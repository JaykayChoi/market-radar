const express = require('express')
const router = express.Router()

const BLS_BASE = 'https://api.bls.gov/publicAPI/v2'

// 주요 시리즈 ID 사전 정의
const SERIES = {
  cpi:          'CUUR0000SA0',       // CPI-U All Items (전체 소비자물가)
  core_cpi:     'CUUR0000SA0L1E',    // Core CPI (식품/에너지 제외)
  nfp:          'CES0000000001',     // 비농업 취업자수 (NFP, 천명 단위)
  unemployment: 'LNS14000000',       // 실업률 U-3
  u6:           'LNS13327709',       // 실업률 U-6 (광의, 불완전고용 포함)
  eci:          'CIU1010000000000A', // 고용비용지수 (ECI)
  ppi:          'WPUFD49104',        // 생산자물가 (최종수요)
}

function getApiKey() {
  const key = process.env.BLS_API_KEY
  if (!key) throw new Error('BLS_API_KEY 환경변수가 설정되지 않았습니다.')
  return key
}

async function blsPost(seriesIds, params = {}) {
  const apiKey = getApiKey()
  const body = { seriesid: seriesIds, registrationkey: apiKey, ...params }
  const res = await fetch(`${BLS_BASE}/timeseries/data/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`BLS API 오류: ${res.status} ${res.statusText}`)
  const data = await res.json()
  if (data.status !== 'REQUEST_SUCCEEDED') {
    throw new Error(`BLS 요청 실패: ${data.message?.join(', ') || data.status}`)
  }
  return data
}

// GET /api/bls/keys — 사용 가능한 별칭 목록
router.get('/keys', (req, res) => {
  res.json({ series: SERIES })
})

// GET /api/bls/key/:name — 별칭으로 단일 시리즈 조회
// query: startyear, endyear (예: 2023, 2026)
router.get('/key/:name', async (req, res) => {
  try {
    const seriesId = SERIES[req.params.name]
    if (!seriesId) {
      return res.status(400).json({
        error: `알 수 없는 키: ${req.params.name}`,
        available: Object.keys(SERIES),
      })
    }
    const { startyear, endyear } = req.query
    const params = {}
    if (startyear) params.startyear = startyear
    if (endyear) params.endyear = endyear

    const data = await blsPost([seriesId], params)
    const series = data.Results?.series?.[0]
    res.json({ key: req.params.name, series_id: seriesId, data: series?.data || [] })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/bls/multi — 여러 시리즈 최신값 조회
// query: keys=cpi,nfp,unemployment (콤마 구분)
router.get('/multi', async (req, res) => {
  try {
    const keys = (req.query.keys || '').split(',').map(k => k.trim()).filter(Boolean)
    if (keys.length === 0) {
      return res.status(400).json({ error: 'keys 파라미터 필요 (예: ?keys=cpi,nfp)' })
    }

    const seriesMap = {}
    const results = []
    for (const key of keys) {
      const id = SERIES[key]
      if (id) seriesMap[id] = key
      else results.push({ key, error: '알 수 없는 키' })
    }

    const validIds = Object.keys(seriesMap)
    if (validIds.length > 0) {
      const data = await blsPost(validIds)
      for (const s of data.Results?.series || []) {
        const key = seriesMap[s.seriesID]
        const latest = s.data?.[0]
        results.push({ key, series_id: s.seriesID, year: latest?.year, period: latest?.period, value: latest?.value })
      }
    }

    // 입력 순서 유지
    const ordered = keys.map(k => results.find(r => r.key === k) || { key: k, error: '알 수 없는 키' })
    res.json({ data: ordered })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
module.exports.SERIES = SERIES
