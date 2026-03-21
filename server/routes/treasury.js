const express = require('express')
const router = express.Router()

// US Treasury 공개 API — 인증 불필요
// 수익률 곡선: https://home.treasury.gov/resource-center/data-chart-center/interest-rates/
const TREASURY_XML_BASE = 'https://home.treasury.gov/resource-center/data-chart-center/interest-rates/pages/xml'

// 만기 코드 → 레이블 매핑
const MATURITIES = {
  BC_1MONTH:  '1M',
  BC_2MONTH:  '2M',
  BC_3MONTH:  '3M',
  BC_6MONTH:  '6M',
  BC_1YEAR:   '1Y',
  BC_2YEAR:   '2Y',
  BC_3YEAR:   '3Y',
  BC_5YEAR:   '5Y',
  BC_7YEAR:   '7Y',
  BC_10YEAR:  '10Y',
  BC_20YEAR:  '20Y',
  BC_30YEAR:  '30Y',
}

// TIPS 실질 수익률
const TIPS_MATURITIES = {
  TC_5YEAR:  '5Y',
  TC_7YEAR:  '7Y',
  TC_10YEAR: '10Y',
  TC_20YEAR: '20Y',
  TC_30YEAR: '30Y',
}

async function fetchYieldXml(type, yyyymm) {
  // 올바른 파라미터명: field_tdr_date_value_month (YYYYMM 형식)
  const url = `${TREASURY_XML_BASE}?data=${type}&field_tdr_date_value_month=${yyyymm}`
  const res = await fetch(url, {
    headers: { 'User-Agent': 'MarketRadar/1.0' },
  })
  if (!res.ok) throw new Error(`US Treasury 오류: ${res.status} ${res.statusText}`)
  return res.text()
}

// XML에서 수익률 데이터를 파싱 — Treasury XML 형식
// 실제 형식: <d:NEW_DATE m:type="Edm.DateTime">2026-03-02T00:00:00</d:NEW_DATE>
//            <d:BC_10YEAR m:type="Edm.Double">4.20</d:BC_10YEAR>
function parseYieldXml(xml, maturityMap) {
  const entries = []
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g
  let entryMatch
  while ((entryMatch = entryRegex.exec(xml)) !== null) {
    const block = entryMatch[1]
    const row = { date: null, rates: {} }

    // 날짜 추출 — m:type 속성 포함, T00:00:00 접미사 제거
    const dateMatch = block.match(/<d:NEW_DATE[^>]*>([\d-]+)T?[\d:]*<\/d:NEW_DATE>/)
    if (dateMatch) row.date = dateMatch[1]

    // 각 만기 수익률 추출 — m:type 속성 포함
    for (const [code, label] of Object.entries(maturityMap)) {
      const m = block.match(new RegExp(`<d:${code}[^>]*>([\\d.]+)<\\/d:${code}>`))
      row.rates[label] = m ? parseFloat(m[1]) : null
    }

    if (row.date) entries.push(row)
  }
  return entries
}

// yyyymm 문자열 생성 (기본: 현재 월)
function currentYYYYMM() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${y}${m}`
}

// GET /api/treasury/yield — 명목 국채 수익률 곡선
// query: month=YYYYMM (기본: 현재 월), limit=N (최근 N일)
router.get('/yield', async (req, res) => {
  try {
    const month = req.query.month || currentYYYYMM()
    const limit = parseInt(req.query.limit) || 30
    const xml = await fetchYieldXml('daily_treasury_yield_curve', month)
    const data = parseYieldXml(xml, MATURITIES).slice(-limit).reverse()
    res.json({ type: 'nominal', month, maturities: Object.values(MATURITIES), data })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/treasury/yield/latest — 가장 최근 수익률 곡선 (단일 행)
router.get('/yield/latest', async (req, res) => {
  try {
    const month = currentYYYYMM()
    const xml = await fetchYieldXml('daily_treasury_yield_curve', month)
    const data = parseYieldXml(xml, MATURITIES)
    if (data.length === 0) throw new Error('데이터 없음')
    const latest = data[data.length - 1]
    res.json({ type: 'nominal', ...latest })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/treasury/tips — TIPS 실질 수익률
router.get('/tips', async (req, res) => {
  try {
    const month = req.query.month || currentYYYYMM()
    const limit = parseInt(req.query.limit) || 30
    const xml = await fetchYieldXml('daily_treasury_real_yield_curve', month)
    const data = parseYieldXml(xml, TIPS_MATURITIES).slice(-limit).reverse()
    res.json({ type: 'real_tips', month, maturities: Object.values(TIPS_MATURITIES), data })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
module.exports.parseYieldXml = parseYieldXml
module.exports.MATURITIES = MATURITIES
module.exports.TIPS_MATURITIES = TIPS_MATURITIES
