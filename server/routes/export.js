const express = require('express')
const router = express.Router()
const ExcelJS = require('exceljs')
const db = require('../storage/db')

function formatDate(d) {
  return d.getFullYear().toString() +
    String(d.getMonth()+1).padStart(2,'0') +
    String(d.getDate()).padStart(2,'0')
}

const COLUMNS = {
  etf: [
    { header: '순위', key: 'rank', width: 6 },
    { header: '종목코드', key: 'code', width: 10 },
    { header: 'ETF명', key: 'name', width: 40 },
    { header: '테마', key: 'theme', width: 30 },
    { header: '운용사', key: 'manager', width: 20 },
    { header: '순설정액(억원)', key: 'net_flow', width: 16 },
    { header: 'NAV', key: 'nav', width: 12 },
    { header: '상장주수', key: 'list_shrs', width: 14 },
  ],
  foreign: [
    { header: '순위', key: 'rank', width: 6 },
    { header: '종목코드', key: 'code', width: 10 },
    { header: '종목명', key: 'name', width: 30 },
    { header: '순매수금액(원)', key: 'net_val', width: 16 },
    { header: '순매수수량', key: 'net_vol', width: 14 },
    { header: '기간수익률(%)', key: 'period_return', width: 14 },
  ],
  institution: [
    { header: '순위', key: 'rank', width: 6 },
    { header: '종목코드', key: 'code', width: 10 },
    { header: '종목명', key: 'name', width: 30 },
    { header: '순매수금액(원)', key: 'net_val', width: 16 },
    { header: '순매수수량', key: 'net_vol', width: 14 },
    { header: '기간수익률(%)', key: 'period_return', width: 14 },
  ],
  industry: [
    { header: '업종명', key: 'index_name', width: 30 },
    { header: '종가', key: 'close', width: 12 },
    { header: '등락률(%)', key: 'change_rate', width: 12 },
    { header: '시가', key: 'open', width: 12 },
    { header: '고가', key: 'high', width: 12 },
    { header: '저가', key: 'low', width: 12 },
  ]
}

router.get('/excel/:type', async (req, res) => {
  const { type } = req.params
  const today = formatDate(new Date())
  const { start = today, end = today } = req.query

  let data = []
  try {
    switch(type) {
      case 'etf': data = db.getEtfData(start, end); break
      case 'foreign': data = db.getForeignData(start, end, 'foreign'); break
      case 'institution': data = db.getForeignData(start, end, 'institution'); break
      case 'industry': data = db.getIndustryData(start, end); break
      default: return res.status(400).json({ error: 'unknown type' })
    }

    const cols = COLUMNS[type] || COLUMNS.foreign
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet(type)

    // Row 1: 타이틀
    ws.mergeCells(1, 1, 1, cols.length)
    const titleCell = ws.getCell(1, 1)
    titleCell.value = `${type} 데이터 (${start}~${end})`
    titleCell.font = { bold: true, size: 13 }
    titleCell.alignment = { horizontal: 'center' }

    // Row 2: 헤더
    const headerRow = ws.getRow(2)
    cols.forEach((col, i) => {
      const cell = headerRow.getCell(i + 1)
      cell.value = col.header
      cell.font = { bold: true }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } }
    })

    // 열 너비 설정
    cols.forEach((col, i) => {
      ws.getColumn(i + 1).width = col.width
    })

    // 데이터 행
    data.forEach((row, idx) => {
      const wsRow = ws.getRow(idx + 3)
      cols.forEach((col, i) => {
        wsRow.getCell(i + 1).value = row[col.key] ?? ''
      })
    })

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename="${type}_${today}.xlsx"`)
    await wb.xlsx.write(res)
    res.end()
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
