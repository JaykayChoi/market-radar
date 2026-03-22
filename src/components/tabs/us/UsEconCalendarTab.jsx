import React, { useState, useEffect, useMemo } from 'react'

// ── 날짜 유틸 ─────────────────────────────────────────────────────

function toYmd(d) { return d.toISOString().slice(0, 10) }
function addMonths(d, n) { const r = new Date(d); r.setMonth(r.getMonth() + n); return r }

function getMonthGrid(year, month) {
  const first = new Date(year, month, 1)
  const last  = new Date(year, month + 1, 0)
  const startDay = first.getDay()
  const days = []
  for (let i = 0; i < startDay; i++) days.push(null)
  for (let d = 1; d <= last.getDate(); d++) days.push(new Date(year, month, d))
  return days
}

function fmtNum(v, unit) {
  if (v == null) return '—'
  const s = typeof v === 'number' ? v.toLocaleString('en-US', { maximumFractionDigits: 2 }) : v
  return unit ? `${s} ${unit}` : s
}

function fmtAmt(v) {
  if (!v) return ''
  if (v >= 1e9) return `$${(v / 1e9).toFixed(0)}B`
  if (v >= 1e6) return `$${(v / 1e6).toFixed(0)}M`
  return `$${v.toLocaleString()}`
}

// 중요도 색상/라벨
const IMPACT_CONFIG = {
  high:   { bg: 'bg-red-50',    dot: 'bg-red-500',    badge: 'bg-red-100 text-red-700',    label: '높음' },
  medium: { bg: 'bg-amber-50',  dot: 'bg-amber-500',  badge: 'bg-amber-100 text-amber-700', label: '보통' },
  low:    { bg: 'bg-gray-50',   dot: 'bg-gray-400',   badge: 'bg-gray-100 text-gray-600',  label: '낮음' },
}

const CATEGORY_LABEL = {
  prices: '물가', jobs: '고용', growth: '성장', consumption: '소비',
  housing: '주택', manufacturing: '제조', sentiment: '심리', trade: '무역',
}

// 서브 필터
const SUB_FILTERS = [
  { id: 'all',      label: '전체' },
  { id: 'high',     label: '높은 중요도' },
  { id: 'fomc',     label: 'FOMC' },
  { id: 'jobs',     label: '고용' },
  { id: 'prices',   label: '물가' },
  { id: 'auction',  label: '국채 경매' },
]

function matchSubFilter(event, filter) {
  if (filter === 'all') return true
  if (filter === 'high') return event.impact === 'high'
  if (filter === 'fomc') return false
  if (filter === 'jobs') return event.category === 'jobs'
  if (filter === 'prices') return event.category === 'prices'
  if (filter === 'auction') return event.type === 'auction'
  return true
}

// ── 컴포넌트 ──────────────────────────────────────────────────────

