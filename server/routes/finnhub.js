const express = require('express')
const router = express.Router()

const FINNHUB_BASE = 'https://finnhub.io/api/v1'

// 사전 정의 경제 지표 코드
const INDICATORS = {
  gdp_growth:      'unitedStates/gdpGrowthRate',
  consumer_conf:   'unitedStates/consumerConfidence',
  retail_sales:    'unitedStates/retailSales',
  industrial_prod: 'unitedStates/industrialProduction',
  housing_starts:  'unitedStates/housingStarts',
  jobless_claims:  'unitedStates/initialJoblessClaims',
}

function getApiKey() {
  const key = process.env.FINNHUB_API_KEY
  if (!key) throw new Error('FINNHUB_API_KEY 환경변수가 설정되지 않았습니다.')
  return key
}

async function finnhubGet(path, params = {}) {
  const token = getApiKey()
  const qs = new URLSearchParams({ ...params, token })
  const res = await fetch(`${FINNHUB_BASE}${path}?${qs}`)
  if (!res.ok) throw new Error(`Finnhub API 오류: ${res.status} ${res.statusText}`)
  return res.json()
}

// GET /api/finnhub/quote?symbol=SPY — 실시간 호가/시세
router.get('/quote', async (req, res) => {
  try {
    const { symbol } = req.query
    if (!symbol) return res.status(400).json({ error: 'symbol 파라미터 필요' })
    const data = await finnhubGet('/quote', { symbol: symbol.toUpperCase() })
    res.json({ symbol: symbol.toUpperCase(), ...data })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/finnhub/profile?symbol=AAPL — 기업 기본정보
router.get('/profile', async (req, res) => {
  try {
    const { symbol } = req.query
    if (!symbol) return res.status(400).json({ error: 'symbol 파라미터 필요' })
    const data = await finnhubGet('/stock/profile2', { symbol: symbol.toUpperCase() })
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/finnhub/metric?symbol=AAPL — 재무 지표 (PE, PB, EPS 등)
router.get('/metric', async (req, res) => {
  try {
    const { symbol } = req.query
    if (!symbol) return res.status(400).json({ error: 'symbol 파라미터 필요' })
    const data = await finnhubGet('/stock/metric', { symbol: symbol.toUpperCase(), metric: 'all' })
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/finnhub/earnings?symbol=AAPL — EPS 어닝 서프라이즈
router.get('/earnings', async (req, res) => {
  try {
    const { symbol, limit = 8 } = req.query
    if (!symbol) return res.status(400).json({ error: 'symbol 파라미터 필요' })
    const data = await finnhubGet('/stock/earnings', { symbol: symbol.toUpperCase(), limit })
    res.json({ symbol: symbol.toUpperCase(), data })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/finnhub/calendar/economic — 경제 지표 캘린더
// query: from=YYYY-MM-DD, to=YYYY-MM-DD
router.get('/calendar/economic', async (req, res) => {
  try {
    const { from, to } = req.query
    const params = {}
    if (from) params.from = from
    if (to) params.to = to
    const data = await finnhubGet('/calendar/economic', params)
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// FOMC 2025-2026 일정 (공식 발표 기준)
const FOMC_SCHEDULE = [
  // 2025
  { date: '2025-01-29', type: 'meeting', summary: false, dots: false },
  { date: '2025-03-19', type: 'meeting', summary: true,  dots: true  },
  { date: '2025-05-07', type: 'meeting', summary: false, dots: false },
  { date: '2025-06-18', type: 'meeting', summary: true,  dots: true  },
  { date: '2025-07-30', type: 'meeting', summary: false, dots: false },
  { date: '2025-09-17', type: 'meeting', summary: true,  dots: true  },
  { date: '2025-10-29', type: 'meeting', summary: false, dots: false },
  { date: '2025-12-17', type: 'meeting', summary: true,  dots: true  },
  // 2026
  { date: '2026-01-28', type: 'meeting', summary: false, dots: false },
  { date: '2026-03-18', type: 'meeting', summary: true,  dots: true  },
  { date: '2026-04-29', type: 'meeting', summary: false, dots: false },
  { date: '2026-06-17', type: 'meeting', summary: true,  dots: true  },
  { date: '2026-07-29', type: 'meeting', summary: false, dots: false },
  { date: '2026-09-16', type: 'meeting', summary: true,  dots: true  },
  { date: '2026-10-28', type: 'meeting', summary: false, dots: false },
  { date: '2026-12-16', type: 'meeting', summary: true,  dots: true  },
]

// GET /api/finnhub/fomc — FOMC 일정
router.get('/fomc', (req, res) => {
  const { year } = req.query
  let schedule = FOMC_SCHEDULE
  if (year) schedule = schedule.filter(s => s.date.startsWith(year))
  res.json({ schedule })
})

// GET /api/finnhub/indicator/keys — 사전 정의 경제지표 목록
router.get('/indicator/keys', (req, res) => {
  res.json({ indicators: INDICATORS })
})

// GET /api/finnhub/indicator/:name — 사전 정의 경제지표 조회
router.get('/indicator/:name', async (req, res) => {
  try {
    const indicator = INDICATORS[req.params.name]
    if (!indicator) {
      return res.status(400).json({
        error: `알 수 없는 지표: ${req.params.name}`,
        available: Object.keys(INDICATORS),
      })
    }
    const data = await finnhubGet('/economic/indicator', { indicator })
    res.json({ name: req.params.name, indicator, ...data })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/finnhub/calendar/ipo — IPO 캘린더
router.get('/calendar/ipo', async (req, res) => {
  try {
    const { from, to } = req.query
    if (!from || !to) return res.status(400).json({ error: 'from, to 파라미터 필요 (YYYY-MM-DD)' })
    const data = await finnhubGet('/calendar/ipo', { from, to })
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 기업명 캐시 (symbol → name, 영구 유지)
const companyNameCache = new Map()

async function resolveCompanyNames(symbols) {
  const missing = symbols.filter(s => !companyNameCache.has(s))
  // 병렬로 최대 20개씩 조회 (Finnhub rate limit 고려)
  for (let i = 0; i < missing.length; i += 20) {
    const batch = missing.slice(i, i + 20)
    await Promise.allSettled(batch.map(async (sym) => {
      try {
        const data = await finnhubGet('/stock/profile2', { symbol: sym })
        companyNameCache.set(sym, data.name || sym)
      } catch {
        companyNameCache.set(sym, sym)  // 실패 시 심볼 그대로
      }
    }))
  }
}

// GET /api/finnhub/calendar/earnings — 실적발표 캘린더 (기업명 포함)
router.get('/calendar/earnings', async (req, res) => {
  try {
    const { from, to, symbol } = req.query
    if (!from || !to) return res.status(400).json({ error: 'from, to 파라미터 필요 (YYYY-MM-DD)' })
    const params = { from, to }
    if (symbol) params.symbol = symbol.toUpperCase()
    const data = await finnhubGet('/calendar/earnings', params)

    // 기업명 조회
    const symbols = [...new Set((data.earningsCalendar || []).map(e => e.symbol).filter(Boolean))]
    await resolveCompanyNames(symbols)

    // 기업명 추가
    if (data.earningsCalendar) {
      data.earningsCalendar = data.earningsCalendar.map(e => ({
        ...e,
        companyName: companyNameCache.get(e.symbol) || e.symbol,
      }))
    }

    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
module.exports.INDICATORS = INDICATORS
