const { gotoMenu, fetch_json } = require('./browser')

// KRX 데이터포털에서 직접 확인 후 교체 (Task 1)
const SHORT_BALANCE_MENU = 'MDC0201060201'  // ← 실제 menuId로 교체
const SHORT_TRADE_MENU   = 'MDC0201060101'  // ← 실제 menuId로 교체
// 전종목 응답 최소 행 수 (Task 1에서 확인, 보통 1000 이상)
const MIN_ROWS = 500

async function collectShortBalance(page, dates) {
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
      const d = JSON.parse(await response.text())
      const rows = d.output || []
      const first = rows[0] || {}
      // Task 1에서 확인한 실제 필드명으로 조건 교체
      if (rows.length > MIN_ROWS && Object.keys(first).some(k => k.toUpperCase().includes('BAL'))) {
        capturedBld = lastReqBld
        capturedParams = lastReqParams
      }
    } catch {}
  }

  page.on('request', onRequest)
  page.on('response', onResponse)
  await gotoMenu(page, SHORT_BALANCE_MENU, 6000)
  page.removeListener('request', onRequest)
  page.removeListener('response', onResponse)

  if (!capturedBld) throw new Error('[shortstock] 공매도 잔고 bld 캡처 실패')

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
    console.log(`[shortstock] 공매도 잔고 ${date}: ${rows.length}건`)
  }
  return results
}

async function collectShortTrade(page, dates) {
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
      const d = JSON.parse(await response.text())
      const rows = d.output || []
      const first = rows[0] || {}
      // Task 1에서 확인한 실제 필드명으로 조건 교체
      if (rows.length > MIN_ROWS && Object.keys(first).some(k => k.toUpperCase().includes('SHRT'))) {
        capturedBld = lastReqBld
        capturedParams = lastReqParams
      }
    } catch {}
  }

  page.on('request', onRequest)
  page.on('response', onResponse)
  await gotoMenu(page, SHORT_TRADE_MENU, 6000)
  page.removeListener('request', onRequest)
  page.removeListener('response', onResponse)

  if (!capturedBld) throw new Error('[shortstock] 공매도 거래 bld 캡처 실패')

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
    console.log(`[shortstock] 공매도 거래 ${date}: ${rows.length}건`)
  }
  return results
}

module.exports = { collectShortBalance, collectShortTrade }
