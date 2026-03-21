const express = require('express')
const router = express.Router()

const POLYGON_BASE = 'https://api.polygon.io'

function getApiKey() {
  const key = process.env.POLYGON_API_KEY
  if (!key) throw new Error('POLYGON_API_KEY 환경변수가 설정되지 않았습니다.')
  return key
}

async function polygonGet(path, params = {}) {
  const apiKey = getApiKey()
  const qs = new URLSearchParams({ ...params, apiKey })
  const res = await fetch(`${POLYGON_BASE}${path}?${qs}`)
  if (!res.ok) throw new Error(`Polygon API 오류: ${res.status} ${res.statusText}`)
  const data = await res.json()
  if (data.status === 'ERROR') throw new Error(`Polygon: ${data.error || data.message}`)
  return data
}

// YYYY-MM-DD 문자열 생성
function toDateStr(date) {
  return date.toISOString().slice(0, 10)
}
function defaultDateRange(days = 365) {
  const end = new Date()
  const start = new Date(end)
  start.setDate(start.getDate() - days)
  return { from: toDateStr(start), to: toDateStr(end) }
}

// GET /api/polygon/aggs?symbol=SPY&from=YYYY-MM-DD&to=YYYY-MM-DD&timespan=day&multiplier=1
// OHLCV 집계 (무료 티어: 이전 날 EOD)
router.get('/aggs', async (req, res) => {
  try {
    const { symbol, timespan = 'day', multiplier = 1 } = req.query
    if (!symbol) return res.status(400).json({ error: 'symbol 파라미터 필요' })
    const range = defaultDateRange(365)
    const from = req.query.from || range.from
    const to   = req.query.to   || range.to
    const sym = symbol.toUpperCase()
    const data = await polygonGet(
      `/v2/aggs/ticker/${sym}/range/${multiplier}/${timespan}/${from}/${to}`,
      { adjusted: 'true', sort: 'desc', limit: 250 }
    )
    const candles = (data.results || []).map(r => ({
      date:   toDateStr(new Date(r.t)),
      open:   r.o,
      high:   r.h,
      low:    r.l,
      close:  r.c,
      volume: r.v,
      vwap:   r.vw,
    }))
    res.json({ symbol: sym, timespan, multiplier, from, to, count: candles.length, candles })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/polygon/snapshot?symbol=SPY — 최신 시세 스냅샷
router.get('/snapshot', async (req, res) => {
  try {
    const { symbol } = req.query
    if (!symbol) return res.status(400).json({ error: 'symbol 파라미터 필요' })
    const sym = symbol.toUpperCase()
    const data = await polygonGet(`/v2/snapshot/locale/us/markets/stocks/tickers/${sym}`)
    res.json({ symbol: sym, snapshot: data.ticker })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/polygon/details?symbol=SPY — 종목 기본정보 (시총, 발행주식수, 섹터 등)
router.get('/details', async (req, res) => {
  try {
    const { symbol } = req.query
    if (!symbol) return res.status(400).json({ error: 'symbol 파라미터 필요' })
    const sym = symbol.toUpperCase()
    const data = await polygonGet(`/v3/reference/tickers/${sym}`)
    res.json({ symbol: sym, details: data.results })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/polygon/news?symbol=AAPL&limit=10 — 종목 관련 뉴스
router.get('/news', async (req, res) => {
  try {
    const { symbol, limit = 10 } = req.query
    if (!symbol) return res.status(400).json({ error: 'symbol 파라미터 필요' })
    const data = await polygonGet('/v2/reference/news', {
      ticker: symbol.toUpperCase(),
      limit,
      order: 'desc',
    })
    res.json({ symbol: symbol.toUpperCase(), news: data.results || [] })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/polygon/dividends?symbol=SPY — 배당 이력
router.get('/dividends', async (req, res) => {
  try {
    const { symbol, limit = 20 } = req.query
    if (!symbol) return res.status(400).json({ error: 'symbol 파라미터 필요' })
    const data = await polygonGet('/v3/reference/dividends', {
      ticker: symbol.toUpperCase(),
      limit,
      order: 'desc',
    })
    res.json({ symbol: symbol.toUpperCase(), dividends: data.results || [] })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
