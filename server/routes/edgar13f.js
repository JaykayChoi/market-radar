const express = require('express')
const router = express.Router()

const SEC_BASE = 'https://data.sec.gov'
const SEC_ARCHIVE = 'https://www.sec.gov/Archives/edgar/data'
const HEADERS = { 'User-Agent': 'MarketRadar/1.0 admin@market-radar.app', 'Accept-Encoding': 'gzip, deflate' }

// ── 50개 주요 기관 (AUM 내림차순, 미국 13F 신고 기관) ──────────────

const INSTITUTIONS = [
  // 자산운용사
  { id: 'blackrock',    name: 'BlackRock',                    cik: '2012383',  type: 'AM', aum: 10_000_000_000_000 },
  { id: 'vanguard',     name: 'Vanguard Group',               cik: '102909',   type: 'AM', aum:  8_100_000_000_000 },
  { id: 'fidelity',     name: 'FMR LLC (Fidelity)',           cik: '315066',   type: 'AM', aum:  4_900_000_000_000 },
  { id: 'ssga',         name: 'State Street Corp.',           cik: '93751',    type: 'AM', aum:  4_100_000_000_000 },
  { id: 'jpmorgan_am',  name: 'JPMorgan Asset Management',    cik: '19617',    type: 'AM', aum:  3_300_000_000_000 },
  { id: 'gs_am',        name: 'Goldman Sachs Group',          cik: '886982',   type: 'AM', aum:  2_800_000_000_000 },
  { id: 'capital',      name: 'Capital Research Global',      cik: '1422848',  type: 'AM', aum:  2_600_000_000_000 },
  { id: 'bny',          name: 'Bank of New York Mellon',      cik: '1390777',  type: 'AM', aum:  1_900_000_000_000 },
  { id: 'pimco',        name: 'PIMCO (Allianz)',              cik: '1535323',  type: 'AM', aum:  1_800_000_000_000 },
  { id: 'invesco',      name: 'Invesco',                      cik: '914208',   type: 'AM', aum:  1_500_000_000_000 },
  { id: 'troweprice',   name: 'T. Rowe Price Associates',     cik: '80255',    type: 'AM', aum:  1_500_000_000_000 },
  { id: 'ms_im',        name: 'Morgan Stanley',               cik: '895421',   type: 'AM', aum:  1_400_000_000_000 },
  { id: 'franklin',     name: 'Franklin Resources',           cik: '38777',    type: 'AM', aum:  1_400_000_000_000 },
  { id: 'wellington',   name: 'Wellington Management Group',  cik: '902219',   type: 'AM', aum:  1_200_000_000_000 },
  { id: 'tiaa',         name: 'TIAA (Nuveen)',                cik: '315038',   type: 'AM', aum:  1_100_000_000_000 },
  { id: 'northern',     name: 'Northern Trust',               cik: '73124',    type: 'AM', aum:  1_100_000_000_000 },
  { id: 'blackstone',   name: 'Blackstone',                   cik: '1393818',  type: 'AM', aum:  1_000_000_000_000 },
  { id: 'dfa',          name: 'Dimensional Fund Advisors',    cik: '354204',   type: 'AM', aum:    680_000_000_000 },
  { id: 'apollo',       name: 'Apollo Management Holdings',   cik: '1449434',  type: 'AM', aum:    650_000_000_000 },
  { id: 'kkr',          name: 'KKR & Co.',                    cik: '1399770',  type: 'AM', aum:    500_000_000_000 },
  { id: 'neuberger',    name: 'Neuberger Berman Group',       cik: '1465109',  type: 'AM', aum:    460_000_000_000 },
  { id: 'geode',        name: 'Geode Capital Management',     cik: '1214717',  type: 'AM', aum:    380_000_000_000 },
  // 헤지펀드
  { id: 'berkshire',    name: 'Berkshire Hathaway',           cik: '1067983',  type: 'HF', aum:  312_000_000_000, manager: 'Warren Buffett'          },
  { id: 'harris',       name: 'Harris Associates (Oakmark)',  cik: '813917',   type: 'HF', aum:  180_000_000_000, manager: 'Bill Nygren'             },
  { id: 'bridgewater',  name: 'Bridgewater Associates',       cik: '1350694',  type: 'HF', aum:  150_000_000_000, manager: 'Ray Dalio'               },
  { id: 'renaissance',  name: 'Renaissance Technologies',     cik: '1037389',  type: 'HF', aum:  130_000_000_000, manager: 'Peter Brown'             },
  { id: 'aqr',          name: 'AQR Capital Management',       cik: '1167557',  type: 'HF', aum:  100_000_000_000, manager: 'Cliff Asness'            },
  { id: 'millennium',   name: 'Millennium Management',        cik: '1273087',  type: 'HF', aum:   70_000_000_000, manager: 'Israel Englander'        },
  { id: 'elliott',      name: 'Elliott Investment Mgmt',      cik: '1791786',  type: 'HF', aum:   65_000_000_000, manager: 'Paul Singer'             },
  { id: 'citadel',      name: 'Citadel Advisors',             cik: '1423053',  type: 'HF', aum:   60_000_000_000, manager: 'Ken Griffin'             },
  { id: 'deshaw',       name: 'D.E. Shaw & Co.',              cik: '1009207',  type: 'HF', aum:   60_000_000_000, manager: 'David Shaw'              },
  { id: 'twosigma',     name: 'Two Sigma Investments',        cik: '1450144',  type: 'HF', aum:   60_000_000_000, manager: 'John Overdeck'           },
  { id: 'viking',       name: 'Viking Global Investors',      cik: '1103804',  type: 'HF', aum:   40_000_000_000, manager: 'Andreas Halvorsen'       },
  { id: 'point72',      name: 'Point72 Asset Management',     cik: '1603466',  type: 'HF', aum:   34_000_000_000, manager: 'Steve Cohen'             },
  { id: 'baupost',      name: 'Baupost Group',                cik: '1061768',  type: 'HF', aum:   30_000_000_000, manager: 'Seth Klarman'            },
  { id: 'coatue',       name: 'Coatue Management',            cik: '1135730',  type: 'HF', aum:   25_000_000_000, manager: 'Philippe Laffont'        },
  { id: 'lonepine',     name: 'Lone Pine Capital',            cik: '1061165',  type: 'HF', aum:   20_000_000_000, manager: 'Stephen Mandel'          },
  { id: 'icahn',        name: 'Icahn Enterprises',            cik: '921669',   type: 'HF', aum:   20_000_000_000, manager: 'Carl Icahn'              },
  { id: 'pershing',     name: 'Pershing Square Capital',      cik: '1336528',  type: 'HF', aum:   18_500_000_000, manager: 'Bill Ackman'             },
  { id: 'appaloosa',    name: 'Appaloosa LP',                  cik: '1656456',  type: 'HF', aum:   17_000_000_000, manager: 'David Tepper'            },
  { id: 'thirdpoint',   name: 'Third Point',                  cik: '1040273',  type: 'HF', aum:   15_000_000_000, manager: 'Dan Loeb'                },
  { id: 'tiger',        name: 'Tiger Global Management',      cik: '1167483',  type: 'HF', aum:   14_200_000_000, manager: 'Chase Coleman'           },
  { id: 'valueact',     name: 'ValueAct Holdings',            cik: '1418814',  type: 'HF', aum:   10_000_000_000, manager: 'Mason Morfit'            },
  { id: 'glenview',     name: 'Glenview Capital Mgmt',       cik: '1138995',  type: 'HF', aum:    8_000_000_000, manager: 'Larry Robbins'           },
  { id: 'starboard',    name: 'Starboard Value LP',           cik: '1517137',  type: 'HF', aum:    6_000_000_000, manager: 'Jeff Smith'              },
  { id: 'paulson',      name: 'Paulson & Co.',                cik: '1035674',  type: 'HF', aum:    4_800_000_000, manager: 'John Paulson'            },
  { id: 'duquesne',     name: 'Duquesne Family Office',       cik: '1536411',  type: 'HF', aum:    3_900_000_000, manager: 'Stanley Druckenmiller'   },
  { id: 'jana',         name: 'Jana Partners Management',     cik: '1998597',  type: 'HF', aum:    3_000_000_000, manager: 'Barry Rosenstein'        },
  { id: 'southeastern', name: 'Southeastern Asset Mgmt',     cik: '807985',   type: 'HF', aum:    2_500_000_000, manager: 'Mason Hawkins'           },
  { id: 'soros',        name: 'Soros Fund Management',        cik: '1029160',  type: 'HF', aum:    2_000_000_000, manager: 'George Soros'            },
]

