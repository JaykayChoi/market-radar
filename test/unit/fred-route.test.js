/**
 * FRED 라우트 유닛 테스트
 * 실행: node --env-file=.env --test test/unit/fred-route.test.js
 *
 * fetch를 mock하여 외부 API 호출 없이 라우트 로직을 검증한다.
 */

const { test, describe, before, after, mock } = require('node:test')
const assert = require('node:assert/strict')
const express = require('express')
const supertest = require('supertest')

// ─── fetch mock 설정 ──────────────────────────────────────────────

let mockFetchImpl = null

// global fetch를 intercept
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

function makeFredResponse(observations) {
  return {
    ok: true,
    json: async () => ({ observations }),
  }
}

function makeErrorResponse(status, text) {
  return { ok: false, status, statusText: text, json: async () => ({}) }
}

// ─── 앱 셋업 ─────────────────────────────────────────────────────

let app
let request

before(() => {
  setupFetchMock()
  process.env.FRED_API_KEY = 'test-key-1234'

  app = express()
  app.use(express.json())
  // 모듈 캐시 제거 후 재로드 (환경변수 반영)
  delete require.cache[require.resolve('../../server/routes/fred')]
  app.use('/api/fred', require('../../server/routes/fred'))
  request = supertest(app)
})

after(() => {
  teardownFetchMock()
})

// ─── GET /api/fred/keys ───────────────────────────────────────────

describe('GET /api/fred/keys', () => {
  test('시리즈 별칭 목록 전체를 반환한다', async () => {
    const res = await request.get('/api/fred/keys')
    assert.equal(res.status, 200)
    assert.ok(res.body.series, 'series 키가 존재해야 함')
    assert.ok('fed_rate' in res.body.series)
    assert.ok('vix' in res.body.series)
    assert.ok('hy_spread' in res.body.series)
    assert.ok(Object.keys(res.body.series).length >= 20, '20개 이상의 시리즈 정의')
  })
})

// ─── GET /api/fred/key/:name ──────────────────────────────────────

describe('GET /api/fred/key/:name', () => {
  test('유효한 별칭으로 observations 반환', async () => {
    mockFetchImpl = () => makeFredResponse([
      { date: '2026-03-19', value: '3.64', realtime_start: '2026-03-20', realtime_end: '2026-03-20' },
    ])
    const res = await request.get('/api/fred/key/fed_rate')
    assert.equal(res.status, 200)
    assert.equal(res.body.key, 'fed_rate')
    assert.equal(res.body.series_id, 'DFF')
    assert.ok(Array.isArray(res.body.observations))
    assert.equal(res.body.observations[0].value, 3.64)
  })

  test('유효하지 않은 별칭은 400 반환', async () => {
    const res = await request.get('/api/fred/key/not_a_real_key')
    assert.equal(res.status, 400)
    assert.ok(res.body.error)
    assert.ok(Array.isArray(res.body.available))
  })

  test('FRED "." 값은 null로 변환된다', async () => {
    mockFetchImpl = () => makeFredResponse([
      { date: '2026-03-19', value: '.', realtime_start: '2026-03-20', realtime_end: '2026-03-20' },
    ])
    const res = await request.get('/api/fred/key/vix')
    assert.equal(res.status, 200)
    assert.equal(res.body.observations[0].value, null)
  })

  test('FRED API 실패 시 500 반환', async () => {
    mockFetchImpl = () => makeErrorResponse(503, 'Service Unavailable')
    const res = await request.get('/api/fred/key/fed_rate')
    assert.equal(res.status, 500)
    assert.ok(res.body.error)
  })

  test('query 파라미터 limit, sort_order 전달', async () => {
    let capturedUrl = ''
    mockFetchImpl = (url) => {
      capturedUrl = url
      return makeFredResponse([{ date: '2026-01-01', value: '5.00', realtime_start: '', realtime_end: '' }])
    }
    await request.get('/api/fred/key/fed_rate?limit=5&sort_order=asc')
    assert.ok(capturedUrl.includes('limit=5'))
    assert.ok(capturedUrl.includes('sort_order=asc'))
  })
})

// ─── GET /api/fred/series/:id ─────────────────────────────────────

