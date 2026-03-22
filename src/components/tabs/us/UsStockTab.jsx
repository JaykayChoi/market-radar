import React, { useState, useEffect, useMemo } from 'react'

// ── 포맷 유틸 ────────────────────────────────────────────────────

function fmtNum(v, d = 2) { return v != null ? v.toFixed(d) : '—' }
function fmtCap(v) {
  if (v == null) return '—'
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`
  if (v >= 1e9)  return `$${(v / 1e9).toFixed(0)}B`
  if (v >= 1e6)  return `$${(v / 1e6).toFixed(0)}M`
  return `$${v.toLocaleString()}`
}
function fmtVol(v) {
  if (v == null) return '—'
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`
  return v.toLocaleString()
}

// ── 52주 신고가/신저가 뷰 ──────────────────────────────────────────

function Week52UsView({ stocks, onViewOptions }) {
  const [view, setView]     = useState('high')
  const [sector, setSector] = useState('전체')

  const sectors = useMemo(() => {
    const set = new Set(stocks.map(s => s.sector).filter(Boolean))
    return ['전체', ...Array.from(set).sort()]
  }, [stocks])

  const enriched = useMemo(() => {
    return stocks
      .filter(s => s.w52High && s.w52Low && s.price)
      .map(s => ({
        ...s,
        fromHighPct: parseFloat(((s.price - s.w52High) / s.w52High * 100).toFixed(2)),
        fromLowPct:  parseFloat(((s.price - s.w52Low) / s.w52Low * 100).toFixed(2)),
        w52pct: ((s.price - s.w52Low) / (s.w52High - s.w52Low) * 100),
      }))
  }, [stocks])

  const list = useMemo(() => {
    let data = view === 'high'
      ? enriched.filter(s => s.fromHighPct >= -5).sort((a, b) => b.fromHighPct - a.fromHighPct)
      : enriched.filter(s => s.fromLowPct <= 10).sort((a, b) => a.fromLowPct - b.fromLowPct)
    if (sector !== '전체') data = data.filter(s => s.sector === sector)
    return data
  }, [enriched, view, sector])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex border border-gray-300 rounded overflow-hidden">
          <button onClick={() => setView('high')}
            className={`px-4 py-1.5 text-sm font-medium ${view === 'high' ? 'bg-red-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
            52주 신고가
          </button>
          <button onClick={() => setView('low')}
            className={`px-4 py-1.5 text-sm font-medium ${view === 'low' ? 'bg-blue-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
            52주 신저가
          </button>
        </div>
        <select value={sector} onChange={e => setSector(e.target.value)}
          className="text-xs border border-gray-300 rounded px-2 py-1.5">
          {sectors.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <span className="ml-auto text-xs text-gray-400">{list.length}종목 / S&P 500</span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-500">종목</th>
              <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-500">섹터</th>
              <th className="px-2 py-2 text-right text-[10px] font-semibold text-gray-500">현재가</th>
              <th className="px-2 py-2 text-right text-[10px] font-semibold text-gray-500">시가총액</th>
              <th className="px-2 py-2 text-right text-[10px] font-semibold text-gray-500">등락률</th>
              <th className="px-2 py-2 text-right text-[10px] font-semibold text-gray-500">52주 고가</th>
              <th className="px-2 py-2 text-right text-[10px] font-semibold text-gray-500">52주 저가</th>
              <th className="px-2 py-2 text-right text-[10px] font-semibold text-gray-500">고가 대비</th>
              <th className="px-2 py-2 text-center text-[10px] font-semibold text-gray-500 w-28">위치</th>
              <th className="px-2 py-2 text-center text-[10px] font-semibold text-gray-500 w-20"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {list.length === 0 && (
              <tr><td colSpan={10} className="text-center py-8 text-gray-400">해당 조건의 종목이 없습니다</td></tr>
            )}
            {list.map(s => {
              const isAtHigh = s.fromHighPct >= -1
              const isAtLow = s.fromLowPct <= 3
              return (
                <tr key={s.symbol} className={`hover:bg-gray-50 ${isAtHigh ? 'bg-red-50' : isAtLow ? 'bg-blue-50' : ''}`}>
                  <td className="px-2 py-1.5">
                    <span className="font-semibold text-blue-600">{s.symbol}</span>
                    <span className="ml-1 text-gray-500">{s.name}</span>
                  </td>
                  <td className="px-2 py-1.5 text-gray-500">{s.sector}</td>
                  <td className="px-2 py-1.5 text-right font-medium text-gray-900">${fmtNum(s.price)}</td>
                  <td className="px-2 py-1.5 text-right text-gray-600">{fmtCap(s.marketCap)}</td>
                  <td className={`px-2 py-1.5 text-right font-bold ${(s.changePct || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {(s.changePct || 0) >= 0 ? '+' : ''}{fmtNum(s.changePct)}%
                  </td>
                  <td className="px-2 py-1.5 text-right text-red-500">${fmtNum(s.w52High)}</td>
                  <td className="px-2 py-1.5 text-right text-blue-500">${fmtNum(s.w52Low)}</td>
                  <td className={`px-2 py-1.5 text-right font-medium ${s.fromHighPct >= 0 ? 'text-red-600' : 'text-gray-600'}`}>
                    {s.fromHighPct >= 0 ? '+' : ''}{s.fromHighPct}%
                  </td>
                  <td className="px-2 py-1.5">
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div className="bg-gradient-to-r from-blue-400 to-red-400 h-1.5 rounded-full"
                        style={{ width: `${Math.max(0, Math.min(100, s.w52pct)).toFixed(0)}%` }} />
                    </div>
                  </td>
                  <td className="px-2 py-1.5 text-center whitespace-nowrap">
                    <button onClick={() => onViewOptions?.(s.symbol)}
                      className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-700 hover:bg-purple-200">옵션</button>
                    <a href={`https://www.chartmill.com/stock/quote/${s.symbol}`}
                      target="_blank" rel="noopener noreferrer"
                      className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 inline-block">상세↗</a>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-400">
        ※ 52주 고가 대비 -5% 이내 = 신고가 근접, 52주 저가 대비 +10% 이내 = 신저가 근접. Yahoo Finance 기준.
      </p>
    </div>
  )
}

// ── 메인 컴포넌트 ──────────────────────────────────────────────────

const US_STOCK_SUBS = [
  { id: 'list',   label: '종목 리스트' },
  { id: 'week52', label: '52주 신고가/신저가' },
]

export default function UsStockTab({ onViewOptions }) {
  const [subTab, setSubTab]   = useState('list')
  const [stocks, setStocks]   = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)
  const [sortKey, setSortKey] = useState('marketCap')
  const [sortDir, setSortDir] = useState('desc')
  const [sector, setSector]   = useState('전체')
  const [search, setSearch]   = useState('')

  // 데이터 fetch
  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch('/api/yahoo/stocks')
      .then(r => {
        if (!r.ok) throw new Error(`API 오류: ${r.status}`)
        return r.json()
      })
      .then(data => {
        if (data.error) throw new Error(data.error)
        setStocks(data.stocks || [])
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  // 섹터 목록 (동적)
  const sectors = useMemo(() => {
    const set = new Set(stocks.map(s => s.sector).filter(Boolean))
    return ['전체', ...Array.from(set).sort()]
  }, [stocks])

  // 필터 + 정렬
  const filtered = useMemo(() => {
    let list = stocks
    if (sector !== '전체') list = list.filter(s => s.sector === sector)
    if (search) {
      const q = search.toUpperCase()
      list = list.filter(s => s.symbol.includes(q) || s.name.toUpperCase().includes(q))
    }
    return [...list].sort((a, b) => {
      const va = a[sortKey] ?? (sortDir === 'desc' ? -Infinity : Infinity)
      const vb = b[sortKey] ?? (sortDir === 'desc' ? -Infinity : Infinity)
      return sortDir === 'desc' ? vb - va : va - vb
    })
  }, [stocks, sector, search, sortKey, sortDir])

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const SortTh = ({ k, label, align = 'right' }) => (
    <th onClick={() => handleSort(k)}
      className={`px-2 py-2 text-${align} text-[10px] font-semibold text-gray-500 uppercase cursor-pointer hover:text-blue-600 select-none whitespace-nowrap`}>
      {label} {sortKey === k && (sortDir === 'desc' ? '▼' : '▲')}
    </th>
  )

  // 시장 요약 통계
  const summary = useMemo(() => {
    if (stocks.length === 0) return null
    const up = stocks.filter(s => s.changePct > 0).length
    const down = stocks.filter(s => s.changePct < 0).length
    const flat = stocks.length - up - down
    const avgPct = stocks.reduce((s, st) => s + (st.changePct || 0), 0) / stocks.length
    return { up, down, flat, avgPct, total: stocks.length }
  }, [stocks])

  return (
    <div data-testid="us-stock-tab">
      {/* 서브탭 */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex border border-gray-300 rounded overflow-hidden">
          {US_STOCK_SUBS.map(t => (
            <button key={t.id} onClick={() => setSubTab(t.id)}
              className={`px-3 py-1 text-xs font-medium ${
                subTab === t.id ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}>{t.label}</button>
          ))}
        </div>
      </div>

      {/* 로딩 */}
      {loading && (
        <div className="flex items-center justify-center py-20 bg-white rounded-lg border border-gray-200">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-3" />
          <span className="text-sm text-gray-500">S&P 500 종목 데이터 로딩 중... (약 5초)</span>
        </div>
      )}

      {/* 에러 */}
      {!loading && error && (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-lg border border-gray-200">
          <p className="text-3xl mb-2">⚠️</p>
          <p className="font-medium text-gray-600">데이터 로드 실패</p>
          <p className="text-xs text-red-500 mt-1">{error}</p>
        </div>
      )}

      {/* 52주 신고가/신저가 뷰 */}
      {!loading && !error && subTab === 'week52' && stocks.length > 0 && (
        <Week52UsView stocks={stocks} onViewOptions={onViewOptions} />
      )}

      {!loading && !error && subTab === 'list' && stocks.length > 0 && (
        <>
          {/* 시장 요약 */}
          {summary && (
            <div className="grid grid-cols-5 gap-3 mb-4">
              <div className="bg-white rounded-lg border border-gray-200 p-2.5 text-center shadow-sm">
                <p className="text-[10px] text-gray-400">S&P 500 종목</p>
                <p className="text-sm font-bold text-gray-900">{summary.total}개</p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-2.5 text-center shadow-sm">
                <p className="text-[10px] text-gray-400">평균 등락률</p>
                <p className={`text-sm font-bold ${summary.avgPct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {summary.avgPct >= 0 ? '+' : ''}{fmtNum(summary.avgPct)}%
                </p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-2.5 text-center shadow-sm">
                <p className="text-[10px] text-gray-400">상승</p>
                <p className="text-sm font-bold text-green-600">{summary.up}개</p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-2.5 text-center shadow-sm">
                <p className="text-[10px] text-gray-400">하락</p>
                <p className="text-sm font-bold text-red-600">{summary.down}개</p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-2.5 text-center shadow-sm">
                <p className="text-[10px] text-gray-400">보합</p>
                <p className="text-sm font-bold text-gray-500">{summary.flat}개</p>
              </div>
            </div>
          )}

          {/* 필터 바 */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <select value={sector} onChange={e => setSector(e.target.value)}
              className="text-xs border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:border-blue-500">
              {sectors.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="종목명 또는 심볼 검색"
              className="w-48 px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            />
            <span className="ml-auto text-xs text-gray-400">{filtered.length}종목</span>
          </div>

          {/* 테이블 */}
          <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
            <table className="w-full text-xs" data-testid="stock-table">
              <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                <tr>
                  <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-500 w-8">#</th>
                  <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-500 min-w-[140px]">종목</th>
                  <SortTh k="price" label="현재가" />
                  <SortTh k="changePct" label="등락률" />
                  <SortTh k="marketCap" label="시가총액" />
                  <SortTh k="pe" label="PER" />
                  <SortTh k="forwardPe" label="Fwd PE" />
                  <SortTh k="eps" label="EPS" />
                  <SortTh k="divYield" label="배당%" />
                  <SortTh k="volume" label="거래량" />
                  <SortTh k="targetMean" label="목표가" />
                  <SortTh k="targetDiffPct" label="괴리율" />
                  <th className="px-2 py-2 text-center text-[10px] font-semibold text-gray-500 w-24">52주</th>
                  <th className="px-2 py-2 text-center text-[10px] font-semibold text-gray-500 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {filtered.map((s, i) => {
                  const w52pct = s.w52High && s.w52Low ? ((s.price - s.w52Low) / (s.w52High - s.w52Low) * 100) : 0
                  return (
                    <tr key={s.symbol} className="hover:bg-gray-50">
                      <td className="px-2 py-1.5 text-gray-400">{i + 1}</td>
                      <td className="px-2 py-1.5">
                        <span className="font-semibold text-blue-600">{s.symbol}</span>
                        <span className="ml-1.5 text-gray-500 truncate">{s.name}</span>
                      </td>
                      <td className="px-2 py-1.5 text-right font-medium text-gray-900">${fmtNum(s.price)}</td>
                      <td className={`px-2 py-1.5 text-right font-bold ${(s.changePct || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {(s.changePct || 0) >= 0 ? '+' : ''}{fmtNum(s.changePct)}%
                      </td>
                      <td className="px-2 py-1.5 text-right text-gray-700">{fmtCap(s.marketCap)}</td>
                      <td className="px-2 py-1.5 text-right text-gray-700">{s.pe ? fmtNum(s.pe, 1) : '—'}</td>
                      <td className="px-2 py-1.5 text-right text-gray-700">{s.forwardPe ? fmtNum(s.forwardPe, 1) : '—'}</td>
                      <td className="px-2 py-1.5 text-right text-gray-700">{s.eps ? `$${fmtNum(s.eps)}` : '—'}</td>
                      <td className="px-2 py-1.5 text-right text-gray-700">{s.divYield ? `${fmtNum(s.divYield)}%` : '—'}</td>
                      <td className="px-2 py-1.5 text-right text-gray-600">{fmtVol(s.volume)}</td>
                      <td className="px-2 py-1.5 text-right text-gray-700">{s.targetMean ? `$${fmtNum(s.targetMean, 0)}` : '—'}</td>
                      <td className={`px-2 py-1.5 text-right font-medium ${(s.targetDiffPct || 0) > 0 ? 'text-green-600' : (s.targetDiffPct || 0) < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                        {s.targetDiffPct != null ? `${s.targetDiffPct > 0 ? '+' : ''}${fmtNum(s.targetDiffPct, 1)}%` : '—'}
                      </td>
                      <td className="px-2 py-1.5 w-24">
                        <div className="flex items-center gap-1">
                          <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                            <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${Math.max(0, Math.min(100, w52pct)).toFixed(0)}%` }} />
                          </div>
                          <span className="text-[9px] text-gray-400 w-7 text-right">{w52pct.toFixed(0)}%</span>
                        </div>
                      </td>
                      <td className="px-2 py-1.5 text-center whitespace-nowrap">
                        <button
                          onClick={() => onViewOptions?.(s.symbol)}
                          className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors"
                          title={`${s.symbol} 옵션 체인 보기`}
                        >
                          옵션
                        </button>
                        <a href={`https://www.chartmill.com/stock/quote/${s.symbol}`}
                          target="_blank" rel="noopener noreferrer"
                          className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors inline-block"
                          title={`${s.symbol} Chartmill 분석`}
                        >
                          상세↗
                        </a>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-gray-400 mt-2">
            ※ S&P 500 구성종목 기준 (Wikipedia). 시세: Yahoo Finance. 장중 15분 지연 가능.
          </p>
        </>
      )}
    </div>
  )
}
