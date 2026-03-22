const express = require('express')
const router = express.Router()

const FRED_BASE = 'https://api.stlouisfed.org/fred'

// 주요 시리즈 ID 사전 정의
const SERIES = {
  // 금리
  fed_rate:        'DFF',        // 미국 기준금리
  t2y:             'GS2',        // 2년 국채
  t5y:             'GS5',        // 5년 국채
  t10y:            'GS10',       // 10년 국채
  t30y:            'GS30',       // 30년 국채
  spread_10y2y:    'T10Y2Y',     // 장단기 스프레드 (경기침체 신호)
  spread_10y3m:    'T10Y3M',     // 10년-3개월 스프레드
  tips_10y:        'DFII10',     // 10년 실질금리 (TIPS)
  // 물가
  cpi:             'CPIAUCSL',   // CPI 전체
  core_cpi:        'CPILFESL',   // 근원 CPI
  pce:             'PCEPI',      // PCE 물가
  core_pce:        'PCEPILFE',   // 근원 PCE (Fed 선호)
  // 고용
  unemployment:    'UNRATE',     // 실업률
  nfp:             'PAYEMS',     // 비농업 취업자수
  // 달러/환율
  dxy:             'DTWEXBGS',   // 달러 인덱스
  usdkrw:          'DEXKOUS',    // 원/달러
  usdjpy:          'DEXJPUS',    // 엔/달러
  eurusd:          'DEXUSEU',    // 유로/달러
  // 신용/유동성
  hy_spread:       'BAMLH0A0HYM2',  // 하이일드 스프레드
  ig_spread:       'BAMLC0A0CM',    // 투자등급 스프레드
  m2:              'M2SL',          // 통화량 M2
  // 공포지수
  vix:             'VIXCLS',
  // GDP
  gdp:             'GDPC1',         // 실질 GDP
  // 모기지/부동산
  mortgage30:      'MORTGAGE30US',
  houst:           'HOUST',          // 주택착공건수
  // 소비/심리
  umcsent:         'UMCSENT',        // 미시간 소비자심리지수
  rsxfs:           'RSXFS',          // 소매판매 (식품서비스 제외)
  // 산업/생산
  indpro:          'INDPRO',         // 산업생산지수
  capacity:        'TCU',            // 설비가동률
  // 무역
  bopgstb:         'BOPGSTB',        // 무역수지
  // 연준 대차대조표
  walcl:           'WALCL',          // 연준 총자산 (QT 추적)
  // 기대 인플레이션
  bei_10y:         'T10YIE',         // 10년 BEI (손익분기 인플레이션율)
  bei_5y:          'T5YIE',          // 5년 BEI
  // 추가 환율
  usdcny:          'DEXCHUS',        // 위안/달러
}

// FRED는 데이터 없는 날짜에 "." 반환 → null 변환
function parseValue(v) {
  if (v === '.' || v === null || v === undefined) return null
  const n = parseFloat(v)
  return isNaN(n) ? null : n
}

function getApiKey() {
  const key = process.env.FRED_API_KEY
  if (!key) throw new Error('FRED_API_KEY 환경변수가 설정되지 않았습니다.')
  return key
}

async function fredGet(path, params = {}) {
  const apiKey = getApiKey()
  const qs = new URLSearchParams({ ...params, api_key: apiKey, file_type: 'json' })
  const res = await fetch(`${FRED_BASE}${path}?${qs}`)
  if (!res.ok) throw new Error(`FRED API 오류: ${res.status} ${res.statusText}`)
  return res.json()
}

// GET /api/fred/series/:id — 시계열 데이터 조회
// query: limit(기본100), sort_order(desc), observation_start(YYYY-MM-DD), observation_end
router.get('/series/:id', async (req, res) => {
  try {
    const { limit = 100, sort_order = 'desc', observation_start, observation_end } = req.query
    const params = { series_id: req.params.id, limit, sort_order }
    if (observation_start) params.observation_start = observation_start
    if (observation_end) params.observation_end = observation_end

    const data = await fredGet('/series/observations', params)
    const observations = data.observations.map(o => ({ ...o, value: parseValue(o.value) }))
    res.json({ series_id: req.params.id, observations })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/fred/key/:name — 별칭으로 시계열 조회 (예: fed_rate, vix, hy_spread)
router.get('/key/:name', async (req, res) => {
  try {
    const seriesId = SERIES[req.params.name]
    if (!seriesId) {
      return res.status(400).json({
        error: `알 수 없는 키: ${req.params.name}`,
        available: Object.keys(SERIES),
      })
    }
    const { limit = 100, sort_order = 'desc', observation_start, observation_end } = req.query
    const params = { series_id: seriesId, limit, sort_order }
    if (observation_start) params.observation_start = observation_start
    if (observation_end) params.observation_end = observation_end

    const data = await fredGet('/series/observations', params)
    const observations = data.observations.map(o => ({ ...o, value: parseValue(o.value) }))
    res.json({ key: req.params.name, series_id: seriesId, observations })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/fred/multi — 여러 시리즈 한 번에 조회 (최신값만)
// query: keys=fed_rate,vix,hy_spread (콤마 구분)
router.get('/multi', async (req, res) => {
  try {
    const keys = (req.query.keys || '').split(',').map(k => k.trim()).filter(Boolean)
    if (keys.length === 0) {
      return res.status(400).json({ error: 'keys 파라미터 필요 (예: ?keys=fed_rate,vix)' })
    }

    const results = await Promise.all(
      keys.map(async (key) => {
        const seriesId = SERIES[key]
        if (!seriesId) return { key, error: '알 수 없는 키' }
        try {
          const data = await fredGet('/series/observations', {
            series_id: seriesId,
            limit: 1,
            sort_order: 'desc',
          })
          const latest = data.observations?.[0]
          return { key, series_id: seriesId, date: latest?.date, value: parseValue(latest?.value) }
        } catch (e) {
          return { key, series_id: seriesId, error: e.message }
        }
      })
    )
    res.json({ data: results })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/fred/keys — 사용 가능한 별칭 목록
router.get('/keys', (req, res) => {
  res.json({ series: SERIES })
})

module.exports = router
module.exports.SERIES = SERIES
