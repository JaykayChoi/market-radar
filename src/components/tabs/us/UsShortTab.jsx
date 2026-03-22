import React, { useState, useEffect, useMemo } from 'react'
import { Treemap, ResponsiveContainer, Tooltip } from 'recharts'

// ── 포맷 유틸 ────────────────────────────────────────────────────────
function fmtCap(v) {
  if (v == null) return '—'
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`
  if (v >= 1e9)  return `$${(v / 1e9).toFixed(1)}B`
  if (v >= 1e6)  return `$${(v / 1e6).toFixed(0)}M`
  return `$${v.toLocaleString()}`
}
function fmtShares(v) {
  if (v == null) return '—'
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`
  return v.toLocaleString()
}
function pctChange(cur, prev) {
  if (!prev || !cur) return 0
  return ((cur - prev) / prev * 100)
}
function floatColor(pct) {
  if (pct >= 20) return { bg: '#dc2626', text: '#fff' }
  if (pct >= 15) return { bg: '#ea580c', text: '#fff' }
  if (pct >= 10) return { bg: '#d97706', text: '#fff' }
  if (pct >= 7)  return { bg: '#ca8a04', text: '#fff' }
  if (pct >= 5)  return { bg: '#65a30d', text: '#fff' }
  return { bg: '#16a34a', text: '#fff' }
}
function dtcBadge(dtc) {
  if (dtc == null) return 'bg-gray-100 text-gray-500'
  if (dtc >= 5) return 'bg-red-100 text-red-700'
  if (dtc >= 3) return 'bg-orange-100 text-orange-700'
  if (dtc >= 2) return 'bg-yellow-100 text-yellow-700'
  return 'bg-green-100 text-green-700'
}

// ── Treemap 커스텀 셀 ─────────────────────────────────────────────────
function TreemapCell(props) {
  const { x, y, width, height } = props
  const sym = props.symbol || props.name || ''
  const pct = props.shortPctFloat ?? 0
  if (!width || !height || width < 4 || height < 4) return null
  const c = floatColor(pct)
  const showSymbol = width > 42 && height > 20
  const showPct = width > 50 && height > 36
  const fontSize = Math.min(12, Math.max(8, width / 6))
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} rx={3}
        fill={c.bg} stroke="#fff" strokeWidth={2} style={{ cursor: 'pointer' }} />
      {showSymbol && (
        <text x={x + width / 2} y={y + height / 2 - (showPct ? 6 : 0)}
          textAnchor="middle" dominantBaseline="central"
          fill={c.text} fontSize={fontSize} fontWeight="bold">
          {sym}
        </text>
      )}
      {showPct && (
        <text x={x + width / 2} y={y + height / 2 + 10}
          textAnchor="middle" dominantBaseline="central"
          fill={c.text} fontSize={fontSize - 1} opacity={0.9}>
          {pct.toFixed(1)}%
        </text>
      )}
    </g>
  )
}

