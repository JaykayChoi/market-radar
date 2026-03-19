const { gotoMenu, fetch_json } = require('./browser')

async function collectIndustry(page, dates) {
  let capturedBld = null
  let capturedParams = null

  const onRequest = (request) => {
    if (request.url().includes('getJsonData.cmd') && request.postData() && !capturedBld) {
      const m = request.postData().match(/bld=([^&]+)/)
      if (m) {
        capturedBld = m[1]
        capturedParams = request.postData()
      }
    }
  }

  page.on('request', onRequest)
  await gotoMenu(page, 'MDC0201010101', 6000)
  page.removeListener('request', onRequest)

  const bldSuffix = (capturedBld || 'MDCSTAT01901').replace('dbms/MDC/STAT/standard/', '')
  const baseObj = capturedParams
    ? Object.fromEntries(new URLSearchParams(
        capturedParams
          .replace(/bld=[^&]+&?/, '')
          .replace(/locale=[^&]+&?/, '')
          .replace(/^&+|&+$/g, '')
      ))
    : {}

  const result = {}
  for (const date of dates) {
    result[date] = await fetch_json(page, bldSuffix, { ...baseObj, trdDd: date })
  }

  return result
}

module.exports = { collectIndustry }