// ── 24시간 캐시 ────────────────────────────────────────────────────

const cache = new Map()
const CACHE_TTL = 24 * 60 * 60 * 1000

// ── SEC EDGAR 헬퍼 ─────────────────────────────────────────────────

async function fetchJson(url) {
  const res = await fetch(url, { headers: HEADERS })
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`)
  return res.json()
}

async function fetchText(url) {
  const res = await fetch(url, { headers: HEADERS })
  if (!res.ok) return null
  return res.text()
}

// submissions JSON → 최근 13F-HR 2건 반환 (latest + previous)
async function getFilings(cik, count = 2) {
  const padded = cik.padStart(10, '0')
  const sub = await fetchJson(`${SEC_BASE}/submissions/CIK${padded}.json`)

  const { accessionNumber, form, filingDate } = sub.filings.recent
  const results = []
  for (let i = 0; i < form.length && results.length < count; i++) {
    if (form[i] === '13F-HR' || form[i] === '13F-HR/A') {
      results.push({
        accNo:      accessionNumber[i].replace(/-/g, ''),
        accNoDash:  accessionNumber[i],
        filingDate: filingDate[i],
      })
    }
  }
  if (results.length === 0) throw new Error('13F-HR 신고 없음')
  return results
}

// 인포테이블 XML 다운로드 — 여러 후보 파일명 시도
async function fetchInfoTableXml(cik, accNo) {
  const base = `${SEC_ARCHIVE}/${parseInt(cik, 10)}/${accNo}`

  // 일반적인 파일명 후보
  for (const name of ['form13fInfoTable.xml', 'informationtable.xml', 'infotable.xml']) {
    const xml = await fetchText(`${base}/${name}`)
    if (xml && xml.includes('infoTable')) return xml
  }

  // 폴백: 인덱스 HTML에서 모든 XML 링크 탐색 (xslForm 스타일시트 제외)
  const accNoDash = accNo.replace(/^(\d{10})(\d{2})(\d{6})$/, '$1-$2-$3')
  const idxHtml = await fetchText(`${base}/${accNoDash}-index.htm`)
  if (idxHtml) {
    const linkRe = /href="([^"]*\.xml)"/gi
    let m
    while ((m = linkRe.exec(idxHtml)) !== null) {
      const href = m[1]
      if (href.includes('xslForm')) continue  // 스타일시트 제외
      const url = href.startsWith('http') ? href : `https://www.sec.gov${href}`
      const xml = await fetchText(url)
      if (xml && xml.includes('infoTable')) return xml
    }
  }

  throw new Error('infotable XML을 찾을 수 없습니다')
}

