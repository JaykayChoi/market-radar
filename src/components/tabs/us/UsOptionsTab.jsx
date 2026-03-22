import React, { useState, useEffect, useMemo } from 'react'

// ── 포맷 유틸 ────────────────────────────────────────────────────

function fmtNum(v, d = 2) { return v != null ? v.toFixed(d) : '—' }
function fmtVol(v) {
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`
  return v?.toLocaleString() ?? '0'
}

function pcrColor(pcr) {
  if (pcr >= 1.0) return 'text-red-600'
  if (pcr >= 0.7) return 'text-gray-700'
  return 'text-green-600'
}

function pcrLabel(pcr) {
  if (pcr >= 1.2) return '극도 약세'
  if (pcr >= 1.0) return '약세'
  if (pcr >= 0.7) return '중립'
  if (pcr >= 0.5) return '강세'
  return '극도 강세'
}

// ── 옵션 데이터 자동 분석 ────────────────────────────────────────

function analyzeOptionChain(chain) {
  const { calls, puts, underlying } = chain
  if (!calls?.length || !puts?.length) return []
  const price = underlying.price
  const insights = []

  const totalCallVol = calls.reduce((s, c) => s + c.volume, 0)
  const totalPutVol  = puts.reduce((s, p) => s + p.volume, 0)
  const totalCallOI  = calls.reduce((s, c) => s + c.openInterest, 0)
  const totalPutOI   = puts.reduce((s, p) => s + p.openInterest, 0)

  if (totalCallVol === 0 && totalPutVol === 0) return insights

  const pcrVol = totalCallVol > 0 ? totalPutVol / totalCallVol : 0

  if (pcrVol >= 1.2) {
    insights.push({ type: 'bearish', title: '풋 거래량 우위', text: `P/C 거래량 비율 ${pcrVol.toFixed(2)}로 풋 옵션 거래가 콜을 크게 압도. 하방 헤지 또는 약세 베팅이 활발합니다.` })
  } else if (pcrVol <= 0.5) {
    insights.push({ type: 'bullish', title: '콜 거래량 압도', text: `P/C 거래량 비율 ${pcrVol.toFixed(2)}로 콜 거래가 풋의 2배 이상. 강한 상승 기대 심리가 반영되어 있습니다.` })
  } else if (pcrVol <= 0.7) {
    insights.push({ type: 'bullish', title: '콜 거래 우세', text: `P/C 거래량 비율 ${pcrVol.toFixed(2)}로 콜 옵션 선호. 단기 강세 심리가 우세합니다.` })
  } else if (pcrVol >= 1.0) {
    insights.push({ type: 'bearish', title: '풋 거래 우세', text: `P/C 거래량 비율 ${pcrVol.toFixed(2)}로 풋 거래가 콜을 초과. 약세 심리 또는 헤지 수요가 증가하고 있습니다.` })
  } else {
    insights.push({ type: 'neutral', title: '균형 잡힌 시장', text: `P/C 거래량 비율 ${pcrVol.toFixed(2)}로 콜과 풋 거래가 비교적 균형.` })
  }

  // Max Pain
  const strikes = [...new Set([...calls.map(c => c.strike), ...puts.map(p => p.strike)])].sort((a, b) => a - b)
  let minPain = Infinity, maxPainStrike = strikes[0]
  for (const s of strikes) {
    let pain = 0
    for (const c of calls) pain += Math.max(0, s - c.strike) * c.openInterest
    for (const p of puts)  pain += Math.max(0, p.strike - s) * p.openInterest
    if (pain < minPain) { minPain = pain; maxPainStrike = s }
  }
  if (maxPainStrike && price) {
    const mpDiff = ((maxPainStrike - price) / price * 100).toFixed(1)
    insights.push({
      type: maxPainStrike > price ? 'bullish' : maxPainStrike < price ? 'bearish' : 'neutral',
      title: `Max Pain: $${maxPainStrike}`,
      text: `만기 시 매도자 손실 최소화 행사가. 현재가 대비 ${mpDiff > 0 ? '+' : ''}${mpDiff}%. 만기일에 이 가격 방향으로 수렴하는 경향.`,
    })
  }

  // 콜 OI 최대 (저항선)
  if (calls.length > 0) {
    const maxCallOI = calls.reduce((max, c) => c.openInterest > max.openInterest ? c : max, calls[0])
    if (maxCallOI.openInterest > 0 && maxCallOI.strike > price) {
      insights.push({ type: 'info', title: `콜 OI 집중: $${maxCallOI.strike} (${fmtVol(maxCallOI.openInterest)})`, text: `콜 미결제약정 최대 행사가. 감마 헤지 집중으로 저항선 가능성.` })
    }
  }

  // 풋 OI 최대 (지지선)
  if (puts.length > 0) {
    const maxPutOI = puts.reduce((max, p) => p.openInterest > max.openInterest ? p : max, puts[0])
    if (maxPutOI.openInterest > 0 && maxPutOI.strike < price) {
      insights.push({ type: 'info', title: `풋 OI 집중: $${maxPutOI.strike} (${fmtVol(maxPutOI.openInterest)})`, text: `풋 미결제약정 최대 행사가. 하락 시 헤지 매수 유입으로 지지선 가능성.` })
    }
  }

  // 거래량 급등
  const avgCallVol = totalCallVol / calls.length
  const avgPutVol  = totalPutVol / puts.length
  const hotCalls = calls.filter(c => c.volume > avgCallVol * 3 && !c.itm)
  const hotPuts  = puts.filter(p => p.volume > avgPutVol * 3 && !p.itm)
  if (hotCalls.length > 0) {
    const hot = hotCalls[0]
    insights.push({ type: 'bullish', title: `콜 거래량 급등: $${hot.strike}`, text: `OTM 콜에서 평균 대비 ${(hot.volume / avgCallVol).toFixed(0)}배 거래량. 상승 베팅 가능성.` })
  }
  if (hotPuts.length > 0) {
    const hot = hotPuts[0]
    insights.push({ type: 'bearish', title: `풋 거래량 급등: $${hot.strike}`, text: `OTM 풋에서 평균 대비 ${(hot.volume / avgPutVol).toFixed(0)}배 거래량. 하방 헤지 또는 약세 베팅.` })
  }

  // IV 스큐
  const otmPuts = puts.filter(p => !p.itm && p.iv > 0)
  const otmCalls = calls.filter(c => !c.itm && c.iv > 0)
  if (otmPuts.length > 0 && otmCalls.length > 0) {
    const otmPutIV  = otmPuts.reduce((s, p) => s + p.iv, 0) / otmPuts.length
    const otmCallIV = otmCalls.reduce((s, c) => s + c.iv, 0) / otmCalls.length
    const skew = otmPutIV - otmCallIV
    if (skew > 0.03) {
      insights.push({ type: 'bearish', title: 'IV 스큐: 풋 프리미엄', text: `OTM 풋 IV(${(otmPutIV*100).toFixed(1)}%)가 콜(${(otmCallIV*100).toFixed(1)}%)보다 ${(skew*100).toFixed(1)}%p 높음. 하방 리스크 보험 수요 증가.` })
    } else if (skew < -0.01) {
      insights.push({ type: 'bullish', title: 'IV 스큐: 콜 프리미엄', text: `OTM 콜 IV가 풋보다 높음. 상방 기대가 매우 강하거나 숏 스퀴즈 가능성.` })
    }
  }

  return insights
}

const INSIGHT_STYLE = {
  bullish: { border: 'border-green-200', bg: 'bg-green-50', icon: '🟢', label: '강세 신호' },
  bearish: { border: 'border-red-200',   bg: 'bg-red-50',   icon: '🔴', label: '약세 신호' },
  neutral: { border: 'border-gray-200',  bg: 'bg-gray-50',  icon: '⚪', label: '중립' },
  info:    { border: 'border-blue-200',  bg: 'bg-blue-50',  icon: '🔵', label: '참고' },
}

function OptionAnalysis({ chain }) {
  const insights = analyzeOptionChain(chain)
  if (insights.length === 0) return null
  return (
    <div className="mt-4 space-y-2">
      <p className="text-sm font-bold text-gray-800">데이터 분석</p>
      {insights.map((ins, i) => {
        const style = INSIGHT_STYLE[ins.type] || INSIGHT_STYLE.info
        return (
          <div key={i} className={`rounded-lg border ${style.border} ${style.bg} px-4 py-2.5`}>
            <div className="flex items-center gap-2 mb-0.5">
              <span>{style.icon}</span>
              <span className="text-xs font-bold text-gray-800">{ins.title}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                ins.type === 'bullish' ? 'bg-green-200 text-green-800' :
                ins.type === 'bearish' ? 'bg-red-200 text-red-800' :
                ins.type === 'info' ? 'bg-blue-200 text-blue-800' :
                'bg-gray-200 text-gray-700'
              }`}>{style.label}</span>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">{ins.text}</p>
          </div>
        )
      })}
    </div>
  )
}

