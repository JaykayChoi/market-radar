/**
 * Finnhub 라우트 유닛 테스트
 * 실행: node --env-file=.env --test test/unit/finnhub-route.test.js
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
function teardownFetchMock() {
  globalThis.fetch = originalFetch
}

function makeOkResponse(body) {
  return { ok: true, json: async () => body }
}
function makeErrorResponse(status, text) {
  return { ok: false, status, statusText: text, json: async () => ({}) }
}

let request

before(() => {
  setupFetchMock()
  process.env.FINNHUB_API_KEY = 'test-finnhub-key'

  const app = express()
  app.use(express.json())
  delete require.cache[require.resolve('../../server/routes/finnhub')]
  app.use('/api/finnhub', require('../../server/routes/finnhub'))
  request = supertest(app)
})

after(() => teardownFetchMock())

describe('GET /api/finnhub/quote', () => {
  test('symbol 없으면 400 반환', async () => {
    const res = await request.get('/api/finnhub/quote')
    assert.equal(res.status, 400)
    assert.ok(res.body.error)
  })

  test('유효한 symbol로 시세 반환', async () => {
    mockFetchImpl = () => makeOkResponse({ c: 590.12, h: 595.0, l: 585.0, o: 588.0, pc: 587.5 })
    const res = await request.get('/api/finnhub/quote?symbol=SPY')
    assert.equal(res.status, 200)
    assert.equal(res.body.symbol, 'SPY')
    assert.ok('c' in res.body, '현재가(c) 필드 존재')
  })

  test('symbol 소문자 입력도 대문자로 처리', async () => {
    let capturedUrl = ''
    mockFetchImpl = (url) => { capturedUrl = url; return makeOkResponse({ c: 100 }) }
    await request.get('/api/finnhub/quote?symbol=spy')
    assert.ok(capturedUrl.includes('symbol=SPY'))
  })

  test('Finnhub API 실패 시 500 반환', async () => {
    mockFetchImpl = () => makeErrorResponse(429, 'Too Many Requests')
    const res = await request.get('/api/finnhub/quote?symbol=SPY')
    assert.equal(res.status, 500)
    assert.ok(res.body.error)
  })
})

describe('GET /api/finnhub/indicator/keys', () => {
  test('사전 정의 경제지표 목록 반환', async () => {
    const res = await request.get('/api/finnhub/indicator/keys')
    assert.equal(res.status, 200)
    assert.ok(res.body.indicators)
    assert.ok('gdp_growth' in res.body.indicators)
  })
})

describe('GET /api/finnhub/indicator/:name', () => {
  test('유효한 지표명으로 데이터 반환', async () => {
    mockFetchImpl = () => makeOkResponse({ data: [2.8, 3.1, 2.5], period: ['2025-Q4', '2025-Q3', '2025-Q2'] })
    const res = await request.get('/api/finnhub/indicator/gdp_growth')
    assert.equal(res.status, 200)
    assert.equal(res.body.name, 'gdp_growth')
    assert.ok(res.body.indicator)
  })

  test('알 수 없는 지표명은 400 반환', async () => {
    const res = await request.get('/api/finnhub/indicator/bad_indicator')
    assert.equal(res.status, 400)
    assert.ok(res.body.error)
    assert.ok(Array.isArray(res.body.available))
  })
})

describe('GET /api/finnhub/earnings', () => {
  test('symbol 없으면 400 반환', async () => {
    const res = await request.get('/api/finnhub/earnings')
    assert.equal(res.status, 400)
  })

  test('어닝 데이터 반환', async () => {
    mockFetchImpl = () => makeOkResponse([{ actual: 2.40, estimate: 2.35, period: '2026-01-01' }])
    const res = await request.get('/api/finnhub/earnings?symbol=AAPL')
    assert.equal(res.status, 200)
    assert.equal(res.body.symbol, 'AAPL')
    assert.ok(Array.isArray(res.body.data))
  })
})

describe('FINNHUB_API_KEY 미설정', () => {
  test('API 키 없으면 500 반환', async () => {
    const saved = process.env.FINNHUB_API_KEY
    delete process.env.FINNHUB_API_KEY
    delete require.cache[require.resolve('../../server/routes/finnhub')]
    const noKeyApp = express()
    noKeyApp.use('/api/finnhub', require('../../server/routes/finnhub'))
    const res = await supertest(noKeyApp).get('/api/finnhub/quote?symbol=SPY')
    assert.equal(res.status, 500)
    assert.ok(res.body.error.includes('FINNHUB_API_KEY'))
    process.env.FINNHUB_API_KEY = saved
  })
})
