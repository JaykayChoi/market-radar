/**
 * Polygon.io 라우트 유닛 테스트
 * 실행: node --env-file=.env --test test/unit/polygon-route.test.js
 */

const { test, describe, before, after } = require('node:test')
const assert = require('node:assert/strict')
const express = require('express')
const supertest = require('supertest')

let mockFetchImpl = null
const originalFetch = globalThis.fetch

function setupFetchMock() {
  globalThis.fetch = async (url, opts) => {
    if (mockFetchImpl) return mockFetchImpl(url, opts)
    return originalFetch(url, opts)
  }
}
function teardownFetchMock() { globalThis.fetch = originalFetch }

function makeOkResponse(body) {
  return { ok: true, json: async () => body }
}
function makeErrorResponse(status, text) {
  return { ok: false, status, statusText: text, json: async () => ({}) }
}

const SAMPLE_AGGS = {
  status: 'OK',
  results: [
    { t: 1742860800000, o: 584.0, h: 592.0, l: 582.0, c: 590.0, v: 50000000, vw: 588.5 },
    { t: 1742774400000, o: 580.0, h: 586.0, l: 578.0, c: 584.0, v: 45000000, vw: 582.3 },
  ],
}

let request

before(() => {
  setupFetchMock()
  process.env.POLYGON_API_KEY = 'test-polygon-key'

  const app = express()
  app.use(express.json())
  delete require.cache[require.resolve('../../server/routes/polygon')]
  app.use('/api/polygon', require('../../server/routes/polygon'))
  request = supertest(app)
})

after(() => teardownFetchMock())

describe('GET /api/polygon/aggs', () => {
  test('symbol 없으면 400 반환', async () => {
    const res = await request.get('/api/polygon/aggs')
    assert.equal(res.status, 400)
  })

  test('OHLCV 캔들 데이터 반환', async () => {
    mockFetchImpl = () => makeOkResponse(SAMPLE_AGGS)
    const res = await request.get('/api/polygon/aggs?symbol=SPY')
    assert.equal(res.status, 200)
    assert.equal(res.body.symbol, 'SPY')
    assert.ok(Array.isArray(res.body.candles))
    assert.equal(res.body.candles.length, 2)
    assert.ok(res.body.candles[0].date)
    assert.equal(res.body.candles[0].close, 590.0)
    assert.ok(res.body.candles[0].vwap !== undefined)
  })

  test('symbol 소문자 입력도 대문자 처리', async () => {
    let capturedUrl = ''
    mockFetchImpl = (url) => { capturedUrl = url; return makeOkResponse(SAMPLE_AGGS) }
    await request.get('/api/polygon/aggs?symbol=spy')
    assert.ok(capturedUrl.includes('/SPY/'))
  })

  test('Polygon ERROR status 시 500 반환', async () => {
    mockFetchImpl = () => makeOkResponse({ status: 'ERROR', error: 'Invalid API Key' })
    const res = await request.get('/api/polygon/aggs?symbol=SPY')
    assert.equal(res.status, 500)
    assert.ok(res.body.error.includes('Invalid API Key'))
  })

  test('HTTP 오류 시 500 반환', async () => {
    mockFetchImpl = () => makeErrorResponse(403, 'Forbidden')
    const res = await request.get('/api/polygon/aggs?symbol=SPY')
    assert.equal(res.status, 500)
  })
})

describe('GET /api/polygon/snapshot', () => {
  test('symbol 없으면 400 반환', async () => {
    const res = await request.get('/api/polygon/snapshot')
    assert.equal(res.status, 400)
  })

  test('스냅샷 반환', async () => {
    mockFetchImpl = () => makeOkResponse({
      status: 'OK',
      ticker: { ticker: 'SPY', day: { c: 590.0, v: 50000000 } },
    })
    const res = await request.get('/api/polygon/snapshot?symbol=SPY')
    assert.equal(res.status, 200)
    assert.equal(res.body.symbol, 'SPY')
    assert.ok(res.body.snapshot)
  })
})

describe('GET /api/polygon/details', () => {
  test('symbol 없으면 400 반환', async () => {
    const res = await request.get('/api/polygon/details')
    assert.equal(res.status, 400)
  })

  test('종목 정보 반환', async () => {
    mockFetchImpl = () => makeOkResponse({
      status: 'OK',
      results: { ticker: 'SPY', name: 'SPDR S&P 500 ETF Trust', market_cap: 500000000000 },
    })
    const res = await request.get('/api/polygon/details?symbol=SPY')
    assert.equal(res.status, 200)
    assert.equal(res.body.symbol, 'SPY')
    assert.ok(res.body.details)
  })
})

describe('POLYGON_API_KEY 미설정', () => {
  test('API 키 없으면 500 반환', async () => {
    const saved = process.env.POLYGON_API_KEY
    delete process.env.POLYGON_API_KEY
    delete require.cache[require.resolve('../../server/routes/polygon')]
    const noKeyApp = express()
    noKeyApp.use('/api/polygon', require('../../server/routes/polygon'))
    const res = await supertest(noKeyApp).get('/api/polygon/aggs?symbol=SPY')
    assert.equal(res.status, 500)
    assert.ok(res.body.error.includes('POLYGON_API_KEY'))
    process.env.POLYGON_API_KEY = saved
  })
})
