/**
 * SEC EDGAR 13F 라우트 유닛 테스트
 * 실행: node --test test/unit/edgar13f-route.test.js
 */

const { test, describe, before, after, beforeEach } = require('node:test')
const assert = require('node:assert/strict')
const express = require('express')
const supertest = require('supertest')

const SAMPLE_XML = `
<informationTable xmlns="http://www.sec.gov/edgar/document/thirteenf/informationtable">
  <infoTable>
    <nameOfIssuer>APPLE INC</nameOfIssuer>
    <cusip>037833100</cusip>
    <value>76500000000</value>
    <shrsOrPrnAmt><sshPrnamt>300000000</sshPrnamt></shrsOrPrnAmt>
  </infoTable>
  <infoTable>
    <nameOfIssuer>MICROSOFT CORP</nameOfIssuer>
    <cusip>594918104</cusip>
    <value>25000000000</value>
    <shrsOrPrnAmt><sshPrnamt>60000000</sshPrnamt></shrsOrPrnAmt>
  </infoTable>
  <infoTable>
    <nameOfIssuer>NVIDIA CORP PUT</nameOfIssuer>
    <cusip>67066G104</cusip>
    <value>1500000000</value>
    <shrsOrPrnAmt><sshPrnamt>10000000</sshPrnamt></shrsOrPrnAmt>
    <putCall>Put</putCall>
  </infoTable>
</informationTable>
`

const SAMPLE_SUBMISSIONS = {
  filings: {
    recent: {
      accessionNumber: ['0001193125-26-054580', '0001193125-25-001234'],
      form: ['13F-HR', '10-K'],
      filingDate: ['2026-02-17', '2025-02-01'],
    },
  },
}

const SAMPLE_INDEX_HTML = `
<html><body>
<a href="/Archives/edgar/data/1067983/000119312526054580/xslForm13F_X02/primary_doc.xml">cover</a>
<a href="/Archives/edgar/data/1067983/000119312526054580/xslForm13F_X02/50240.xml">infotable xsl</a>
<a href="/Archives/edgar/data/1067983/000119312526054580/50240.xml">infotable</a>
</body></html>
`

const originalFetch = globalThis.fetch
let mockFetchImpl = null

function setupFetchMock() {
  globalThis.fetch = async (url, opts) => {
    if (mockFetchImpl) return mockFetchImpl(url, opts)
    return originalFetch(url, opts)
  }
}
function teardownFetchMock() { globalThis.fetch = originalFetch }

function makeJsonResponse(body)   { return { ok: true,  json: async () => body, text: async () => JSON.stringify(body) } }
function makeTextResponse(body)   { return { ok: true,  json: async () => ({}), text: async () => body } }
function makeErrorResponse(status){ return { ok: false, status, text: async () => '', json: async () => ({}) } }

let request
let parseInfoTable

before(() => {
  setupFetchMock()
  delete require.cache[require.resolve('../../server/routes/edgar13f')]
  const router = require('../../server/routes/edgar13f')
  parseInfoTable = router.parseInfoTable

  const app = express()
  app.use(express.json())
  app.use('/api/edgar13f', router)
  request = supertest(app)
})

after(() => teardownFetchMock())

// ── parseInfoTable 유닛 테스트 ──────────────────────────────────────

describe('parseInfoTable()', () => {
  test('상위 N개만 반환하고 rank가 정확히 부여된다', () => {
    const result = parseInfoTable(SAMPLE_XML, 2)
    assert.equal(result.length, 2)
    assert.equal(result[0].rank, 1)
    assert.equal(result[1].rank, 2)
  })

  test('value 내림차순 정렬 — AAPL이 1위', () => {
    const result = parseInfoTable(SAMPLE_XML, 3)
    assert.equal(result[0].name, 'APPLE INC')
    assert.equal(result[0].value, 76_500_000_000)
  })

  test('pct 합계가 100에 가깝다', () => {
    const result = parseInfoTable(SAMPLE_XML, 3)
    const total = result.reduce((s, r) => s + r.pct, 0)
    assert.ok(Math.abs(total - 100) < 0.5, `pct sum ${total} should be ~100`)
  })

  test('putCall 필드가 파싱된다', () => {
    const result = parseInfoTable(SAMPLE_XML, 3)
    const nvda = result.find(r => r.name.includes('NVIDIA'))
    assert.ok(nvda, 'NVIDIA PUT entry expected')
    assert.equal(nvda.putCall, 'Put')
  })

  test('putCall 없는 항목은 null', () => {
    const result = parseInfoTable(SAMPLE_XML, 3)
    const aapl = result.find(r => r.name === 'APPLE INC')
    assert.equal(aapl.putCall, null)
  })

  test('shares가 파싱된다', () => {
    const result = parseInfoTable(SAMPLE_XML, 1)
    assert.equal(result[0].shares, 300_000_000)
  })

  test('빈 XML은 빈 배열 반환', () => {
    const result = parseInfoTable('<empty/>', 50)
    assert.deepEqual(result, [])
  })
})

// ── GET /api/edgar13f/institutions ────────────────────────────────

