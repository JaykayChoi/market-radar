/**
 * CBOE 라우트 유닛 테스트
 * 실행: node --test test/unit/cboe-route.test.js
 * (API 키 불필요 — CBOE 무료 CSV 다운로드)
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

const SAMPLE_CSV = `DATE,OPEN,HIGH,LOW,CLOSE
01/02/2026,16.00,17.50,15.80,16.54
01/05/2026,16.54,18.20,15.90,17.12
01/06/2026,17.12,19.00,16.50,18.45
`

function makeTextResponse(text) {
  return { ok: true, text: async () => text }
}
function makeErrorResponse(status, text) {
  return { ok: false, status, statusText: text }
}

let request
let parseCsv

before(() => {
  setupFetchMock()
  const app = express()
  app.use(express.json())
  delete require.cache[require.resolve('../../server/routes/cboe')]
  const cboe = require('../../server/routes/cboe')
  parseCsv = cboe.parseCsv
  app.use('/api/cboe', cboe)
  request = supertest(app)
})

after(() => teardownFetchMock())

describe('parseCsv 유틸리티', () => {
  test('CSV 헤더와 데이터 행을 파싱한다', () => {
    const rows = parseCsv(SAMPLE_CSV)
    assert.equal(rows.length, 3)
    assert.ok(rows[0].date)
    assert.equal(typeof rows[0].close, 'number')
    assert.equal(rows[0].close, 16.54)
  })

  test('CLOSE 값을 숫자로 변환한다', () => {
    const rows = parseCsv(SAMPLE_CSV)
    for (const row of rows) {
      assert.equal(typeof row.close, 'number')
    }
  })
})

describe('GET /api/cboe/keys', () => {
  test('사용 가능한 지수 목록 반환', async () => {
    const res = await request.get('/api/cboe/keys')
    assert.equal(res.status, 200)
    assert.ok(res.body.indices)
    assert.ok('vix' in res.body.indices)
    assert.ok('vix9d' in res.body.indices)
    assert.ok('vvix' in res.body.indices)
  })
})

describe('GET /api/cboe/:index', () => {
  test('VIX 히스토리 반환', async () => {
    mockFetchImpl = () => makeTextResponse(SAMPLE_CSV)
    const res = await request.get('/api/cboe/vix')
    assert.equal(res.status, 200)
    assert.equal(res.body.index, 'vix')
    assert.ok(Array.isArray(res.body.data))
    assert.ok(res.body.data.length > 0)
    assert.ok(res.body.data[0].date)
    assert.equal(typeof res.body.data[0].close, 'number')
  })

  test('limit 파라미터로 행 수 제한', async () => {
    mockFetchImpl = () => makeTextResponse(SAMPLE_CSV)
    const res = await request.get('/api/cboe/vix?limit=2')
    assert.equal(res.status, 200)
    assert.equal(res.body.data.length, 2)
  })

  test('최신 데이터가 먼저 반환된다 (역순)', async () => {
    mockFetchImpl = () => makeTextResponse(SAMPLE_CSV)
    const res = await request.get('/api/cboe/vix')
    assert.equal(res.status, 200)
    // CSV 마지막 행(01/06)이 첫 번째로 와야 함
    assert.ok(res.body.data[0].date.includes('2026'))
  })

  test('알 수 없는 지수는 400 반환', async () => {
    const res = await request.get('/api/cboe/bad_index')
    assert.equal(res.status, 400)
    assert.ok(res.body.error)
    assert.ok(Array.isArray(res.body.available))
  })

  test('CBOE CSV 다운로드 실패 시 500 반환', async () => {
    mockFetchImpl = () => makeErrorResponse(503, 'Service Unavailable')
    const res = await request.get('/api/cboe/vix')
    assert.equal(res.status, 500)
    assert.ok(res.body.error)
  })
})
