import React, { useEffect, useState, useMemo } from 'react'
import DataTable from '../DataTable'

// ── 거래량 급등 뷰 ─────────────────────────────────────────────────

const SURGE_COLUMNS = [
  { key: 'name',        label: '종목명',       type: 'text'    },
  { key: 'surge_ratio', label: '증가율(배수)',  type: 'number'  },
  { key: 'close',       label: '현재가',        type: 'number'  },
  { key: 'change_rate', label: '등락률(%)',     type: 'percent' },
  { key: 'volume',      label: '거래량',        type: 'number'  },
  { key: 'prev_volume', label: '전일거래량',    type: 'number'  },
  { key: 'per',         label: 'PER',           type: 'number'  },
  { key: '_link',       label: '',              type: 'link', href: row => `https://alphasquare.co.kr/home/stock-summary?code=${row.code}`, linkLabel: '종목' },
]

const MARKETS = [
  { id: 'all',    label: '전체'   },
  { id: 'kospi',  label: '코스피' },
  { id: 'kosdaq', label: '코스닥' },
]

function SurgeView() {
  const [rawData, setRawData] = useState([])
  const [loading, setLoading] = useState(false)
  const [market, setMarket] = useState('all')

  useEffect(() => {
    setLoading(true)
    fetch('/api/naver/volume_surge')
      .then(r => r.json())
      .then(res => setRawData(Array.isArray(res.data) ? res.data : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const data = useMemo(() => {
    if (market === 'all') return rawData
    return rawData.filter(r => r.market === market)
  }, [market, rawData])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm font-medium text-gray-700">시장</span>
        <div className="flex flex-wrap gap-2">
          {MARKETS.map(m => (
            <button key={m.id} onClick={() => setMarket(m.id)}
              className={`px-3 py-1.5 text-sm rounded border transition-colors ${
                market === m.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
              }`}>{m.label}</button>
          ))}
        </div>
      </div>
      <DataTable columns={SURGE_COLUMNS} data={data} loading={loading} defaultSortKey="surge_ratio" defaultSortDir="desc" />
    </div>
  )
}

// ── 52주 신고가/신저가 뷰 ──────────────────────────────────────────

function Week52View() {
  const [data, setData]       = useState({ nearHigh: [], nearLow: [], totalScanned: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [view, setView]       = useState('high') // high | low
  const [market, setMarket]   = useState('all')

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch('/api/naver/week52')
      .then(r => { if (!r.ok) throw new Error(`API 오류: ${r.status}`); return r.json() })
      .then(d => { if (d.error) throw new Error(d.error); setData(d) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const list = view === 'high' ? data.nearHigh : data.nearLow
  const filtered = useMemo(() => {
    if (market === 'all') return list
    return list.filter(s => s.market === market)
  }, [list, market])

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-3" />
      <span className="text-sm text-gray-500">전종목 52주 데이터 스캔 중... (약 20초)</span>
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
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex border border-gray-300 rounded overflow-hidden">
          <button onClick={() => setView('high')}
            className={`px-4 py-1.5 text-sm font-medium ${view === 'high' ? 'bg-red-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
            52주 신고가 ({data.nearHigh.length})
          </button>
          <button onClick={() => setView('low')}
            className={`px-4 py-1.5 text-sm font-medium ${view === 'low' ? 'bg-blue-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
            52주 신저가 ({data.nearLow.length})
          </button>
        </div>
        <div className="flex gap-1">
          {MARKETS.map(m => (
            <button key={m.id} onClick={() => setMarket(m.id)}
              className={`px-3 py-1.5 text-sm rounded border transition-colors ${
                market === m.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
              }`}>{m.label}</button>
          ))}
        </div>
        <span className="ml-auto text-xs text-gray-400">
          {filtered.length}종목 / 전체 {data.totalScanned}종목 스캔
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">시장</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">종목명</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">현재가</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">시가총액</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">등락률</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">52주 고가</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">52주 저가</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">고가 대비</th>
              <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 w-32">위치</th>
              <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 w-12"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {filtered.length === 0 && (
              <tr><td colSpan={10} className="text-center py-8 text-gray-400">해당 조건의 종목이 없습니다</td></tr>
            )}
            {filtered.map(s => {
              const range = s.high52w - s.low52w
              const pos = range > 0 ? ((s.close - s.low52w) / range * 100) : 50
              const isAtHigh = s.fromHighPct >= -1
              const isAtLow = s.fromLowPct <= 3
              return (
                <tr key={s.code} className={`hover:bg-gray-50 transition-colors ${isAtHigh ? 'bg-red-50' : isAtLow ? 'bg-blue-50' : ''}`}>
                  <td className="px-3 py-2 text-xs">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      s.market === 'kospi' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                    }`}>{s.market === 'kospi' ? '코스피' : '코스닥'}</span>
                  </td>
                  <td className="px-3 py-2 text-sm font-medium text-gray-900">{s.name}</td>
                  <td className="px-3 py-2 text-right text-sm text-gray-900">{s.close.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right text-xs text-gray-600">
                    {s.marketCap ? (s.marketCap >= 10000 ? `${(s.marketCap / 10000).toFixed(1)}조` : `${s.marketCap.toLocaleString()}억`) : '—'}
                  </td>
                  <td className={`px-3 py-2 text-right text-sm font-medium ${
                    s.changeRate > 0 ? 'text-red-600' : s.changeRate < 0 ? 'text-blue-600' : 'text-gray-500'
                  }`}>{s.changeRate > 0 ? '+' : ''}{s.changeRate}%</td>
                  <td className="px-3 py-2 text-right text-sm text-red-500">{s.high52w.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right text-sm text-blue-500">{s.low52w.toLocaleString()}</td>
                  <td className={`px-3 py-2 text-right text-sm font-medium ${
                    s.fromHighPct >= 0 ? 'text-red-600' : 'text-gray-600'
                  }`}>{s.fromHighPct >= 0 ? '+' : ''}{s.fromHighPct}%</td>
                  <td className="px-3 py-2">
                    <div className="w-full bg-gray-200 rounded-full h-2 relative">
                      <div className="absolute left-0 top-0 h-2 rounded-full bg-gradient-to-r from-blue-400 to-red-400"
                        style={{ width: `${Math.min(Math.max(pos, 2), 100)}%` }} />
                    </div>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <a href={`https://alphasquare.co.kr/home/stock-summary?code=${s.code}`}
                      target="_blank" rel="noopener noreferrer"
                      className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700 hover:bg-blue-200">종목↗</a>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-400">
        ※ 52주 고가 대비 -5% 이내 = 신고가 근접, 52주 저가 대비 +10% 이내 = 신저가 근접. 네이버 fchart 기준.
      </p>
    </div>
  )
}

// ── 메인 컴포넌트 ──────────────────────────────────────────────────

const SUB_TABS = [
  { id: 'surge', label: '거래량 급등' },
  { id: 'week52', label: '52주 신고가/신저가' },
]

export default function VolumeSurgeTab() {
  const [subTab, setSubTab] = useState('surge')

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="flex border border-gray-300 rounded overflow-hidden">
          {SUB_TABS.map(t => (
            <button key={t.id} onClick={() => setSubTab(t.id)}
              className={`px-3 py-1 text-xs font-medium ${
                subTab === t.id ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}>{t.label}</button>
          ))}
        </div>
      </div>

      {subTab === 'surge' && <SurgeView />}
      {subTab === 'week52' && <Week52View />}
    </div>
  )
}
