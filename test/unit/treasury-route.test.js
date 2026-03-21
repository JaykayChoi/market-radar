/**
 * US Treasury 라우트 유닛 테스트
 * 실행: node --test test/unit/treasury-route.test.js
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

// 실제 Treasury XML 형식 반영 (m:type 속성, DateTime 형식)
const SAMPLE_XML = `<?xml version="1.0" encoding="utf-8" standalone="yes" ?>
<feed xmlns:d="http://schemas.microsoft.com/ado/2007/08/dataservices" xmlns:m="http://schemas.microsoft.com/ado/2007/08/dataservices/metadata">
<entry>
<content type="application/xml"><m:properties>
<d:NEW_DATE m:type="Edm.DateTime">2026-03-19T00:00:00</d:NEW_DATE>
<d:BC_1MONTH m:type="Edm.Double">3.74</d:BC_1MONTH>
<d:BC_3MONTH m:type="Edm.Double">3.75</d:BC_3MONTH>
<d:BC_6MONTH m:type="Edm.Double">3.79</d:BC_6MONTH>
<d:BC_1YEAR m:type="Edm.Double">3.80</d:BC_1YEAR>
<d:BC_2YEAR m:type="Edm.Double">3.88</d:BC_2YEAR>
<d:BC_5YEAR m:type="Edm.Double">4.01</d:BC_5YEAR>
<d:BC_10YEAR m:type="Edm.Double">4.20</d:BC_10YEAR>
<d:BC_30YEAR m:type="Edm.Double">4.36</d:BC_30YEAR>
</m:properties></content></entry>
<entry>
<content type="application/xml"><m:properties>
<d:NEW_DATE m:type="Edm.DateTime">2026-03-20T00:00:00</d:NEW_DATE>
<d:BC_1MONTH m:type="Edm.Double">3.73</d:BC_1MONTH>
<d:BC_3MONTH m:type="Edm.Double">3.74</d:BC_3MONTH>
<d:BC_6MONTH m:type="Edm.Double">3.79</d:BC_6MONTH>
<d:BC_1YEAR m:type="Edm.Double">3.80</d:BC_1YEAR>
<d:BC_2YEAR m:type="Edm.Double">3.88</d:BC_2YEAR>
<d:BC_5YEAR m:type="Edm.Double">4.01</d:BC_5YEAR>
<d:BC_10YEAR m:type="Edm.Double">4.39</d:BC_10YEAR>
<d:BC_30YEAR m:type="Edm.Double">4.96</d:BC_30YEAR>
</m:properties></content></entry>
</feed>`

function makeTextResponse(text) {
  return { ok: true, text: async () => text }
}
function makeErrorResponse(status, text) {
  return { ok: false, status, statusText: text }
}

let request
let parseYieldXml, MATURITIES

before(() => {
  setupFetchMock()
  const app = express()
  app.use(express.json())
  delete require.cache[require.resolve('../../server/routes/treasury')]
  const treasury = require('../../server/routes/treasury')
  parseYieldXml = treasury.parseYieldXml
  MATURITIES = treasury.MATURITIES
  app.use('/api/treasury', treasury)
  request = supertest(app)
})

after(() => teardownFetchMock())

describe('parseYieldXml 유틸리티', () => {
  test('XML에서 날짜와 수익률 파싱', () => {
    const rows = parseYieldXml(SAMPLE_XML, MATURITIES)
    assert.ok(rows.length >= 2)
    assert.ok(rows[0].date)
    assert.ok(rows[0].rates)
    assert.equal(typeof rows[0].rates['10Y'], 'number')
  })

  test('수익률 값을 숫자로 변환', () => {
    const rows = parseYieldXml(SAMPLE_XML, MATURITIES)
    assert.equal(rows[0].rates['10Y'], 4.20)
    assert.equal(rows[0].rates['2Y'], 3.88)
  })
})

describe('GET /api/treasury/yield', () => {
  test('수익률 곡선 데이터 반환', async () => {
    mockFetchImpl = () => makeTextResponse(SAMPLE_XML)
    const res = await request.get('/api/treasury/yield')
    assert.equal(res.status, 200)
    assert.equal(res.body.type, 'nominal')
    assert.ok(Array.isArray(res.body.data))
    assert.ok(Array.isArray(res.body.maturities))
    assert.ok(res.body.data.length > 0)
  })

  test('최신 날짜가 먼저 반환 (역순)', async () => {
    mockFetchImpl = () => makeTextResponse(SAMPLE_XML)
    const res = await request.get('/api/treasury/yield')
    assert.equal(res.status, 200)
    assert.ok(res.body.data[0].date >= res.body.data[1]?.date)
  })

  test('Treasury API 실패 시 500 반환', async () => {
    mockFetchImpl = () => makeErrorResponse(503, 'Service Unavailable')
    const res = await request.get('/api/treasury/yield')
    assert.equal(res.status, 500)
    assert.ok(res.body.error)
  })
})

describe('GET /api/treasury/yield/latest', () => {
  test('가장 최근 수익률 한 행 반환', async () => {
    mockFetchImpl = () => makeTextResponse(SAMPLE_XML)
    const res = await request.get('/api/treasury/yield/latest')
    assert.equal(res.status, 200)
    assert.equal(res.body.type, 'nominal')
    assert.ok(res.body.date)
    assert.ok(res.body.rates)
    assert.ok('10Y' in res.body.rates)
  })
})

describe('GET /api/treasury/tips', () => {
  const TIPS_XML = `<feed xmlns:d="http://schemas.microsoft.com/ado/2007/08/dataservices" xmlns:m="http://schemas.microsoft.com/ado/2007/08/dataservices/metadata">
    <entry><content type="application/xml"><m:properties>
      <d:NEW_DATE m:type="Edm.DateTime">2026-03-19T00:00:00</d:NEW_DATE>
      <d:TC_5YEAR m:type="Edm.Double">1.85</d:TC_5YEAR>
      <d:TC_10YEAR m:type="Edm.Double">1.92</d:TC_10YEAR>
      <d:TC_30YEAR m:type="Edm.Double">2.05</d:TC_30YEAR>
    </m:properties></content></entry>
  </feed>`

  test('TIPS 실질 수익률 반환', async () => {
    mockFetchImpl = () => makeTextResponse(TIPS_XML)
    const res = await request.get('/api/treasury/tips')
    assert.equal(res.status, 200)
    assert.equal(res.body.type, 'real_tips')
    assert.ok(Array.isArray(res.body.data))
  })
})
