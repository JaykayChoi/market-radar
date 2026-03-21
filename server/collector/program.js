const { gotoMenu, fetch_json } = require('./browser')

// discover_krx_menus.js 탐색으로 확인된 실제 menuId
// MDC0201020305 → MDCSTAT02601 (프로그램매매 차익/비차익, 3행)
const PROGRAM_MENU = 'MDC0201020305'
const MIN_ROWS = 0

async function collectProgramTrade(page, dates) {
  let capturedBld = null
  let capturedParams = null
  let lastReqBld = null
  let lastReqParams = null

  const onRequest = (request) => {
    if (request.url().includes('getJsonData.cmd') && request.postData()) {
      const m = request.postData().match(/bld=([^&]+)/)
      if (m) {
        lastReqBld = m[1]
        lastReqParams = request.postData()
      }
    }
  }

  const onResponse = async (response) => {
    if (!response.url().includes('getJsonData.cmd') || capturedBld) return
    try {
      // MDCSTAT02601 코드가 포함된 bld이면 캡처
      if (lastReqBld && lastReqBld.includes('MDCSTAT026')) {
        capturedBld = lastReqBld
        capturedParams = lastReqParams
      }
    } catch {}
  }

  page.on('request', onRequest)
  page.on('response', onResponse)
  await gotoMenu(page, PROGRAM_MENU, 6000)
  page.removeListener('request', onRequest)
  page.removeListener('response', onResponse)

  if (!capturedBld) throw new Error('[program] 프로그램매매 bld 캡처 실패 (MDCSTAT026xx 없음)')

  const bldSuffix = capturedBld.replace('dbms/MDC/STAT/standard/', '')
  const baseObj = Object.fromEntries(
    new URLSearchParams(
      capturedParams
        .replace(/bld=[^&]+&?/, '')
        .replace(/locale=[^&]+&?/, '')
        .replace(/^&+|&+$/g, '')
    )
  )

  const results = {}
  for (const date of dates) {
    const rows = await fetch_json(page, bldSuffix, { ...baseObj, trdDd: date })
    results[date] = rows
    console.log(`[program] 프로그램 순매수 ${date}: ${rows.length}건`)
  }
  return results
}

module.exports = { collectProgramTrade }
