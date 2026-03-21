const express = require('express')
const router = express.Router()
const db = require('../storage/db')

function parseDate(str) {
  return new Date(str.slice(0,4), str.slice(4,6)-1, str.slice(6,8))
}
function formatDate(d) {
  return d.getFullYear().toString() +
    String(d.getMonth()+1).padStart(2,'0') +
    String(d.getDate()).padStart(2,'0')
}

function getBusinessDays(startStr, endStr) {
  const days = []
  const start = parseDate(startStr)
  const end = parseDate(endStr)
  const cur = new Date(start)
  while (cur <= end) {
    const dow = cur.getDay()
    if (dow !== 0 && dow !== 6) days.push(formatDate(cur))
    cur.setDate(cur.getDate() + 1)
  }
  return days
}

router.get('/:type', (req, res) => {
  const { type } = req.params
  const today = formatDate(new Date())
  const { start = formatDate(new Date(Date.now() - 7*24*60*60*1000)), end = today } = req.query

  let data = []
  try {
    switch(type) {
      case 'etf': data = db.getEtfData(start, end); break
      case 'foreign': {
        const investorCode = req.query.investor_type || '9000'
        data = db.getForeignData(start, end, investorCode)
        break
      }
      case 'industry':       data = db.getIndustryData(start, end);     break
      case 'short_balance':  data = db.getShortBalanceData(start, end); break
      case 'short_trade':    data = db.getShortTradeData(start, end);    break
      case 'volume_surge':   data = db.getVolumeSurgeData(start, end);   break
      default: return res.status(400).json({ error: 'unknown type' })
    }

    const collectedDatesRaw = db.getCollectedDates(start, end)
    const collectedDates = collectedDatesRaw.map(r => r.date)
    const allBizDays = getBusinessDays(start, end)
    const missingDates = allBizDays.filter(d => !collectedDates.includes(d))

    res.json({ type, start, end, collectedDates, missingDates, data })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
