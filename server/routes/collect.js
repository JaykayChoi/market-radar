const express = require('express')
const router = express.Router()
const { v4: uuidv4 } = require('uuid')
const path = require('path')
const fs = require('fs')

let isCollecting = false
let lockAcquiredAt = null
let currentSessionId = null
let sessionEvents = new Map()
const sseClients = new Set()
const LOCK_TTL = 10 * 60 * 1000

function isLockValid() {
  return isCollecting && lockAcquiredAt && (Date.now() - lockAcquiredAt) < LOCK_TTL
}

function releaseLock() {
  isCollecting = false
  lockAcquiredAt = null
}

let eventCounter = 0
function emitProgress(sessionId, stage, total, label, status, error = null) {
  const id = String(++eventCounter)
  const event = { id, stage, total, label, status }
  if (error) event.error = error

  if (!sessionEvents.has(sessionId)) sessionEvents.set(sessionId, [])
  sessionEvents.get(sessionId).push(event)

  const data = `id: ${id}\ndata: ${JSON.stringify(event)}\n\n`
  for (const res of sseClients) {
    try { res.write(data) } catch (e) { sseClients.delete(res) }
  }
}

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

// 버튼 기준과 동일한 기간 계산 (DateRangePicker.jsx 의 QUICK_BUTTONS)
function bizDaysBack(endStr, n) {
  const d = parseDate(endStr)
  let count = 0
  while (count < n) {
    d.setDate(d.getDate() - 1)
    if (d.getDay() !== 0 && d.getDay() !== 6) count++
  }
  return formatDate(d)
}

function calDaysBack(endStr, n) {
  const d = parseDate(endStr)
  d.setDate(d.getDate() - n)
  return formatDate(d)
}

