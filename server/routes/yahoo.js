const express = require('express')
const router = express.Router()

// Yahoo Finance 비공식 API — 인증 불필요, 정책 변경 리스크 있음
const YF_BASE1 = 'https://query1.finance.yahoo.com'
const YF_BASE2 = 'https://query2.finance.yahoo.com'

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; MarketRadar/1.0)',
}

async function yfGet(url) {
  const res = await fetch(url, { headers: HEADERS })
  if (!res.ok) throw new Error(`Yahoo Finance 오류: ${res.status} ${res.statusText}`)
  return res.json()
}

// GET /api/yahoo/quote?symbol=SPY — 최신 시세 (v8 chart meta 기반)
// Yahoo v10 quoteSummary는 인증 없이 차단됨 → v8 chart의 meta 필드 사용
router.get('/quote', async (req, res) => {
  try {
    const { symbol } = req.query
    if (!symbol) return res.status(400).json({ error: 'symbol 파라미터 필요' })
    const sym = symbol.toUpperCase()
    const data = await yfGet(
      `${YF_BASE1}/v8/finance/chart/${sym}?range=1d&interval=1d&includePrePost=false`
    )
    const result = data.chart?.result?.[0]
    if (!result) return res.status(404).json({ error: `심볼을 찾을 수 없음: ${sym}` })
    const meta = result.meta
    res.json({
      symbol:              sym,
      shortName:           meta.shortName,
      currency:            meta.currency,
      exchangeName:        meta.exchangeName,
      regularMarketPrice:  meta.regularMarketPrice,
      previousClose:       meta.chartPreviousClose,
      regularMarketVolume: meta.regularMarketVolume,
      fiftyTwoWeekHigh:    meta.fiftyTwoWeekHigh,
      fiftyTwoWeekLow:     meta.fiftyTwoWeekLow,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/yahoo/chart?symbol=SPY&range=1y&interval=1d — OHLCV 차트 데이터
// range: 1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max
// interval: 1m, 2m, 5m, 15m, 30m, 60m, 90m, 1h, 1d, 5d, 1wk, 1mo, 3mo
router.get('/chart', async (req, res) => {
  try {
    const { symbol, range = '1y', interval = '1d' } = req.query
    if (!symbol) return res.status(400).json({ error: 'symbol 파라미터 필요' })
    const sym = symbol.toUpperCase()
    const qs = new URLSearchParams({ range, interval, includePrePost: 'false' })
    const data = await yfGet(`${YF_BASE1}/v8/finance/chart/${sym}?${qs}`)
    const result = data.chart?.result?.[0]
    if (!result) return res.status(404).json({ error: `심볼을 찾을 수 없음: ${sym}` })

    const { timestamp, indicators } = result
    const quote = indicators.quote?.[0]
    // 타임스탬프 + OHLCV 배열을 객체 배열로 변환
    const candles = (timestamp || []).map((ts, i) => ({
      date:   new Date(ts * 1000).toISOString().slice(0, 10),
      open:   quote?.open?.[i]  ?? null,
      high:   quote?.high?.[i]  ?? null,
      low:    quote?.low?.[i]   ?? null,
      close:  quote?.close?.[i] ?? null,
      volume: quote?.volume?.[i] ?? null,
    }))
    res.json({ symbol: sym, range, interval, meta: result.meta, candles })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/yahoo/search?q=apple — 심볼 검색
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query
    if (!q) return res.status(400).json({ error: 'q 파라미터 필요' })
    const data = await yfGet(`${YF_BASE1}/v1/finance/search?q=${encodeURIComponent(q)}&lang=en-US&region=US`)
    const quotes = (data.quotes || []).map(q => ({
      symbol:   q.symbol,
      name:     q.longname || q.shortname,
      type:     q.quoteType,
      exchange: q.exchange,
    }))
    res.json({ query: q, results: quotes })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
