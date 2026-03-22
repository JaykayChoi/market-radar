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

// ── 52주 신고가/신저가 ─────────────────────────────────────────────

// 시가총액 순위 페이지에서 code → marketCap 맵 구축
function fetchMarketCapMap(sosok, maxPages = 15) {
  const https = require('https')
  const iconv = require('iconv-lite')
  return new Promise(async (resolve) => {
    const map = {}
    const fetchPage = (page) => new Promise((res2) => {
      const options = {
        hostname: 'finance.naver.com',
        path: `/sise/sise_market_sum.naver?sosok=${sosok}&page=${page}`,
        headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://finance.naver.com/sise/' },
      }
      https.get(options, (resp) => {
        const chunks = []
        resp.on('data', c => chunks.push(c))
        resp.on('end', () => {
          const html = iconv.decode(Buffer.concat(chunks), 'EUC-KR')
          const trs = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || []
          for (const tr of trs) {
            const code = tr.match(/code=(\d{6})/)
            if (!code) continue
            const tds = [...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)]
              .map(td => td[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, '').trim())
            if (tds.length >= 7) {
              const cap = parseInt(tds[6].replace(/,/g, '')) || 0
              if (cap > 0) map[code[1]] = cap // 억원 단위
            }
          }
          res2()
        })
      }).on('error', () => res2())
    })
    // 병렬로 페이지 가져오기 (5개씩)
    for (let i = 1; i <= maxPages; i += 5) {
      const batch = []
      for (let p = i; p < i + 5 && p <= maxPages; p++) batch.push(fetchPage(p))
      await Promise.all(batch)
    }
    resolve(map)
  })
}

// 네이버 sise 페이지에서 전종목 코드/이름/현재가/등락률 수집
function fetchSiseAll(sosok) {
  return new Promise((resolve, reject) => {
    const https = require('https')
    const iconv = require('iconv-lite')
    const options = {
      hostname: 'finance.naver.com',
      path: `/sise/sise_rise.naver?sosok=${sosok}`,
      headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://finance.naver.com/sise/' },
    }
    https.get(options, (res) => {
      const chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end', () => {
        const html = iconv.decode(Buffer.concat(chunks), 'EUC-KR')
        const stocks = []
        const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
        let m
        while ((m = trRe.exec(html)) !== null) {
          const tr = m[0]
          const code = tr.match(/code=(\d{6})/)
          if (!code) continue
          const tds = [...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)]
            .map(td => td[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, '').trim())
          if (tds.length < 6) continue
          const name = tds[1]
          const close = parseInt(tds[2].replace(/,/g, '')) || 0
          const changeRate = parseFloat(tds[4].replace(/[+%]/g, '')) || 0
          if (close > 0) stocks.push({ code: code[1], name, close, changeRate })
        }
        resolve(stocks)
      })
    }).on('error', reject)
  })
}

// fchart API로 52주 고가/저가 조회
async function fetch52wData(code) {
  const res = await fetch(
    `https://fchart.stock.naver.com/sise.nhn?symbol=${code}&timeframe=week&count=52&requestType=0`,
    { headers: { 'User-Agent': 'Mozilla/5.0' } }
  )
  const xml = await res.text()
  const items = [...xml.matchAll(/data="([^"]+)"/g)].map(m => m[1].split('|'))
  if (!items.length) return null
  const highs = items.map(d => parseInt(d[2])).filter(v => !isNaN(v))
  const lows = items.map(d => parseInt(d[3])).filter(v => !isNaN(v))
  return { high52w: Math.max(...highs), low52w: Math.min(...lows) }
}

// GET /api/naver/week52 — 52주 신고가/신저가 종목
router.get('/week52', async (req, res) => {
  try {
    // 1) 코스피+코스닥 전종목 현재가 + 시가총액 맵
    const [kospi, kosdaq, capKospi, capKosdaq] = await Promise.all([
      fetchSiseAll(0),
      fetchSiseAll(1),
      fetchMarketCapMap(0),
      fetchMarketCapMap(1),
    ])
    const capMap = { ...capKospi, ...capKosdaq }
    const allStocks = [
      ...kospi.map(s => ({ ...s, market: 'kospi', marketCap: capMap[s.code] || null })),
      ...kosdaq.map(s => ({ ...s, market: 'kosdaq', marketCap: capMap[s.code] || null })),
    ]

    // 2) 52주 고/저 병렬 조회 (50개씩 배치)
    const BATCH = 50
    for (let i = 0; i < allStocks.length; i += BATCH) {
      const batch = allStocks.slice(i, i + BATCH)
      const results = await Promise.allSettled(
        batch.map(s => fetch52wData(s.code))
      )
      results.forEach((r, j) => {
        if (r.status === 'fulfilled' && r.value) {
          batch[j].high52w = r.value.high52w
          batch[j].low52w = r.value.low52w
        }
      })
    }

    // 3) Naver API로 stockEndType 확인 → 'stock'만 유지 (ETF/ETN 제외)
    const TYPE_BATCH = 80
    for (let i = 0; i < allStocks.length; i += TYPE_BATCH) {
      const batch = allStocks.slice(i, i + TYPE_BATCH)
      const results = await Promise.allSettled(
        batch.map(s =>
          fetch(`https://m.stock.naver.com/api/stock/${s.code}/basic`, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
          }).then(r => r.json()).then(j => ({ code: s.code, type: j.stockEndType, marketCap: j.marketValue || j.marketCap || null }))
        )
      )
      results.forEach((r, j) => {
        if (r.status === 'fulfilled') {
          batch[j].stockType = r.value.type
          batch[j].marketCap = r.value.marketCap
        } else {
          batch[j].stockType = 'unknown'
        }
      })
    }
    const stocksOnly = allStocks.filter(s => s.stockType === 'stock')

    // 4) 괴리율 계산 + 필터 (52주 데이터가 있는 종목만)
    const enriched = stocksOnly
      .filter(s => s.high52w && s.low52w)
      .map(s => ({
        ...s,
        fromHighPct: parseFloat(((s.close - s.high52w) / s.high52w * 100).toFixed(2)),
        fromLowPct:  parseFloat(((s.close - s.low52w) / s.low52w * 100).toFixed(2)),
      }))

    // 신고가 근접 (고가 대비 -5% 이내) 정렬: 고가에 가까운 순
    const nearHigh = enriched
      .filter(s => s.fromHighPct >= -5)
      .sort((a, b) => b.fromHighPct - a.fromHighPct)

    // 신저가 근접 (저가 대비 +10% 이내) 정렬: 저가에 가까운 순
    const nearLow = enriched
      .filter(s => s.fromLowPct <= 10)
      .sort((a, b) => a.fromLowPct - b.fromLowPct)

    res.json({ nearHigh, nearLow, totalScanned: enriched.length })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
