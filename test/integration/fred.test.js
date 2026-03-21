/**
 * FRED API 테스트
 * 실행: node test/fred.test.js
 *
 * 환경변수 FRED_API_KEY가 .env에 설정되어 있어야 함.
 * KRX와 달리 브라우저 자동화 없이 순수 HTTP 호출로 테스트 가능.
 */

// 실행: node --env-file=.env test/fred.test.js

const FRED_BASE = 'https://api.stlouisfed.org/fred'

function getApiKey() {
  const key = process.env.FRED_API_KEY
  if (!key) throw new Error('FRED_API_KEY 환경변수 없음 — .env 확인')
  return key
}

async function fetchSeries(seriesId, limit = 3) {
  const key = getApiKey()
  const qs = new URLSearchParams({ series_id: seriesId, api_key: key, file_type: 'json', limit, sort_order: 'desc' })
  const res = await fetch(`${FRED_BASE}/series/observations?${qs}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = await res.json()
  if (json.error_message) throw new Error(json.error_message)
  return json.observations
}

// ─── 테스트 케이스 ────────────────────────────────────────────────

const TESTS = [
  // 금리
  { name: '기준금리 (DFF)',           id: 'DFF' },
  { name: '2년 국채 (GS2)',           id: 'GS2' },
  { name: '10년 국채 (GS10)',         id: 'GS10' },
  { name: '장단기 스프레드 (T10Y2Y)', id: 'T10Y2Y' },
  { name: '실질금리 TIPS 10y',        id: 'DFII10' },
  // 물가
  { name: 'CPI 전체 (CPIAUCSL)',      id: 'CPIAUCSL' },
  { name: '근원 CPI (CPILFESL)',      id: 'CPILFESL' },
  { name: '근원 PCE (PCEPILFE)',      id: 'PCEPILFE' },
  // 고용
  { name: '실업률 (UNRATE)',          id: 'UNRATE' },
  { name: '비농업 취업자수 (PAYEMS)', id: 'PAYEMS' },
  // 달러/환율
  { name: '달러 인덱스 (DTWEXBGS)',   id: 'DTWEXBGS' },
  { name: '원/달러 (DEXKOUS)',        id: 'DEXKOUS' },
  // 신용
  { name: 'HY 스프레드 (BAMLH0A0HYM2)', id: 'BAMLH0A0HYM2' },
  { name: 'IG 스프레드 (BAMLC0A0CM)',   id: 'BAMLC0A0CM' },
  // 공포지수
  { name: 'VIX (VIXCLS)',             id: 'VIXCLS' },
  // 통화량
  { name: '통화량 M2 (M2SL)',         id: 'M2SL' },
]

async function runTests() {
  console.log('=== FRED API 테스트 시작 ===\n')

  const results = await Promise.all(
    TESTS.map(async ({ name, id }) => {
      try {
        const obs = await fetchSeries(id, 1)
        const latest = obs[0]
        return { ok: true, name, id, date: latest.date, value: latest.value }
      } catch (e) {
        return { ok: false, name, id, error: e.message }
      }
    })
  )

  let passed = 0
  let failed = 0

  results.forEach(r => {
    if (r.ok) {
      console.log(`✅ ${r.name.padEnd(30)} ${String(r.value).padStart(10)}  [${r.date}]`)
      passed++
    } else {
      console.log(`❌ ${r.name.padEnd(30)} ERROR: ${r.error}`)
      failed++
    }
  })

  console.log(`\n=== 결과: ${passed}/${passed + failed} 통과 ===`)

  if (failed > 0) process.exit(1)
}

runTests().catch(e => {
  console.error('테스트 실행 실패:', e.message)
  process.exit(1)
})
