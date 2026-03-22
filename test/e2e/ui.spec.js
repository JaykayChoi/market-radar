/**
 * 브라우저 UI E2E 테스트
 * 실행: npx playwright test --config playwright.config.js
 *
 * 실제 브라우저로 http://localhost:5173 을 열어 UI 동작 검증
 */

const { test, expect } = require('@playwright/test')

// ─── 공통 헬퍼 ──────────────────────────────────────────────────────

async function goToUsMarket(page) {
  await page.goto('/')
  await page.click('button:has-text("🇺🇸 미국")')
}

// ─── 앱 기본 구조 ────────────────────────────────────────────────────

test.describe('앱 기본 구조', () => {
  test('Market Radar 헤더가 표시된다', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1')).toContainText('Market Radar')
  })

  test('🇰🇷 한국 / 🇺🇸 미국 마켓 선택 버튼이 표시된다', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('button:has-text("🇰🇷 한국")')).toBeVisible()
    await expect(page.locator('button:has-text("🇺🇸 미국")')).toBeVisible()
  })

  test('기본값은 한국 마켓이고 ETF 탭이 활성화된다', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('button:has-text("ETF 순자산변화")')).toBeVisible()
  })
})

// ─── 미국 ETF 탭 ────────────────────────────────────────────────────

test.describe('미국 ETF 탭', () => {
  test('🇺🇸 미국 클릭 시 ETF 탭이 기본으로 열린다', async ({ page }) => {
    await goToUsMarket(page)
    await expect(page.locator('button:has-text("ETF")')).toBeVisible()
    await expect(page.locator('button:has-text("매크로")')).toBeVisible()
  })

  test('ETF 탭에서 데이터 테이블이 로드된다', async ({ page }) => {
    await goToUsMarket(page)
    // 로딩 완료 대기 (최대 20초 — 실제 API 호출)
    await page.waitForSelector('[data-testid="us-etf-tab"]', { timeout: 20000 })
    await expect(page.locator('[data-testid="etf-table"]')).toBeVisible()
  })

  test('ETF 테이블에 SPY 행이 있다', async ({ page }) => {
    await goToUsMarket(page)
    await page.waitForSelector('[data-testid="etf-row-SPY"]', { timeout: 20000 })
    await expect(page.locator('[data-testid="etf-row-SPY"]')).toBeVisible()
  })

  test('ETF 테이블에 27개 행이 표시된다', async ({ page }) => {
    await goToUsMarket(page)
    await page.waitForSelector('[data-testid="etf-table"] tbody tr', { timeout: 20000 })
    const rows = page.locator('[data-testid="etf-table"] tbody tr')
    await expect(rows).toHaveCount(27)
  })

  test('카테고리 필터 — US Equity 클릭 시 5개로 줄어든다', async ({ page }) => {
    await goToUsMarket(page)
    await page.waitForSelector('[data-testid="etf-table"] tbody tr', { timeout: 20000 })
    await page.click('[data-testid="filter-US Equity"]')
    const rows = page.locator('[data-testid="etf-table"] tbody tr')
    await expect(rows).toHaveCount(5)
  })

  test('카테고리 필터 — 전체 클릭 시 27개로 복원된다', async ({ page }) => {
    await goToUsMarket(page)
    await page.waitForSelector('[data-testid="etf-table"] tbody tr', { timeout: 20000 })
    await page.click('[data-testid="filter-US Equity"]')
    await page.click('[data-testid="filter-전체"]')
    const rows = page.locator('[data-testid="etf-table"] tbody tr')
    await expect(rows).toHaveCount(27)
  })
})

// ─── 미국 13F 기관 탭 ────────────────────────────────────────────────

