const { gotoMenu, fetch_json } = require('./browser')

const DEFAULT_TYPES = [
  { code: '1000', label: '금융투자' },
  { code: '2000', label: '보험' },
  { code: '3000', label: '투신' },
  { code: '3100', label: '사모' },
  { code: '4000', label: '은행' },
  { code: '5000', label: '기타금융' },
  { code: '6000', label: '연기금 등' },
  { code: '7050', label: '기관합계' },
  { code: '7100', label: '기타법인' },
  { code: '8000', label: '개인' },
  { code: '9000', label: '외국인' },
  { code: '9001', label: '기타외국인' },
  { code: '9999', label: '전체' },
]

async function collectForeign(page, startDate, endDate) {
  let capturedBld = null
  let capturedParams = null

  const onRequest = (request) => {
    if (request.url().includes('getJsonData.cmd') && request.postData()) {
      const m = request.postData().match(/bld=([^&]+)/)
      if (m && m[1].includes('MDCSTAT02401') && !capturedBld) {
        capturedBld = m[1]
        capturedParams = request.postData()
      }
    }
  }

  page.on('request', onRequest)
  await gotoMenu(page, 'MDC0201020303', 6000)
  page.removeListener('request', onRequest)

  if (!capturedBld) throw new Error('MDCSTAT02401 bld 캡처 실패')

  // 페이지에서 투자자구분 select 옵션 자동 추출
  const extractedTypes = await page.evaluate(() => {
    const selects = Array.from(document.querySelectorAll('select'))
    for (const sel of selects) {
      const options = Array.from(sel.options).filter(o => o.value)
      if (options.some(o => o.value === '9000' || o.value === '3000')) {
        return options.map(o => ({ code: o.value, label: o.text.trim() }))
      }
    }
    return null
  })

  const investorTypes = extractedTypes || DEFAULT_TYPES
  console.log(`[foreign] 투자자구분 목록: ${investorTypes.map(t => `${t.code}:${t.label}`).join(', ')}`)

  const bldSuffix = capturedBld.replace('dbms/MDC/STAT/standard/', '')
  const rawParams = capturedParams
    .replace(/bld=[^&]+&?/, '')
    .replace(/locale=[^&]+&?/, '')
    .replace(/^&+|&+$/g, '')
  const baseObj = Object.fromEntries(new URLSearchParams(rawParams))

  const results = {}
  for (const type of investorTypes) {
    const rows = await fetch_json(page, bldSuffix, {
      ...baseObj, strtDd: startDate, endDd: endDate, invstTpCd: type.code
    })
    results[type.code] = { label: type.label, rows }
    console.log(`[foreign] ${startDate}~${endDate} ${type.label}(${type.code}): ${rows.length}건`)
  }

  return { investorTypes, results }
}

module.exports = { collectForeign }
