import React, { useState, useEffect, useMemo } from 'react'

// ── 날짜 유틸 ────────────────────────────────────────────────────

function toYmd(d) { return d.toISOString().slice(0, 10) }
function addMonths(d, n) { const r = new Date(d); r.setMonth(r.getMonth() + n); return r }

function getMonthGrid(year, month) {
  const first = new Date(year, month, 1)
  const last  = new Date(year, month + 1, 0)
  const startDay = first.getDay()  // 0=Sun
  const days = []

  // 이전 달 빈칸
  for (let i = 0; i < startDay; i++) days.push(null)
  // 해당 월 날짜
  for (let d = 1; d <= last.getDate(); d++) {
    days.push(new Date(year, month, d))
  }
  return days
}

function fmtPrice(p) {
  if (!p) return '—'
  return typeof p === 'string' ? p : `$${p}`
}

function fmtRevenue(v) {
  if (!v) return null
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`
  if (v >= 1e6) return `$${(v / 1e6).toFixed(0)}M`
  return `$${v.toLocaleString()}`
}

const HOUR_LABEL = { bmo: '장전', amc: '장후', dmh: '장중' }

// 시가총액 상위 50 기업 (2026 기준 추정, rank = 시총 순위)
const TOP50 = {
  AAPL:  { name: 'Apple', rank: 1 },
  MSFT:  { name: 'Microsoft', rank: 2 },
  NVDA:  { name: 'NVIDIA', rank: 3 },
  AMZN:  { name: 'Amazon', rank: 4 },
  GOOGL: { name: 'Alphabet (A)', rank: 5 },
  GOOG:  { name: 'Alphabet (C)', rank: 5 },
  META:  { name: 'Meta Platforms', rank: 6 },
  BRK_B: { name: 'Berkshire Hathaway', rank: 7 },
  'BRK.B': { name: 'Berkshire Hathaway', rank: 7 },
  TSLA:  { name: 'Tesla', rank: 8 },
  AVGO:  { name: 'Broadcom', rank: 9 },
  LLY:   { name: 'Eli Lilly', rank: 10 },
  JPM:   { name: 'JPMorgan Chase', rank: 11 },
  WMT:   { name: 'Walmart', rank: 12 },
  V:     { name: 'Visa', rank: 13 },
  UNH:   { name: 'UnitedHealth', rank: 14 },
  XOM:   { name: 'ExxonMobil', rank: 15 },
  MA:    { name: 'Mastercard', rank: 16 },
  ORCL:  { name: 'Oracle', rank: 17 },
  COST:  { name: 'Costco', rank: 18 },
  PG:    { name: 'Procter & Gamble', rank: 19 },
  HD:    { name: 'Home Depot', rank: 20 },
  JNJ:   { name: 'Johnson & Johnson', rank: 21 },
  NFLX:  { name: 'Netflix', rank: 22 },
  ABBV:  { name: 'AbbVie', rank: 23 },
  BAC:   { name: 'Bank of America', rank: 24 },
  CRM:   { name: 'Salesforce', rank: 25 },
  KO:    { name: 'Coca-Cola', rank: 26 },
  CVX:   { name: 'Chevron', rank: 27 },
  MRK:   { name: 'Merck', rank: 28 },
  AMD:   { name: 'AMD', rank: 29 },
  PEP:   { name: 'PepsiCo', rank: 30 },
  TMO:   { name: 'Thermo Fisher', rank: 31 },
  ADBE:  { name: 'Adobe', rank: 32 },
  LIN:   { name: 'Linde', rank: 33 },
  ACN:   { name: 'Accenture', rank: 34 },
  ABT:   { name: 'Abbott Labs', rank: 35 },
  CSCO:  { name: 'Cisco', rank: 36 },
  WFC:   { name: 'Wells Fargo', rank: 37 },
  MCD:   { name: 'McDonald\'s', rank: 38 },
  DHR:   { name: 'Danaher', rank: 39 },
  TXN:   { name: 'Texas Instruments', rank: 40 },
  PM:    { name: 'Philip Morris', rank: 41 },
  QCOM:  { name: 'Qualcomm', rank: 42 },
  MS:    { name: 'Morgan Stanley', rank: 43 },
  DIS:   { name: 'Walt Disney', rank: 44 },
  INTU:  { name: 'Intuit', rank: 45 },
  GE:    { name: 'GE Aerospace', rank: 46 },
  IBM:   { name: 'IBM', rank: 47 },
  CAT:   { name: 'Caterpillar', rank: 48 },
  AMGN:  { name: 'Amgen', rank: 49 },
  NOW:   { name: 'ServiceNow', rank: 50 },
}

function getCompanyName(symbol) {
  return TOP50[symbol]?.name || symbol
}

function isTop50(symbol) {
  return symbol in TOP50
}

// ── 컴포넌트 ──────────────────────────────────────────────────────

export default function UsCalendarTab() {
  const [baseDate, setBaseDate] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [ipos, setIpos]         = useState([])
  const [earnings, setEarnings] = useState([])
  const [loading, setLoading]   = useState(false)
  const [filter, setFilter]     = useState('all') // all, ipo, earnings
  const [selected, setSelected] = useState(null)  // 선택된 날짜 YYYY-MM-DD

  const year  = baseDate.getFullYear()
  const month = baseDate.getMonth()

  // 데이터 fetch
  useEffect(() => {
    const from = toYmd(baseDate)
    const to   = toYmd(new Date(year, month + 1, 0))
    setLoading(true)
    setSelected(null)

    Promise.all([
      fetch(`/api/finnhub/calendar/ipo?from=${from}&to=${to}`).then(r => r.json()),
      fetch(`/api/finnhub/calendar/earnings?from=${from}&to=${to}`).then(r => r.json()),
    ])
      .then(([ipoData, earnData]) => {
        setIpos(ipoData.ipoCalendar || [])
        setEarnings(earnData.earningsCalendar || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [baseDate, year, month])

  // 날짜별 이벤트 맵
  const eventMap = useMemo(() => {
    const map = {}
    if (filter === 'all' || filter === 'ipo') {
      for (const ipo of ipos) {
        if (!ipo.date) continue
        if (!map[ipo.date]) map[ipo.date] = { ipos: [], earnings: [], hasTop50: false }
        map[ipo.date].ipos.push(ipo)
      }
    }
    if (filter === 'all' || filter === 'earnings') {
      for (const e of earnings) {
        if (!e.date) continue
        if (!map[e.date]) map[e.date] = { ipos: [], earnings: [], hasTop50: false }
        map[e.date].earnings.push(e)
        if (isTop50(e.symbol)) map[e.date].hasTop50 = true
      }
    }
    // 실적을 시총 순으로 정렬 (top50 먼저, 그 안에서 rank 순)
    for (const ev of Object.values(map)) {
      ev.earnings.sort((a, b) => {
        const ra = TOP50[a.symbol]?.rank ?? 9999
        const rb = TOP50[b.symbol]?.rank ?? 9999
        return ra - rb
      })
    }
    return map
  }, [ipos, earnings, filter])

  const grid = getMonthGrid(year, month)
  const today = toYmd(new Date())

  const prevMonth = () => setBaseDate(addMonths(baseDate, -1))
  const nextMonth = () => setBaseDate(addMonths(baseDate, 1))
  const goToday   = () => setBaseDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1))

  // 선택된 날짜의 이벤트
  const selectedEvents = selected ? eventMap[selected] : null

  return (
    <div data-testid="us-calendar-tab">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="px-2 py-1 rounded border border-gray-300 hover:bg-gray-100 text-sm">&lt;</button>
          <h2 className="text-lg font-bold text-gray-900 w-40 text-center">
            {year}년 {month + 1}월
          </h2>
          <button onClick={nextMonth} className="px-2 py-1 rounded border border-gray-300 hover:bg-gray-100 text-sm">&gt;</button>
          <button onClick={goToday} className="px-3 py-1 rounded border border-gray-300 hover:bg-gray-100 text-xs ml-2">오늘</button>
        </div>

        <div className="flex gap-1">
          {[
            { id: 'all',      label: '전체' },
            { id: 'ipo',      label: 'IPO' },
            { id: 'earnings', label: '실적발표' },
          ].map(f => (
            <button
              key={f.id}
              data-testid={`filter-${f.id}`}
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                filter === f.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* 범례 */}
      <div className="flex gap-4 mb-3 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> IPO ({ipos.length})
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" /> 실적발표 ({earnings.length})
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded bg-amber-200 inline-block" /> 시총 TOP50 실적
        </span>
        {loading && <span className="text-gray-400">로딩 중...</span>}
      </div>

      <div className="flex gap-4">
        {/* 달력 */}
        <div className="flex-1">
          {/* 요일 헤더 */}
          <div className="grid grid-cols-7 mb-1">
            {['일', '월', '화', '수', '목', '금', '토'].map(d => (
              <div key={d} className={`text-center text-xs font-semibold py-1 ${d === '일' ? 'text-red-400' : d === '토' ? 'text-blue-400' : 'text-gray-400'}`}>
                {d}
              </div>
            ))}
          </div>

          {/* 날짜 그리드 */}
          <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden border border-gray-200">
            {grid.map((date, i) => {
              if (!date) {
                return <div key={`empty-${i}`} className="bg-gray-50 min-h-[80px]" />
              }
              const ymd = toYmd(date)
              const ev = eventMap[ymd]
              const isToday = ymd === today
              const isSelected = ymd === selected
              const dayOfWeek = date.getDay()

              return (
                <div
                  key={ymd}
                  onClick={() => setSelected(isSelected ? null : ymd)}
                  className={`min-h-[80px] p-1.5 cursor-pointer transition-colors hover:bg-blue-50 ${
                    isSelected ? 'ring-2 ring-blue-500 ring-inset' : ''
                  } ${ev?.hasTop50 ? 'bg-amber-50' : 'bg-white'}`}
                >
                  <div className={`text-xs font-medium mb-1 ${
                    isToday ? 'bg-blue-600 text-white w-5 h-5 rounded-full flex items-center justify-center' :
                    dayOfWeek === 0 ? 'text-red-500' :
                    dayOfWeek === 6 ? 'text-blue-500' : 'text-gray-700'
                  }`}>
                    {date.getDate()}
                  </div>
                  {ev && (
                    <div className="space-y-0.5">
                      {ev.ipos.length > 0 && (
                        <div className="flex items-center gap-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                          <span className="text-[10px] text-emerald-700 truncate">
                            IPO {ev.ipos.length}건
                          </span>
                        </div>
                      )}
                      {ev.earnings.length > 0 && (
                        <div className="flex items-center gap-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                          <span className="text-[10px] text-blue-700 truncate">
                            실적 {ev.earnings.length}건
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* 우측 상세 패널 */}
        <div className="w-80 flex-shrink-0">
          {selected && selectedEvents ? (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
                <p className="text-sm font-bold text-gray-900">{selected}</p>
                <p className="text-xs text-gray-400">
                  IPO {selectedEvents.ipos.length}건 · 실적발표 {selectedEvents.earnings.length}건
                </p>
              </div>
              <div className="max-h-[calc(100vh-320px)] overflow-y-auto divide-y divide-gray-100">
                {/* IPO 목록 */}
                {selectedEvents.ipos.map((ipo, i) => (
                  <div key={`ipo-${i}`} className="px-3 py-2">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                      <span className="text-xs font-bold text-emerald-700">IPO</span>
                      {ipo.symbol && <span className="text-xs font-semibold text-gray-900">{ipo.symbol}</span>}
                    </div>
                    <p className="text-sm font-medium text-gray-800 truncate">{ipo.name}</p>
                    <div className="flex gap-3 mt-0.5 text-[11px] text-gray-500">
                      <span>{ipo.exchange}</span>
                      <span>가격: {fmtPrice(ipo.price)}</span>
                      {ipo.numberOfShares > 0 && <span>{(ipo.numberOfShares / 1e6).toFixed(1)}M주</span>}
                    </div>
                    {ipo.status && (
                      <span className={`inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                        ipo.status === 'priced' ? 'bg-emerald-100 text-emerald-700' :
                        ipo.status === 'expected' ? 'bg-yellow-100 text-yellow-700' :
                        ipo.status === 'filed' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {ipo.status === 'priced' ? '가격 확정' :
                         ipo.status === 'expected' ? '예정' :
                         ipo.status === 'filed' ? '신고' : ipo.status}
                      </span>
                    )}
                  </div>
                ))}
                {/* 실적발표 목록 */}
                {selectedEvents.earnings.map((e, i) => (
                  <div key={`earn-${i}`} className={`px-3 py-2 ${isTop50(e.symbol) ? 'bg-amber-50/50' : ''}`}>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                      <span className="text-xs font-bold text-blue-700">실적</span>
                      <span className="text-xs font-semibold text-gray-900">{getCompanyName(e.symbol)}</span>
                      <span className="text-[10px] text-gray-400">{e.symbol}</span>
                      {isTop50(e.symbol) && (
                        <span className="text-[10px] px-1 py-0.5 rounded bg-amber-200 text-amber-800 font-medium">TOP{TOP50[e.symbol].rank}</span>
                      )}
                      {e.hour && HOUR_LABEL[e.hour] && (
                        <span className="text-[10px] text-gray-400">({HOUR_LABEL[e.hour]})</span>
                      )}
                    </div>
                    <div className="flex gap-3 mt-0.5 text-[11px] text-gray-500">
                      <span>Q{e.quarter} {e.year}</span>
                      {e.epsEstimate != null && <span>EPS 예상: ${e.epsEstimate.toFixed(2)}</span>}
                      {e.epsActual != null && (
                        <span className={e.epsActual >= (e.epsEstimate || 0) ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                          실제: ${e.epsActual.toFixed(2)}
                        </span>
                      )}
                    </div>
                    {e.revenueEstimate != null && (
                      <div className="text-[11px] text-gray-500 mt-0.5">
                        매출 예상: {fmtRevenue(e.revenueEstimate)}
                        {e.revenueActual != null && (
                          <span className={e.revenueActual >= e.revenueEstimate ? ' text-green-600' : ' text-red-600'}>
                            {' '}실제: {fmtRevenue(e.revenueActual)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 p-6 text-center text-gray-400">
              <p className="text-2xl mb-2">📅</p>
              <p className="text-sm">날짜를 클릭하면 상세 정보를 볼 수 있습니다</p>
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-gray-400 mt-3">
        ※ Finnhub IPO Calendar + Earnings Calendar 기준. 데이터는 실시간 반영되지 않을 수 있습니다.
      </p>
    </div>
  )
}
