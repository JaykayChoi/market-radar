/**
 * Yahoo Finance 라우트 유닛 테스트
 * 실행: node --test test/unit/yahoo-route.test.js
 * (API 키 불필요)
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

let request

before(() => {
  setupFetchMock()
  const app = express()
  app.use(express.json())
  delete require.cache[require.resolve('../../server/routes/yahoo')]
  app.use('/api/yahoo', require('../../server/routes/yahoo'))
  request = supertest(app)
})

after(() => teardownFetchMock())

describe('GET /api/yahoo/quote', () => {
  test('symbol 없으면 400 반환', async () => {
    const res = await request.get('/api/yahoo/quote')
    assert.equal(res.status, 400)
  })

  test('v8 chart meta 기반 시세 반환', async () => {
    mockFetchImpl = () => makeOkResponse({
      chart: {
        result: [{
          meta: {
            symbol: 'SPY',
            shortName: 'SPDR S&P 500 ETF Trust',
            regularMarketPrice: 648.57,
            chartPreviousClose: 658.0,
            regularMarketVolume: 50000000,
            currency: 'USD',
            exchangeName: 'NYSEArca',
          },
          timestamp: [],
          indicators: { quote: [{}] },
        }],
        error: null,
      },
    })
    const res = await request.get('/api/yahoo/quote?symbol=SPY')
    assert.equal(res.status, 200)
    assert.equal(res.body.symbol, 'SPY')
    assert.equal(res.body.regularMarketPrice, 648.57)
    assert.ok(res.body.previousClose !== undefined)
  })

  test('결과 없으면 404 반환', async () => {
    mockFetchImpl = () => makeOkResponse({ chart: { result: null, error: null } })
    const res = await request.get('/api/yahoo/quote?symbol=INVALID999')
    assert.equal(res.status, 404)
  })

  test('Yahoo API 실패 시 500 반환', async () => {
    mockFetchImpl = () => makeErrorResponse(429, 'Too Many Requests')
    const res = await request.get('/api/yahoo/quote?symbol=SPY')
    assert.equal(res.status, 500)
  })
})

describe('GET /api/yahoo/chart', () => {
  test('symbol 없으면 400 반환', async () => {
    const res = await request.get('/api/yahoo/chart')
    assert.equal(res.status, 400)
  })

  test('OHLCV 캔들 데이터 반환', async () => {
    mockFetchImpl = () => makeOkResponse({
      chart: {
        result: [{
          meta: { symbol: 'SPY', regularMarketPrice: 590 },
          timestamp: [1704067200, 1704153600],
          indicators: {
            quote: [{ open: [580, 585], high: [592, 595], low: [578, 582], close: [590, 588], volume: [50000000, 45000000] }],
          },
        }],
        error: null,
      },
    })
    const res = await request.get('/api/yahoo/chart?symbol=SPY&range=1y&interval=1d')
    assert.equal(res.status, 200)
    assert.equal(res.body.symbol, 'SPY')
    assert.ok(Array.isArray(res.body.candles))
    assert.equal(res.body.candles.length, 2)
    assert.ok(res.body.candles[0].date)
    assert.ok(res.body.candles[0].close !== undefined)
  })

  test('URL에 range/interval 파라미터 포함', async () => {
    let capturedUrl = ''
    mockFetchImpl = (url) => {
      capturedUrl = url
      return makeOkResponse({ chart: { result: [{ meta: {}, timestamp: [], indicators: { quote: [{}] } }], error: null } })
    }
    await request.get('/api/yahoo/chart?symbol=QQQ&range=3mo&interval=1wk')
    assert.ok(capturedUrl.includes('range=3mo'))
    assert.ok(capturedUrl.includes('interval=1wk'))
  })
})

describe('GET /api/yahoo/search', () => {
  test('q 없으면 400 반환', async () => {
    const res = await request.get('/api/yahoo/search')
    assert.equal(res.status, 400)
  })

  test('검색 결과 반환', async () => {
    mockFetchImpl = () => makeOkResponse({
      quotes: [
        { symbol: 'AAPL', longname: 'Apple Inc.', quoteType: 'EQUITY', exchange: 'NMS' },
      ],
    })
    const res = await request.get('/api/yahoo/search?q=apple')
    assert.equal(res.status, 200)
    assert.ok(Array.isArray(res.body.results))
    assert.equal(res.body.results[0].symbol, 'AAPL')
  })
})
