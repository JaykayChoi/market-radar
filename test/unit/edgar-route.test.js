/**
 * SEC EDGAR 라우트 유닛 테스트
 * 실행: node --test test/unit/edgar-route.test.js
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
let { padCik } = {}

before(() => {
  setupFetchMock()
  const app = express()
  app.use(express.json())
  delete require.cache[require.resolve('../../server/routes/edgar')]
  const edgar = require('../../server/routes/edgar')
  padCik = edgar.padCik
  app.use('/api/edgar', edgar)
  request = supertest(app)
})

after(() => teardownFetchMock())

describe('padCik 유틸리티', () => {
  test('숫자 CIK를 10자리 zero-padding으로 변환', () => {
    const edgar = require('../../server/routes/edgar')
    assert.equal(edgar.padCik('320193'), '0000320193')
    assert.equal(edgar.padCik('1067983'), '0001067983')
    assert.equal(edgar.padCik('0000320193'), '0000320193')
  })
})

describe('GET /api/edgar/company/:cik', () => {
  test('회사 공시 목록 반환', async () => {
    mockFetchImpl = (url) => {
      assert.ok(url.includes('CIK0000320193'))
      return makeOkResponse({
        name: 'Apple Inc.',
        cik: '0000320193',
        sic: '3674',
        sicDescription: 'Semiconductors',
        filings: {
          recent: {
            accessionNumber: ['0001193125-26-001234'],
            filingDate: ['2026-01-15'],
            form: ['10-Q'],
            primaryDocument: ['aapl-20251228.htm'],
          },
        },
      })
    }
    const res = await request.get('/api/edgar/company/320193')
    assert.equal(res.status, 200)
    assert.equal(res.body.name, 'Apple Inc.')
    assert.equal(res.body.cik, '0000320193')
    assert.ok(res.body.filings)
  })

  test('EDGAR API 실패 시 500 반환', async () => {
    mockFetchImpl = () => makeErrorResponse(404, 'Not Found')
    const res = await request.get('/api/edgar/company/9999999')
    assert.equal(res.status, 500)
    assert.ok(res.body.error)
  })

  test('User-Agent 헤더 전달 확인', async () => {
    let capturedHeaders = null
    mockFetchImpl = (url, opts) => {
      capturedHeaders = opts?.headers
      return makeOkResponse({ name: 'Test', filings: { recent: {} } })
    }
    await request.get('/api/edgar/company/320193')
    assert.ok(capturedHeaders?.['User-Agent'])
  })
})

describe('GET /api/edgar/facts/:cik', () => {
  test('XBRL 재무 데이터 반환', async () => {
    mockFetchImpl = () => makeOkResponse({
      entityName: 'Apple Inc.',
      facts: { 'us-gaap': { NetIncomeLoss: { label: 'Net Income (Loss)' } } },
    })
    const res = await request.get('/api/edgar/facts/320193')
    assert.equal(res.status, 200)
    assert.equal(res.body.entityName, 'Apple Inc.')
    assert.ok(res.body.facts)
  })
})

describe('GET /api/edgar/concept/:cik/:taxonomy/:concept', () => {
  test('특정 재무 항목 조회', async () => {
    mockFetchImpl = (url) => {
      assert.ok(url.includes('us-gaap/NetIncomeLoss'))
      return makeOkResponse({ label: 'Net Income (Loss)', units: { USD: [] } })
    }
    const res = await request.get('/api/edgar/concept/320193/us-gaap/NetIncomeLoss')
    assert.equal(res.status, 200)
    assert.ok(res.body.label)
  })
})