describe('GET /api/edgar13f/institutions', () => {
  test('50개 기관 목록 반환', async () => {
    const res = await request.get('/api/edgar13f/institutions')
    assert.equal(res.status, 200)
    assert.equal(res.body.length, 50)
  })

  test('각 기관에 id, name, cik, type, aum 필드 포함', async () => {
    const res = await request.get('/api/edgar13f/institutions')
    const inst = res.body[0]
    assert.ok(inst.id)
    assert.ok(inst.name)
    assert.ok(inst.cik)
    assert.ok(inst.type === 'AM' || inst.type === 'HF')
    assert.ok(typeof inst.aum === 'number' && inst.aum > 0)
  })

  test('AUM 내림차순 정렬 — BlackRock이 1위', async () => {
    const res = await request.get('/api/edgar13f/institutions')
    assert.equal(res.body[0].id, 'blackrock')
    assert.ok(res.body[0].aum >= res.body[1].aum)
  })
})

// ── GET /api/edgar13f/:cik/latest ────────────────────────────────

describe('GET /api/edgar13f/:cik/latest', () => {
  beforeEach(() => { mockFetchImpl = null })

  test('정상 응답 — holdings 배열과 filingDate 반환', async () => {
    mockFetchImpl = (url) => {
      if (url.includes('submissions/CIK')) return makeJsonResponse(SAMPLE_SUBMISSIONS)
      if (url.includes('-index.htm'))       return makeTextResponse(SAMPLE_INDEX_HTML)
      if (url.includes('50240.xml'))        return makeTextResponse(SAMPLE_XML)
      if (url.includes('xslForm'))          return makeErrorResponse(404)
      return makeErrorResponse(404)
    }
    const res = await request.get('/api/edgar13f/1067983/latest')
    assert.equal(res.status, 200)
    assert.ok(res.body.filingDate)
    assert.ok(Array.isArray(res.body.holdings))
    assert.ok(res.body.holdings.length > 0)
    assert.equal(res.body.cik, '1067983')
  })

  test('holdings 항목에 rank, name, cusip, value, shares, pct 포함', async () => {
    mockFetchImpl = (url) => {
      if (url.includes('submissions/CIK')) return makeJsonResponse(SAMPLE_SUBMISSIONS)
      if (url.includes('-index.htm'))       return makeTextResponse(SAMPLE_INDEX_HTML)
      if (url.includes('50240.xml'))        return makeTextResponse(SAMPLE_XML)
      if (url.includes('xslForm'))          return makeErrorResponse(404)
      return makeErrorResponse(404)
    }
    const res = await request.get('/api/edgar13f/1067983/latest')
    const h = res.body.holdings[0]
    assert.ok(typeof h.rank === 'number')
    assert.ok(typeof h.name === 'string')
    assert.ok(typeof h.cusip === 'string')
    assert.ok(typeof h.value === 'number')
    assert.ok(typeof h.shares === 'number')
    assert.ok(typeof h.pct === 'number')
  })

  test('일반 파일명(form13fInfoTable.xml)으로 먼저 시도', async () => {
    const triedUrls = []
    mockFetchImpl = (url) => {
      triedUrls.push(url)
      if (url.includes('submissions/CIK')) return makeJsonResponse(SAMPLE_SUBMISSIONS)
      if (url.includes('form13fInfoTable.xml')) return makeTextResponse(SAMPLE_XML)
      return makeErrorResponse(404)
    }
    // 캐시 미충돌 위해 고유 CIK 사용
    const res = await request.get('/api/edgar13f/2000001/latest')
    assert.equal(res.status, 200)
    assert.ok(triedUrls.some(u => u.includes('form13fInfoTable.xml')))
  })

  test('13F-HR 신고 없는 CIK는 500 반환', async () => {
    mockFetchImpl = () => makeJsonResponse({
      filings: { recent: { accessionNumber: [], form: ['10-K'], filingDate: [] } },
    })
    const res = await request.get('/api/edgar13f/9999999/latest')
    assert.equal(res.status, 500)
    assert.ok(res.body.error)
  })

  test('EDGAR API 오류 시 500 반환', async () => {
    mockFetchImpl = () => makeErrorResponse(503)
    // 캐시 미충돌 위해 고유 CIK 사용
    const res = await request.get('/api/edgar13f/2000002/latest')
    assert.equal(res.status, 500)
    assert.ok(res.body.error)
  })

  test('결과가 24시간 캐시된다 (두 번 호출 시 fetch 횟수 감소)', async () => {
    let callCount = 0
    mockFetchImpl = (url) => {
      callCount++
      if (url.includes('submissions/CIK')) return makeJsonResponse(SAMPLE_SUBMISSIONS)
      if (url.includes('form13fInfoTable.xml')) return makeTextResponse(SAMPLE_XML)
      return makeErrorResponse(404)
    }
    // 캐시 제거 위해 다른 CIK 사용
    await request.get('/api/edgar13f/1111111/latest')
    const firstCount = callCount
    await request.get('/api/edgar13f/1111111/latest')
    assert.equal(callCount, firstCount, '두 번째 호출은 fetch를 추가로 하지 않아야 함')
  })
})
