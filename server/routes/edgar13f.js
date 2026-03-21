const express = require('express')
const router = express.Router()

const SEC_BASE = 'https://data.sec.gov'
const SEC_ARCHIVE = 'https://www.sec.gov/Archives/edgar/data'
const HEADERS = { 'User-Agent': 'MarketRadar/1.0 admin@market-radar.app', 'Accept-Encoding': 'gzip, deflate' }

// ── 50개 주요 기관 (AUM 내림차순, 미국 13F 신고 기관) ──────────────

const INSTITUTIONS = [
  // 자산운용사
  { id: 'blackrock',    name: 'BlackRock',                    cik: '1364742',  type: 'AM', aum: 10_000_000_000_000 },
  { id: 'vanguard',     name: 'Vanguard Group',               cik: '102909',   type: 'AM', aum:  8_100_000_000_000 },
  { id: 'fidelity',     name: 'FMR LLC (Fidelity)',           cik: '315066',   type: 'AM', aum:  4_900_000_000_000 },
  { id: 'ssga',         name: 'State Street Corp.',           cik: '93751',    type: 'AM', aum:  4_100_000_000_000 },
  { id: 'jpmorgan_am',  name: 'JPMorgan Asset Management',    cik: '19617',    type: 'AM', aum:  3_300_000_000_000 },
  { id: 'gs_am',        name: 'Goldman Sachs Group',          cik: '886982',   type: 'AM', aum:  2_800_000_000_000 },
  { id: 'capital',      name: 'Capital Group',                cik: '827054',   type: 'AM', aum:  2_600_000_000_000 },
  { id: 'bny',          name: 'Bank of New York Mellon',      cik: '804269',   type: 'AM', aum:  1_900_000_000_000 },
  { id: 'pimco',        name: 'PIMCO',                        cik: '1016064',  type: 'AM', aum:  1_800_000_000_000 },
  { id: 'invesco',      name: 'Invesco',                      cik: '914208',   type: 'AM', aum:  1_500_000_000_000 },
  { id: 'troweprice',   name: 'T. Rowe Price',                cik: '1113169',  type: 'AM', aum:  1_500_000_000_000 },
  { id: 'ms_im',        name: 'Morgan Stanley',               cik: '895421',   type: 'AM', aum:  1_400_000_000_000 },
  { id: 'franklin',     name: 'Franklin Resources',           cik: '38777',    type: 'AM', aum:  1_400_000_000_000 },
  { id: 'wellington',   name: 'Wellington Management',        cik: '101179',   type: 'AM', aum:  1_200_000_000_000 },
  { id: 'nuveen',       name: 'Nuveen Investments (TIAA)',    cik: '1255888',  type: 'AM', aum:  1_100_000_000_000 },
  { id: 'northern',     name: 'Northern Trust',               cik: '73124',    type: 'AM', aum:  1_100_000_000_000 },
  { id: 'blackstone',   name: 'Blackstone',                   cik: '1393818',  type: 'AM', aum:  1_000_000_000_000 },
  { id: 'dfa',          name: 'Dimensional Fund Advisors',    cik: '803649',   type: 'AM', aum:    680_000_000_000 },
  { id: 'apollo',       name: 'Apollo Global Management',     cik: '1411579',  type: 'AM', aum:    650_000_000_000 },
  { id: 'kkr',          name: 'KKR & Co.',                    cik: '1404912',  type: 'AM', aum:    500_000_000_000 },
  { id: 'neuberger',    name: 'Neuberger Berman',             cik: '1000177',  type: 'AM', aum:    460_000_000_000 },
  { id: 'dodge_cox',    name: 'Dodge & Cox',                  cik: '316373',   type: 'AM', aum:    380_000_000_000 },
  // 헤지펀드
  { id: 'berkshire',    name: 'Berkshire Hathaway',           cik: '1067983',  type: 'HF', aum:  312_000_000_000, manager: 'Warren Buffett'          },
  { id: 'harris',       name: 'Harris Associates (Oakmark)',  cik: '1060349',  type: 'HF', aum:  180_000_000_000, manager: 'Bill Nygren'             },
  { id: 'bridgewater',  name: 'Bridgewater Associates',       cik: '1350694',  type: 'HF', aum:  150_000_000_000, manager: 'Ray Dalio'               },
  { id: 'renaissance',  name: 'Renaissance Technologies',     cik: '1037389',  type: 'HF', aum:  130_000_000_000, manager: 'Peter Brown'             },
  { id: 'aqr',          name: 'AQR Capital Management',       cik: '1350487',  type: 'HF', aum:  100_000_000_000, manager: 'Cliff Asness'            },
  { id: 'millennium',   name: 'Millennium Management',        cik: '1273931',  type: 'HF', aum:   70_000_000_000, manager: 'Israel Englander'        },
  { id: 'elliott',      name: 'Elliott Associates',           cik: '1048268',  type: 'HF', aum:   65_000_000_000, manager: 'Paul Singer'             },
  { id: 'citadel',      name: 'Citadel Advisors',             cik: '1423053',  type: 'HF', aum:   60_000_000_000, manager: 'Ken Griffin'             },
  { id: 'deshaw',       name: 'D.E. Shaw & Co.',              cik: '1009207',  type: 'HF', aum:   60_000_000_000, manager: 'David Shaw'              },
  { id: 'twosigma',     name: 'Two Sigma Investments',        cik: '1450144',  type: 'HF', aum:   60_000_000_000, manager: 'John Overdeck'           },
  { id: 'viking',       name: 'Viking Global Investors',      cik: '1103804',  type: 'HF', aum:   40_000_000_000, manager: 'Andreas Halvorsen'       },
  { id: 'point72',      name: 'Point72 Asset Management',     cik: '1603466',  type: 'HF', aum:   34_000_000_000, manager: 'Steve Cohen'             },
  { id: 'baupost',      name: 'Baupost Group',                cik: '1343408',  type: 'HF', aum:   30_000_000_000, manager: 'Seth Klarman'            },
  { id: 'coatue',       name: 'Coatue Management',            cik: '1336593',  type: 'HF', aum:   25_000_000_000, manager: 'Philippe Laffont'        },
  { id: 'lonepine',     name: 'Lone Pine Capital',            cik: '1041235',  type: 'HF', aum:   20_000_000_000, manager: 'Stephen Mandel'          },
  { id: 'icahn',        name: 'Icahn Associates',             cik: '813762',   type: 'HF', aum:   20_000_000_000, manager: 'Carl Icahn'              },
  { id: 'pershing',     name: 'Pershing Square Capital',      cik: '1336528',  type: 'HF', aum:   18_500_000_000, manager: 'Bill Ackman'             },
  { id: 'appaloosa',    name: 'Appaloosa Management',         cik: '1006438',  type: 'HF', aum:   17_000_000_000, manager: 'David Tepper'            },
  { id: 'thirdpoint',   name: 'Third Point',                  cik: '1040273',  type: 'HF', aum:   15_000_000_000, manager: 'Dan Loeb'                },
  { id: 'tiger',        name: 'Tiger Global Management',      cik: '1167483',  type: 'HF', aum:   14_200_000_000, manager: 'Chase Coleman'           },
  { id: 'valueact',     name: 'ValueAct Capital',             cik: '1237803',  type: 'HF', aum:   10_000_000_000, manager: 'Mason Morfit'            },
  { id: 'glenview',     name: 'Glenview Capital',             cik: '1222469',  type: 'HF', aum:    8_000_000_000, manager: 'Larry Robbins'           },
  { id: 'starboard',    name: 'Starboard Value',              cik: '1418214',  type: 'HF', aum:    6_000_000_000, manager: 'Jeff Smith'              },
  { id: 'paulson',      name: 'Paulson & Co.',                cik: '1035706',  type: 'HF', aum:    4_800_000_000, manager: 'John Paulson'            },
  { id: 'duquesne',     name: 'Duquesne Family Office',       cik: '1494891',  type: 'HF', aum:    3_900_000_000, manager: 'Stanley Druckenmiller'   },
  { id: 'jana',         name: 'Jana Partners',                cik: '1198879',  type: 'HF', aum:    3_000_000_000, manager: 'Barry Rosenstein'        },
  { id: 'southeastern', name: 'Southeastern Asset Mgmt',     cik: '277751',   type: 'HF', aum:    2_500_000_000, manager: 'Mason Hawkins'           },
  { id: 'greenlight',   name: 'Greenlight Capital',           cik: '1080319',  type: 'HF', aum:    1_600_000_000, manager: 'David Einhorn'           },
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

// submissions JSON → 최신 13F-HR 정보 반환
async function getLatestFiling(cik) {
  const padded = cik.padStart(10, '0')
  const sub = await fetchJson(`${SEC_BASE}/submissions/CIK${padded}.json`)

  const { accessionNumber, form, filingDate } = sub.filings.recent
  const idx = form.findIndex(f => f === '13F-HR' || f === '13F-HR/A')
  if (idx === -1) throw new Error('13F-HR 신고 없음')

  return {
    accNo:      accessionNumber[idx].replace(/-/g, ''),
    accNoDash:  accessionNumber[idx],
    filingDate: filingDate[idx],
  }
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

// ── 라우트 ──────────────────────────────────────────────────────────

// GET /api/edgar13f/institutions
router.get('/institutions', (req, res) => {
  res.json(INSTITUTIONS)
})

// GET /api/edgar13f/:cik/latest — 최신 13F 홀딩스 (상위 50)
router.get('/:cik/latest', async (req, res) => {
  try {
    const cik    = req.params.cik.replace(/^0+/, '')  // leading zeros 제거
    const cacheKey = `13f-${cik}`
    const cached = cache.get(cacheKey)
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      return res.json(cached.data)
    }

    const { accNo, filingDate } = await getLatestFiling(cik)
    const xml      = await fetchInfoTableXml(cik, accNo)
    const holdings = parseInfoTable(xml, 50)
    const total    = holdings.reduce((s, h) => s + h.value, 0)

    const data = { cik, filingDate, total, holdings }
    cache.set(cacheKey, { data, ts: Date.now() })
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
module.exports.INSTITUTIONS = INSTITUTIONS
module.exports.parseInfoTable = parseInfoTable
