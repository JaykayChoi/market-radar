const express = require('express')
const router = express.Router()

// 주요 ETF 목록 (카테고리별)
const ETF_LIST = [
  // US 주식
  { symbol: 'SPY',  name: 'S&P 500 ETF Trust',           category: 'US Equity' },
  { symbol: 'QQQ',  name: 'Invesco QQQ Trust',            category: 'US Equity' },
  { symbol: 'IWM',  name: 'iShares Russell 2000',         category: 'US Equity' },
  { symbol: 'VTI',  name: 'Vanguard Total Stock Market',  category: 'US Equity' },
  { symbol: 'DIA',  name: 'SPDR Dow Jones Industrials',   category: 'US Equity' },
  // 해외 주식
  { symbol: 'EFA',  name: 'iShares MSCI EAFE',            category: 'International' },
  { symbol: 'EEM',  name: 'iShares MSCI Emerging Markets',category: 'International' },
  { symbol: 'VEA',  name: 'Vanguard Developed Markets',   category: 'International' },
  { symbol: 'VWO',  name: 'Vanguard Emerging Markets',    category: 'International' },
  // 채권
  { symbol: 'TLT',  name: 'iShares 20+Y Treasury Bond',   category: 'Fixed Income' },
  { symbol: 'AGG',  name: 'iShares Core U.S. Agg Bond',   category: 'Fixed Income' },
  { symbol: 'HYG',  name: 'iShares High Yield Corp Bond', category: 'Fixed Income' },
  { symbol: 'LQD',  name: 'iShares IG Corp Bond',         category: 'Fixed Income' },
  { symbol: 'TIP',  name: 'iShares TIPS Bond',            category: 'Fixed Income' },
  // 원자재
  { symbol: 'GLD',  name: 'SPDR Gold Shares',             category: 'Commodities' },
  { symbol: 'SLV',  name: 'iShares Silver Trust',         category: 'Commodities' },
  { symbol: 'USO',  name: 'United States Oil Fund',       category: 'Commodities' },
  { symbol: 'PDBC', name: 'Invesco Commodity Strategy',   category: 'Commodities' },
  // 섹터 (11개 SPDR 전체)
  { symbol: 'XLK',  name: 'Technology Select Sector',     category: 'Sector' },
  { symbol: 'XLF',  name: 'Financial Select Sector',      category: 'Sector' },
  { symbol: 'XLE',  name: 'Energy Select Sector',         category: 'Sector' },
  { symbol: 'XLV',  name: 'Health Care Select Sector',    category: 'Sector' },
  { symbol: 'XLI',  name: 'Industrial Select Sector',     category: 'Sector' },
  { symbol: 'XLY',  name: 'Consumer Discr Select Sector', category: 'Sector' },
  { symbol: 'XLP',  name: 'Consumer Staples Sel Sector',  category: 'Sector' },
  { symbol: 'XLU',  name: 'Utilities Select Sector',      category: 'Sector' },
  { symbol: 'XLC',  name: 'Communication Svcs Sel Sector',category: 'Sector' },
  { symbol: 'XLRE', name: 'Real Estate Select Sector',    category: 'Sector' },
  { symbol: 'XLB',  name: 'Materials Select Sector',      category: 'Sector' },
  // 레버리지/역방향
  { symbol: 'TQQQ', name: 'ProShares UltraPro QQQ',       category: 'Leverage' },
  { symbol: 'SQQQ', name: 'ProShares UltraPro Short QQQ', category: 'Leverage' },
  { symbol: 'UVXY', name: 'ProShares Ultra VIX ST Futures',category: 'Leverage' },
]

// FMP AUM 캐시 (30분 TTL)
let aumCache = { data: {}, updatedAt: 0 }
const AUM_TTL_MS = 30 * 60 * 1000

async function fetchAum(symbols) {
  const now = Date.now()
  if (now - aumCache.updatedAt < AUM_TTL_MS) return aumCache.data

  const apiKey = process.env.FMP_API_KEY
  if (!apiKey) return {}

  const results = await Promise.allSettled(
    symbols.map(sym =>
      fetch(`https://financialmodelingprep.com/stable/profile?symbol=${sym}&apikey=${apiKey}`, {
        headers: { 'User-Agent': 'MarketRadar/1.0' },
      })
        .then(r => (r.ok ? r.json() : []))
        .then(d => ({ sym, marketCap: d[0]?.marketCap ?? null }))
    )
  )

  const aum = {}
  for (const r of results) {
    if (r.status === 'fulfilled') aum[r.value.sym] = r.value.marketCap
  }

  aumCache = { data: aum, updatedAt: now }
  return aum
}

