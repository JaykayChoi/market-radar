const https = require('https')
const iconv = require('iconv-lite')

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36'

function fetchRaw(sosok) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'finance.naver.com',
      path: `/sise/sise_quant_high.naver?sosok=${sosok}&page=1`,
      headers: { 'User-Agent': USER_AGENT, 'Referer': 'https://finance.naver.com/sise/' },
    }
    https.get(options, (res) => {
      const chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end', () => resolve(iconv.decode(Buffer.concat(chunks), 'EUC-KR')))
    }).on('error', reject)
  })
}

function stripTags(s) {
  return s.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, '').trim()
}

function parseTable(html) {
  const tableMatch = html.match(/<table[^>]+class="type_2"[\s\S]*?<\/table>/i)
  if (!tableMatch) return []

  const rows = []
  const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
  let trM
  while ((trM = trRe.exec(tableMatch[0])) !== null) {
    const tr = trM[0]
    const tds = [...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(m => m[0])
    if (tds.length < 10) continue

    const codeMatch = tr.match(/code=(\d{6})/)
    if (!codeMatch) continue

    const code = codeMatch[1]
    const rank = parseInt(stripTags(tds[0]))
    if (isNaN(rank)) continue

    const surgeRatio = parseFloat(stripTags(tds[1]).replace(/,/g, '')) || 0
    const name = stripTags(tds[2])
    const close = parseInt(stripTags(tds[3]).replace(/,/g, '')) || 0
    // tds[4] = 전일비 (img + 숫자), skip
    const changeRate = parseFloat(stripTags(tds[5]).replace(/[+%]/g, '')) || 0
    // tds[6] = 매수호가, tds[7] = 매도호가, skip
    const volume = parseInt(stripTags(tds[8]).replace(/,/g, '')) || 0
    const prevVolume = parseInt(stripTags(tds[9]).replace(/,/g, '')) || 0
    const per = parseFloat(stripTags(tds[10]).replace(/,/g, '')) || 0

    rows.push({ code, name, surge_ratio: surgeRatio, close, change_rate: changeRate, volume, prev_volume: prevVolume, per })
  }
  return rows
}

async function collectVolumeSurge(date) {
  const results = {}
  for (const [market, sosok] of [['kospi', 0], ['kosdaq', 1]]) {
    try {
      const html = await fetchRaw(sosok)
      const rows = parseTable(html)
      results[market] = rows
      console.log(`[naver_quant] ${market} 거래량 급등 ${rows.length}건`)
    } catch (err) {
      console.warn(`[naver_quant] ${market} 수집 실패:`, err.message)
      results[market] = []
    }
  }
  return results
}

module.exports = { collectVolumeSurge }
