const express = require('express')
const router = express.Router()

const BEA_BASE = 'https://apps.bea.gov/api/data'

// 주요 NIPA 테이블 (National Income and Product Accounts)
const TABLES = {
  gdp:              { name: 'T10101', desc: '실질 GDP 및 구성항목 (분기 변화율)' },
  gdp_nominal:      { name: 'T10105', desc: '명목 GDP (분기, 십억달러)' },
  pce:              { name: 'T20305', desc: '개인소비지출 (PCE) 구성 항목' },
  corporate_profit: { name: 'T11300', desc: '법인 세전 이익' },
  trade_balance:    { name: 'T40100', desc: '경상수지 — 무역/서비스/소득' },
  disposable_income:{ name: 'T20100', desc: '가처분 개인소득 및 저축률' },
}

function getApiKey() {
  const key = process.env.BEA_API_KEY
  if (!key) throw new Error('BEA_API_KEY 환경변수가 설정되지 않았습니다.')
  return key
}

async function beaGet(params = {}) {
  const UserID = getApiKey()
  const qs = new URLSearchParams({ UserID, ResultFormat: 'JSON', ...params })
  const res = await fetch(`${BEA_BASE}?${qs}`)
  if (!res.ok) throw new Error(`BEA API 오류: ${res.status} ${res.statusText}`)
  const data = await res.json()
  if (data.BEAAPI?.Error) throw new Error(`BEA: ${data.BEAAPI.Error.APIErrorDescription}`)
  return data.BEAAPI?.Results
}

// GET /api/bea/tables — 사전 정의 테이블 목록
router.get('/tables', (req, res) => {
  res.json({ tables: TABLES })
})

// GET /api/bea/gdp — 실질 GDP 성장률 (최근 분기)
// query: years=2024,2025 (콤마 구분, 기본 최근 2년)
router.get('/gdp', async (req, res) => {
  try {
    const year = req.query.year || 'LAST5'
    const data = await beaGet({
      method: 'GetData',
      datasetname: 'NIPA',
      TableName: 'T10101',
      Frequency: 'Q',
      Year: year,
    })
    res.json({ table: 'T10101', desc: TABLES.gdp.desc, data: data?.Data || [] })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/bea/pce — PCE 소비지출
router.get('/pce', async (req, res) => {
  try {
    const year = req.query.year || 'LAST5'
    const data = await beaGet({
      method: 'GetData',
      datasetname: 'NIPA',
      TableName: 'T20305',
      Frequency: 'Q',
      Year: year,
    })
    res.json({ table: 'T20305', desc: TABLES.pce.desc, data: data?.Data || [] })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/bea/table/:name — 임의 NIPA 테이블 조회
// query: frequency=Q|A (기본 Q), year=LAST5
router.get('/table/:name', async (req, res) => {
  try {
    const { frequency = 'Q', year = 'LAST5' } = req.query
    const data = await beaGet({
      method: 'GetData',
      datasetname: 'NIPA',
      TableName: req.params.name,
      Frequency: frequency,
      Year: year,
    })
    res.json({ table: req.params.name, data: data?.Data || [] })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/bea/datasets — BEA 제공 데이터셋 목록
router.get('/datasets', async (req, res) => {
  try {
    const data = await beaGet({ method: 'GetDataSetList' })
    res.json({ datasets: data?.Dataset || [] })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
module.exports.TABLES = TABLES
