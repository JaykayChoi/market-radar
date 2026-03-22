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

// ── Yahoo Finance 인증 (crumb + cookie) ─────────────────────────

let yfAuth = { cookie: null, crumb: null, ts: 0 }
const AUTH_TTL = 30 * 60 * 1000  // 30분

async function getYfAuth() {
  if (yfAuth.crumb && Date.now() - yfAuth.ts < AUTH_TTL) return yfAuth

  const cookieRes = await fetch('https://fc.yahoo.com', { redirect: 'manual' })
  const setCookies = cookieRes.headers.getSetCookie?.() || []
  const cookie = setCookies.map(c => c.split(';')[0]).join('; ')

  const crumbRes = await fetch('https://query2.finance.yahoo.com/v1/test/getcrumb', {
    headers: { ...HEADERS, Cookie: cookie },
  })
  if (!crumbRes.ok) throw new Error('Yahoo crumb 획득 실패')
  const crumb = await crumbRes.text()

  yfAuth = { cookie, crumb, ts: Date.now() }
  return yfAuth
}

// GET /api/yahoo/options?symbol=SPY — 옵션 체인
// query: symbol (필수), date (만기일 unix timestamp, 생략 시 가장 가까운 만기)
router.get('/options', async (req, res) => {
  try {
    const { symbol, date } = req.query
    if (!symbol) return res.status(400).json({ error: 'symbol 파라미터 필요' })
    const sym = symbol.toUpperCase()

    const auth = await getYfAuth()
    const qs = new URLSearchParams({ crumb: auth.crumb })
    if (date) qs.set('date', date)

    const data = await fetch(
      `https://query2.finance.yahoo.com/v7/finance/options/${sym}?${qs}`,
      { headers: { ...HEADERS, Cookie: auth.cookie } }
    ).then(r => {
      if (!r.ok) throw new Error(`Yahoo options 오류: ${r.status}`)
      return r.json()
    })

    const result = data.optionChain?.result?.[0]
    if (!result) return res.status(404).json({ error: `옵션 데이터 없음: ${sym}` })

    const quote = result.quote || {}
    const options = result.options?.[0] || {}

    res.json({
      symbol: sym,
      underlying: {
        price: quote.regularMarketPrice,
        change: quote.regularMarketChange,
        changePct: quote.regularMarketChangePercent,
        name: quote.shortName || quote.longName || sym,
      },
      expirations: (result.expirationDates || []).map(ts => {
        const d = new Date(ts * 1000)
        return { timestamp: ts, date: d.toISOString().slice(0, 10) }
      }),
      calls: (options.calls || []).map(c => ({
        strike:       c.strike,
        lastPrice:    c.lastPrice,
        bid:          c.bid,
        ask:          c.ask,
        volume:       c.volume || 0,
        openInterest: c.openInterest || 0,
        iv:           c.impliedVolatility,
        itm:          c.inTheMoney,
      })),
      puts: (options.puts || []).map(p => ({
        strike:       p.strike,
        lastPrice:    p.lastPrice,
        bid:          p.bid,
        ask:          p.ask,
        volume:       p.volume || 0,
        openInterest: p.openInterest || 0,
        iv:           p.impliedVolatility,
        itm:          p.inTheMoney,
      })),
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/yahoo/options/pcr?symbol=SPY — 만기일별 P/C Ratio 요약
// 가장 가까운 만기일 최대 8개에 대해 P/C ratio 계산
router.get('/options/pcr', async (req, res) => {
  try {
    const { symbol = 'SPY' } = req.query
    const sym = symbol.toUpperCase()

    const auth = await getYfAuth()
    // 먼저 만기일 목록 가져오기 (기본 호출)
    const baseData = await fetch(
      `https://query2.finance.yahoo.com/v7/finance/options/${sym}?crumb=${auth.crumb}`,
      { headers: { ...HEADERS, Cookie: auth.cookie } }
    ).then(r => {
      if (!r.ok) throw new Error(`Yahoo options 오류: ${r.status}`)
      return r.json()
    })

    const result = baseData.optionChain?.result?.[0]
    if (!result) return res.status(404).json({ error: `옵션 데이터 없음: ${sym}` })

    const expirations = (result.expirationDates || []).slice(0, 8)
    const quote = result.quote || {}

    // 각 만기일별 P/C ratio 계산 (병렬)
    const pcrData = await Promise.allSettled(expirations.map(async (ts) => {
      const d = await fetch(
        `https://query2.finance.yahoo.com/v7/finance/options/${sym}?date=${ts}&crumb=${auth.crumb}`,
        { headers: { ...HEADERS, Cookie: auth.cookie } }
      ).then(r => r.ok ? r.json() : null)

      const opts = d?.optionChain?.result?.[0]?.options?.[0]
      if (!opts) return null

      const callVol = (opts.calls || []).reduce((s, c) => s + (c.volume || 0), 0)
      const putVol  = (opts.puts  || []).reduce((s, p) => s + (p.volume || 0), 0)
      const callOI  = (opts.calls || []).reduce((s, c) => s + (c.openInterest || 0), 0)
      const putOI   = (opts.puts  || []).reduce((s, p) => s + (p.openInterest || 0), 0)

      return {
        expiration: new Date(ts * 1000).toISOString().slice(0, 10),
        callVol, putVol, callOI, putOI,
        pcrVol: callVol > 0 ? parseFloat((putVol / callVol).toFixed(3)) : null,
        pcrOI:  callOI > 0  ? parseFloat((putOI / callOI).toFixed(3))  : null,
      }
    }))

    const rows = pcrData
      .filter(r => r.status === 'fulfilled' && r.value)
      .map(r => r.value)

    // 전체 합산
    const totalCallVol = rows.reduce((s, r) => s + r.callVol, 0)
    const totalPutVol  = rows.reduce((s, r) => s + r.putVol, 0)
    const totalCallOI  = rows.reduce((s, r) => s + r.callOI, 0)
    const totalPutOI   = rows.reduce((s, r) => s + r.putOI, 0)

    res.json({
      symbol: sym,
      price: quote.regularMarketPrice,
      name: quote.shortName || sym,
      overall: {
        pcrVol: totalCallVol > 0 ? parseFloat((totalPutVol / totalCallVol).toFixed(3)) : null,
        pcrOI:  totalCallOI > 0  ? parseFloat((totalPutOI / totalCallOI).toFixed(3))  : null,
        totalCallVol, totalPutVol, totalCallOI, totalPutOI,
      },
      byExpiration: rows,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
