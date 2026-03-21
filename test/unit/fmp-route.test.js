/**
 * FMP 라우트 유닛 테스트 (stable API 기반)
 * 실행: node --env-file=.env --test test/unit/fmp-route.test.js
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
  process.env.FMP_API_KEY = 'test-fmp-key'

  const app = express()
  app.use(express.json())
  delete require.cache[require.resolve('../../server/routes/fmp')]
  app.use('/api/fmp', require('../../server/routes/fmp'))
  request = supertest(app)
})

after(() => teardownFetchMock())

describe('GET /api/fmp/quote', () => {
  test('symbol 없으면 400 반환', async () => {
    const res = await request.get('/api/fmp/quote')
    assert.equal(res.status, 400)
  })

  test('시세 데이터 반환', async () => {
    mockFetchImpl = () => makeOkResponse([{ symbol: 'SPY', price: 648.57, name: 'SPDR S&P 500 ETF Trust' }])
    const res = await request.get('/api/fmp/quote?symbol=SPY')
    assert.equal(res.status, 200)
    assert.ok(Array.isArray(res.body))
    assert.equal(res.body[0].symbol, 'SPY')
  })

  test('FMP Error Message 시 500 반환', async () => {
    mockFetchImpl = () => makeOkResponse({ 'Error Message': 'Invalid API KEY.' })
    const res = await request.get('/api/fmp/quote?symbol=SPY')
    assert.equal(res.status, 500)
    assert.ok(res.body.error.includes('Invalid API KEY'))
  })

  test('stable API URL 사용 확인', async () => {
    let capturedUrl = ''
    mockFetchImpl = (url) => { capturedUrl = url; return makeOkResponse([{ symbol: 'SPY' }]) }
    await request.get('/api/fmp/quote?symbol=SPY')
    assert.ok(capturedUrl.includes('financialmodelingprep.com/stable'))
  })
})

describe('GET /api/fmp/profile', () => {
  test('symbol 없으면 400 반환', async () => {
    const res = await request.get('/api/fmp/profile')
    assert.equal(res.status, 400)
  })

  test('기업 기본정보 반환', async () => {
    mockFetchImpl = () => makeOkResponse([{ symbol: 'AAPL', marketCap: 3000000000000, sector: 'Technology' }])
    const res = await request.get('/api/fmp/profile?symbol=AAPL')
    assert.equal(res.status, 200)
  })
})

describe('GET /api/fmp/history', () => {
  test('symbol 없으면 400 반환', async () => {
    const res = await request.get('/api/fmp/history')
    assert.equal(res.status, 400)
  })

  test('일별 주가 이력 반환', async () => {
    mockFetchImpl = () => makeOkResponse([
      { symbol: 'SPY', date: '2026-03-20', open: 656.51, high: 656.69, low: 644.72, close: 648.57 },
    ])
    const res = await request.get('/api/fmp/history?symbol=SPY')
    assert.equal(res.status, 200)
    assert.ok(Array.isArray(res.body))
  })
})

describe('GET /api/fmp/earnings', () => {
  test('symbol 없으면 400 반환', async () => {
    const res = await request.get('/api/fmp/earnings')
    assert.equal(res.status, 400)
  })

  test('어닝 데이터 반환', async () => {
    mockFetchImpl = () => makeOkResponse([
      { symbol: 'AAPL', date: '2026-05-07', epsEstimated: 1.88 },
    ])
    const res = await request.get('/api/fmp/earnings?symbol=AAPL')
    assert.equal(res.status, 200)
    assert.ok(Array.isArray(res.body))
  })
})

describe('FMP_API_KEY 미설정', () => {
  test('API 키 없으면 500 반환', async () => {
    const saved = process.env.FMP_API_KEY
    delete process.env.FMP_API_KEY
    delete require.cache[require.resolve('../../server/routes/fmp')]
    const noKeyApp = express()
    noKeyApp.use('/api/fmp', require('../../server/routes/fmp'))
    const res = await supertest(noKeyApp).get('/api/fmp/quote?symbol=SPY')
    assert.equal(res.status, 500)
    assert.ok(res.body.error.includes('FMP_API_KEY'))
    process.env.FMP_API_KEY = saved
  })
})
