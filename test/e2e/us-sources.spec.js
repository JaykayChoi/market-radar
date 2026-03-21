/**
 * 미국 데이터 소스 E2E 테스트 (실제 API 호출)
 * 실행: npx playwright test --config playwright.config.js
 *
 * 전제: Express 서버가 실행 중이어야 함 (FRED_API_KEY, FMP_API_KEY, BLS_API_KEY 등 .env 필요)
 */

const { test, expect } = require('@playwright/test')

const BASE = 'http://localhost:3000'

// ─── US Treasury (인증 불필요) ──────────────────────────────────────

test.describe('US Treasury API E2E', () => {
  test('GET /api/treasury/yield — 수익률 곡선 반환', async ({ request }) => {
    const res = await request.get(`${BASE}/api/treasury/yield`)
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    expect(body.type).toBe('nominal')
    expect(Array.isArray(body.data)).toBeTruthy()
    expect(body.data.length).toBeGreaterThan(0)
    expect(body.data[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(typeof body.data[0].rates['10Y']).toBe('number')
  })

  test('GET /api/treasury/yield/latest — 최신 수익률 1행', async ({ request }) => {
    const res = await request.get(`${BASE}/api/treasury/yield/latest`)
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    expect(body.type).toBe('nominal')
    expect(body.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(body.rates).toBeDefined()
    expect(typeof body.rates['10Y']).toBe('number')
    expect(body.rates['10Y']).toBeGreaterThan(0)
  })

  test('GET /api/treasury/tips — TIPS 실질 수익률 반환', async ({ request }) => {
    const res = await request.get(`${BASE}/api/treasury/tips`)
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    expect(body.type).toBe('real_tips')
    expect(Array.isArray(body.data)).toBeTruthy()
  })
})

// ─── CBOE (인증 불필요) ─────────────────────────────────────────────

test.describe('CBOE API E2E', () => {
  test('GET /api/cboe/vix — VIX 히스토리 반환', async ({ request }) => {
    const res = await request.get(`${BASE}/api/cboe/vix`)
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    expect(body.index).toBe('vix')
    expect(Array.isArray(body.data)).toBeTruthy()
    expect(body.data.length).toBeGreaterThan(0)
    expect(body.data[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(typeof body.data[0].close).toBe('number')
    expect(body.data[0].close).toBeGreaterThan(0)
  })

  test('GET /api/cboe/vix?limit=5 — 최근 5개 반환', async ({ request }) => {
    const res = await request.get(`${BASE}/api/cboe/vix?limit=5`)
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    expect(body.data.length).toBeLessThanOrEqual(5)
  })

  test('GET /api/cboe/invalid — 400 반환', async ({ request }) => {
    const res = await request.get(`${BASE}/api/cboe/invalid_index`)
    expect(res.status()).toBe(400)
  })
})

// ─── Yahoo Finance (인증 불필요) ────────────────────────────────────

test.describe('Yahoo Finance API E2E', () => {
  test('GET /api/yahoo/quote?symbol=SPY — SPY 시세 반환', async ({ request }) => {
    const res = await request.get(`${BASE}/api/yahoo/quote?symbol=SPY`)
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    expect(body.symbol).toBe('SPY')
    expect(body.regularMarketPrice).toBeGreaterThan(0)
    expect(body.previousClose).toBeGreaterThan(0)
  })

  test('GET /api/yahoo/chart?symbol=QQQ&range=1mo — 캔들 데이터 반환', async ({ request }) => {
    const res = await request.get(`${BASE}/api/yahoo/chart?symbol=QQQ&range=1mo&interval=1d`)
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    expect(body.symbol).toBe('QQQ')
    expect(Array.isArray(body.candles)).toBeTruthy()
    expect(body.candles.length).toBeGreaterThan(0)
    expect(body.candles[0].date).toBeDefined()
    expect(typeof body.candles[0].close).toBe('number')
  })

  test('GET /api/yahoo/search?q=apple — 검색 결과 반환', async ({ request }) => {
    const res = await request.get(`${BASE}/api/yahoo/search?q=apple`)
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    expect(Array.isArray(body.results)).toBeTruthy()
    expect(body.results.length).toBeGreaterThan(0)
    const aapl = body.results.find(r => r.symbol === 'AAPL')
    expect(aapl).toBeDefined()
  })
})

// ─── FMP (API 키 필요) ──────────────────────────────────────────────

test.describe('FMP API E2E', () => {
  test('GET /api/fmp/profile?symbol=AAPL — 기업 정보 반환', async ({ request }) => {
    const res = await request.get(`${BASE}/api/fmp/profile?symbol=AAPL`)
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    expect(Array.isArray(body)).toBeTruthy()
    expect(body[0].symbol).toBe('AAPL')
    expect(body[0].marketCap).toBeGreaterThan(0)
  })

  test('GET /api/fmp/quote?symbol=SPY — 시세 반환', async ({ request }) => {
    const res = await request.get(`${BASE}/api/fmp/quote?symbol=SPY`)
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    expect(Array.isArray(body)).toBeTruthy()
    expect(body[0].symbol).toBe('SPY')
    expect(body[0].price).toBeGreaterThan(0)
  })
})

// ─── ETF 집계 라우트 ────────────────────────────────────────────────

test.describe('ETF 집계 API E2E', () => {
  test('GET /api/etf/list — 27개 ETF 메타데이터 반환', async ({ request }) => {
    const res = await request.get(`${BASE}/api/etf/list`)
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    expect(Array.isArray(body)).toBeTruthy()
    expect(body.length).toBe(27)
    const cats = new Set(body.map(e => e.category))
    expect(cats.has('US Equity')).toBeTruthy()
    expect(cats.has('Fixed Income')).toBeTruthy()
  })

  test('GET /api/etf/SPY — SPY 상세 (가격+AUM+성과)', async ({ request }) => {
    const res = await request.get(`${BASE}/api/etf/SPY`)
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    expect(body.symbol).toBe('SPY')
    expect(body.price).toBeGreaterThan(0)
    expect(body.aum).toBeGreaterThan(0)
    expect(typeof body.perf3M).toBe('number')
    expect(typeof body.perf1M).toBe('number')
  })

  test('GET /api/etf/INVALID — 404 반환', async ({ request }) => {
    const res = await request.get(`${BASE}/api/etf/INVALID123`)
    expect(res.status()).toBe(404)
  })
})

// ─── BLS (API 키 필요) ──────────────────────────────────────────────

test.describe('BLS API E2E', () => {
  test('GET /api/bls/key/cpi — CPI 데이터 반환', async ({ request }) => {
    const res = await request.get(`${BASE}/api/bls/key/cpi`)
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    expect(body.series_id).toBeDefined()
    expect(Array.isArray(body.data)).toBeTruthy()
    expect(body.data.length).toBeGreaterThan(0)
  })

  test('GET /api/bls/key/unemployment — 실업률 반환', async ({ request }) => {
    const res = await request.get(`${BASE}/api/bls/key/unemployment`)
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    expect(body.series_id).toBeDefined()
    expect(body.data.length).toBeGreaterThan(0)
    const val = body.data[0].value
    expect(typeof val === 'string' || val === null).toBeTruthy()
  })
})
