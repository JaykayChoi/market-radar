const express = require('express')
const router = express.Router()

const CBOE_CDN = 'https://cdn.cboe.com/api/global/us_indices/daily_prices'

// 사전 정의 지수 — 무료 CSV 다운로드 가능
const INDICES = {
  vix:    'VIX_History.csv',
  vix9d:  'VIX9D_History.csv',
  vix3m:  'VIX3M_History.csv',
  vix6m:  'VIX6M_History.csv',
  vvix:   'VVIX_History.csv',  // VIX of VIX
}

async function fetchCsv(filename) {
  const res = await fetch(`${CBOE_CDN}/${filename}`)
  if (!res.ok) throw new Error(`CBOE 다운로드 오류: ${res.status} ${res.statusText}`)
  return res.text()
}

// CSV 파싱 — CBOE 형식: DATE,OPEN,HIGH,LOW,CLOSE
function parseCsv(text) {
  const lines = text.trim().split('\n')
  // 헤더 행 탐색 (DATE로 시작하는 줄)
  const headerIdx = lines.findIndex(l => l.trim().toUpperCase().startsWith('DATE'))
  if (headerIdx === -1) throw new Error('CSV 헤더를 찾을 수 없습니다.')
  const headers = lines[headerIdx].split(',').map(h => h.trim().toLowerCase())
  return lines.slice(headerIdx + 1)
    .filter(l => l.trim())
    .map(line => {
      const vals = line.split(',')
      const row = {}
      headers.forEach((h, i) => {
        row[h] = vals[i]?.trim() ?? null
      })
      // 날짜 정규화: MM/DD/YYYY → YYYY-MM-DD
      if (row.date && row.date.includes('/')) {
        const [m, d, y] = row.date.split('/')
        row.date = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
      }
      // close 값을 숫자로 변환
      if (row.close) row.close = parseFloat(row.close) || null
      if (row.open)  row.open  = parseFloat(row.open)  || null
      if (row.high)  row.high  = parseFloat(row.high)  || null
      if (row.low)   row.low   = parseFloat(row.low)   || null
      return row
    })
}

// GET /api/cboe/keys — 사용 가능한 지수 목록
router.get('/keys', (req, res) => {
  res.json({ indices: INDICES })
})

// GET /api/cboe/:index — 지수 히스토리 (예: /api/cboe/vix)
// query: limit (기본 100, 최신부터)
router.get('/:index', async (req, res) => {
  try {
    const filename = INDICES[req.params.index]
    if (!filename) {
      return res.status(400).json({
        error: `알 수 없는 지수: ${req.params.index}`,
        available: Object.keys(INDICES),
      })
    }
    const limit = parseInt(req.query.limit) || 100
    const text = await fetchCsv(filename)
    const rows = parseCsv(text)
    // 최신 데이터가 뒤에 있으므로 역순으로 잘라냄
    const data = rows.slice(-limit).reverse()
    res.json({ index: req.params.index, count: data.length, data })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
module.exports.parseCsv = parseCsv
module.exports.INDICES = INDICES
