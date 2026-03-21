/**
 * BLS 라우트 유닛 테스트
 * 실행: node --env-file=.env --test test/unit/bls-route.test.js
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

function makeBlsResponse(seriesIds, values) {
  return {
    ok: true,
    json: async () => ({
      status: 'REQUEST_SUCCEEDED',
      Results: {
        series: seriesIds.map((id, i) => ({
          seriesID: id,
          data: [{ year: '2026', period: 'M02', value: String(values[i] ?? '3.5') }],
        })),
      },
    }),
  }
}

function makeErrorResponse(status, text) {
  return { ok: false, status, statusText: text, json: async () => ({}) }
}

let request

before(() => {
  setupFetchMock()
  process.env.BLS_API_KEY = 'test-bls-key'

  const app = express()
  app.use(express.json())
  delete require.cache[require.resolve('../../server/routes/bls')]
  app.use('/api/bls', require('../../server/routes/bls'))
  request = supertest(app)
})

after(() => teardownFetchMock())

describe('GET /api/bls/keys', () => {
  test('시리즈 별칭 목록을 반환한다', async () => {
    const res = await request.get('/api/bls/keys')
    assert.equal(res.status, 200)
    assert.ok(res.body.series)
    assert.ok('cpi' in res.body.series)
    assert.ok('nfp' in res.body.series)
    assert.ok('unemployment' in res.body.series)
  })
})

describe('GET /api/bls/key/:name', () => {
  test('유효한 키로 시리즈 데이터 반환', async () => {
    mockFetchImpl = (url, opts) => {
      const body = JSON.parse(opts.body)
      return makeBlsResponse(body.seriesid, [3.9])
    }
    const res = await request.get('/api/bls/key/unemployment')
    assert.equal(res.status, 200)
    assert.equal(res.body.key, 'unemployment')
    assert.ok(res.body.series_id)
    assert.ok(Array.isArray(res.body.data))
    assert.equal(res.body.data[0].value, '3.9')
  })

  test('유효하지 않은 키는 400 반환', async () => {
    const res = await request.get('/api/bls/key/not_a_key')
    assert.equal(res.status, 400)
    assert.ok(res.body.error)
    assert.ok(Array.isArray(res.body.available))
  })

  test('BLS API 실패 시 500 반환', async () => {
    mockFetchImpl = () => makeErrorResponse(503, 'Service Unavailable')
    const res = await request.get('/api/bls/key/cpi')
    assert.equal(res.status, 500)
    assert.ok(res.body.error)
  })

  test('startyear/endyear 파라미터 전달', async () => {
    let capturedBody = null
    mockFetchImpl = (url, opts) => {
      capturedBody = JSON.parse(opts.body)
      return makeBlsResponse(capturedBody.seriesid, [315])
    }
    await request.get('/api/bls/key/cpi?startyear=2023&endyear=2026')
    assert.equal(capturedBody.startyear, '2023')
    assert.equal(capturedBody.endyear, '2026')
  })
})

describe('GET /api/bls/multi', () => {
  test('keys 없으면 400 반환', async () => {
    const res = await request.get('/api/bls/multi')
    assert.equal(res.status, 400)
    assert.ok(res.body.error)
  })

  test('여러 키로 최신값 반환', async () => {
    mockFetchImpl = (url, opts) => {
      const body = JSON.parse(opts.body)
      return makeBlsResponse(body.seriesid, [315.0, 142000])
    }
    const res = await request.get('/api/bls/multi?keys=cpi,nfp')
    assert.equal(res.status, 200)
    assert.ok(Array.isArray(res.body.data))
    assert.equal(res.body.data.length, 2)
  })

  test('알 수 없는 키는 error 포함', async () => {
    mockFetchImpl = (url, opts) => {
      const body = JSON.parse(opts.body)
      return makeBlsResponse(body.seriesid, [3.9])
    }
    const res = await request.get('/api/bls/multi?keys=unemployment,bad_key')
    assert.equal(res.status, 200)
    const bad = res.body.data.find(d => d.key === 'bad_key')
    assert.ok(bad?.error)
  })

  test('입력 순서 유지', async () => {
    mockFetchImpl = (url, opts) => {
      const body = JSON.parse(opts.body)
      return makeBlsResponse(body.seriesid, [3.9, 315.0])
    }
    const res = await request.get('/api/bls/multi?keys=unemployment,cpi')
    assert.equal(res.status, 200)
    assert.equal(res.body.data[0].key, 'unemployment')
    assert.equal(res.body.data[1].key, 'cpi')
  })
})

describe('BLS_API_KEY 미설정', () => {
  test('API 키 없으면 500 반환', async () => {
    const saved = process.env.BLS_API_KEY
    delete process.env.BLS_API_KEY
    delete require.cache[require.resolve('../../server/routes/bls')]
    const noKeyApp = express()
    noKeyApp.use('/api/bls', require('../../server/routes/bls'))
    const res = await supertest(noKeyApp).get('/api/bls/key/cpi')
    assert.equal(res.status, 500)
    assert.ok(res.body.error.includes('BLS_API_KEY'))
    process.env.BLS_API_KEY = saved
  })
})
