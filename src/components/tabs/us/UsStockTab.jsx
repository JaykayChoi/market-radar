import React, { useState, useMemo } from 'react'

// ── 모의 데이터 (주요 50종목) ────────────────────────────────────

const MOCK_STOCKS = [
  { symbol: 'AAPL',  name: 'Apple',             sector: 'Tech',       price: 248.35, change: 3.82,  changePct: 1.56,  marketCap: 3820, pe: 33.2, eps: 7.48, divYield: 0.40, volume: 58.4,  avgVol: 62.1, w52High: 260, w52Low: 164, beta: 1.24 },
  { symbol: 'MSFT',  name: 'Microsoft',         sector: 'Tech',       price: 442.10, change: -2.15, changePct: -0.48, marketCap: 3290, pe: 37.1, eps: 11.92, divYield: 0.68, volume: 22.3, avgVol: 20.8, w52High: 468, w52Low: 362, beta: 0.89 },
  { symbol: 'NVDA',  name: 'NVIDIA',            sector: 'Tech',       price: 138.50, change: 5.20,  changePct: 3.90,  marketCap: 3390, pe: 65.4, eps: 2.12, divYield: 0.02, volume: 312.5, avgVol: 245.0, w52High: 153, w52Low: 60, beta: 1.68 },
  { symbol: 'AMZN',  name: 'Amazon',            sector: 'Consumer',   price: 225.80, change: 1.45,  changePct: 0.65,  marketCap: 2380, pe: 42.3, eps: 5.34, divYield: 0, volume: 45.2, avgVol: 48.5, w52High: 242, w52Low: 151, beta: 1.15 },
  { symbol: 'GOOGL', name: 'Alphabet',          sector: 'Tech',       price: 182.40, change: -0.80, changePct: -0.44, marketCap: 2240, pe: 23.5, eps: 7.76, divYield: 0.44, volume: 28.6, avgVol: 26.3, w52High: 201, w52Low: 142, beta: 1.05 },
  { symbol: 'META',  name: 'Meta Platforms',     sector: 'Tech',       price: 632.50, change: 8.30,  changePct: 1.33,  marketCap: 1610, pe: 28.9, eps: 21.88, divYield: 0.31, volume: 18.2, avgVol: 16.5, w52High: 648, w52Low: 390, beta: 1.22 },
  { symbol: 'TSLA',  name: 'Tesla',             sector: 'Consumer',   price: 285.60, change: -12.40, changePct: -4.16, marketCap: 915, pe: 95.2, eps: 3.00, divYield: 0, volume: 112.8, avgVol: 98.5, w52High: 488, w52Low: 138, beta: 2.31 },
  { symbol: 'AVGO',  name: 'Broadcom',          sector: 'Tech',       price: 228.50, change: 4.10,  changePct: 1.83,  marketCap: 1060, pe: 38.2, eps: 5.98, divYield: 0.92, volume: 32.1, avgVol: 28.4, w52High: 251, w52Low: 128, beta: 1.35 },
  { symbol: 'LLY',   name: 'Eli Lilly',         sector: 'Health',     price: 892.30, change: 15.60, changePct: 1.78,  marketCap: 848, pe: 78.5, eps: 11.37, divYield: 0.56, volume: 4.8, avgVol: 4.2, w52High: 972, w52Low: 710, beta: 0.42 },
  { symbol: 'JPM',   name: 'JPMorgan Chase',    sector: 'Finance',    price: 268.90, change: 2.30,  changePct: 0.86,  marketCap: 770, pe: 13.8, eps: 19.49, divYield: 1.86, volume: 8.5, avgVol: 9.2, w52High: 280, w52Low: 193, beta: 1.05 },
  { symbol: 'WMT',   name: 'Walmart',           sector: 'Consumer',   price: 98.40,  change: 0.55,  changePct: 0.56,  marketCap: 790, pe: 39.4, eps: 2.50, divYield: 0.85, volume: 15.2, avgVol: 14.8, w52High: 105, w52Low: 73, beta: 0.52 },
  { symbol: 'V',     name: 'Visa',              sector: 'Finance',    price: 342.80, change: 1.90,  changePct: 0.56,  marketCap: 680, pe: 33.5, eps: 10.23, divYield: 0.63, volume: 6.8, avgVol: 7.1, w52High: 358, w52Low: 268, beta: 0.95 },
  { symbol: 'UNH',   name: 'UnitedHealth',      sector: 'Health',     price: 518.20, change: -8.50, changePct: -1.61, marketCap: 475, pe: 19.8, eps: 26.17, divYield: 1.48, volume: 5.2, avgVol: 4.8, w52High: 630, w52Low: 436, beta: 0.62 },
  { symbol: 'XOM',   name: 'ExxonMobil',        sector: 'Energy',     price: 108.50, change: -1.20, changePct: -1.09, marketCap: 455, pe: 14.2, eps: 7.64, divYield: 3.49, volume: 14.5, avgVol: 16.2, w52High: 126, w52Low: 95, beta: 0.82 },
  { symbol: 'MA',    name: 'Mastercard',        sector: 'Finance',    price: 558.30, change: 3.40,  changePct: 0.61,  marketCap: 520, pe: 40.2, eps: 13.89, divYield: 0.50, volume: 3.2, avgVol: 3.5, w52High: 572, w52Low: 420, beta: 1.08 },
  { symbol: 'COST',  name: 'Costco',            sector: 'Consumer',   price: 1045.0, change: 12.50, changePct: 1.21,  marketCap: 464, pe: 58.6, eps: 17.83, divYield: 0.47, volume: 2.5, avgVol: 2.8, w52High: 1080, w52Low: 705, beta: 0.78 },
  { symbol: 'NFLX',  name: 'Netflix',           sector: 'Tech',       price: 1028.0, change: 22.30, changePct: 2.22,  marketCap: 440, pe: 52.4, eps: 19.62, divYield: 0, volume: 5.8, avgVol: 5.2, w52High: 1065, w52Low: 550, beta: 1.42 },
  { symbol: 'HD',    name: 'Home Depot',        sector: 'Consumer',   price: 412.50, change: -3.20, changePct: -0.77, marketCap: 410, pe: 26.8, eps: 15.39, divYield: 2.18, volume: 4.1, avgVol: 4.5, w52High: 440, w52Low: 325, beta: 1.02 },
  { symbol: 'ABBV',  name: 'AbbVie',            sector: 'Health',     price: 198.30, change: 1.80,  changePct: 0.92,  marketCap: 350, pe: 24.1, eps: 8.23, divYield: 3.22, volume: 7.2, avgVol: 7.8, w52High: 212, w52Low: 154, beta: 0.58 },
  { symbol: 'BAC',   name: 'Bank of America',   sector: 'Finance',    price: 48.20,  change: 0.65,  changePct: 1.37,  marketCap: 378, pe: 15.2, eps: 3.17, divYield: 2.24, volume: 38.5, avgVol: 35.2, w52High: 52, w52Low: 33, beta: 1.35 },
  { symbol: 'CRM',   name: 'Salesforce',        sector: 'Tech',       price: 348.90, change: 5.60,  changePct: 1.63,  marketCap: 335, pe: 48.5, eps: 7.19, divYield: 0.46, volume: 6.8, avgVol: 7.2, w52High: 369, w52Low: 212, beta: 1.28 },
  { symbol: 'KO',    name: 'Coca-Cola',         sector: 'Consumer',   price: 72.80,  change: 0.15,  changePct: 0.21,  marketCap: 314, pe: 28.3, eps: 2.57, divYield: 2.68, volume: 12.5, avgVol: 13.8, w52High: 74, w52Low: 57, beta: 0.55 },
  { symbol: 'CVX',   name: 'Chevron',           sector: 'Energy',     price: 158.40, change: -2.80, changePct: -1.74, marketCap: 285, pe: 12.5, eps: 12.67, divYield: 4.08, volume: 8.2, avgVol: 9.5, w52High: 175, w52Low: 135, beta: 0.95 },
  { symbol: 'AMD',   name: 'AMD',               sector: 'Tech',       price: 128.60, change: 4.50,  changePct: 3.63,  marketCap: 208, pe: 44.8, eps: 2.87, divYield: 0, volume: 52.3, avgVol: 48.5, w52High: 187, w52Low: 95, beta: 1.72 },
  { symbol: 'PEP',   name: 'PepsiCo',           sector: 'Consumer',   price: 148.20, change: -0.30, changePct: -0.20, marketCap: 203, pe: 22.8, eps: 6.50, divYield: 3.52, volume: 5.8, avgVol: 6.2, w52High: 183, w52Low: 141, beta: 0.52 },
  { symbol: 'ADBE',  name: 'Adobe',             sector: 'Tech',       price: 462.80, change: 7.90,  changePct: 1.74,  marketCap: 201, pe: 35.6, eps: 13.00, divYield: 0, volume: 4.5, avgVol: 4.2, w52High: 588, w52Low: 403, beta: 1.28 },
  { symbol: 'MRK',   name: 'Merck',             sector: 'Health',     price: 88.50,  change: -1.40, changePct: -1.56, marketCap: 224, pe: 15.8, eps: 5.60, divYield: 3.50, volume: 11.2, avgVol: 12.5, w52High: 134, w52Low: 85, beta: 0.38 },
  { symbol: 'GS',    name: 'Goldman Sachs',     sector: 'Finance',    price: 625.40, change: 8.20,  changePct: 1.33,  marketCap: 198, pe: 16.2, eps: 38.60, divYield: 2.08, volume: 2.5, avgVol: 2.8, w52High: 648, w52Low: 410, beta: 1.32 },
  { symbol: 'DIS',   name: 'Walt Disney',       sector: 'Consumer',   price: 118.30, change: 1.60,  changePct: 1.37,  marketCap: 215, pe: 42.5, eps: 2.78, divYield: 0.85, volume: 9.8, avgVol: 10.2, w52High: 128, w52Low: 84, beta: 1.18 },
  { symbol: 'PFE',   name: 'Pfizer',            sector: 'Health',     price: 26.80,  change: -0.45, changePct: -1.65, marketCap: 151, pe: 18.9, eps: 1.42, divYield: 6.27, volume: 32.5, avgVol: 35.8, w52High: 32, w52Low: 24, beta: 0.68 },
]

