const { chromium } = require('playwright')
const path = require('path')

const PROFILE_DIR = path.join(process.cwd(), 'browser_profile')

let browser = null
let page = null

async function getBrowser() {
  if (!browser) {
    browser = await chromium.launchPersistentContext(PROFILE_DIR, {
      headless: false,
      args: ['--no-sandbox']
    })
  }
  return browser
}

async function getPage() {
  const ctx = await getBrowser()
  if (!page || page.isClosed()) {
    page = ctx.pages()[0] || await ctx.newPage()
  }
  return page
}

function isLoggedIn(url) {
  return url.includes('data.krx.co.kr') && !url.includes('COMS') && !url.includes('nid.naver')
}

async function waitForLoginInPlace(pg) {
  const MAX_WAIT = 3 * 60 * 1000
  const start = Date.now()
  let i = 0
  while (Date.now() - start < MAX_WAIT) {
    await pg.waitForTimeout(5000)
    const cur = pg.url()
    if (isLoggedIn(cur)) {
      console.log('[browser] 로그인 완료!')
      return
    }
    console.log(`[browser] 로그인 대기 중... (${++i * 5}초)`)
  }
  throw new Error('KRX 로그인 대기 시간 초과 (3분)')
}

async function ensureLoggedIn(pg) {
  await pg.goto('https://data.krx.co.kr/contents/MDC/MAIN/main/index.cmd',
    { timeout: 30000, waitUntil: 'networkidle' })
  await pg.waitForTimeout(3000)

  const url = pg.url()
  if (isLoggedIn(url)) return

  console.log('[browser] 로그인 필요 - 브라우저에서 로그인해 주세요.')
  if (!url.includes('data.krx.co.kr') || url.includes('nid.naver')) {
    await pg.goto('https://data.krx.co.kr/contents/MDC/COMS/client/MDCCOMS001.cmd',
      { timeout: 30000, waitUntil: 'networkidle' })
  }
  await waitForLoginInPlace(pg)
}

async function gotoMenu(pg, menuId, waitMs = 8000) {
  await pg.goto(
    `https://data.krx.co.kr/contents/MDC/MDI/mdiLoader/index.cmd?menuId=${menuId}`,
    { timeout: 30000, waitUntil: 'networkidle' }
  )
  await pg.waitForTimeout(waitMs)

  if (!isLoggedIn(pg.url())) {
    console.log('[browser] 세션 만료 - 브라우저에서 로그인해 주세요...')
    const cur = pg.url()
    if (!cur.includes('data.krx.co.kr') || cur.includes('nid.naver')) {
      await pg.goto('https://data.krx.co.kr/contents/MDC/COMS/client/MDCCOMS001.cmd',
        { timeout: 30000, waitUntil: 'networkidle' })
    }
    await waitForLoginInPlace(pg)
    await pg.goto(
      `https://data.krx.co.kr/contents/MDC/MDI/mdiLoader/index.cmd?menuId=${menuId}`,
      { timeout: 30000, waitUntil: 'networkidle' }
    )
    await pg.waitForTimeout(waitMs)
  }
}

async function fetch_json(pg, bld, params) {
  // bld가 이미 full path('dbms/'로 시작)이면 그대로, 아니면 standard prefix 붙임
  const fullBld = bld.startsWith('dbms/') ? bld : `dbms/MDC/STAT/standard/${bld}`
  const result = await pg.evaluate(async ({ fullBld, params }) => {
    const parts = [`bld=${fullBld}`, 'locale=ko_KR']
    for (const [k, v] of Object.entries(params)) {
      parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    }
    const res = await fetch('/comm/bldAttendant/getJsonData.cmd', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: parts.join('&')
    })
    const text = await res.text()
    try {
      const d = JSON.parse(text)
      // 응답 루트 키가 'output' 또는 'OutBlock_1'인 경우 모두 처리
      return { output: d.output || d.OutBlock_1 || [], error: null }
    } catch (e) {
      return { output: [], error: e.toString() }
    }
  }, { fullBld, params })
  if (result.error) console.warn('[fetch_json] parse error:', result.error)
  return result.output || []
}

async function closePage() {
  if (page && !page.isClosed()) {
    await page.close()
  }
  page = null
}

async function closeBrowser() {
  await closePage()
  if (browser) {
    await browser.close()
    browser = null
  }
}

module.exports = { getPage, ensureLoggedIn, gotoMenu, fetch_json, closePage, closeBrowser }
