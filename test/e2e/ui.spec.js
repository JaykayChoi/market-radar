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

  test('10개 지표 카드가 모두 표시된다', async ({ page }) => {
    await goToUsMarket(page)
    await page.click('button:has-text("매크로")')
    await page.waitForSelector('[data-testid^="metric-card-"]', { timeout: 20000 })
    const cards = page.locator('[data-testid^="metric-card-"]')
    await expect(cards).toHaveCount(10)
  })
})