async function runCollection(sessionId, startDate, endDate) {
  const db = require('../storage/db')
  const { getPage, closeBrowser, ensureLoggedIn } = require('../collector/browser')
  const { collectEtf } = require('../collector/etf')
  const { collectForeign } = require('../collector/foreign')
  const { collectStock } = require('../collector/stock')
  const { collectIndustry } = require('../collector/industry')
  const { collectShortBalance, collectShortTrade } = require('../collector/shortstock')
  const { collectProgramTrade } = require('../collector/program')
  const { processEtf } = require('../processor/etf')
  const { processForeign } = require('../processor/foreign')

  const TOTAL = 7
  const rawDir = path.join(__dirname, '../../data/raw')
  if (!fs.existsSync(rawDir)) fs.mkdirSync(rawDir, { recursive: true })

  const days = getBusinessDays(startDate, endDate)
  const today = endDate
  const allDates = [today, ...days.filter(d => d !== today)]

  try {
    console.log(`[collect] 수집 시작: ${startDate} ~ ${endDate}, ${allDates.length}개 날짜`)
    emitProgress(sessionId, 0, TOTAL, '브라우저 시작 중...', 'running')

    const page = await getPage()
    await ensureLoggedIn(page)

    // 1. ETF
    emitProgress(sessionId, 1, TOTAL, 'ETF 시세 수집 중...', 'running')
    const etfData = await collectEtf(page, allDates)
    processEtf(etfData.prices, etfData.info, db)
    fs.writeFileSync(path.join(rawDir, `krx_raw_${today}_etf.json`), JSON.stringify(etfData))
    emitProgress(sessionId, 1, TOTAL, 'ETF 시세 완료', 'running')

    // 2. 외국인 + 기관 (4개 기간 모두 수집)
    emitProgress(sessionId, 2, TOTAL, '외국인 순매수 수집 중...', 'running')
    const foreignPeriods = [
      { label: '1일전(영업일)', start: bizDaysBack(today, 1) },
      { label: '3일전(영업일)', start: bizDaysBack(today, 3) },
      { label: '1주전',         start: calDaysBack(today, 7) },
      { label: '2주전',         start: calDaysBack(today, 14) },
    ]
    const allForeignRaw = {}
    for (const period of foreignPeriods) {
      const data = await collectForeign(page, period.start, today)
      processForeign(data.investorTypes, data.results, period.start, today, db)
      allForeignRaw[`${period.start}~${today}`] = data
    }
    fs.writeFileSync(path.join(rawDir, `krx_raw_${today}_foreign.json`), JSON.stringify(allForeignRaw))
    emitProgress(sessionId, 2, TOTAL, '투자자별 순매수 완료', 'running')

    // 3. 주식 종가
    emitProgress(sessionId, 3, TOTAL, '주식 종가 수집 중...', 'running')
    const stockData = await collectStock(page, allDates)
    const toNum = s => parseFloat(String(s || '').replace(/,/g, '')) || 0
    const toInt = s => parseInt(String(s || '').replace(/,/g, ''), 10) || 0
    db.upsertStockPrices(Object.entries(stockData).flatMap(([date, rows]) =>
      rows.map(r => ({ date, code: r.ISU_SRT_CD || r.ISU_CD, close_price: toNum(r.TDD_CLSPRC || r.CLSPRC) }))
    ))
    fs.writeFileSync(path.join(rawDir, `krx_raw_${today}_stock.json`), JSON.stringify(stockData))
    emitProgress(sessionId, 3, TOTAL, '주식 종가 완료', 'running')

    // 4. 업종별
    emitProgress(sessionId, 4, TOTAL, '업종별 등락률 수집 중...', 'running')
    const industryData = await collectIndustry(page, allDates)
    db.upsertIndustry(Object.entries(industryData).flatMap(([date, rows]) =>
      rows.map(r => ({
        date,
        index_name: r.IDX_NM || r.IDX_IND_NM || r.index_name,
        close: parseFloat(r.CLSPRC_IDX || r.CLSPRC) || 0,
        change_rate: parseFloat(r.FLUC_RT) || 0,
        open: parseFloat(r.OPNPRC_IDX || r.OPNPRC) || 0,
        high: parseFloat(r.HGPRC_IDX || r.HGPRC) || 0,
        low: parseFloat(r.LWPRC_IDX || r.LWPRC) || 0
      }))
    ))
    fs.writeFileSync(path.join(rawDir, `krx_raw_${today}_industry.json`), JSON.stringify(industryData))
    emitProgress(sessionId, 4, TOTAL, '업종별 등락률 완료', 'running')

    // 5. 공매도 잔고 + 거래 (각각 독립 try/catch)
    emitProgress(sessionId, 5, TOTAL, '공매도 데이터 수집 중...', 'running')
    let shortBalanceRaw = {}
    let shortTradeRaw = {}
    try {
      shortBalanceRaw = await collectShortBalance(page, allDates)
      const balanceRows = Object.entries(shortBalanceRaw).flatMap(([date, rows]) =>
        rows.map(r => ({
          date,
          code: r.ISU_SRT_CD || r.ISU_CD,
          name: r.ISU_ABBRV || r.ISU_NM,
          balance_qty: toInt(r.BALANCE_QTY),    // ← Task 1 실제 필드명으로 교체
          balance_amt: toNum(r.BALANCE_AMT),    // ← Task 1 실제 필드명으로 교체
          balance_ratio: toNum(r.BALANCE_RT),   // ← Task 1 실제 필드명으로 교체
        }))
      )
      if (balanceRows.length > 0) db.upsertShortBalance(balanceRows)
      else console.warn('[collect] 공매도 잔고 0건 — upsert 생략')
    } catch (err) {
      console.warn('[collect] 공매도 잔고 수집 실패 (skip):', err.message)
    }
    try {
      shortTradeRaw = await collectShortTrade(page, allDates)
      const tradeRows = Object.entries(shortTradeRaw).flatMap(([date, rows]) =>
        rows.map(r => ({
          date,
          code: r.ISU_SRT_CD || r.ISU_CD,
          name: r.ISU_ABBRV || r.ISU_NM,
          short_vol: toInt(r.SHRT_SELL_VOL),      // ← Task 1 실제 필드명으로 교체
          total_vol: toInt(r.TOT_TRDVOL),          // ← Task 1 실제 필드명으로 교체
          vol_ratio:  toNum(r.SHRT_SELL_RT),       // ← Task 1 실제 필드명으로 교체
          short_val:  toNum(r.SHRT_SELL_AMT),      // ← Task 1 실제 필드명으로 교체
          total_val:  toNum(r.TOT_TRDVAL),          // ← Task 1 실제 필드명으로 교체
          val_ratio:  toNum(r.SHRT_SELL_AMT_RT),   // ← Task 1 실제 필드명으로 교체
        }))
      )
      if (tradeRows.length > 0) db.upsertShortTrade(tradeRows)
      else console.warn('[collect] 공매도 거래 0건 — upsert 생략')
    } catch (err) {
      console.warn('[collect] 공매도 거래 수집 실패 (skip):', err.message)
    }
    fs.writeFileSync(path.join(rawDir, `krx_raw_${today}_short.json`), JSON.stringify({ shortBalanceRaw, shortTradeRaw }))
    emitProgress(sessionId, 5, TOTAL, '공매도 데이터 완료', 'running')

    // 6. 프로그램 순매수
    emitProgress(sessionId, 6, TOTAL, '프로그램 순매수 수집 중...', 'running')
    try {
      const programRaw = await collectProgramTrade(page, allDates)
      const programRows = Object.entries(programRaw).flatMap(([date, rows]) =>
        rows.map(r => ({
          date,
          code: r.ISU_SRT_CD || r.ISU_CD,
          name: r.ISU_ABBRV || r.ISU_NM,
          arb_buy:     toNum(r.PRGM_BUY_AMT),      // ← Task 1 실제 필드명으로 교체
          arb_sell:    toNum(r.PRGM_SELL_AMT),     // ← Task 1 실제 필드명으로 교체
          arb_net:     toNum(r.PRGM_NETBID_AMT),   // ← Task 1 실제 필드명으로 교체
          nonarb_buy:  toNum(r.PRGM_BUY_AMT2),     // ← Task 1 실제 필드명으로 교체
          nonarb_sell: toNum(r.PRGM_SELL_AMT2),    // ← Task 1 실제 필드명으로 교체
          nonarb_net:  toNum(r.PRGM_NETBID_AMT2),  // ← Task 1 실제 필드명으로 교체
        }))
      )
      if (programRows.length > 0) db.upsertProgramTrade(programRows)
      else console.warn('[collect] 프로그램 순매수 0건 — upsert 생략')
      fs.writeFileSync(path.join(rawDir, `krx_raw_${today}_program.json`), JSON.stringify(programRaw))
    } catch (err) {
      console.warn('[collect] 프로그램 순매수 수집 실패 (skip):', err.message)
    }
    emitProgress(sessionId, 6, TOTAL, '프로그램 순매수 완료', 'running')

    db.upsertCollectedDate(today, ['etf','foreign','stock','industry','short_balance','short_trade','program_trade'])
    console.log(`[collect] 완료: ${today}`)

    await closeBrowser()
    emitProgress(sessionId, 7, TOTAL, '완료', 'done')

  } catch (err) {
    console.error('[collect] 오류:', err)
    try { await closeBrowser() } catch {}
    emitProgress(sessionId, -1, TOTAL, '수집 오류: ' + err.message, 'error', err.message)
  } finally {
    releaseLock()
  }
}

