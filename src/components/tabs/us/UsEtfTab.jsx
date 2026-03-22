import React, { useState, useEffect } from 'react'

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

function PctCell({ v }) {
  if (v == null) return <td className="px-3 py-2 text-right text-gray-400 text-sm">—</td>
  const color = v > 0 ? 'text-green-600' : v < 0 ? 'text-red-600' : 'text-gray-600'
  const sign  = v > 0 ? '+' : ''
  return <td className={`px-3 py-2 text-right text-sm font-medium ${color}`}>{sign}{v.toFixed(2)}%</td>
}

export default function UsEtfTab() {
  const [data, setData]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [category, setCategory] = useState('전체')
  const [sortBy, setSortBy]     = useState('aum')
  const [sortDir, setSortDir]   = useState('desc')

  useEffect(() => {
    setLoading(true)
    fetch('/api/etf/summary')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  if (loading) return (
    <div data-testid="loading" className="flex items-center justify-center py-16 text-gray-500">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-3" />
        <p className="text-sm">ETF 데이터 조회 중...</p>
      </div>
    </div>
  )

  if (error) return (
    <div data-testid="error" className="flex items-center justify-center py-16 text-red-500">
      <p className="text-sm">오류: {error}</p>
    </div>
  )

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
      <th
        onClick={() => handleSort(col)}
        className={`px-3 py-2 ${right ? 'text-right' : 'text-left'} text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-900 whitespace-nowrap`}
      >
        {label}{arrow}
      </th>
    )
  }

  return (
    <div data-testid="us-etf-tab">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">미국 ETF</h2>
        <span className="text-xs text-gray-400">가격/성과: Yahoo Finance · AUM: FMP</span>
      </div>

      {/* 카테고리 필터 */}
      <div className="flex flex-wrap gap-2 mb-4">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            data-testid={`filter-${cat}`}
            onClick={() => setCategory(cat)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              category === cat
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400 hover:text-blue-600'
            }`}
          >
            {cat}
          </button>
        ))}
        <span className="ml-auto text-xs text-gray-400 self-center">{sorted.length}개 ETF</span>
      </div>

      {/* 테이블 */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
        <table className="w-full text-sm" data-testid="etf-table">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Symbol</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Category</th>
              <SortTh col="price"     label="Price" />
              <SortTh col="changePct" label="Day%" />
              <SortTh col="aum"       label="AUM" />
              <SortTh col="perf1W"    label="1W%" />
              <SortTh col="perf1M"    label="1M%" />
              <SortTh col="perf3M"    label="3M%" />
              <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 w-12"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {sorted.map(etf => (
              <tr key={etf.symbol} data-testid={`etf-row-${etf.symbol}`} className="hover:bg-gray-50 transition-colors">
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
                    className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                    title={`${etf.symbol} Chartmill 분석`}
                  >
                    상세↗
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-400 mt-2">
        자금 유출입 데이터는 추후 추가 예정
      </p>
    </div>
  )
}