const SECTORS = ['전체', 'Tech', 'Consumer', 'Finance', 'Health', 'Energy']

// ── 포맷 유틸 ────────────────────────────────────────────────────

function fmtNum(v, d = 2) { return v != null ? v.toFixed(d) : '—' }

// ──────────────────────────────────────────────────────────────────
// 추천1: 정렬 가능한 테이블 리스트 (스크리너 스타일)
// ──────────────────────────────────────────────────────────────────

function Version1({ stocks }) {
  const [sortKey, setSortKey] = useState('marketCap')
  const [sortDir, setSortDir] = useState('desc')
  const [sector, setSector]   = useState('전체')

  const filtered = sector === '전체' ? stocks : stocks.filter(s => s.sector === sector)
  const sorted = [...filtered].sort((a, b) => {
    const va = a[sortKey] ?? 0, vb = b[sortKey] ?? 0
    return sortDir === 'desc' ? vb - va : va - vb
  })

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const SortTh = ({ k, label, align = 'right' }) => (
    <th onClick={() => handleSort(k)}
      className={`px-2 py-2 text-${align} text-[10px] font-semibold text-gray-500 uppercase cursor-pointer hover:text-blue-600 select-none`}>
      {label} {sortKey === k && (sortDir === 'desc' ? '▼' : '▲')}
    </th>
  )

  return (
    <div>
      <div className="flex gap-1 mb-3">
        {SECTORS.map(s => (
          <button key={s} onClick={() => setSector(s)}
            className={`px-3 py-1 rounded-full text-xs font-medium ${sector === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {s}
          </button>
        ))}
        <span className="ml-auto text-xs text-gray-400 self-center">{sorted.length}종목</span>
      </div>
      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-500 w-8">#</th>
              <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-500">종목</th>
              <SortTh k="price" label="현재가" />
              <SortTh k="changePct" label="등락률" />
              <SortTh k="marketCap" label="시총(B)" />
              <SortTh k="pe" label="PER" />
              <SortTh k="eps" label="EPS" />
              <SortTh k="divYield" label="배당%" />
              <SortTh k="volume" label="거래량(M)" />
              <SortTh k="beta" label="베타" />
              <th className="px-2 py-2 text-center text-[10px] font-semibold text-gray-500">52주</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {sorted.map((s, i) => {
              const w52pct = ((s.price - s.w52Low) / (s.w52High - s.w52Low) * 100)
              return (
                <tr key={s.symbol} className="hover:bg-gray-50">
                  <td className="px-2 py-1.5 text-gray-400">{i + 1}</td>
                  <td className="px-2 py-1.5">
                    <span className="font-semibold text-blue-600">{s.symbol}</span>
                    <span className="ml-1.5 text-gray-500">{s.name}</span>
                  </td>
                  <td className="px-2 py-1.5 text-right font-medium text-gray-900">${fmtNum(s.price)}</td>
                  <td className={`px-2 py-1.5 text-right font-bold ${s.changePct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {s.changePct >= 0 ? '+' : ''}{fmtNum(s.changePct)}%
                  </td>
                  <td className="px-2 py-1.5 text-right text-gray-700">${s.marketCap}</td>
                  <td className="px-2 py-1.5 text-right text-gray-700">{fmtNum(s.pe, 1)}</td>
                  <td className="px-2 py-1.5 text-right text-gray-700">${fmtNum(s.eps)}</td>
                  <td className="px-2 py-1.5 text-right text-gray-700">{s.divYield > 0 ? `${fmtNum(s.divYield)}%` : '—'}</td>
                  <td className="px-2 py-1.5 text-right text-gray-600">{fmtNum(s.volume, 1)}</td>
                  <td className="px-2 py-1.5 text-right text-gray-600">{fmtNum(s.beta)}</td>
                  <td className="px-2 py-1.5 w-24">
                    <div className="flex items-center gap-1">
                      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                        <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${w52pct.toFixed(0)}%` }} />
                      </div>
                      <span className="text-[9px] text-gray-400 w-6 text-right">{w52pct.toFixed(0)}%</span>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────
// 추천2: 카드 그리드 리스트 (한눈에 등락률 + 핵심 지표)
// ──────────────────────────────────────────────────────────────────

function Version2({ stocks }) {
  const [sector, setSector] = useState('전체')
  const [sortKey, setSortKey] = useState('marketCap')

  const filtered = sector === '전체' ? stocks : stocks.filter(s => s.sector === sector)
  const sorted = [...filtered].sort((a, b) => (b[sortKey] ?? 0) - (a[sortKey] ?? 0))

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className="flex gap-1">
          {SECTORS.map(s => (
            <button key={s} onClick={() => setSector(s)}
              className={`px-3 py-1 rounded-full text-xs font-medium ${sector === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {s}
            </button>
          ))}
        </div>
        <select value={sortKey} onChange={e => setSortKey(e.target.value)}
          className="ml-auto text-xs border border-gray-300 rounded px-2 py-1">
          <option value="marketCap">시가총액순</option>
          <option value="changePct">등락률순</option>
          <option value="volume">거래량순</option>
          <option value="pe">PER순</option>
          <option value="divYield">배당률순</option>
        </select>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {sorted.map(s => {
          const w52pct = ((s.price - s.w52Low) / (s.w52High - s.w52Low) * 100)
          return (
            <div key={s.symbol} className="bg-white rounded-lg border border-gray-200 p-3 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-blue-600">{s.symbol}</span>
                <span className={`text-xs font-bold ${s.changePct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {s.changePct >= 0 ? '+' : ''}{fmtNum(s.changePct)}%
                </span>
              </div>
              <p className="text-[10px] text-gray-500 truncate mb-1.5">{s.name}</p>
              <p className="text-sm font-bold text-gray-900 mb-2">${fmtNum(s.price)}</p>
              <div className="space-y-0.5 text-[10px]">
                <div className="flex justify-between"><span className="text-gray-400">시총</span><span className="text-gray-700">${s.marketCap}B</span></div>
                <div className="flex justify-between"><span className="text-gray-400">PER</span><span className="text-gray-700">{fmtNum(s.pe, 1)}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">배당</span><span className="text-gray-700">{s.divYield > 0 ? `${fmtNum(s.divYield)}%` : '—'}</span></div>
              </div>
              <div className="mt-2 bg-gray-100 rounded-full h-1">
                <div className="bg-blue-500 h-1 rounded-full" style={{ width: `${w52pct.toFixed(0)}%` }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────
// 추천3: 히트맵 스타일 (섹터별 그룹 + 등락률 색상)
// ──────────────────────────────────────────────────────────────────

function Version3({ stocks }) {
  const bySector = useMemo(() => {
    const map = {}
    for (const s of stocks) {
      if (!map[s.sector]) map[s.sector] = []
      map[s.sector].push(s)
    }
    // 각 섹터 내 시총 순 정렬
    for (const arr of Object.values(map)) arr.sort((a, b) => b.marketCap - a.marketCap)
    return map
  }, [stocks])

  function getColor(pct) {
    if (pct >= 3) return 'bg-green-600 text-white'
    if (pct >= 1.5) return 'bg-green-500 text-white'
    if (pct >= 0.5) return 'bg-green-400 text-white'
    if (pct >= 0) return 'bg-green-100 text-green-800'
    if (pct >= -0.5) return 'bg-red-100 text-red-800'
    if (pct >= -1.5) return 'bg-red-400 text-white'
    if (pct >= -3) return 'bg-red-500 text-white'
    return 'bg-red-600 text-white'
  }

  return (
    <div className="space-y-4">
      {Object.entries(bySector).map(([sector, stocks]) => (
        <div key={sector}>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 px-1">{sector} ({stocks.length})</p>
          <div className="flex flex-wrap gap-1">
            {stocks.map(s => {
              // 시총 기반 크기 (큰 종목 = 넓은 카드)
              const w = s.marketCap >= 1000 ? 'w-36 h-20' : s.marketCap >= 300 ? 'w-28 h-16' : 'w-24 h-14'
              return (
                <div key={s.symbol} className={`${w} ${getColor(s.changePct)} rounded-lg p-2 flex flex-col justify-between cursor-pointer hover:opacity-80 transition-opacity`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">{s.symbol}</span>
                    <span className="text-[10px] font-medium">{s.changePct >= 0 ? '+' : ''}{fmtNum(s.changePct, 1)}%</span>
                  </div>
                  <div>
                    <p className="text-[10px] opacity-80 truncate">{s.name}</p>
                    <p className="text-xs font-bold">${fmtNum(s.price, 0)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
      <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-2">
        <span>등락률:</span>
        {[
          { label: '+3%↑', cls: 'bg-green-600' },
          { label: '+1.5%', cls: 'bg-green-500' },
          { label: '+0.5%', cls: 'bg-green-400' },
          { label: '0~', cls: 'bg-green-100' },
          { label: '0~', cls: 'bg-red-100' },
          { label: '-0.5%', cls: 'bg-red-400' },
          { label: '-1.5%', cls: 'bg-red-500' },
          { label: '-3%↓', cls: 'bg-red-600' },
        ].map(c => (
          <span key={c.label + c.cls} className={`${c.cls} px-1.5 py-0.5 rounded text-white text-[9px]`}>{c.label}</span>
        ))}
        <span className="ml-2">카드 크기 = 시가총액</span>
      </div>
    </div>
  )
}

// ── 메인 컴포넌트 ──────────────────────────────────────────────────

export default function UsStockTab() {
  const [version, setVersion] = useState('v1')

  return (
    <div data-testid="us-stock-tab">
      <div className="flex items-center gap-2 mb-4">
        {[
          { id: 'v1', label: '추천1: 테이블 리스트' },
          { id: 'v2', label: '추천2: 카드 그리드' },
          { id: 'v3', label: '추천3: 섹터 히트맵' },
        ].map(v => (
          <button key={v.id} onClick={() => setVersion(v.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              version === v.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>
            {v.label}
          </button>
        ))}
      </div>

      {version === 'v1' && <Version1 stocks={MOCK_STOCKS} />}
      {version === 'v2' && <Version2 stocks={MOCK_STOCKS} />}
      {version === 'v3' && <Version3 stocks={MOCK_STOCKS} />}

      <p className="text-xs text-orange-500 mt-3">※ 현재 모의 데이터입니다. 실제 데이터 연동 예정.</p>
    </div>
  )
}
