/**
 * BEA 라우트 유닛 테스트
 * 실행: node --env-file=.env --test test/unit/bea-route.test.js
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

function makeBeaResponse(data) {
  return {
    ok: true,
    json: async () => ({
      BEAAPI: { Results: { Data: data } },
    }),
  }
}
function makeBeaError(msg) {
  return {
    ok: true,
    json: async () => ({
      BEAAPI: { Error: { APIErrorDescription: msg } },
    }),
  }
}
function makeErrorResponse(status, text) {
  return { ok: false, status, statusText: text, json: async () => ({}) }
}

const SAMPLE_GDP = [
  { TableName: 'T10101', SeriesCode: 'A191RL', TimePeriod: '2025Q4', DataValue: '2.3', UNIT_MULT: '0' },
  { TableName: 'T10101', SeriesCode: 'A191RL', TimePeriod: '2025Q3', DataValue: '3.1', UNIT_MULT: '0' },
]

let request

before(() => {
  setupFetchMock()
  process.env.BEA_API_KEY = 'test-bea-key'

  const app = express()
  app.use(express.json())
  delete require.cache[require.resolve('../../server/routes/bea')]
  app.use('/api/bea', require('../../server/routes/bea'))
  request = supertest(app)
})

after(() => teardownFetchMock())

describe('GET /api/bea/tables', () => {
  test('사전 정의 테이블 목록 반환', async () => {
    const res = await request.get('/api/bea/tables')
    assert.equal(res.status, 200)
    assert.ok(res.body.tables)
    assert.ok('gdp' in res.body.tables)
    assert.ok('pce' in res.body.tables)
  })
})

describe('GET /api/bea/gdp', () => {
  test('GDP 데이터 반환', async () => {
    mockFetchImpl = () => makeBeaResponse(SAMPLE_GDP)
    const res = await request.get('/api/bea/gdp')
    assert.equal(res.status, 200)
    assert.equal(res.body.table, 'T10101')
    assert.ok(Array.isArray(res.body.data))
    assert.equal(res.body.data.length, 2)
  })

  test('BEA API 오류 시 500 반환', async () => {
    mockFetchImpl = () => makeBeaError('Invalid UserID')
    const res = await request.get('/api/bea/gdp')
    assert.equal(res.status, 500)
    assert.ok(res.body.error.includes('Invalid UserID'))
  })

  test('HTTP 오류 시 500 반환', async () => {
    mockFetchImpl = () => makeErrorResponse(503, 'Service Unavailable')
    const res = await request.get('/api/bea/gdp')
    assert.equal(res.status, 500)
  })
})

describe('GET /api/bea/pce', () => {
  test('PCE 데이터 반환', async () => {
    mockFetchImpl = () => makeBeaResponse([
      { SeriesCode: 'DPCERC', TimePeriod: '2025Q4', DataValue: '5432.1' },
    ])
    const res = await request.get('/api/bea/pce')
    assert.equal(res.status, 200)
    assert.equal(res.body.table, 'T20305')
    assert.ok(Array.isArray(res.body.data))
  })
})

describe('GET /api/bea/table/:name', () => {
  test('임의 테이블 조회', async () => {
    mockFetchImpl = (url) => {
      assert.ok(url.includes('TableName=T11300'))
      return makeBeaResponse([{ SeriesCode: 'A445RC', TimePeriod: '2025Q4', DataValue: '3210.5' }])
    }
    const res = await request.get('/api/bea/table/T11300')
    assert.equal(res.status, 200)
    assert.equal(res.body.table, 'T11300')
  })
})

describe('BEA_API_KEY 미설정', () => {
  test('API 키 없으면 500 반환', async () => {
    const saved = process.env.BEA_API_KEY
    delete process.env.BEA_API_KEY
    delete require.cache[require.resolve('../../server/routes/bea')]
    const noKeyApp = express()
    noKeyApp.use('/api/bea', require('../../server/routes/bea'))
    const res = await supertest(noKeyApp).get('/api/bea/gdp')
    assert.equal(res.status, 500)
    assert.ok(res.body.error.includes('BEA_API_KEY'))
    process.env.BEA_API_KEY = saved
  })
})
