const express = require('express')
const router = express.Router()

// FMP는 2025-08-31 이후 신규 가입자에게 v3 Legacy API 폐기 → stable API 사용
const FMP_BASE = 'https://financialmodelingprep.com/stable'

function getApiKey() {
  const key = process.env.FMP_API_KEY
  if (!key) throw new Error('FMP_API_KEY 환경변수가 설정되지 않았습니다.')
  return key
}

async function fmpGet(path, params = {}) {
  const apikey = getApiKey()
  const qs = new URLSearchParams({ ...params, apikey })
  const res = await fetch(`${FMP_BASE}${path}?${qs}`)
  if (!res.ok) throw new Error(`FMP API 오류: ${res.status} ${res.statusText}`)
  const data = await res.json()
  if (data['Error Message']) throw new Error(`FMP: ${data['Error Message']}`)
  return data
}

// GET /api/fmp/quote?symbol=SPY — 실시간/EOD 시세 (콤마 구분 복수 가능)
router.get('/quote', async (req, res) => {
  try {
    const { symbol } = req.query
    if (!symbol) return res.status(400).json({ error: 'symbol 파라미터 필요' })
    const data = await fmpGet('/quote', { symbol: symbol.toUpperCase() })
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/fmp/profile?symbol=AAPL — 기업 기본정보 (시총, PER, 섹터 등)
router.get('/profile', async (req, res) => {
  try {
    const { symbol } = req.query
    if (!symbol) return res.status(400).json({ error: 'symbol 파라미터 필요' })
    const data = await fmpGet('/profile', { symbol: symbol.toUpperCase() })
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/fmp/history?symbol=SPY&from=YYYY-MM-DD&to=YYYY-MM-DD — 일별 EOD 주가 이력
router.get('/history', async (req, res) => {
  try {
    const { symbol, from, to } = req.query
    if (!symbol) return res.status(400).json({ error: 'symbol 파라미터 필요' })
    const params = { symbol: symbol.toUpperCase() }
    if (from) params.from = from
    if (to) params.to = to
    const data = await fmpGet('/historical-price-eod/full', params)
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/fmp/earnings?symbol=AAPL — 어닝 캘린더 / EPS 서프라이즈
router.get('/earnings', async (req, res) => {
  try {
    const { symbol } = req.query
    if (!symbol) return res.status(400).json({ error: 'symbol 파라미터 필요' })
    const data = await fmpGet('/earnings', { symbol: symbol.toUpperCase() })
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