describe('GET /api/fred/series/:id', () => {
  test('시리즈 ID로 observations 반환', async () => {
    mockFetchImpl = () => makeFredResponse([
      { date: '2026-03-19', value: '4.13', realtime_start: '2026-03-20', realtime_end: '2026-03-20' },
    ])
    const res = await request.get('/api/fred/series/GS10')
    assert.equal(res.status, 200)
    assert.equal(res.body.series_id, 'GS10')
    assert.ok(Array.isArray(res.body.observations))
    assert.equal(res.body.observations[0].value, 4.13)
  })

  test('"." 값은 null로 변환된다', async () => {
    mockFetchImpl = () => makeFredResponse([
      { date: '2026-03-19', value: '.', realtime_start: '', realtime_end: '' },
    ])
    const res = await request.get('/api/fred/series/GS10')
    assert.equal(res.body.observations[0].value, null)
  })

  test('FRED API 실패 시 500 반환', async () => {
    mockFetchImpl = () => makeErrorResponse(500, 'Internal Server Error')
    const res = await request.get('/api/fred/series/GS10')
    assert.equal(res.status, 500)
  })
})

// ─── GET /api/fred/multi ──────────────────────────────────────────

describe('GET /api/fred/multi', () => {
  test('keys 없으면 400 반환', async () => {
    const res = await request.get('/api/fred/multi')
    assert.equal(res.status, 400)
    assert.ok(res.body.error)
  })

  test('유효한 keys로 각 시리즈 최신값 반환', async () => {
    const callCount = { n: 0 }
    mockFetchImpl = () => {
      callCount.n++
      return makeFredResponse([
        { date: '2026-03-19', value: '3.64', realtime_start: '', realtime_end: '' },
      ])
    }
    const res = await request.get('/api/fred/multi?keys=fed_rate,vix')
    assert.equal(res.status, 200)
    assert.ok(Array.isArray(res.body.data))
    assert.equal(res.body.data.length, 2)
    assert.equal(callCount.n, 2)

    const fedRate = res.body.data.find(d => d.key === 'fed_rate')
    assert.ok(fedRate)
    assert.equal(fedRate.value, 3.64)
  })

  test('알 수 없는 key는 error 필드 포함', async () => {
    mockFetchImpl = () => makeFredResponse([
      { date: '2026-03-19', value: '24.06', realtime_start: '', realtime_end: '' },
    ])
    const res = await request.get('/api/fred/multi?keys=vix,bad_key_xyz')
    assert.equal(res.status, 200)
    const bad = res.body.data.find(d => d.key === 'bad_key_xyz')
    assert.ok(bad)
    assert.ok(bad.error)
  })

  test('일부 시리즈 FRED 실패 시 해당 항목만 error 포함', async () => {
    let n = 0
    mockFetchImpl = () => {
      n++
      if (n === 1) return makeFredResponse([{ date: '2026-03-19', value: '3.64', realtime_start: '', realtime_end: '' }])
      return makeErrorResponse(503, 'Service Unavailable')
    }
    const res = await request.get('/api/fred/multi?keys=fed_rate,vix')
    assert.equal(res.status, 200)
    const failed = res.body.data.find(d => d.key === 'vix')
    assert.ok(failed.error)
  })

  test('"." 값은 null로 변환된다', async () => {
    mockFetchImpl = () => makeFredResponse([
      { date: '2026-03-19', value: '.', realtime_start: '', realtime_end: '' },
    ])
    const res = await request.get('/api/fred/multi?keys=fed_rate')
    assert.equal(res.body.data[0].value, null)
  })
})

// ─── FRED_API_KEY 없는 경우 ───────────────────────────────────────

describe('FRED_API_KEY 미설정', () => {
  test('API 키 없으면 500 반환', async () => {
    const saved = process.env.FRED_API_KEY
    delete process.env.FRED_API_KEY

    // 모듈 캐시 제거 후 재로드
    delete require.cache[require.resolve('../../server/routes/fred')]
    const noKeyApp = express()
    noKeyApp.use('/api/fred', require('../../server/routes/fred'))
    const noKeyRequest = supertest(noKeyApp)

    const res = await noKeyRequest.get('/api/fred/key/fed_rate')
    assert.equal(res.status, 500)
    assert.ok(res.body.error.includes('FRED_API_KEY'))

    process.env.FRED_API_KEY = saved
  })
})