// Yahoo Finance v8 차트로 성과 계산
async function fetchPerformance(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=3mo&interval=1d`
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
  if (!res.ok) throw new Error(`Yahoo 오류: ${res.status}`)
  const data = await res.json()
  const result = data.chart?.result?.[0]
  if (!result) return null

  const meta = result.meta
  const closes = (result.indicators?.quote?.[0]?.close || []).filter(v => v != null)
  const n = closes.length
  if (n === 0) return null

  const current = meta.regularMarketPrice
  const prev = meta.chartPreviousClose
  const pct = (v, base) => base ? parseFloat(((v - base) / base * 100).toFixed(2)) : null

  return {
    price:     parseFloat(current.toFixed(2)),
    change:    parseFloat((current - prev).toFixed(2)),
    changePct: pct(current, prev),
    perf1W:    n >= 5  ? pct(current, closes[n - 5])  : null,
    perf1M:    n >= 22 ? pct(current, closes[n - 22]) : null,
    perf3M:    n >= 2  ? pct(current, closes[0])       : null,
    volume:    meta.regularMarketVolume ?? null,
    high52W:   meta.fiftyTwoWeekHigh ?? null,
    low52W:    meta.fiftyTwoWeekLow ?? null,
  }
}

// GET /api/etf/list — ETF 메타데이터 목록
router.get('/list', (req, res) => {
  res.json(ETF_LIST)
})

// GET /api/etf/summary — 전체 ETF 가격/AUM/성과 (병렬 조회)
router.get('/summary', async (req, res) => {
  try {
    const symbols = ETF_LIST.map(e => e.symbol)

    // AUM은 캐시 활용, 성과는 병렬 실시간 조회
    const [aumMap, perfResults] = await Promise.all([
      fetchAum(symbols),
      Promise.allSettled(symbols.map(sym => fetchPerformance(sym))),
    ])

    const summary = ETF_LIST.map((etf, i) => {
      const perf = perfResults[i].status === 'fulfilled' ? perfResults[i].value : null
      const aum = aumMap[etf.symbol] ?? null
      return {
        symbol:    etf.symbol,
        name:      etf.name,
        category:  etf.category,
        aum,
        ...(perf || {}),
      }
    })

    res.json(summary)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── ETF 자금흐름 추정 ─────────────────────────────────────────────

async function fetchFlowData(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=3mo&interval=1wk`
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
  if (!res.ok) return null
  const data = await res.json()
  const result = data.chart?.result?.[0]
  if (!result) return null

  const meta = result.meta
  const closes = result.indicators?.quote?.[0]?.close || []
  const volumes = result.indicators?.quote?.[0]?.volume || []
  const n = closes.length

  if (n < 2) return null

  const current = meta.regularMarketPrice
  const prevClose = meta.chartPreviousClose

  let flowSum1W = 0, flowSum1M = 0, flowSum3M = 0
  for (let i = 1; i < n; i++) {
    if (closes[i] == null || closes[i - 1] == null || volumes[i] == null) continue
    const direction = closes[i] >= closes[i - 1] ? 1 : -1
    const dollarVol = volumes[i] * closes[i] * direction
    flowSum3M += dollarVol
    if (i >= n - 4) flowSum1M += dollarVol
    if (i >= n - 1) flowSum1W += dollarVol
  }

  const avgWeeklyVol = volumes.slice(1).reduce((s, v, i) => {
    return s + (v || 0) * (closes[i + 1] || 0)
  }, 0) / Math.max(n - 1, 1)

  return {
    price: current,
    prevClose,
    changePct: prevClose ? parseFloat(((current - prevClose) / prevClose * 100).toFixed(2)) : null,
    flowProxy1W: Math.round(flowSum1W),
    flowProxy1M: Math.round(flowSum1M),
    flowProxy3M: Math.round(flowSum3M),
    avgWeeklyDollarVol: Math.round(avgWeeklyVol),
  }
}

// GET /api/etf/fund-flows — 전체 ETF 자금흐름 추정
router.get('/fund-flows', async (req, res) => {
  try {
    const symbols = ETF_LIST.map(e => e.symbol)
    const [aumMap, flowResults] = await Promise.all([
      fetchAum(symbols),
      Promise.allSettled(symbols.map(s => fetchFlowData(s))),
    ])

    const flows = ETF_LIST.map((etf, i) => {
      const flow = flowResults[i].status === 'fulfilled' ? flowResults[i].value : null
      return {
        symbol: etf.symbol,
        name: etf.name,
        category: etf.category,
        aum: aumMap[etf.symbol] ?? null,
        ...(flow || {}),
      }
    })

    res.json(flows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/etf/holdings?symbol=SPY — ETF 보유종목 상위 (FMP)
router.get('/holdings', async (req, res) => {
  try {
    const { symbol } = req.query
    if (!symbol) return res.status(400).json({ error: 'symbol 파라미터 필요' })
    const apiKey = process.env.FMP_API_KEY
    if (!apiKey) return res.json({ holdings: [], error: 'FMP API 키 없음' })

    const r = await fetch(
      `https://financialmodelingprep.com/stable/etf-holder?symbol=${symbol.toUpperCase()}&apikey=${apiKey}`,
      { headers: { 'User-Agent': 'MarketRadar/1.0' } }
    )
    if (!r.ok) throw new Error(`FMP 오류: ${r.status}`)
    const data = await r.json()
    if (data['Error Message']) throw new Error(data['Error Message'])

    const holdings = (Array.isArray(data) ? data : []).slice(0, 20).map(h => ({
      asset: h.asset,
      name: h.name,
      weight: h.weightPercentage != null ? parseFloat(h.weightPercentage) : null,
      shares: h.sharesNumber,
    }))

    res.json({ symbol: symbol.toUpperCase(), holdings })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/etf/:symbol — 단일 ETF 상세
router.get('/:symbol', async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase()
    const etf = ETF_LIST.find(e => e.symbol === symbol)
    if (!etf) return res.status(404).json({ error: '등록되지 않은 ETF' })

    const [perf, aumMap] = await Promise.all([
      fetchPerformance(symbol),
      fetchAum([symbol]),
    ])

    res.json({ ...etf, aum: aumMap[symbol] ?? null, ...(perf || {}) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
module.exports.ETF_LIST = ETF_LIST