test.describe('미국 13F 기관 탭', () => {
  async function goTo13fTab(page) {
    await goToUsMarket(page)
    await page.click('button:has-text("13F 기관")')
    await page.waitForSelector('[data-testid="us-13f-tab"]', { timeout: 10000 })
    // 기관 목록이 API 응답 후 렌더링될 때까지 대기
    await page.waitForSelector('[data-testid="inst-blackrock"]', { timeout: 15000 })
  }

  test('13F 기관 탭 클릭 시 탭 컨텐츠가 표시된다', async ({ page }) => {
    await goTo13fTab(page)
    await expect(page.locator('[data-testid="us-13f-tab"]')).toBeVisible()
  })

  test('좌측 사이드바에 기관 버튼들이 표시된다', async ({ page }) => {
    await goTo13fTab(page)
    // BlackRock 버튼 (첫 번째 기관, AUM 최대)
    await expect(page.locator('[data-testid="inst-blackrock"]')).toBeVisible()
  })

  test('기관 클릭 시 로딩 스피너 또는 홀딩스 테이블이 나타난다', async ({ page }) => {
    await goTo13fTab(page)
    await page.click('[data-testid="inst-berkshire"]')
    // 로딩 스피너나 테이블 중 하나가 나타날 때까지 대기
    await page.waitForSelector('.animate-spin, [data-testid="holdings-table"]', { timeout: 10000 })
  })

  test('Berkshire 선택 시 홀딩스 테이블이 로드된다', async ({ page }) => {
    test.setTimeout(90000)  // SEC EDGAR 2건 fetch (전분기 비교)
    await goTo13fTab(page)
    await page.click('[data-testid="inst-berkshire"]')
    await page.waitForSelector('[data-testid="holdings-table"]', { timeout: 60000 })
    await expect(page.locator('[data-testid="holdings-table"]')).toBeVisible()
  })

  test('홀딩스 테이블에 행이 있다', async ({ page }) => {
    test.setTimeout(90000)
    await goTo13fTab(page)
    await page.click('[data-testid="inst-berkshire"]')
    await page.waitForSelector('[data-testid="holdings-table"] tbody tr', { timeout: 60000 })
    const rows = page.locator('[data-testid="holdings-table"] tbody tr')
    await expect(rows.first()).toBeVisible()
  })
})

// ─── 미국 IPO/실적 캘린더 탭 ──────────────────────────────────────────

test.describe('미국 IPO/실적 캘린더 탭', () => {
  test('캘린더 탭 클릭 시 달력이 표시된다', async ({ page }) => {
    await goToUsMarket(page)
    await page.click('button:has-text("IPO/실적 캘린더")')
    await page.waitForSelector('[data-testid="us-calendar-tab"]', { timeout: 15000 })
    await expect(page.locator('[data-testid="us-calendar-tab"]')).toBeVisible()
  })

  test('필터 버튼 (전체/IPO/실적발표)이 표시된다', async ({ page }) => {
    await goToUsMarket(page)
    await page.click('button:has-text("IPO/실적 캘린더")')
    await page.waitForSelector('[data-testid="filter-all"]', { timeout: 15000 })
    await expect(page.locator('[data-testid="filter-all"]')).toBeVisible()
    await expect(page.locator('[data-testid="filter-ipo"]')).toBeVisible()
    await expect(page.locator('[data-testid="filter-earnings"]')).toBeVisible()
  })
})

// ─── 미국 매크로 탭 ──────────────────────────────────────────────────

test.describe('미국 매크로 탭', () => {
  test('매크로 탭 클릭 시 지표 카드가 로드된다', async ({ page }) => {
    await goToUsMarket(page)
    await page.click('button:has-text("매크로")')
    await page.waitForSelector('[data-testid="us-macro-tab"]', { timeout: 20000 })
    await expect(page.locator('[data-testid="us-macro-tab"]')).toBeVisible()
  })

  test('기준금리 카드가 표시된다', async ({ page }) => {
    await goToUsMarket(page)
    await page.click('button:has-text("매크로")')
    await page.waitForSelector('[data-testid="metric-card-fed_rate"]', { timeout: 20000 })
    await expect(page.locator('[data-testid="metric-card-fed_rate"]')).toBeVisible()
  })

  test('VIX 카드가 표시된다', async ({ page }) => {
    await goToUsMarket(page)
    await page.click('button:has-text("매크로")')
    await page.waitForSelector('[data-testid="metric-card-vix"]', { timeout: 20000 })
    await expect(page.locator('[data-testid="metric-card-vix"]')).toContainText('VIX')
  })

  test('30개 이상 지표 카드가 표시된다', async ({ page }) => {
    await goToUsMarket(page)
    await page.click('button:has-text("매크로")')
    await page.waitForSelector('[data-testid^="metric-card-"]', { timeout: 20000 })
    const cards = page.locator('[data-testid^="metric-card-"]')
    const count = await cards.count()
    expect(count).toBeGreaterThanOrEqual(30)
  })
})
