/**
 * US Macro 탭 E2E 테스트
 * 실행: npx playwright test --config playwright.config.js
 *
 * 전제: Express 서버가 실행 중이어야 함 (playwright.config.js webServer 설정으로 자동 기동)
 * FRED_API_KEY: playwright.config.js webServer command에 env-file로 주입
 */

const { test, expect } = require('@playwright/test')

// Vite dev 서버가 아닌 Express 백엔드만 쓰므로
// E2E는 프론트를 별도 기동하거나 여기서는 API 레벨 E2E로 진행

// ─── API Level E2E (Express 서버 직접) ───────────────────────────

test.describe('FRED API E2E', () => {
  test('GET /api/fred/keys — 시리즈 목록 반환', async ({ request }) => {
    const res = await request.get('http://localhost:3000/api/fred/keys')
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    expect(body.series).toBeDefined()
    expect(typeof body.series).toBe('object')
    expect(Object.keys(body.series).length).toBeGreaterThan(15)
  })

  test('GET /api/fred/key/fed_rate — 기준금리 최신값 반환', async ({ request }) => {
    const res = await request.get('http://localhost:3000/api/fred/key/fed_rate?limit=1')
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    expect(body.key).toBe('fed_rate')
    expect(body.series_id).toBe('DFF')
    expect(Array.isArray(body.observations)).toBeTruthy()
    expect(body.observations.length).toBeGreaterThan(0)

    const latest = body.observations[0]
    expect(latest.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(typeof latest.value === 'number' || latest.value === null).toBeTruthy()
  })

  test('GET /api/fred/key/invalid — 400 반환', async ({ request }) => {
    const res = await request.get('http://localhost:3000/api/fred/key/not_a_real_key')
    expect(res.status()).toBe(400)
    const body = await res.json()
    expect(body.error).toBeDefined()
    expect(Array.isArray(body.available)).toBeTruthy()
  })

  test('GET /api/fred/series/GS10 — 10년 국채 수익률 반환', async ({ request }) => {
    const res = await request.get('http://localhost:3000/api/fred/series/GS10?limit=3')
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    expect(body.series_id).toBe('GS10')
    expect(body.observations.length).toBeGreaterThan(0)
    const val = body.observations[0].value
    expect(typeof val === 'number' || val === null).toBeTruthy()
    if (val !== null) expect(val).toBeGreaterThan(0)
  })

  test('GET /api/fred/multi — 핵심 10개 지표 동시 반환', async ({ request }) => {
    const keys = 'fed_rate,t2y,t10y,spread_10y2y,vix,hy_spread,usdkrw,dxy,unemployment,core_pce'
    const res = await request.get(`http://localhost:3000/api/fred/multi?keys=${keys}`)
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    expect(Array.isArray(body.data)).toBeTruthy()
    expect(body.data.length).toBe(10)

    for (const item of body.data) {
      expect(item.key).toBeDefined()
      expect(item.series_id).toBeDefined()
      if (!item.error) {
        expect(item.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
        expect(typeof item.value === 'number' || item.value === null).toBeTruthy()
      }
    }
  })

  test('GET /api/fred/multi — keys 없으면 400', async ({ request }) => {
    const res = await request.get('http://localhost:3000/api/fred/multi')
    expect(res.status()).toBe(400)
  })

  test('value가 "."이면 null로 반환된다 (실제 데이터 없으면 skip)', async ({ request }) => {
    // T10Y2Y는 실제 데이터가 있으므로 null이 아닌 숫자이거나 null 둘 다 허용
    const res = await request.get('http://localhost:3000/api/fred/series/T10Y2Y?limit=1')
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    const val = body.observations[0]?.value
    expect(typeof val === 'number' || val === null).toBeTruthy()
    expect(val).not.toBe('.')  // "." 문자열이 내려오면 안 됨
  })

  test('여러 시리즈 병렬 조회 응답시간이 3초 이내', async ({ request }) => {
    const keys = 'fed_rate,vix,hy_spread,usdkrw,unemployment'
    const start = Date.now()
    const res = await request.get(`http://localhost:3000/api/fred/multi?keys=${keys}`)
    const elapsed = Date.now() - start
    expect(res.ok()).toBeTruthy()
    expect(elapsed).toBeLessThan(3000)
  })
})
