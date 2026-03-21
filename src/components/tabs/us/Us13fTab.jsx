import React, { useState, useEffect } from 'react'

// ── 포맷 유틸 ──────────────────────────────────────────────────────

function fmtAum(v) {
  if (v >= 1e12) return `$${(v / 1e12).toFixed(1)}T`
  if (v >= 1e9)  return `$${(v / 1e9).toFixed(0)}B`
  return `$${v.toLocaleString()}`
}
function fmtValue(v) {
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`
  if (v >= 1e9)  return `$${(v / 1e9).toFixed(1)}B`
  if (v >= 1e6)  return `$${(v / 1e6).toFixed(0)}M`
  return `$${v.toLocaleString()}`
}
function fmtShares(v) {
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`
  return v.toLocaleString()
}

const CHANGE_CONFIG = {
  new:       { label: 'NEW',    bg: 'bg-purple-100', text: 'text-purple-700' },
  increased: { label: '▲ 증가', bg: 'bg-green-100',  text: 'text-green-700'  },
  decreased: { label: '▼ 감소', bg: 'bg-red-100',    text: 'text-red-700'    },
  held:      { label: '― 유지', bg: 'bg-gray-100',   text: 'text-gray-500'   },
  exited:    { label: '✕ 청산', bg: 'bg-orange-100', text: 'text-orange-700' },
}

// ── 컴포넌트 ──────────────────────────────────────────────────────