// POST /api/collect — 수집 시작
router.post('/', async (req, res) => {
  if (isLockValid()) {
    return res.status(409).json({ ok: false, message: '수집 진행 중' })
  }
  isCollecting = true
  lockAcquiredAt = Date.now()
  currentSessionId = uuidv4()

  const { start, end } = req.body
  const startDate = start || formatDate(new Date())
  const endDate = end || formatDate(new Date())

  res.json({ ok: true, sessionId: currentSessionId })

  runCollection(currentSessionId, startDate, endDate).catch(console.error)
})

// GET /api/collect/progress — SSE
router.get('/progress', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()

  sseClients.add(res)

  // 현재 세션의 기존 이벤트 전부 재전송 (SSE 연결 전 이벤트 누락 방지)
  if (currentSessionId && sessionEvents.has(currentSessionId)) {
    const events = sessionEvents.get(currentSessionId)
    const lastId = req.headers['last-event-id']
    const fromIdx = lastId
      ? (events.findIndex(e => e.id === lastId) + 1)
      : 0
    for (const ev of events.slice(fromIdx)) {
      res.write(`id: ${ev.id}\ndata: ${JSON.stringify(ev)}\n\n`)
    }
  }

  req.on('close', () => { sseClients.delete(res) })
})

module.exports = router
