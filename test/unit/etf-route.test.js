/**
 * ETF 라우트 유닛 테스트
 * 실행: node --test test/unit/etf-route.test.js
 * (FMP_API_KEY 필요 — AUM 캐시 테스트 포함)
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

// Yahoo v8 chart mock 응답
function makeYahooChartResponse(symbol, closes = [100, 101, 102, 103, 104, 105]) {
  return makeOkResponse({
    chart: {
      result: [{
        meta: {
          symbol,
          regularMarketPrice: 105,
          chartPreviousClose: 104,
          regularMarketVolume: 50000000,
          fiftyTwoWeekHigh: 120,
          fiftyTwoWeekLow: 80,
        },
        timestamp: closes.map((_, i) => 1700000000 + i * 86400),
        indicators: { quote: [{ close: closes }] },
      }],
      error: null,
    },
  })
}

// FMP profile mock 응답
function makeFmpProfileResponse(symbol) {
  return makeOkResponse([{
    symbol,
    marketCap: 500000000000,
    companyName: 'Test ETF',
    isEtf: true,
  }])
}

let request
let ETF_LIST

before(() => {
  setupFetchMock()
  process.env.FMP_API_KEY = 'test-fmp-key'
  const app = express()
  app.use(express.json())
  delete require.cache[require.resolve('../../server/routes/etf')]
  const etfRoute = require('../../server/routes/etf')
  ETF_LIST = etfRoute.ETF_LIST
  app.use('/api/etf', etfRoute)
  request = supertest(app)
})

after(() => teardownFetchMock())

describe('GET /api/etf/list', () => {
  test('ETF 메타데이터 목록 반환', async () => {
    const res = await request.get('/api/etf/list')
    assert.equal(res.status, 200)
    assert.ok(Array.isArray(res.body))
    assert.ok(res.body.length > 0)
    assert.ok(res.body[0].symbol)
    assert.ok(res.body[0].category)
  })

  test('카테고리 다양성 확인', async () => {
    const res = await request.get('/api/etf/list')
    const cats = new Set(res.body.map(e => e.category))
    assert.ok(cats.has('US Equity'))
    assert.ok(cats.has('Fixed Income'))
    assert.ok(cats.has('Sector'))
  })
})

describe('GET /api/etf/summary', () => {
  test('전체 ETF 성과/AUM 반환', async () => {
    mockFetchImpl = (url) => {
      if (url.includes('financialmodelingprep')) return makeFmpProfileResponse('SPY')
      return makeYahooChartResponse('SPY')
    }
    const res = await request.get('/api/etf/summary')
    assert.equal(res.status, 200)
    assert.ok(Array.isArray(res.body))
    assert.ok(res.body.length > 0)
  })

  test('각 항목에 symbol/category/price 포함', async () => {
    mockFetchImpl = (url) => {
      if (url.includes('financialmodelingprep')) return makeFmpProfileResponse('SPY')
      return makeYahooChartResponse('SPY')
    }
    const res = await request.get('/api/etf/summary')
    const first = res.body[0]
    assert.ok(first.symbol)
    assert.ok(first.category)
    assert.ok(first.price !== undefined)
  })

  test('성과 지표 포함 (perf1W, perf1M, perf3M)', async () => {
    mockFetchImpl = (url) => {
      if (url.includes('financialmodelingprep')) return makeFmpProfileResponse('SPY')
      // 충분한 데이터 포인트 제공
      return makeYahooChartResponse('SPY', Array.from({length: 65}, (_, i) => 90 + i * 0.1))
    }
    const res = await request.get('/api/etf/summary')
    const spy = res.body.find(e => e.symbol === 'SPY')
    assert.ok(spy)
    assert.equal(typeof spy.perf1W, 'number')
    assert.equal(typeof spy.perf1M, 'number')
    assert.equal(typeof spy.perf3M, 'number')
  })
})

describe('GET /api/etf/:symbol', () => {
  test('단일 ETF 데이터 반환', async () => {
    mockFetchImpl = (url) => {
      if (url.includes('financialmodelingprep')) return makeFmpProfileResponse('QQQ')
      return makeYahooChartResponse('QQQ')
    }
    const res = await request.get('/api/etf/QQQ')
    assert.equal(res.status, 200)
    assert.equal(res.body.symbol, 'QQQ')
    assert.ok(res.body.price !== undefined)
    assert.ok(res.body.aum !== undefined)
  })

  test('대소문자 무관 처리', async () => {
    mockFetchImpl = (url) => {
      if (url.includes('financialmodelingprep')) return makeFmpProfileResponse('SPY')
      return makeYahooChartResponse('SPY')
    }
    const res = await request.get('/api/etf/spy')
    assert.equal(res.status, 200)
    assert.equal(res.body.symbol, 'SPY')
  })

  test('미등록 심볼 404 반환', async () => {
    const res = await request.get('/api/etf/UNKNOWN123')
    assert.equal(res.status, 404)
    assert.ok(res.body.error)
  })

  test('Yahoo API 실패 시 500 반환', async () => {
    mockFetchImpl = (url) => {
      if (url.includes('financialmodelingprep')) return makeFmpProfileResponse('SPY')
      return makeErrorResponse(429, 'Too Many Requests')
    }
    const res = await request.get('/api/etf/SPY')
    assert.equal(res.status, 500)
  })
})