// XML 파싱 → holdings 배열 (상위 limit개)
function parseInfoTable(xml, limit = 50) {
  const rows = []
  const regex = /<infoTable>([\s\S]*?)<\/infoTable>/g
  let m

  while ((m = regex.exec(xml)) !== null) {
    const block = m[1]
    const get   = tag => (block.match(new RegExp(`<${tag}[^>]*>([^<]*)<\/${tag}>`)) || [])[1]?.trim() || null

    const valueRaw = get('value')
    const shares   = parseInt(get('sshPrnamt') || '0', 10)
    const value    = valueRaw ? parseInt(valueRaw, 10) : 0  // 달러 단위
    const putCall  = get('putCall')

    rows.push({
      name:    get('nameOfIssuer') || '—',
      cusip:   get('cusip') || '—',
      value,
      shares,
      putCall: putCall || null,
    })
  }

  // 가치 내림차순 정렬 후 상위 limit개
  rows.sort((a, b) => b.value - a.value)
  const top = rows.slice(0, limit)

  // 포트폴리오 비중 계산
  const total = top.reduce((s, r) => s + r.value, 0)
  return top.map((r, i) => ({
    rank: i + 1,
    ...r,
    pct: total > 0 ? parseFloat((r.value / total * 100).toFixed(2)) : 0,
  }))
}

// XML → CUSIP keyed map (비교용, 전체 파싱)
function parseInfoTableRaw(xml) {
  const map = new Map()  // cusip → { value, shares }
  const regex = /<infoTable>([\s\S]*?)<\/infoTable>/g
  let m
  while ((m = regex.exec(xml)) !== null) {
    const block = m[1]
    const get   = tag => (block.match(new RegExp(`<${tag}[^>]*>([^<]*)<\/${tag}>`)) || [])[1]?.trim() || null
    const cusip = get('cusip') || '—'
    const value = parseInt(get('value') || '0', 10)
    const shares = parseInt(get('sshPrnamt') || '0', 10)
    // 동일 CUSIP이 여러 매니저로 나뉘면 합산
    const prev = map.get(cusip)
    if (prev) {
      prev.value += value
      prev.shares += shares
    } else {
      map.set(cusip, { value, shares })
    }
  }
  return map
}

