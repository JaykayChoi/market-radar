const express = require('express')
const router = express.Router()
const { collectVolumeSurge } = require('../collector/naver_quant')

// GET /api/naver/volume_surge — 네이버금융 실시간 조회 (DB 미사용)
router.get('/volume_surge', async (req, res) => {
  try {
    const today = new Date()
    const date = today.getFullYear().toString() +
      String(today.getMonth() + 1).padStart(2, '0') +
      String(today.getDate()).padStart(2, '0')
    const raw = await collectVolumeSurge(date)
    const data = Object.entries(raw).flatMap(([market, rows]) =>
      rows.map(r => ({ ...r, market }))
    )
    res.json({ data })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
