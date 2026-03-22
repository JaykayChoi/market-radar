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

// ── 경제 캘린더 (FRED Release Dates) ──────────────────────────────

// 주요 경제지표 릴리스 ID → 메타 정보
// seriesId: 최근 값 조회용 FRED 시리즈, unit: 표시 단위
const ECON_RELEASES = [
  { id: 10,  name: 'CPI (소비자물가지수)',         event: 'Consumer Price Index',        impact: 'high',   category: 'prices',        seriesId: 'CPIAUCSL',   unit: '',     link: 'https://www.bls.gov/cpi/' },
  { id: 50,  name: '고용보고서 (NFP/실업률)',       event: 'Employment Situation',         impact: 'high',   category: 'jobs',          seriesId: 'PAYEMS',     unit: 'K',    link: 'https://www.bls.gov/news.release/empsit.nr0.htm' },
  { id: 53,  name: 'GDP 성장률',                    event: 'Gross Domestic Product',       impact: 'high',   category: 'growth',        seriesId: 'GDPC1',      unit: 'B$',   link: 'https://www.bea.gov/data/gdp/gross-domestic-product' },
  { id: 21,  name: 'PPI (생산자물가지수)',          event: 'Producer Price Index',          impact: 'high',   category: 'prices',        seriesId: 'PPIACO',     unit: '',     link: 'https://www.bls.gov/ppi/' },
  { id: 235, name: 'PCE 물가/개인소득',             event: 'Personal Income & Outlays',    impact: 'high',   category: 'prices',        seriesId: 'PCEPI',      unit: '',     link: 'https://www.bea.gov/data/personal-consumption-expenditures-price-index' },
  { id: 46,  name: '소매판매',                      event: 'Advance Retail Sales',         impact: 'high',   category: 'consumption',   seriesId: 'RSXFS',      unit: 'M$',   link: 'https://www.census.gov/retail/index.html' },
  { id: 13,  name: '주택착공/건축허가',             event: 'Housing Starts & Permits',     impact: 'medium', category: 'housing',       seriesId: 'HOUST',      unit: 'K',    link: 'https://www.census.gov/construction/nrc/index.html' },
  { id: 320, name: '신규 실업수당 청구',            event: 'Unemployment Insurance Claims',impact: 'medium', category: 'jobs', weekly: true, seriesId: 'ICSA',  unit: 'K',    link: 'https://www.dol.gov/ui/data.pdf' },
  { id: 39,  name: '미시간 소비자심리',             event: 'Michigan Consumer Sentiment',   impact: 'medium', category: 'sentiment',     seriesId: 'UMCSENT',    unit: '',     link: 'http://www.sca.isr.umich.edu/' },
  { id: 52,  name: '무역수지',                      event: 'U.S. Trade Balance',           impact: 'medium', category: 'trade',         seriesId: 'BOPGSTB',    unit: 'M$',   link: 'https://www.census.gov/foreign-trade/data/index.html' },
  { id: 19,  name: '기업재고',                      event: 'Business Inventories',         impact: 'low',    category: 'manufacturing', seriesId: 'ISRATIO',    unit: '',     link: 'https://www.census.gov/mtis/index.html' },
  { id: 42,  name: '신축주택판매',                  event: 'New Home Sales',               impact: 'medium', category: 'housing',       seriesId: 'HSN1F',      unit: 'K',    link: 'https://www.census.gov/construction/nrs/index.html' },
  { id: 40,  name: '기존주택판매',                  event: 'Existing Home Sales',          impact: 'medium', category: 'housing',       seriesId: 'EXHOSLUSM495S', unit: 'M', link: 'https://www.nar.realtor/research-and-statistics/housing-statistics/existing-home-sales' },
]

// GET /api/fred/calendar — 경제지표 발표 캘린더
// query: from=YYYY-MM-DD, to=YYYY-MM-DD
router.get('/calendar', async (req, res) => {
  try {
    const now = new Date()
    const from = req.query.from || new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
    const to   = req.query.to   || new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)

    // 1) 릴리스 날짜 + 최근 관측값을 병렬 조회
    const results = await Promise.allSettled(
      ECON_RELEASES.map(async (rel) => {
        const [dateData, obsData] = await Promise.all([
          fredGet('/release/dates', {
            release_id: rel.id,
            include_release_dates_with_no_data: 'true',
            sort_order: 'asc',
          }),
          rel.seriesId ? fredGet('/series/observations', {
            series_id: rel.seriesId,
            sort_order: 'desc',
            limit: 3,
          }).catch(() => null) : Promise.resolve(null),
        ])

        let dates = (dateData.release_dates || [])
          .filter(d => d.date >= from && d.date <= to)
          .map(d => d.date)

        // 주간 릴리스는 월별 첫 번째만 유지
        if (rel.weekly) {
          const seen = new Set()
          dates = dates.filter(d => {
            const ym = d.slice(0, 7)
            if (seen.has(ym)) return false
            seen.add(ym)
            return true
          })
        }

        // 최근 3개 관측값 파싱
        let actual = null, prev = null, prev2 = null
        if (obsData?.observations?.length) {
          const obs = obsData.observations
          actual = parseValue(obs[0]?.value)
          prev   = parseValue(obs[1]?.value)
          prev2  = parseValue(obs[2]?.value)
        }

        return { ...rel, dates, actual, prev, prev2 }
      })
    )

    // 2) 날짜별 이벤트 맵으로 변환
    const calendar = []
    for (const r of results) {
      if (r.status !== 'fulfilled') continue
      const rel = r.value
      for (const date of rel.dates) {
        calendar.push({
          date,
          event:    rel.event,
          name:     rel.name,
          impact:   rel.impact,
          category: rel.category,
          releaseId: rel.id,
          unit:     rel.unit || '',
          link:     rel.link || null,
          actual:   rel.actual,
          prev:     rel.prev,
          prev2:    rel.prev2,
        })
      }
    }

    // 날짜순 → 중요도순 정렬
    const impOrd = { high: 0, medium: 1, low: 2 }
    calendar.sort((a, b) => a.date.localeCompare(b.date) || (impOrd[a.impact] ?? 3) - (impOrd[b.impact] ?? 3))

    res.json({ economicCalendar: calendar, from, to })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── 국채 경매 일정 (TreasuryDirect API) ───────────────────────────

router.get('/treasury-auctions', async (req, res) => {
  try {
    const now = new Date()
    const from = req.query.from || new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
    const to   = req.query.to   || new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString().slice(0, 10)

    const url = `https://www.treasurydirect.gov/TA_WS/securities/announced?format=json&pagesize=50`
    const r = await fetch(url, { headers: { 'User-Agent': 'MarketRadar/1.0' } })
    if (!r.ok) throw new Error(`TreasuryDirect API 오류: ${r.status}`)
    const data = await r.json()

    const auctions = data
      .filter(a => a.auctionDate && a.auctionDate.slice(0, 10) >= from && a.auctionDate.slice(0, 10) <= to)
      .map(a => ({
        date:         a.auctionDate.slice(0, 10),
        type:         a.securityType,    // Note, Bond, Bill, TIPS, FRN
        term:         a.securityTerm,    // 7-Year, 10-Year, etc.
        cusip:        a.cusip,
        issueDate:    a.issueDate?.slice(0, 10),
        maturityDate: a.maturityDate?.slice(0, 10),
        offeringAmt:  a.offeringAmount ? parseFloat(a.offeringAmount) : null,
        announcementDate: a.announcementDate?.slice(0, 10),
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    res.json({ auctions, from, to })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
module.exports.SERIES = SERIES
