import React, { useState, useEffect, useMemo } from 'react'

// ── 공용 유틸 ──────────────────────────────────────────────────────

const CATEGORIES = ['전체', 'US Equity', 'International', 'Fixed Income', 'Commodities', 'Sector', 'Leverage']

function fmtAum(v) {
  if (v == null) return '—'
  if (v >= 1e12) return `$${(v / 1e12).toFixed(1)}T`
  if (v >= 1e9)  return `$${(v / 1e9).toFixed(1)}B`
  if (v >= 1e6)  return `$${(v / 1e6).toFixed(0)}M`
  return `$${v.toLocaleString()}`
}

function fmtPrice(v) {
  if (v == null) return '—'
  return `$${v.toFixed(2)}`
}

function fmtPct(v) {
  if (v == null) return '—'
  const sign = v > 0 ? '+' : ''
  return `${sign}${v.toFixed(2)}%`
}

function fmtFlow(v) {
  if (v == null) return '—'
  const abs = Math.abs(v)
  let s
  if (abs >= 1e12) s = `${(abs / 1e12).toFixed(1)}T`
  else if (abs >= 1e9) s = `${(abs / 1e9).toFixed(1)}B`
  else if (abs >= 1e6) s = `${(abs / 1e6).toFixed(0)}M`
  else s = abs.toLocaleString()
  return v >= 0 ? `+$${s}` : `-$${s}`
}

function PctCell({ v }) {
  if (v == null) return <td className="px-3 py-2 text-right text-gray-400 text-sm">—</td>
  const color = v > 0 ? 'text-green-600' : v < 0 ? 'text-red-600' : 'text-gray-600'
  const sign  = v > 0 ? '+' : ''
  return <td className={`px-3 py-2 text-right text-sm font-medium ${color}`}>{sign}{v.toFixed(2)}%</td>
}

// ── Flow Bar ───────────────────────────────────────────────────────

function FlowBar({ value, maxAbs }) {
  if (value == null || maxAbs === 0) return <div className="w-full h-4" />
  const pct = Math.min(Math.abs(value) / maxAbs * 100, 100)
  const isPositive = value >= 0
  return (
    <div className="flex items-center h-4 w-full">
      <div className="flex-1 flex justify-end">
        {!isPositive && <div className="h-3 rounded-l bg-red-400" style={{ width: `${pct}%` }} />}
      </div>
      <div className="w-px h-4 bg-gray-300 flex-shrink-0" />
      <div className="flex-1">
        {isPositive && <div className="h-3 rounded-r bg-green-400" style={{ width: `${pct}%` }} />}
      </div>
    </div>
  )
}

// ── 시세 뷰 ────────────────────────────────────────────────────────

