const { gotoMenu, fetch_json } = require('./browser')

async function collectStock(page, dates) {
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
    if (response.url().includes('getJsonData.cmd') && response.status() === 200 && !capturedBld) {
      try {
        const text = await response.text()
        const d = JSON.parse(text)
        const rows = d.output || []
        const first = rows[0] || {}
        if (rows.length > 500 && (first.TDD_CLSPRC || first.CLSPRC)) {
          capturedBld = lastReqBld
          capturedParams = lastReqParams
        }
      } catch {}
    }
  }

  page.on('request', onRequest)
  page.on('response', onResponse)
  await gotoMenu(page, 'MDC0201020105', 6000)
  page.removeListener('request', onRequest)
  page.removeListener('response', onResponse)

  if (!capturedBld) throw new Error('MDCSTAT18801 bld 캡처 실패')

  const bldSuffix = capturedBld.replace('dbms/MDC/STAT/standard/', '')
  const rawParams = capturedParams
    .replace(/bld=[^&]+&?/, '')
    .replace(/locale=[^&]+&?/, '')
    .replace(/^&+|&+$/g, '')
  const baseObj = Object.fromEntries(new URLSearchParams(rawParams))

  const result = {}
  for (const date of dates) {
    result[date] = await fetch_json(page, bldSuffix, { ...baseObj, trdDd: date })
  }

  return result
}

module.exports = { collectStock }