const POPULAR_SYMBOLS = ['SPY', 'QQQ', 'AAPL', 'MSFT', 'NVDA', 'TSLA', 'AMZN', 'META', 'GOOGL', 'AMD']

// ── 컴포넌트 ──────────────────────────────────────────────────────

export default function UsOptionsTab({ initialSymbol, onSymbolUsed }) {
  const [symbol, setSymbol]           = useState(initialSymbol || 'SPY')
  const [inputSymbol, setInputSymbol] = useState('')
  const [chain, setChain]             = useState(null)
  const [selectedExp, setSelectedExp] = useState(null)
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState(null)
  const [view, setView]               = useState('chain')
  const [pcrData, setPcrData]         = useState(null)
  const [pcrLoading, setPcrLoading]   = useState(false)
  const [pcrError, setPcrError]       = useState(null)

  // 종목 정보 탭에서 넘어온 경우
  useEffect(() => {
    if (initialSymbol && initialSymbol !== symbol) {
      setSymbol(initialSymbol)
      setSelectedExp(null)
      setView('chain')
    }
    if (onSymbolUsed) onSymbolUsed()
  }, [initialSymbol])

  // P/C Ratio fetch
  useEffect(() => {
    if (view !== 'pcr') return
    setPcrLoading(true)
    setPcrError(null)
    setPcrData(null)

    fetch(`/api/yahoo/options/pcr?symbol=${symbol}`)
      .then(r => {
        if (!r.ok) throw new Error(`API 오류: ${r.status}`)
        return r.json()
      })
      .then(data => {
        if (data.error) throw new Error(data.error)
        setPcrData(data)
      })
      .catch(e => setPcrError(e.message))
      .finally(() => setPcrLoading(false))
  }, [symbol, view])

  // 옵션 체인 fetch
  useEffect(() => {
    if (view !== 'chain') return
    setLoading(true)
    setError(null)
    setChain(null)

    const qs = selectedExp ? `&date=${selectedExp}` : ''
    fetch(`/api/yahoo/options?symbol=${symbol}${qs}`)
      .then(r => {
        if (!r.ok) throw new Error(`API 오류: ${r.status}`)
        return r.json()
      })
      .then(data => {
        if (data.error) throw new Error(data.error)
        setChain(data)
        // 최초 로드 시 첫 번째 만기일 선택
        if (!selectedExp && data.expirations?.length > 0) {
          setSelectedExp(data.expirations[0].timestamp)
        }
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [symbol, selectedExp, view])

  // 종목 변경 시 만기일 초기화
  const changeSymbol = (s) => {
    setSymbol(s)
    setSelectedExp(null)
  }

  const handleSearch = (e) => {
    e.preventDefault()
    if (inputSymbol.trim()) {
      changeSymbol(inputSymbol.trim().toUpperCase())
      setInputSymbol('')
    }
  }

  // 체인 통계
  const stats = useMemo(() => {
    if (!chain?.calls?.length) return null
    const totalCallVol = chain.calls.reduce((s, c) => s + c.volume, 0)
    const totalPutVol  = chain.puts.reduce((s, p) => s + p.volume, 0)
    const totalCallOI  = chain.calls.reduce((s, c) => s + c.openInterest, 0)
    const totalPutOI   = chain.puts.reduce((s, p) => s + p.openInterest, 0)
    const pcr = totalCallVol > 0 ? totalPutVol / totalCallVol : 0
    return { totalCallVol, totalPutVol, totalCallOI, totalPutOI, pcr }
  }, [chain])

  // 테이블용: 콜/풋을 행사가 기준으로 매칭
  const chainRows = useMemo(() => {
    if (!chain?.calls?.length) return []
    const callMap = new Map(chain.calls.map(c => [c.strike, c]))
    const putMap  = new Map(chain.puts.map(p => [p.strike, p]))
    const allStrikes = [...new Set([...chain.calls.map(c => c.strike), ...chain.puts.map(p => p.strike)])].sort((a, b) => a - b)
    // 현재가 ±15% 범위만 표시
    const price = chain.underlying?.price || 0
    const lo = price * 0.85, hi = price * 1.15
    return allStrikes
      .filter(s => s >= lo && s <= hi)
      .map(s => ({ strike: s, call: callMap.get(s), put: putMap.get(s) }))
  }, [chain])

  return (
    <div data-testid="us-options-tab">
      {/* 뷰 전환 + 종목 검색 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1">
          {[
            { id: 'chain', label: '옵션 체인' },
            { id: 'pcr',   label: 'Put/Call Ratio' },
          ].map(v => (
            <button
              key={v.id}
              data-testid={`view-${v.id}`}
              onClick={() => setView(v.id)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
                view === v.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {POPULAR_SYMBOLS.map(s => (
              <button
                key={s}
                onClick={() => changeSymbol(s)}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                  symbol === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <form onSubmit={handleSearch} className="flex gap-1">
            <input
              type="text"
              value={inputSymbol}
              onChange={e => setInputSymbol(e.target.value)}
              placeholder="종목 검색"
              className="w-24 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            />
            <button type="submit" className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700">검색</button>
          </form>
        </div>
      </div>

      {/* ── P/C Ratio 뷰 ── */}
      {view === 'pcr' && (
        <div>
          {pcrLoading && (
            <div className="flex items-center justify-center py-20 bg-white rounded-lg border border-gray-200">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-3" />
              <span className="text-sm text-gray-500">{symbol} 만기일별 P/C Ratio 계산 중...</span>
            </div>
          )}
          {!pcrLoading && pcrError && (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-lg border border-gray-200">
              <p className="text-3xl mb-2">⚠️</p>
              <p className="font-medium text-gray-600">P/C Ratio 로드 실패</p>
              <p className="text-xs text-red-500 mt-1">{pcrError}</p>
            </div>
          )}
          {!pcrLoading && !pcrError && pcrData && (
            <>
              <h2 className="text-lg font-bold text-gray-900 mb-3">
                {pcrData.name} <span className="text-sm text-gray-400">{pcrData.symbol}</span>
                <span className="ml-2 text-base font-normal text-gray-500">${fmtNum(pcrData.price)}</span>
              </h2>

              {/* 전체 요약 카드 */}
              <div className="grid grid-cols-4 gap-3 mb-4">
                {[
                  { label: 'P/C (거래량)', value: fmtNum(pcrData.overall.pcrVol), color: pcrColor(pcrData.overall.pcrVol), sub: pcrLabel(pcrData.overall.pcrVol) },
                  { label: 'P/C (미결제)', value: fmtNum(pcrData.overall.pcrOI), color: pcrColor(pcrData.overall.pcrOI), sub: pcrLabel(pcrData.overall.pcrOI) },
                  { label: '총 콜 거래량', value: fmtVol(pcrData.overall.totalCallVol), color: 'text-green-600', sub: `OI: ${fmtVol(pcrData.overall.totalCallOI)}` },
                  { label: '총 풋 거래량', value: fmtVol(pcrData.overall.totalPutVol), color: 'text-red-600', sub: `OI: ${fmtVol(pcrData.overall.totalPutOI)}` },
                ].map(({ label, value, color, sub }) => (
                  <div key={label} className="bg-white rounded-lg border border-gray-200 p-3 text-center shadow-sm">
                    <p className="text-xs text-gray-400 mb-1">{label}</p>
                    <p className={`text-xl font-bold ${color}`}>{value}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>
                  </div>
                ))}
              </div>

              {/* 만기일별 테이블 */}
              <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">만기일</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">콜 거래량</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">풋 거래량</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">P/C 거래량</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">콜 OI</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">풋 OI</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">P/C OI</th>
                      <th className="px-4 py-2 text-center text-xs font-semibold text-gray-500 uppercase">심리</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {pcrData.byExpiration.map(row => (
                      <tr key={row.expiration} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-gray-700 font-medium">{row.expiration}</td>
                        <td className="px-4 py-2 text-right text-green-600">{fmtVol(row.callVol)}</td>
                        <td className="px-4 py-2 text-right text-red-600">{fmtVol(row.putVol)}</td>
                        <td className={`px-4 py-2 text-right font-bold ${pcrColor(row.pcrVol ?? 0)}`}>{row.pcrVol != null ? fmtNum(row.pcrVol) : '—'}</td>
                        <td className="px-4 py-2 text-right text-green-600">{fmtVol(row.callOI)}</td>
                        <td className="px-4 py-2 text-right text-red-600">{fmtVol(row.putOI)}</td>
                        <td className={`px-4 py-2 text-right font-bold ${pcrColor(row.pcrOI ?? 0)}`}>{row.pcrOI != null ? fmtNum(row.pcrOI) : '—'}</td>
                        <td className="px-4 py-2 text-center">
                          {row.pcrVol != null && (
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              row.pcrVol >= 1.0 ? 'bg-red-100 text-red-700' :
                              row.pcrVol >= 0.7 ? 'bg-gray-100 text-gray-600' :
                              'bg-green-100 text-green-700'
                            }`}>
                              {pcrLabel(row.pcrVol)}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="text-xs text-gray-400 mt-2">
                ※ {symbol} 옵션 기준 만기일별 P/C Ratio. 거래량 기반 + OI 기반 두 가지 관점. Yahoo Finance 데이터.
              </p>
            </>
          )}
        </div>
      )}

      {/* ── 옵션 체인 뷰 ── */}

      {/* 로딩 */}
      {view === 'chain' && loading && (
        <div className="flex items-center justify-center py-20 bg-white rounded-lg border border-gray-200">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-3" />
          <span className="text-sm text-gray-500">{symbol} 옵션 데이터 로딩 중...</span>
        </div>
      )}

      {/* 에러 */}
      {view === 'chain' && !loading && error && (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-lg border border-gray-200">
          <p className="text-3xl mb-2">⚠️</p>
          <p className="font-medium text-gray-600">옵션 데이터 로드 실패</p>
          <p className="text-xs text-red-500 mt-1">{error}</p>
        </div>
      )}

      {/* 옵션 체인 */}
      {view === 'chain' && !loading && !error && chain && (
        <div>
          {/* 종목 정보 + 만기 선택 */}
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {chain.underlying?.name || symbol}
                <span className="ml-2 text-sm text-gray-400">{symbol}</span>
                <span className="ml-2 text-base font-normal text-gray-500">${fmtNum(chain.underlying?.price)}</span>
                {chain.underlying?.change != null && (
                  <span className={`ml-2 text-sm ${chain.underlying.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {chain.underlying.change >= 0 ? '+' : ''}{fmtNum(chain.underlying.change)} ({fmtNum(chain.underlying.changePct)}%)
                  </span>
                )}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">만기일:</span>
              <select
                value={selectedExp || ''}
                onChange={e => setSelectedExp(Number(e.target.value))}
                className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-blue-500"
              >
                {(chain.expirations || []).map(exp => (
                  <option key={exp.timestamp} value={exp.timestamp}>{exp.date}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 요약 카드 */}
          {stats && (
            <div className="grid grid-cols-5 gap-3 mb-4">
              {[
                { label: '콜 거래량', value: fmtVol(stats.totalCallVol), color: 'text-green-600' },
                { label: '풋 거래량', value: fmtVol(stats.totalPutVol), color: 'text-red-600' },
                { label: 'P/C 거래량', value: fmtNum(stats.pcr), color: pcrColor(stats.pcr) },
                { label: '콜 OI', value: fmtVol(stats.totalCallOI), color: 'text-green-600' },
                { label: '풋 OI', value: fmtVol(stats.totalPutOI), color: 'text-red-600' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-white rounded-lg border border-gray-200 p-2.5 text-center shadow-sm">
                  <p className="text-[10px] text-gray-400 mb-0.5">{label}</p>
                  <p className={`text-sm font-bold ${color}`}>{value}</p>
                </div>
              ))}
            </div>
          )}

          {/* 옵션 체인 테이블 */}
          {chainRows.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
              <table className="w-full text-xs" data-testid="option-chain-table">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th colSpan="5" className="px-2 py-1.5 text-center text-xs font-bold text-green-700 bg-green-50 border-r border-gray-200">CALLS</th>
                    <th className="px-2 py-1.5 text-center text-xs font-bold text-gray-700 bg-gray-100">행사가</th>
                    <th colSpan="5" className="px-2 py-1.5 text-center text-xs font-bold text-red-700 bg-red-50 border-l border-gray-200">PUTS</th>
                  </tr>
                  <tr className="text-gray-500">
                    <th className="px-2 py-1 text-right font-semibold">최종가</th>
                    <th className="px-2 py-1 text-right font-semibold">Bid</th>
                    <th className="px-2 py-1 text-right font-semibold">Ask</th>
                    <th className="px-2 py-1 text-right font-semibold">거래량</th>
                    <th className="px-2 py-1 text-right font-semibold border-r border-gray-200">OI</th>
                    <th className="px-2 py-1 text-center font-semibold bg-gray-50">Strike</th>
                    <th className="px-2 py-1 text-right font-semibold border-l border-gray-200">최종가</th>
                    <th className="px-2 py-1 text-right font-semibold">Bid</th>
                    <th className="px-2 py-1 text-right font-semibold">Ask</th>
                    <th className="px-2 py-1 text-right font-semibold">거래량</th>
                    <th className="px-2 py-1 text-right font-semibold">OI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {chainRows.map(({ strike, call, put }) => {
                    const price = chain.underlying?.price || 0
                    const isAtm = Math.abs(strike - price) / price < 0.005
                    const cItm = call?.itm
                    const pItm = put?.itm
                    return (
                      <tr key={strike} className={`hover:bg-gray-50 ${isAtm ? 'bg-yellow-50' : ''}`}>
                        <td className={`px-2 py-1.5 text-right font-medium ${cItm ? 'bg-green-50 text-green-800' : 'text-gray-700'}`}>{call ? `$${fmtNum(call.lastPrice)}` : '—'}</td>
                        <td className={`px-2 py-1.5 text-right ${cItm ? 'bg-green-50' : ''} text-gray-500`}>{call ? `$${fmtNum(call.bid)}` : '—'}</td>
                        <td className={`px-2 py-1.5 text-right ${cItm ? 'bg-green-50' : ''} text-gray-500`}>{call ? `$${fmtNum(call.ask)}` : '—'}</td>
                        <td className={`px-2 py-1.5 text-right ${cItm ? 'bg-green-50' : ''} text-gray-600`}>{call ? fmtVol(call.volume) : '—'}</td>
                        <td className={`px-2 py-1.5 text-right border-r border-gray-200 ${cItm ? 'bg-green-50' : ''} text-gray-600`}>{call ? fmtVol(call.openInterest) : '—'}</td>
                        <td className={`px-2 py-1.5 text-center font-bold ${isAtm ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-50 text-gray-900'}`}>${strike}</td>
                        <td className={`px-2 py-1.5 text-right border-l border-gray-200 font-medium ${pItm ? 'bg-red-50 text-red-800' : 'text-gray-700'}`}>{put ? `$${fmtNum(put.lastPrice)}` : '—'}</td>
                        <td className={`px-2 py-1.5 text-right ${pItm ? 'bg-red-50' : ''} text-gray-500`}>{put ? `$${fmtNum(put.bid)}` : '—'}</td>
                        <td className={`px-2 py-1.5 text-right ${pItm ? 'bg-red-50' : ''} text-gray-500`}>{put ? `$${fmtNum(put.ask)}` : '—'}</td>
                        <td className={`px-2 py-1.5 text-right ${pItm ? 'bg-red-50' : ''} text-gray-600`}>{put ? fmtVol(put.volume) : '—'}</td>
                        <td className={`px-2 py-1.5 text-right ${pItm ? 'bg-red-50' : ''} text-gray-600`}>{put ? fmtVol(put.openInterest) : '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* 데이터 분석 */}
          <OptionAnalysis chain={chain} />

          <div className="flex gap-4 mt-3 text-[10px] text-gray-400">
            <span className="flex items-center gap-1"><span className="w-3 h-2 bg-green-50 border border-green-200 inline-block" /> ITM (콜)</span>
            <span className="flex items-center gap-1"><span className="w-3 h-2 bg-red-50 border border-red-200 inline-block" /> ITM (풋)</span>
            <span className="flex items-center gap-1"><span className="w-3 h-2 bg-yellow-50 border border-yellow-200 inline-block" /> ATM</span>
            <span>OI = 미결제약정 · IV = 내재변동성 · 현재가 ±15% 범위 표시</span>
          </div>

          {/* 용어 해석 가이드 */}
          <div className="mt-4 bg-gray-50 rounded-lg border border-gray-200 p-4 text-xs text-gray-600 space-y-2">
            <p className="font-semibold text-gray-700 text-sm mb-2">옵션 체인 읽는 법</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
              <div><span className="font-semibold text-gray-800">행사가 (Strike)</span> — 옵션 만기 시 매수/매도할 수 있는 가격.</div>
              <div><span className="font-semibold text-gray-800">최종가 (Last)</span> — 해당 옵션의 마지막 체결 가격. 1계약 = 주식 100주.</div>
              <div><span className="font-semibold text-gray-800">Bid / Ask</span> — 매수호가 / 매도호가. 스프레드가 좁을수록 유동성 풍부.</div>
              <div><span className="font-semibold text-gray-800">거래량 (Volume)</span> — 당일 체결 계약 수. 급등 시 대규모 포지션 신호.</div>
              <div><span className="font-semibold text-gray-800">OI (미결제약정)</span> — 미청산 총 계약 수. OI 높은 행사가 = 지지/저항.</div>
              <div><span className="font-semibold text-gray-800">P/C Ratio</span> — 풋/콜 거래량 비율. &gt;1.0 약세, &lt;0.7 강세. 극단값은 역방향 지표.</div>
              <div><span className="font-semibold text-gray-800">콜 (Call)</span> — 행사가로 <span className="text-green-600 font-medium">살 수 있는 권리</span>. 주가 상승 시 수익.</div>
              <div><span className="font-semibold text-gray-800">풋 (Put)</span> — 행사가로 <span className="text-red-600 font-medium">팔 수 있는 권리</span>. 하락 시 수익 또는 헤지.</div>
              <div><span className="font-semibold text-gray-800">ITM (내가격)</span> — 행사하면 이익. 콜: 행사가 &lt; 현재가. 풋: 행사가 &gt; 현재가.</div>
              <div><span className="font-semibold text-gray-800">Max Pain</span> — 만기 시 옵션 매도자 손실 최소화 가격. 수렴 경향.</div>
            </div>
          </div>

          <p className="text-xs text-gray-400 mt-2">
            ※ Yahoo Finance 옵션 체인 기준. 장중 데이터는 15분 지연될 수 있습니다.
          </p>
        </div>
      )}
    </div>
  )
}