function PriceView({ data }) {
  const [category, setCategory] = useState('전체')
  const [sortBy, setSortBy]     = useState('aum')
  const [sortDir, setSortDir]   = useState('desc')

  const handleSort = col => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('desc') }
  }

  const filtered = data.filter(e => category === '전체' || e.category === category)
  const sorted   = [...filtered].sort((a, b) => {
    const va = a[sortBy] ?? -Infinity
    const vb = b[sortBy] ?? -Infinity
    return sortDir === 'asc' ? va - vb : vb - va
  })

  const SortTh = ({ col, label, right = true }) => {
    const active = sortBy === col
    const arrow  = active ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''
    return (
      <th onClick={() => handleSort(col)}
        className={`px-3 py-2 ${right ? 'text-right' : 'text-left'} text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-900 whitespace-nowrap`}>
        {label}{arrow}
      </th>
    )
  }

  return (
    <>
      <div className="flex flex-wrap gap-2 mb-4">
        {CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setCategory(cat)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              category === cat
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400 hover:text-blue-600'
            }`}>{cat}</button>
        ))}
        <span className="ml-auto text-xs text-gray-400 self-center">{sorted.length}개 ETF</span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Symbol</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Name</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 hidden md:table-cell">Category</th>
              <SortTh col="price" label="Price" />
              <SortTh col="changePct" label="Day%" />
              <SortTh col="aum" label="AUM" />
              <SortTh col="perf1W" label="1W%" />
              <SortTh col="perf1M" label="1M%" />
              <SortTh col="perf3M" label="3M%" />
              <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 w-12"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {sorted.map(etf => (
              <tr key={etf.symbol} className="hover:bg-gray-50 transition-colors">
                <td className="px-3 py-2 font-semibold text-blue-600 whitespace-nowrap">{etf.symbol}</td>
                <td className="px-3 py-2 text-gray-700 max-w-xs truncate">{etf.name}</td>
                <td className="px-3 py-2 hidden md:table-cell">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{etf.category}</span>
                </td>
                <td className="px-3 py-2 text-right font-medium text-gray-900 whitespace-nowrap">{fmtPrice(etf.price)}</td>
                <PctCell v={etf.changePct} />
                <td className="px-3 py-2 text-right text-gray-600 whitespace-nowrap">{fmtAum(etf.aum)}</td>
                <PctCell v={etf.perf1W} />
                <PctCell v={etf.perf1M} />
                <PctCell v={etf.perf3M} />
                <td className="px-3 py-2 text-center">
                  <a href={`https://www.chartmill.com/stock/quote/${etf.symbol}`}
                    target="_blank" rel="noopener noreferrer"
                    className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700 hover:bg-blue-200">상세↗</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

// ── 자금흐름 뷰 ────────────────────────────────────────────────────

const FLOW_PERIOD = [
  { id: '1W', label: '1주' },
  { id: '1M', label: '1개월' },
  { id: '3M', label: '3개월' },
]

function FlowView() {
  const [flows, setFlows]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [category, setCategory] = useState('all')
  const [period, setPeriod]     = useState('1W')
  const [sortBy, setSortBy]     = useState('flow')
  const [sortDir, setSortDir]   = useState('desc')
  const [holdingsSymbol, setHoldingsSymbol] = useState(null)
  const [holdings, setHoldings] = useState([])
  const [holdingsLoading, setHoldingsLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetch('/api/etf/fund-flows')
      .then(r => { if (!r.ok) throw new Error(`API 오류: ${r.status}`); return r.json() })
      .then(d => setFlows(Array.isArray(d) ? d : []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!holdingsSymbol) return
    setHoldingsLoading(true)
    fetch(`/api/etf/holdings?symbol=${holdingsSymbol}`)
      .then(r => r.json())
      .then(d => setHoldings(d.holdings || []))
      .catch(() => setHoldings([]))
      .finally(() => setHoldingsLoading(false))
  }, [holdingsSymbol])

  const flowKey = period === '1W' ? 'flowProxy1W' : period === '1M' ? 'flowProxy1M' : 'flowProxy3M'

  const filtered = useMemo(() => {
    let data = flows
    if (category !== 'all') data = data.filter(e => e.category === category)
    return [...data].sort((a, b) => {
      let va, vb
      if (sortBy === 'flow') { va = a[flowKey] ?? 0; vb = b[flowKey] ?? 0 }
      else if (sortBy === 'aum') { va = a.aum ?? 0; vb = b.aum ?? 0 }
      else if (sortBy === 'changePct') { va = a.changePct ?? 0; vb = b.changePct ?? 0 }
      else { va = a[sortBy] ?? 0; vb = b[sortBy] ?? 0 }
      return sortDir === 'desc' ? vb - va : va - vb
    })
  }, [flows, category, period, sortBy, sortDir, flowKey])

  const maxFlowAbs = useMemo(() => Math.max(...filtered.map(e => Math.abs(e[flowKey] ?? 0)), 1), [filtered, flowKey])

  const categorySummary = useMemo(() => {
    const map = {}
    for (const e of flows) {
      if (!map[e.category]) map[e.category] = { inflow: 0, outflow: 0, totalAum: 0, count: 0 }
      const f = e[flowKey] ?? 0
      if (f > 0) map[e.category].inflow += f
      else map[e.category].outflow += f
      map[e.category].totalAum += e.aum ?? 0
      map[e.category].count++
    }
    return map
  }, [flows, flowKey])

  const handleSort = col => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('desc') }
  }

  const SortTh = ({ col, label, right = true }) => {
    const active = sortBy === col
    const arrow = active ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''
    return (
      <th onClick={() => handleSort(col)}
        className={`px-3 py-2 ${right ? 'text-right' : 'text-left'} text-xs font-semibold text-gray-500 cursor-pointer hover:text-gray-900 whitespace-nowrap select-none`}>
        {label}{arrow}
      </th>
    )
  }

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-3" />
      <span className="text-sm text-gray-500">자금흐름 데이터 로딩 중...</span>
    </div>
  )

  if (error) return (
    <div className="flex flex-col items-center justify-center py-16">
      <p className="text-3xl mb-2">⚠️</p>
      <p className="font-medium text-gray-600">데이터 로드 실패</p>
      <p className="text-xs text-red-500 mt-1">{error}</p>
    </div>
  )

  return (
    <>
      {/* 기간 + 카테고리 */}
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <div className="flex gap-1">
          {FLOW_PERIOD.map(p => (
            <button key={p.id} onClick={() => setPeriod(p.id)}
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                period === p.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>{p.label}</button>
          ))}
        </div>
        <div className="flex gap-1">
          <button onClick={() => setCategory('all')}
            className={`px-3 py-1 rounded text-xs font-medium ${category === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>전체</button>
          {CATEGORIES.slice(1).map(c => (
            <button key={c} onClick={() => setCategory(c)}
              className={`px-3 py-1 rounded text-xs font-medium ${category === c ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{c}</button>
          ))}
        </div>
      </div>

      {/* 카테고리 요약 카드 */}
      {category === 'all' && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
          {Object.entries(categorySummary).map(([cat, s]) => {
            const net = s.inflow + s.outflow
            return (
              <div key={cat} onClick={() => setCategory(cat)}
                className="bg-white rounded-lg border border-gray-200 p-3 cursor-pointer hover:border-blue-300 transition-colors">
                <p className="text-xs font-semibold text-gray-700 mb-1">{cat}</p>
                <p className="text-xs text-gray-400">{s.count}개 · {fmtAum(s.totalAum)}</p>
                <p className={`text-sm font-bold mt-1 ${net > 0 ? 'text-green-600' : net < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                  {fmtFlow(net)}
                </p>
              </div>
            )
          })}
        </div>
      )}

      {/* 테이블 + 보유종목 패널 */}
      <div className="flex gap-4">
        <div className="flex-1 bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <SortTh col="symbol" label="종목" right={false} />
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">이름</th>
                <SortTh col="aum" label="AUM" />
                <SortTh col="changePct" label="등락%" />
                <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 w-40">자금흐름</th>
                <SortTh col="flow" label="Flow ($)" />
                <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 w-16">보유</th>
                <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="text-center py-8 text-gray-400">해당 카테고리 ETF가 없습니다</td></tr>
              )}
              {filtered.map(e => {
                const flowVal = e[flowKey]
                const isPositive = (flowVal ?? 0) >= 0
                return (
                  <tr key={e.symbol} className="hover:bg-blue-50 transition-colors">
                    <td className="px-3 py-2 text-xs font-bold text-gray-900">{e.symbol}</td>
                    <td className="px-3 py-2 text-xs text-gray-600 truncate max-w-[160px]">{e.name}</td>
                    <td className="px-3 py-2 text-right text-xs text-gray-700">{fmtAum(e.aum)}</td>
                    <td className={`px-3 py-2 text-right text-xs font-medium ${
                      (e.changePct ?? 0) > 0 ? 'text-green-600' : (e.changePct ?? 0) < 0 ? 'text-red-600' : 'text-gray-500'
                    }`}>{fmtPct(e.changePct)}</td>
                    <td className="px-3 py-2"><FlowBar value={flowVal} maxAbs={maxFlowAbs} /></td>
                    <td className={`px-3 py-2 text-right text-xs font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                      {fmtFlow(flowVal)}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button onClick={() => setHoldingsSymbol(holdingsSymbol === e.symbol ? null : e.symbol)}
                        className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                          holdingsSymbol === e.symbol ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}>TOP20</button>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <a href={`https://www.chartmill.com/stock/quote/${e.symbol}`}
                        target="_blank" rel="noopener noreferrer"
                        className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700 hover:bg-blue-200">상세↗</a>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* 보유종목 패널 */}
        {holdingsSymbol && (
          <div className="w-72 flex-shrink-0">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden sticky top-4">
              <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 flex items-center justify-between">
                <p className="text-sm font-bold text-gray-900">{holdingsSymbol} TOP20</p>
                <button onClick={() => setHoldingsSymbol(null)} className="text-xs text-gray-400 hover:text-gray-600">✕</button>
              </div>
              {holdingsLoading ? (
                <div className="p-4 text-center text-xs text-gray-400">
                  <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  로딩 중...
                </div>
              ) : holdings.length === 0 ? (
                <div className="p-4 text-center text-xs text-gray-400">보유종목 데이터가 없습니다</div>
              ) : (
                <div className="max-h-[calc(100vh-280px)] overflow-y-auto divide-y divide-gray-50">
                  {holdings.map((h, i) => (
                    <div key={i} className="px-3 py-1.5 flex items-center gap-2">
                      <span className="text-[10px] text-gray-400 w-4">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-medium text-gray-900">{h.asset}</span>
                        {h.name && <p className="text-[10px] text-gray-400 truncate">{h.name}</p>}
                      </div>
                      <span className="text-xs font-semibold text-blue-600">
                        {h.weight != null ? `${h.weight.toFixed(2)}%` : '—'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-4 mt-3 text-xs text-gray-400">
        <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-green-400" /> 유입</span>
        <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-red-400" /> 유출</span>
        <span className="ml-auto">※ Volume-Weighted Money Flow 추정치. AUM: FMP. 보유종목: FMP ETF Holder.</span>
      </div>
    </>
  )
}

// ── 메인 컴포넌트 ──────────────────────────────────────────────────

const SUB_TABS = [
  { id: 'price', label: '시세/성과' },
  { id: 'flow',  label: '자금흐름' },
]

export default function UsEtfTab() {
  const [subTab, setSubTab]   = useState('price')
  const [data, setData]       = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    setLoading(true)
    fetch('/api/etf/summary')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  return (
    <div data-testid="us-etf-tab">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-gray-800">미국 ETF</h2>
          <div className="flex border border-gray-300 rounded overflow-hidden">
            {SUB_TABS.map(t => (
              <button key={t.id} onClick={() => setSubTab(t.id)}
                className={`px-3 py-1 text-xs font-medium ${
                  subTab === t.id ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}>{t.label}</button>
            ))}
          </div>
        </div>
        <span className="text-xs text-gray-400">Yahoo Finance · FMP</span>
      </div>

      {subTab === 'price' && (
        loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-3" />
            <p className="text-sm text-gray-500 ml-3">ETF 데이터 조회 중...</p>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-16 text-red-500">
            <p className="text-sm">오류: {error}</p>
          </div>
        ) : (
          <PriceView data={data} />
        )
      )}

      {subTab === 'flow' && <FlowView />}
    </div>
  )
}