// 최신 vs 직전 분기 비교 → holdings에 change/changePct 추가
function addChangeInfo(holdings, prevMap) {
  if (!prevMap || prevMap.size === 0) return holdings

  return holdings.map(h => {
    const prev = prevMap.get(h.cusip)
    if (!prev) {
      return { ...h, change: 'new', changePct: null }
    }
    if (prev.shares === 0) {
      return { ...h, change: 'new', changePct: null }
    }
    const diff = ((h.shares - prev.shares) / prev.shares) * 100
    if (Math.abs(diff) < 0.5) {
      return { ...h, change: 'held', changePct: 0 }
    }
    return {
      ...h,
      change: diff > 0 ? 'increased' : 'decreased',
      changePct: parseFloat(diff.toFixed(1)),
    }
  })
}

// ── 라우트 ──────────────────────────────────────────────────────────

// GET /api/edgar13f/institutions
router.get('/institutions', (req, res) => {
  res.json(INSTITUTIONS)
})

// GET /api/edgar13f/:cik/latest — 최신 13F 홀딩스 + 전분기 비교 (상위 50)
router.get('/:cik/latest', async (req, res) => {
  try {
    const cik    = req.params.cik.replace(/^0+/, '')  // leading zeros 제거
    const cacheKey = `13f-${cik}`
    const cached = cache.get(cacheKey)
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      return res.json(cached.data)
    }

    const filings = await getFilings(cik, 2)
    const latestXml = await fetchInfoTableXml(cik, filings[0].accNo)
    let holdings = parseInfoTable(latestXml, 100)

    // 전체 XML 기준 총액 계산
    const latestMap = parseInfoTableRaw(latestXml)
    let total = 0
    for (const [, v] of latestMap) total += v.value

    // 직전 분기 비교
    let prevFilingDate = null
    let prevTotal = null
    let exited = []
    if (filings.length >= 2) {
      try {
        const prevXml = await fetchInfoTableXml(cik, filings[1].accNo)
        const prevMap = parseInfoTableRaw(prevXml)
        holdings = addChangeInfo(holdings, prevMap)
        prevFilingDate = filings[1].filingDate

        // 전분기 총 포트폴리오 (전체 XML 기준)
        let prevTotalAll = 0
        for (const [, v] of prevMap) prevTotalAll += v.value
        prevTotal = prevTotalAll

        // 청산 종목: 직전 분기 상위 100에 있었지만 이번 분기에 없는 CUSIP
        const currentCusips = new Set(holdings.map(h => h.cusip))
        const prevTop = parseInfoTable(prevXml, 100)
        exited = prevTop
          .filter(p => !currentCusips.has(p.cusip))
          .map(p => ({ ...p, change: 'exited', changePct: null }))
      } catch (_) { /* 직전 분기 파싱 실패 시 비교 없이 진행 */ }
    }

    // 비교 데이터 없는 항목에 기본값 설정
    holdings = holdings.map(h => ({
      change: null, changePct: null, ...h,
    }))

    const totalChangePct = (prevTotal !== null && prevTotal > 0)
      ? parseFloat(((total - prevTotal) / prevTotal * 100).toFixed(1))
      : null
    const newCount = holdings.filter(h => h.change === 'new').length
    const increasedCount = holdings.filter(h => h.change === 'increased').length
    const decreasedCount = holdings.filter(h => h.change === 'decreased').length

    const edgarUrl = `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${cik.padStart(10, '0')}&type=13F-HR&dateb=&owner=include&count=10`

    const data = {
      cik,
      filingDate: filings[0].filingDate,
      prevFilingDate,
      edgarUrl,
      total,
      prevTotal,
      totalChangePct,
      newCount,
      increasedCount,
      decreasedCount,
      exitedCount: exited.length,
      holdings,
      exited,
    }
    cache.set(cacheKey, { data, ts: Date.now() })
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
module.exports.INSTITUTIONS = INSTITUTIONS
module.exports.parseInfoTable = parseInfoTable
module.exports.parseInfoTableRaw = parseInfoTableRaw
module.exports.addChangeInfo = addChangeInfo
