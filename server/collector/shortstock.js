const { gotoMenu, fetch_json } = require('./browser')

const SHORT_TRADE_MENU   = 'MDC02030204'  // MDCSTAT30401 공매도 거래 상위 50
const SHORT_BALANCE_MENU = 'MDC02030304'  // MDCSTAT30801 공매도 순보유 잔고 상위 50

async function _captureMenu(page, menuId, bldPattern, label) {
  let capturedBld = null
  let capturedParams = null
  let lastReqBld = null
  let lastReqParams = null

  const onRequest = (request) => {
    if (request.url().includes('getJsonData.cmd') && request.postData()) {
      const m = request.postData().match(/bld=([^&]+)/)
      if (m) {
        lastReqBld = decodeURIComponent(m[1])
        lastReqParams = request.postData()
      }
    }
  }

  const onResponse = async (response) => {
    if (!response.url().includes('getJsonData.cmd') || capturedBld) return
    if (lastReqBld && lastReqBld.includes(bldPattern)) {
      capturedBld = lastReqBld
      capturedParams = lastReqParams
    }
  }

  page.on('request', onRequest)
  page.on('response', onResponse)
  await gotoMenu(page, menuId, 6000)
  page.removeListener('request', onRequest)
  page.removeListener('response', onResponse)

  if (!capturedBld) throw new Error(`[shortstock] ${label} bld 캡처 실패 (${bldPattern} 없음)`)

  const baseObj = Object.fromEntries(
    new URLSearchParams(
      capturedParams
        .replace(/bld=[^&]+&?/, '')
        .replace(/locale=[^&]+&?/, '')
        .replace(/^&+|&+$/g, '')
    )
  )
  return { capturedBld, baseObj }
}

async function collectShortTrade(page, dates) {
  const { capturedBld, baseObj } = await _captureMenu(
    page, SHORT_TRADE_MENU, 'MDCSTAT304', '공매도 거래'
  )

  const results = {}
  for (const date of dates) {
    const kospi  = await fetch_json(page, capturedBld, { ...baseObj, trdDd: date, mktTpCd: '1' })
    const kosdaq = await fetch_json(page, capturedBld, { ...baseObj, trdDd: date, mktTpCd: '2' })
    results[date] = [...kospi, ...kosdaq]
    console.log(`[shortstock] 공매도 거래 ${date}: 코스피 ${kospi.length}건, 코스닥 ${kosdaq.length}건`)
  }
  return results
}

async function collectShortBalance(page, dates) {
  const { capturedBld, baseObj } = await _captureMenu(
    page, SHORT_BALANCE_MENU, 'MDCSTAT308', '공매도 잔고'
  )

  const results = {}
  for (const date of dates) {
    const kospi  = await fetch_json(page, capturedBld, { ...baseObj, trdDd: date, mktTpCd: '1' })
    const kosdaq = await fetch_json(page, capturedBld, { ...baseObj, trdDd: date, mktTpCd: '2' })
    results[date] = [...kospi, ...kosdaq]
    console.log(`[shortstock] 공매도 잔고 ${date}: 코스피 ${kospi.length}건, 코스닥 ${kosdaq.length}건`)
  }
  return results
}

module.exports = { collectShortBalance, collectShortTrade }