export default function UsEconCalendarTab() {
  const [baseDate, setBaseDate] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [events, setEvents]       = useState([])
  const [auctions, setAuctions]   = useState([])
  const [fomc, setFomc]           = useState([])
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState(null)
  const [subFilter, setSubFilter] = useState('all')
  const [selected, setSelected]   = useState(null)
  const [viewMode, setViewMode]   = useState('calendar')

  const year  = baseDate.getFullYear()
  const month = baseDate.getMonth()

  // 데이터 fetch
  useEffect(() => {
    const from = toYmd(baseDate)
    const to   = toYmd(new Date(year, month + 1, 0))
    setLoading(true)
    setSelected(null)
    setError(null)

    Promise.all([
      fetch(`/api/fred/calendar?from=${from}&to=${to}`).then(r => {
        if (!r.ok) throw new Error(`Economic Calendar API 오류: ${r.status}`)
        return r.json()
      }),
      fetch(`/api/finnhub/fomc?year=${year}`).then(r => {
        if (!r.ok) throw new Error(`FOMC API 오류: ${r.status}`)
        return r.json()
      }),
      fetch(`/api/fred/treasury-auctions?from=${from}&to=${to}`).then(r => {
        if (!r.ok) return { auctions: [] }
        return r.json()
      }).catch(() => ({ auctions: [] })),
    ])
      .then(([econData, fomcData, auctionData]) => {
        if (econData.error) throw new Error(econData.error)
        setEvents(econData.economicCalendar || [])
        setFomc(fomcData.schedule || [])
        setAuctions(auctionData.auctions || [])
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [baseDate, year, month])

  // FOMC 맵
  const fomcDateSet = useMemo(() => new Set(fomc.map(f => f.date)), [fomc])
  const fomcMap = useMemo(() => {
    const map = {}
    for (const f of fomc) map[f.date] = f
    return map
  }, [fomc])

  // 국채 경매 맵
  const auctionMap = useMemo(() => {
    const map = {}
    for (const a of auctions) {
      if (!map[a.date]) map[a.date] = []
      map[a.date].push(a)
    }
    return map
  }, [auctions])

  // 경제지표 + 국채경매 통합 이벤트
  const allEvents = useMemo(() => {
    const combined = [
      ...events.map(e => ({ ...e, type: 'indicator' })),
      ...auctions.map(a => ({
        date: a.date,
        event: `${a.type} ${a.term}`,
        name: `국채 경매 (${a.term})`,
        impact: a.type === 'Bond' || a.type === 'Note' ? 'medium' : 'low',
        category: 'auction',
        type: 'auction',
        auctionDetail: a,
      })),
    ]
    return combined
  }, [events, auctions])

  // 필터링
  const filteredEvents = useMemo(() => {
    return allEvents.filter(e => matchSubFilter(e, subFilter))
  }, [allEvents, subFilter])

  // 날짜별 이벤트 맵
  const eventMap = useMemo(() => {
    const map = {}
    for (const e of filteredEvents) {
      if (!e.date) continue
      if (!map[e.date]) map[e.date] = []
      map[e.date].push(e)
    }
    const order = { high: 0, medium: 1, low: 2 }
    for (const arr of Object.values(map)) {
      arr.sort((a, b) => (order[a.impact] ?? 3) - (order[b.impact] ?? 3))
    }
    return map
  }, [filteredEvents])

  function getDateImpact(ymd) {
    const ev = eventMap[ymd]
    if (!ev?.length) return null
    if (ev.some(e => e.impact === 'high')) return 'high'
    if (ev.some(e => e.impact === 'medium')) return 'medium'
    return 'low'
  }

  const grid = getMonthGrid(year, month)
  const today = toYmd(new Date())
  const prevMonth = () => setBaseDate(addMonths(baseDate, -1))
  const nextMonth = () => setBaseDate(addMonths(baseDate, 1))
  const goToday   = () => setBaseDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1))

  const selectedEvents = selected ? (eventMap[selected] || []) : []
  const selectedFomc   = selected ? fomcMap[selected] : null

  const sortedDates = useMemo(() => Object.keys(eventMap).sort(), [eventMap])

  // 통계
  const stats = useMemo(() => {
    const monthEnd = toYmd(new Date(year, month + 1, 0))
    const monthStart = toYmd(baseDate)
    return {
      total: filteredEvents.filter(e => e.type === 'indicator').length,
      high: filteredEvents.filter(e => e.impact === 'high' && e.type === 'indicator').length,
      medium: filteredEvents.filter(e => e.impact === 'medium' && e.type === 'indicator').length,
      fomc: fomc.filter(f => f.date >= monthStart && f.date <= monthEnd).length,
      auctions: filteredEvents.filter(e => e.type === 'auction').length,
    }
  }, [filteredEvents, fomc, baseDate, year, month])

  // 이벤트 상세 렌더
  function renderEventDetail(e, i) {
    if (e.type === 'auction') {
      const a = e.auctionDetail
      return (
        <div key={i} className="px-3 py-2 bg-emerald-50">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="w-2 h-2 rounded bg-emerald-500 flex-shrink-0" />
            <span className="text-xs font-semibold text-gray-900">{a.type} {a.term}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-emerald-100 text-emerald-700">국채</span>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 mt-1 text-[11px] text-gray-600">
            {a.offeringAmt && <div>발행규모: <span className="font-medium">{fmtAmt(a.offeringAmt)}</span></div>}
            {a.issueDate && <div>발행일: {a.issueDate}</div>}
            {a.maturityDate && <div>만기일: {a.maturityDate}</div>}
            {a.cusip && <div>CUSIP: {a.cusip}</div>}
          </div>
          <a href={`https://www.treasurydirect.gov/auctions/auction-query/results/`}
            target="_blank" rel="noopener noreferrer"
            className="text-[10px] text-blue-500 hover:underline mt-1 inline-block">
            TreasuryDirect 경매 결과 →
          </a>
        </div>
      )
    }

    const imp = IMPACT_CONFIG[e.impact] || IMPACT_CONFIG.low
    const changeDir = (e.actual != null && e.prev != null) ? (e.actual > e.prev ? 'up' : e.actual < e.prev ? 'down' : 'flat') : null

    return (
      <div key={i} className={`px-3 py-2 ${imp.bg}`}>
        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
          <span className={`w-2 h-2 rounded-full ${imp.dot} flex-shrink-0`} />
          <span className="text-xs font-semibold text-gray-900">{e.name}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${imp.badge}`}>{imp.label}</span>
          <span className="text-[10px] text-gray-400">{CATEGORY_LABEL[e.category] || ''}</span>
        </div>
        <p className="text-[10px] text-gray-400">{e.event}</p>

        {/* 최근값 / 이전값 */}
        {(e.actual != null || e.prev != null) && (
          <div className="grid grid-cols-3 gap-2 mt-1.5 text-[11px]">
            <div>
              <span className="text-gray-400">최근 발표</span>
              <p className={`font-semibold ${changeDir === 'up' ? 'text-green-600' : changeDir === 'down' ? 'text-red-600' : 'text-gray-700'}`}>
                {fmtNum(e.actual, e.unit)}
                {changeDir === 'up' && ' ▲'}
                {changeDir === 'down' && ' ▼'}
              </p>
            </div>
            <div>
              <span className="text-gray-400">이전 발표</span>
              <p className="font-medium text-gray-600">{fmtNum(e.prev, e.unit)}</p>
            </div>
            <div>
              <span className="text-gray-400">2회전</span>
              <p className="font-medium text-gray-500">{fmtNum(e.prev2, e.unit)}</p>
            </div>
          </div>
        )}

        {/* 외부 링크 */}
        {e.link && (
          <a href={e.link} target="_blank" rel="noopener noreferrer"
            className="text-[10px] text-blue-500 hover:underline mt-1 inline-block">
            공식 발표 페이지 →
          </a>
        )}
      </div>
    )
  }

  return (
    <div data-testid="us-econ-calendar-tab">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="px-2 py-1 rounded border border-gray-300 hover:bg-gray-100 text-sm">&lt;</button>
          <h2 className="text-lg font-bold text-gray-900 w-40 text-center">{year}년 {month + 1}월</h2>
          <button onClick={nextMonth} className="px-2 py-1 rounded border border-gray-300 hover:bg-gray-100 text-sm">&gt;</button>
          <button onClick={goToday} className="px-3 py-1 rounded border border-gray-300 hover:bg-gray-100 text-xs ml-2">오늘</button>
        </div>
        <div className="flex border border-gray-300 rounded overflow-hidden">
          <button onClick={() => setViewMode('calendar')}
            className={`px-3 py-1 text-xs ${viewMode === 'calendar' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>달력</button>
          <button onClick={() => setViewMode('list')}
            className={`px-3 py-1 text-xs ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>목록</button>
        </div>
      </div>

      {/* 서브 필터 + 통계 */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <div className="flex gap-1">
          {SUB_FILTERS.map(f => (
            <button key={f.id} onClick={() => setSubFilter(f.id)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                subFilter === f.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>{f.label}</button>
          ))}
        </div>
        <div className="ml-auto flex gap-3 text-xs text-gray-500">
          <span>지표 {stats.total}건</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> 높음 {stats.high}</span>
          {stats.fomc > 0 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-purple-500" /> FOMC {stats.fomc}</span>}
          {stats.auctions > 0 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-emerald-500" /> 경매 {stats.auctions}</span>}
        </div>
      </div>

      {/* 로딩 */}
      {loading && (
        <div className="flex items-center justify-center py-20 bg-white rounded-lg border border-gray-200">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-3" />
          <span className="text-sm text-gray-500">경제 캘린더 데이터 로딩 중...</span>
        </div>
      )}

      {/* 에러 */}
      {!loading && error && (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-lg border border-gray-200">
          <p className="text-3xl mb-2">⚠️</p>
          <p className="font-medium text-gray-600">데이터 로드 실패</p>
          <p className="text-xs text-red-500 mt-1 max-w-sm text-center">{error}</p>
        </div>
      )}

      {/* ── 달력 뷰 ── */}
      {!loading && !error && viewMode === 'calendar' && (
        <div className="flex gap-4">
          <div className="flex-1">
            <div className="grid grid-cols-7 mb-1">
              {['일', '월', '화', '수', '목', '금', '토'].map(d => (
                <div key={d} className={`text-center text-xs font-semibold py-1 ${d === '일' ? 'text-red-400' : d === '토' ? 'text-blue-400' : 'text-gray-400'}`}>{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden border border-gray-200">
              {grid.map((date, i) => {
                if (!date) return <div key={`empty-${i}`} className="bg-gray-50 min-h-[90px]" />
                const ymd = toYmd(date)
                const ev = eventMap[ymd] || []
                const isToday = ymd === today
                const isSelected = ymd === selected
                const isFomc = fomcDateSet.has(ymd)
                const hasAuction = !!auctionMap[ymd]
                const impact = getDateImpact(ymd)
                const dayOfWeek = date.getDay()

                let cellBg = 'bg-white'
                if (isFomc) cellBg = 'bg-purple-50'
                else if (impact === 'high') cellBg = 'bg-red-50'
                else if (impact === 'medium') cellBg = 'bg-amber-50'

                return (
                  <div key={ymd} onClick={() => setSelected(isSelected ? null : ymd)}
                    className={`min-h-[90px] p-1.5 cursor-pointer transition-colors hover:bg-blue-50 ${cellBg} ${isSelected ? 'ring-2 ring-blue-500 ring-inset' : ''}`}>
                    <div className="flex items-center gap-1 mb-1">
                      <span className={`text-xs font-medium ${
                        isToday ? 'bg-blue-600 text-white w-5 h-5 rounded-full flex items-center justify-center' :
                        dayOfWeek === 0 ? 'text-red-500' : dayOfWeek === 6 ? 'text-blue-500' : 'text-gray-700'
                      }`}>{date.getDate()}</span>
                      {isFomc && <span className="text-[9px] px-1 py-0.5 rounded bg-purple-200 text-purple-800 font-bold">FOMC</span>}
                    </div>
                    {ev.length > 0 && (
                      <div className="space-y-0.5">
                        {ev.filter(e => e.impact === 'high' && e.type === 'indicator').slice(0, 3).map((e, j) => (
                          <div key={j} className="flex items-center gap-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                            <span className="text-[9px] text-red-700 truncate leading-tight">{e.name}</span>
                          </div>
                        ))}
                        {ev.filter(e => e.impact === 'medium' && e.type === 'indicator').slice(0, 2).map((e, j) => (
                          <div key={`m-${j}`} className="flex items-center gap-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                            <span className="text-[9px] text-amber-700 truncate leading-tight">{e.name}</span>
                          </div>
                        ))}
                        {hasAuction && (
                          <div className="flex items-center gap-0.5">
                            <span className="w-1.5 h-1.5 rounded bg-emerald-500 flex-shrink-0" />
                            <span className="text-[9px] text-emerald-700">경매 {auctionMap[ymd].length}건</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── 우측 상세 패널 ── */}
          <div className="w-96 flex-shrink-0">
            {selected && (selectedEvents.length > 0 || selectedFomc) ? (
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                <div className={`px-3 py-2 border-b ${selectedFomc ? 'bg-purple-50 border-purple-200' : 'bg-gray-50 border-gray-200'}`}>
                  <p className="text-sm font-bold text-gray-900">{selected}</p>
                  <p className="text-xs text-gray-400">
                    {selectedFomc && <span className="text-purple-600 font-medium">FOMC 회의일 · </span>}
                    경제지표 {selectedEvents.filter(e => e.type === 'indicator').length}건
                    {selectedEvents.filter(e => e.type === 'auction').length > 0 && (
                      <span className="text-emerald-600"> · 국채 경매 {selectedEvents.filter(e => e.type === 'auction').length}건</span>
                    )}
                  </p>
                </div>

                {selectedFomc && (
                  <div className="px-3 py-2 bg-purple-50 border-b border-purple-100">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="w-2 h-2 rounded bg-purple-500 flex-shrink-0" />
                      <span className="text-xs font-bold text-purple-700">FOMC 회의</span>
                    </div>
                    <div className="text-[11px] text-purple-600 space-y-0.5">
                      <p>{selectedFomc.summary ? '경제전망 요약(SEP) + 점도표 발표' : '성명서만 발표'}</p>
                      {selectedFomc.dots && <p className="font-medium">점도표(Dot Plot) 업데이트 예정</p>}
                    </div>
                    <a href="https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm"
                      target="_blank" rel="noopener noreferrer"
                      className="text-[10px] text-purple-500 hover:underline mt-1 inline-block">
                      연준 FOMC 공식 페이지 →
                    </a>
                  </div>
                )}

                <div className="max-h-[calc(100vh-320px)] overflow-y-auto divide-y divide-gray-100">
                  {selectedEvents.map((e, i) => renderEventDetail(e, i))}
                  {selectedEvents.length === 0 && selectedFomc && (
                    <div className="px-3 py-4 text-center text-xs text-gray-400">
                      FOMC 회의일 — 경제지표 발표 없음
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-6 text-center text-gray-400">
                <p className="text-2xl mb-2">📊</p>
                <p className="text-sm">날짜를 클릭하면 경제지표 상세를 볼 수 있습니다</p>
                <p className="text-xs mt-2 text-gray-300">CPI, NFP, FOMC, 국채 경매 등</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 목록 뷰 ── */}
      {!loading && !error && viewMode === 'list' && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500">
                <th className="text-left px-3 py-2 w-28">날짜</th>
                <th className="text-left px-3 py-2">지표</th>
                <th className="text-center px-3 py-2 w-20">중요도</th>
                <th className="text-right px-3 py-2 w-24">최근값</th>
                <th className="text-right px-3 py-2 w-24">이전값</th>
                <th className="text-center px-3 py-2 w-16">변화</th>
                <th className="text-center px-3 py-2 w-16">링크</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedDates.length === 0 && (
                <tr><td colSpan={7} className="text-center py-8 text-gray-400 text-sm">이 달에 이벤트가 없습니다</td></tr>
              )}
              {sortedDates.map(date => {
                const dayEvents = eventMap[date]
                const isFomc = fomcDateSet.has(date)
                return (
                  <React.Fragment key={date}>
                    {isFomc && (
                      <tr className="bg-purple-50">
                        <td className="px-3 py-1.5 text-xs font-medium text-purple-700">{date}</td>
                        <td className="px-3 py-1.5 text-xs font-bold text-purple-700">
                          FOMC 회의 {fomcMap[date]?.summary ? '(SEP + 점도표)' : '(성명서)'}
                        </td>
                        <td className="px-3 py-1.5 text-center">
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-purple-100 text-purple-700">FOMC</span>
                        </td>
                        <td colSpan={3}></td>
                        <td className="px-3 py-1.5 text-center">
                          <a href="https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm"
                            target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-500 hover:underline">Fed →</a>
                        </td>
                      </tr>
                    )}
                    {dayEvents.map((e, i) => {
                      const imp = IMPACT_CONFIG[e.impact] || IMPACT_CONFIG.low
                      const isAuction = e.type === 'auction'
                      const changeDir = (e.actual != null && e.prev != null) ? (e.actual > e.prev ? 'up' : e.actual < e.prev ? 'down' : null) : null
                      return (
                        <tr key={`${date}-${i}`} className={`${isAuction ? 'bg-emerald-50' : imp.bg} hover:bg-blue-50 transition-colors`}>
                          <td className="px-3 py-1.5 text-xs text-gray-600">{i === 0 && !isFomc ? date : ''}</td>
                          <td className="px-3 py-1.5">
                            <span className="text-xs font-medium text-gray-800">{e.name}</span>
                            {!isAuction && <span className="text-[10px] text-gray-400 ml-1">({CATEGORY_LABEL[e.category] || e.category})</span>}
                            {isAuction && e.auctionDetail?.offeringAmt && (
                              <span className="text-[10px] text-emerald-600 ml-1">{fmtAmt(e.auctionDetail.offeringAmt)}</span>
                            )}
                          </td>
                          <td className="px-3 py-1.5 text-center">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${isAuction ? 'bg-emerald-100 text-emerald-700' : imp.badge}`}>
                              {isAuction ? '경매' : imp.label}
                            </span>
                          </td>
                          <td className="px-3 py-1.5 text-right text-xs text-gray-700 font-medium">
                            {!isAuction ? fmtNum(e.actual, e.unit) : '—'}
                          </td>
                          <td className="px-3 py-1.5 text-right text-xs text-gray-500">
                            {!isAuction ? fmtNum(e.prev, e.unit) : '—'}
                          </td>
                          <td className="px-3 py-1.5 text-center text-xs">
                            {changeDir === 'up' && <span className="text-green-600 font-bold">▲</span>}
                            {changeDir === 'down' && <span className="text-red-600 font-bold">▼</span>}
                          </td>
                          <td className="px-3 py-1.5 text-center">
                            {e.link && (
                              <a href={e.link} target="_blank" rel="noopener noreferrer"
                                className="text-[10px] text-blue-500 hover:underline">공식 →</a>
                            )}
                            {isAuction && (
                              <a href="https://www.treasurydirect.gov/auctions/auction-query/results/"
                                target="_blank" rel="noopener noreferrer"
                                className="text-[10px] text-blue-500 hover:underline">결과 →</a>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 범례 */}
      <div className="flex gap-4 mt-3 text-xs text-gray-400 flex-wrap">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> 높은 중요도</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> 보통</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-purple-500" /> FOMC</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-emerald-500" /> 국채 경매</span>
        <span className="ml-auto">※ FRED Release Dates + TreasuryDirect + 연준 공식 일정 기반</span>
      </div>
    </div>
  )
}
