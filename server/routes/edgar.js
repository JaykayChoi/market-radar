const express = require('express')
const router = express.Router()

const EDGAR_BASE = 'https://data.sec.gov'

// User-Agent 헤더 필수 (SEC 요구사항)
const HEADERS = {
  'User-Agent': 'MarketRadar contact@marketradar.local',
  'Accept-Encoding': 'gzip, deflate',
}

// CIK를 10자리 zero-padding 문자열로 변환
function padCik(cik) {
  return String(cik).replace(/^0+/, '').padStart(10, '0')
}

async function edgarGet(path) {
  const res = await fetch(`${EDGAR_BASE}${path}`, { headers: HEADERS })
  if (!res.ok) throw new Error(`SEC EDGAR 오류: ${res.status} ${res.statusText}`)
  return res.json()
}

// GET /api/edgar/company/:cik — 회사 공시 목록
// :cik — 숫자 CIK (예: 320193 = Apple, 1067983 = Berkshire)
router.get('/company/:cik', async (req, res) => {
  try {
    const cik = padCik(req.params.cik)
    const data = await edgarGet(`/submissions/CIK${cik}.json`)
    // 응답 크기 절감: 최신 공시 50개만 반환
    const recent = data.filings?.recent
    const filings = recent ? {
      accessionNumber: recent.accessionNumber?.slice(0, 50),
      filingDate:      recent.filingDate?.slice(0, 50),
      form:            recent.form?.slice(0, 50),
      primaryDocument: recent.primaryDocument?.slice(0, 50),
    } : null
    res.json({
      cik,
      name:     data.name,
      sic:      data.sic,
      sicDesc:  data.sicDescription,
      filings,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/edgar/facts/:cik — XBRL 재무 데이터 전체
router.get('/facts/:cik', async (req, res) => {
  try {
    const cik = padCik(req.params.cik)
    const data = await edgarGet(`/api/xbrl/companyfacts/CIK${cik}.json`)
    res.json({ cik, entityName: data.entityName, facts: data.facts })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/edgar/concept/:cik/:taxonomy/:concept
// 특정 재무 항목만 조회 (예: /0000320193/us-gaap/NetIncomeLoss)
// taxonomy: us-gaap, dei, ifrs-full 등
router.get('/concept/:cik/:taxonomy/:concept', async (req, res) => {
  try {
    const cik = padCik(req.params.cik)
    const { taxonomy, concept } = req.params
    const data = await edgarGet(`/api/xbrl/companyconcept/CIK${cik}/${taxonomy}/${concept}.json`)
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
module.exports.padCik = padCik