export default function Us13fTab() {
  const [institutions, setInstitutions] = useState([])
  const [selectedId, setSelectedId]     = useState(null)
  const [holdings, setHoldings]         = useState(null)
  const [filingDate, setFilingDate]     = useState(null)
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState(null)
  const [stats, setStats]               = useState(null)
  const [exited, setExited]             = useState([])

  // 기관 목록 로드
  useEffect(() => {
    fetch('/api/edgar13f/institutions')
      .then(r => r.json())
      .then(data => {
        setInstitutions(data)
        if (data.length > 0) setSelectedId(data[0].id)
      })
      .catch(() => {})
  }, [])

  // 선택된 기관의 홀딩스 로드
  useEffect(() => {
    if (!selectedId || institutions.length === 0) return
    const inst = institutions.find(i => i.id === selectedId)
    if (!inst) return

    setLoading(true)
    setError(null)
    setHoldings(null)
    setFilingDate(null)
    setStats(null)
    setExited([])

    fetch(`/api/edgar13f/${inst.cik}/latest`)
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error)
        setHoldings(data.holdings)
        setFilingDate(data.filingDate)
        setExited(data.exited || [])
        setStats({
          prevFilingDate: data.prevFilingDate,
          totalChangePct: data.totalChangePct,
          newCount: data.newCount || 0,
          increasedCount: data.increasedCount || 0,
          decreasedCount: data.decreasedCount || 0,
          exitedCount: data.exitedCount || 0,
        })
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [selectedId, institutions])

  const institution = institutions.find(i => i.id === selectedId)
  const amList = institutions.filter(i => i.type === 'AM')
  const hfList = institutions.filter(i => i.type === 'HF')

  const totalValue = holdings ? holdings.reduce((s, h) => s + h.value, 0) : 0

  const InstBtn = ({ inst }) => (
    <button
      data-testid={`inst-${inst.id}`}
      onClick={() => setSelectedId(inst.id)}
      className={`w-full text-left px-3 py-2 rounded-lg border text-xs transition-colors ${
        selectedId === inst.id
          ? 'bg-blue-600 text-white border-blue-600'
          : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:text-blue-600'
      }`}
    >
      <div className="font-medium truncate">{inst.name}</div>
      <div className={`mt-0.5 ${selectedId === inst.id ? 'text-blue-200' : 'text-gray-400'}`}>
        {fmtAum(inst.aum)}
        {inst.manager && <span className="ml-1">· {inst.manager}</span>}
      </div>
    </button>
  )

  return (
    <div data-testid="us-13f-tab" className="flex gap-4">
      {/* 좌측 기관 목록 */}
      <div className="w-64 flex-shrink-0 h-[calc(100vh-180px)] overflow-y-auto space-y-3 pr-1">
        {amList.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 px-1">
              자산운용사 ({amList.length})
            </p>
            <div className="space-y-1">
              {amList.map(inst => <InstBtn key={inst.id} inst={inst} />)}
            </div>
          </div>
        )}
        {hfList.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 px-1">
              헤지펀드 ({hfList.length})
            </p>
            <div className="space-y-1">
              {hfList.map(inst => <InstBtn key={inst.id} inst={inst} />)}
            </div>
          </div>
        )}
      </div>

      {/* 우측 홀딩스 */}
      <div className="flex-1 min-w-0">
        {institution && (
          <>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{institution.name}</h2>
                {institution.manager && (
                  <p className="text-sm text-gray-500">매니저: {institution.manager}</p>
                )}
              </div>
              <span className="text-xs text-gray-400">
                SEC EDGAR 13F{filingDate ? ` · ${filingDate}` : ''}
              </span>
            </div>

            {/* 요약 카드 */}
            <div className="grid grid-cols-7 gap-3 mb-4">
              {[
                { label: 'AUM',       value: fmtAum(institution.aum),                 color: 'text-gray-900' },
                { label: '포트폴리오',
                  value: holdings ? fmtValue(totalValue) : '—',
                  sub: stats?.totalChangePct != null
                    ? `${stats.totalChangePct > 0 ? '+' : ''}${stats.totalChangePct}%`
                    : null,
                  subColor: stats?.totalChangePct > 0 ? 'text-green-600' : stats?.totalChangePct < 0 ? 'text-red-600' : 'text-gray-400',
                  color: 'text-gray-900' },
                { label: '보유 종목',  value: holdings ? `${holdings.length}개` : '—', color: 'text-gray-900' },
                { label: '신규 편입',  value: stats ? `${stats.newCount}개` : '—',     color: 'text-purple-600' },
                { label: '비중 확대',  value: stats ? `${stats.increasedCount}개` : '—', color: 'text-green-600' },
                { label: '비중 축소',  value: stats ? `${stats.decreasedCount}개` : '—', color: 'text-red-600' },
                { label: '청산',      value: stats ? `${stats.exitedCount}개` : '—',    color: 'text-orange-600' },
              ].map(({ label, value, color, sub, subColor }) => (
                <div key={label} className="bg-white rounded-lg border border-gray-200 p-3 text-center shadow-sm">
                  <p className="text-xs text-gray-400 mb-1">{label}</p>
                  <p className={`text-base font-bold ${color}`}>
                    {value}
                    {sub && <span className={`ml-1 text-xs font-medium ${subColor}`}>{sub}</span>}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}

        {/* 로딩 */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 bg-white rounded-lg border border-gray-200">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm">SEC EDGAR에서 13F 데이터 로딩 중...</p>
          </div>
        )}

        {/* 오류 */}
        {!loading && error && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 bg-white rounded-lg border border-gray-200">
            <p className="text-3xl mb-2">⚠️</p>
            <p className="font-medium text-gray-600">데이터 로드 실패</p>
            <p className="text-xs text-red-500 mt-1 max-w-sm text-center">{error}</p>
          </div>
        )}

        {/* 홀딩스 테이블 */}
        {!loading && !error && holdings && (
          <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
            <table className="w-full text-sm" data-testid="holdings-table">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 uppercase w-8">#</th>
                  <th className="px-3 py-2 text-left   text-xs font-semibold text-gray-500 uppercase">종목명</th>
                  <th className="px-3 py-2 text-left   text-xs font-semibold text-gray-500 uppercase">CUSIP</th>
                  <th className="px-3 py-2 text-right  text-xs font-semibold text-gray-500 uppercase">주식수</th>
                  <th className="px-3 py-2 text-right  text-xs font-semibold text-gray-500 uppercase">평가액</th>
                  <th className="px-3 py-2 text-right  text-xs font-semibold text-gray-500 uppercase">비중</th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 uppercase">전분기</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {holdings.map(h => {
                  const cfg = h.change ? CHANGE_CONFIG[h.change] : null
                  return (
                  <tr key={`${h.rank}-${h.cusip}`} data-testid={`holding-row-${h.rank}`} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-center text-gray-400 text-xs">{h.rank}</td>
                    <td className="px-3 py-2 font-medium text-gray-900">
                      {h.name}
                      {h.putCall && (
                        <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700 font-medium">
                          {h.putCall}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-gray-400 text-xs font-mono">{h.cusip}</td>
                    <td className="px-3 py-2 text-right text-gray-600">{fmtShares(h.shares)}</td>
                    <td className="px-3 py-2 text-right font-medium text-gray-900">{fmtValue(h.value)}</td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <div className="w-14 bg-gray-100 rounded-full h-1.5">
                          <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${Math.min(h.pct, 100)}%` }} />
                        </div>
                        <span className="text-gray-700 font-medium w-9 text-right">{h.pct.toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-center">
                      {cfg ? (
                        <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
                          {cfg.label}
                          {h.changePct !== null && h.changePct !== 0 && (
                            <span>({h.changePct > 0 ? '+' : ''}{h.changePct.toFixed(1)}%)</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                  )
                })}
              </tbody>
              {exited.length > 0 && (
                <tbody className="border-t-2 border-orange-200">
                  <tr>
                    <td colSpan="7" className="px-3 py-1.5 bg-orange-50 text-xs font-semibold text-orange-600 uppercase tracking-wider">
                      전분기 대비 청산 ({exited.length}종목)
                    </td>
                  </tr>
                  {exited.map(h => (
                    <tr key={`exited-${h.cusip}`} className="bg-orange-50/30 text-gray-400">
                      <td className="px-3 py-2 text-center text-xs">—</td>
                      <td className="px-3 py-2 font-medium line-through">{h.name}</td>
                      <td className="px-3 py-2 text-xs font-mono">{h.cusip}</td>
                      <td className="px-3 py-2 text-right text-xs">{fmtShares(h.shares)}</td>
                      <td className="px-3 py-2 text-right text-xs">{fmtValue(h.value)}</td>
                      <td className="px-3 py-2 text-right text-xs">{h.pct.toFixed(1)}%</td>
                      <td className="px-3 py-2 text-center">
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                          ✕ 청산
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              )}
            </table>
          </div>
        )}

        <p className="text-xs text-gray-400 mt-2">
          ※ SEC EDGAR 13F-HR 공시 기준. 상위 50개 포지션 표시. 전분기 대비 주식수 변화 비교. 24시간 캐시 적용.
        </p>
      </div>
    </div>
  )
}