// ── 메인 컴포넌트 ────────────────────────────────────────────────────
export default function UsShortTab() {
  const [stocks, setStocks]     = useState([])
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)
  const [selected, setSelected] = useState(null)
  const [sortKey, setSortKey]   = useState('shortPctFloat')
  const [sortDir, setSortDir]   = useState('desc')
  const [sector, setSector]     = useState('전체')
  const [search, setSearch]     = useState('')
  const [view, setView]         = useState('all')

  // 데이터 fetch
  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch('/api/yahoo/short')
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

  const sectors = useMemo(() => {
    const set = new Set(stocks.map(s => s.sector).filter(Boolean))
    return ['전체', ...Array.from(set).sort()]
  }, [stocks])

  const filtered = useMemo(() => {
    let list = stocks
    if (sector !== '전체') list = list.filter(s => s.sector === sector)
    if (search) {
      const q = search.toUpperCase()
      list = list.filter(s => s.symbol.includes(q) || (s.name || '').toUpperCase().includes(q))
    }
    return [...list].sort((a, b) => {
      const va = a[sortKey] ?? (sortDir === 'desc' ? -Infinity : Infinity)
      const vb = b[sortKey] ?? (sortDir === 'desc' ? -Infinity : Infinity)
      return sortDir === 'desc' ? vb - va : va - vb
    })
  }, [stocks, sector, search, sortKey, sortDir])

  const treemapData = useMemo(() =>
    filtered.filter(s => s.shortInterest > 0).map(s => ({
      name: s.symbol, symbol: s.symbol,
      size: s.shortInterest, shortPctFloat: s.shortPctFloat ?? 0,
    }))
  , [filtered])

  const stats = useMemo(() => {
    const list = filtered.filter(s => s.shortPctFloat != null)
    if (!list.length) return { avg: 0, max: null, avgDtc: 0, hotCount: 0 }
    const avg = list.reduce((s, i) => s + i.shortPctFloat, 0) / list.length
    const max = list.reduce((m, i) => (i.shortPctFloat || 0) > (m.shortPctFloat || 0) ? i : m, list[0])
    const dtcList = list.filter(i => i.daysToCover != null)
    const avgDtc = dtcList.length ? dtcList.reduce((s, i) => s + i.daysToCover, 0) / dtcList.length : 0
    const hotCount = list.filter(i => i.shortPctFloat >= 15).length
    return { avg, max, avgDtc, hotCount }
  }, [filtered])

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

  const detail = selected ? stocks.find(s => s.symbol === selected) : null
  const chg = detail ? pctChange(detail.shortInterest, detail.prevShortInterest) : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3"></div>
          <div className="text-sm text-gray-500">S&P 500 공매도 데이터 로딩 중...</div>
          <div className="text-xs text-gray-400 mt-1">약 500종목 조회 (최대 1-2분 소요)</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <div className="text-red-600 font-semibold mb-1">데이터 로드 실패</div>
        <div className="text-sm text-red-500">{error}</div>
        <button onClick={() => window.location.reload()} className="mt-3 px-4 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700">
          새로고침
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* ── 요약 카드 ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-lg border p-3">
          <div className="text-xs text-gray-500">평균 Short% Float</div>
          <div className="text-xl font-bold text-gray-900">{stats.avg.toFixed(1)}%</div>
        </div>
        <div className="bg-white rounded-lg border p-3">
          <div className="text-xs text-gray-500">최고 Short% Float</div>
          <div className="text-xl font-bold text-red-600">
            {stats.max?.symbol} {stats.max?.shortPctFloat?.toFixed(1)}%
          </div>
        </div>
        <div className="bg-white rounded-lg border p-3">
          <div className="text-xs text-gray-500">평균 Days to Cover</div>
          <div className="text-xl font-bold text-gray-900">{stats.avgDtc.toFixed(1)}일</div>
        </div>
        <div className="bg-white rounded-lg border p-3">
          <div className="text-xs text-gray-500">과열 종목 (15%+)</div>
          <div className="text-xl font-bold text-orange-600">{stats.hotCount}개</div>
        </div>
      </div>

      {/* ── 필터 바 ── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1">
          <button onClick={() => setView('all')}
            className={`px-3 py-1.5 text-xs rounded border transition-colors ${view === 'all' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'}`}>
            테이블 + 히트맵
          </button>
          <button onClick={() => setView('heatmap')}
            className={`px-3 py-1.5 text-xs rounded border transition-colors ${view === 'heatmap' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'}`}>
            히트맵 전체
          </button>
        </div>
        <select value={sector} onChange={e => setSector(e.target.value)}
          className="border rounded px-2 py-1.5 text-xs bg-white">
          {sectors.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="종목 검색 (심볼/이름)"
          className="border rounded px-3 py-1.5 text-xs w-48" />
        <span className="text-xs text-gray-400 ml-auto">{filtered.length}종목</span>
      </div>

      {/* ── 히트맵 ── */}
      {treemapData.length > 0 && (
        <div className="bg-white rounded-lg border p-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-700">Short Interest 히트맵</h3>
            <div className="flex items-center gap-1 text-[10px] text-gray-500">
              <span>크기: Short Interest</span>
              <span className="mx-1">|</span>
              <span>색상: Short% Float</span>
              <span className="ml-2 inline-flex items-center gap-1">
                <span className="w-3 h-3 rounded" style={{ background: '#16a34a' }}></span>낮음
                <span className="w-3 h-3 rounded" style={{ background: '#d97706' }}></span>중간
                <span className="w-3 h-3 rounded" style={{ background: '#dc2626' }}></span>높음
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={view === 'heatmap' ? 500 : 280}>
            <Treemap
              data={treemapData}
              dataKey="size"
              nameKey="name"
              content={<TreemapCell />}
              onClick={(node) => node?.symbol && setSelected(node.symbol)}
              isAnimationActive={false}
            >
              <Tooltip
                content={({ payload }) => {
                  if (!payload?.[0]) return null
                  const d = payload[0].payload
                  return (
                    <div className="bg-gray-900 text-white text-xs rounded px-3 py-2 shadow-lg">
                      <div className="font-bold">{d.symbol}</div>
                      <div>Short% Float: {d.shortPctFloat?.toFixed(1)}%</div>
                      <div>Short Interest: {fmtShares(d.size)}</div>
                    </div>
                  )
                }}
              />
            </Treemap>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── 테이블 + 상세 패널 ── */}
      {view === 'all' && (
        <div className="flex gap-4">
          {/* 왼쪽: 테이블 */}
          <div className="flex-1 min-w-0">
            <div className="bg-white rounded-lg border overflow-hidden">
              <div className="overflow-x-auto" style={{ maxHeight: 520 }}>
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-500 w-8">#</th>
                      <SortTh k="symbol" label="종목" align="left" />
                      <SortTh k="shortPctFloat" label="Short% Float" />
                      <SortTh k="daysToCover" label="DTC" />
                      <SortTh k="shortInterest" label="Short Interest" />
                      <SortTh k="marketCap" label="시가총액" />
                      <th className="px-2 py-2 text-right text-[10px] font-semibold text-gray-500">변동</th>
                      <th className="px-2 py-2 text-center text-[10px] font-semibold text-gray-500 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtered.map((s, i) => {
                      const chg = pctChange(s.shortInterest, s.prevShortInterest)
                      const isSelected = selected === s.symbol
                      return (
                        <tr key={s.symbol}
                          onClick={() => setSelected(s.symbol)}
                          className={`cursor-pointer transition-colors ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                          <td className="px-2 py-2 text-gray-400">{i + 1}</td>
                          <td className="px-2 py-2">
                            <div className="font-semibold text-gray-900">{s.symbol}</div>
                            <div className="text-[10px] text-gray-400 truncate max-w-[120px]">{s.name}</div>
                          </td>
                          <td className="px-2 py-2 text-right">
                            {s.shortPctFloat != null ? (
                              <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                s.shortPctFloat >= 15 ? 'bg-red-100 text-red-700' :
                                s.shortPctFloat >= 10 ? 'bg-orange-100 text-orange-700' :
                                s.shortPctFloat >= 5  ? 'bg-yellow-100 text-yellow-700' :
                                'bg-green-100 text-green-700'
                              }`}>
                                {s.shortPctFloat.toFixed(1)}%
                              </span>
                            ) : '—'}
                          </td>
                          <td className="px-2 py-2 text-right">
                            {s.daysToCover != null ? (
                              <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${dtcBadge(s.daysToCover)}`}>
                                {s.daysToCover.toFixed(1)}
                              </span>
                            ) : '—'}
                          </td>
                          <td className="px-2 py-2 text-right text-gray-700">{fmtShares(s.shortInterest)}</td>
                          <td className="px-2 py-2 text-right text-gray-500">{fmtCap(s.marketCap)}</td>
                          <td className={`px-2 py-2 text-right font-medium ${chg >= 0 ? 'text-red-500' : 'text-blue-500'}`}>
                            {s.prevShortInterest ? `${chg >= 0 ? '+' : ''}${chg.toFixed(1)}%` : '—'}
                          </td>
                          <td className="px-2 py-2 text-center">
                            <a href={`https://www.chartmill.com/stock/quote/${s.symbol}`}
                              target="_blank" rel="noopener noreferrer"
                              className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
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
            </div>
          </div>

          {/* 오른쪽: 상세 패널 */}
          <div className="w-72 flex-shrink-0">
            {detail ? (
              <div className="bg-white rounded-lg border p-4 sticky top-4 space-y-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-gray-900">{detail.symbol}</span>
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">{detail.sector}</span>
                  </div>
                  <div className="text-sm text-gray-500 mt-0.5">{detail.name}</div>
                  {detail.price != null && (
                    <div className="text-lg font-semibold text-gray-800 mt-1">${detail.price.toFixed(2)}</div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-[10px] text-gray-400 uppercase">Short% Float</div>
                    <div className={`text-base font-bold ${
                      (detail.shortPctFloat || 0) >= 15 ? 'text-red-600' :
                      (detail.shortPctFloat || 0) >= 10 ? 'text-orange-600' : 'text-gray-900'
                    }`}>
                      {detail.shortPctFloat != null ? `${detail.shortPctFloat.toFixed(2)}%` : '—'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-400 uppercase">Days to Cover</div>
                    <div className="text-base font-bold text-gray-900">
                      {detail.daysToCover != null ? `${detail.daysToCover.toFixed(1)}일` : '—'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-400 uppercase">Short Interest</div>
                    <div className="text-sm font-semibold text-gray-800">{fmtShares(detail.shortInterest)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-400 uppercase">시가총액</div>
                    <div className="text-sm font-semibold text-gray-800">{fmtCap(detail.marketCap)}</div>
                  </div>
                </div>

                {/* 공매도 비율 게이지 */}
                {detail.shortPctFloat != null && (
                  <div>
                    <div className="text-[10px] text-gray-400 uppercase mb-1">Short% Float 게이지</div>
                    <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(detail.shortPctFloat / 30 * 100, 100)}%`,
                          background: 'linear-gradient(90deg, #16a34a, #d97706, #dc2626)',
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-[9px] text-gray-400 mt-0.5">
                      <span>0%</span><span>15%</span><span>30%+</span>
                    </div>
                  </div>
                )}

                {/* 전월 대비 변동 */}
                {detail.prevShortInterest != null && (
                  <div>
                    <div className="text-[10px] text-gray-400 uppercase mb-1">전월 대비 Short Interest 변동</div>
                    <div className="flex items-center gap-2">
                      <span className={`text-base font-bold ${chg >= 0 ? 'text-red-500' : 'text-blue-500'}`}>
                        {chg >= 0 ? '+' : ''}{chg.toFixed(1)}%
                      </span>
                      <span className="text-xs text-gray-400">
                        ({fmtShares(detail.prevShortInterest)} → {fmtShares(detail.shortInterest)})
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2 mt-1.5 overflow-hidden">
                      <div className={`h-full rounded-full ${chg >= 0 ? 'bg-red-400' : 'bg-blue-400'}`}
                        style={{ width: `${Math.min(Math.abs(chg) / 15 * 100, 100)}%` }} />
                    </div>
                  </div>
                )}

                {/* Shares Float 비율 시각화 */}
                {detail.shortPctFloat != null && (
                  <div>
                    <div className="text-[10px] text-gray-400 uppercase mb-1">유통주식 대비 공매도</div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden flex">
                        <div className="bg-red-400 h-full flex items-center justify-center text-[9px] text-white font-bold"
                          style={{ width: `${Math.min(detail.shortPctFloat, 100)}%`, minWidth: detail.shortPctFloat > 3 ? '30px' : '0' }}>
                          {detail.shortPctFloat > 5 ? `${detail.shortPctFloat.toFixed(0)}%` : ''}
                        </div>
                        <div className="bg-blue-100 h-full flex-1 flex items-center justify-center text-[9px] text-blue-600">
                          Float
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 외부 링크 */}
                <div className="flex flex-wrap gap-2">
                  <a href={`https://www.chartmill.com/stock/quote/${detail.symbol}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex-1 text-center px-2 py-1.5 text-[10px] font-medium bg-purple-50 text-purple-600 rounded border border-purple-200 hover:bg-purple-100 transition-colors">
                    Chartmill 분석
                  </a>
                  <a href={`https://www.nasdaq.com/market-activity/stocks/${detail.symbol.toLowerCase()}/short-interest`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex-1 text-center px-2 py-1.5 text-[10px] font-medium bg-blue-50 text-blue-600 rounded border border-blue-200 hover:bg-blue-100 transition-colors">
                    Nasdaq 공매도
                  </a>
                  <a href={`https://finviz.com/quote.ashx?t=${detail.symbol}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex-1 text-center px-2 py-1.5 text-[10px] font-medium bg-green-50 text-green-600 rounded border border-green-200 hover:bg-green-100 transition-colors">
                    Finviz 분석
                  </a>
                </div>

                {/* 기준일 */}
                {detail.shortDate && (
                  <div className="text-[10px] text-gray-400 text-right">
                    기준일: {detail.shortDate}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-lg border p-8 text-center">
                <div className="text-gray-300 text-4xl mb-2">📊</div>
                <div className="text-sm text-gray-400">종목을 클릭하면<br />상세 정보가 표시됩니다</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
