import React, { useState } from 'react'

// ── 모의 데이터 ──────────────────────────────────────────────────

const MOCK = {
  symbol: 'AAPL',
  name: 'Apple Inc.',
  exchange: 'NASDAQ',
  sector: 'Technology',
  industry: 'Consumer Electronics',
  price: 248.35,
  change: 3.82,
  changePct: 1.56,
  prevClose: 244.53,
  open: 245.10,
  dayHigh: 249.20,
  dayLow: 244.80,
  volume: 58_420_000,
  avgVolume: 62_150_000,
  marketCap: 3_820_000_000_000,
  pe: 33.2,
  forwardPe: 28.5,
  eps: 7.48,
  dividend: 1.00,
  dividendYield: 0.40,
  beta: 1.24,
  week52High: 260.10,
  week52Low: 164.08,
  targetPrice: 265.00,
  analystRating: 'Buy',
  analystCount: 42,
  shortRatio: 1.8,
  institutionalPct: 60.2,
  // 재무
  revenue:     [
    { q: 'Q1 2025', val: 94_930_000_000 },
    { q: 'Q2 2025', val: 85_780_000_000 },
    { q: 'Q3 2025', val: 89_500_000_000 },
    { q: 'Q4 2025', val: 124_300_000_000 },
  ],
  earnings:    [
    { q: 'Q1 2025', est: 1.62, actual: 1.65 },
    { q: 'Q2 2025', est: 1.34, actual: 1.40 },
    { q: 'Q3 2025', est: 1.39, actual: 1.46 },
    { q: 'Q4 2025', est: 2.35, actual: 2.42 },
  ],
  // 뉴스
  news: [
    { title: 'Apple, 새로운 AI 기능으로 iPhone 17 출시 예정', source: 'Bloomberg', time: '2시간 전', sentiment: 'positive' },
    { title: 'Vision Pro 2세대 개발 본격화, 내년 출시 목표', source: 'Reuters', time: '5시간 전', sentiment: 'positive' },
    { title: '중국 시장 점유율 하락 우려, 화웨이 경쟁 심화', source: 'CNBC', time: '1일 전', sentiment: 'negative' },
    { title: 'Apple Services 매출 분기 최고 기록 경신', source: 'WSJ', time: '2일 전', sentiment: 'positive' },
  ],
}

// ── 포맷 유틸 ────────────────────────────────────────────────────

function fmtNum(v, d = 2) { return v != null ? v.toFixed(d) : '—' }
function fmtB(v) {
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`
  if (v >= 1e9)  return `$${(v / 1e9).toFixed(1)}B`
  if (v >= 1e6)  return `$${(v / 1e6).toFixed(0)}M`
  return `$${v?.toLocaleString() ?? '—'}`
}
function fmtVol(v) {
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`
  return v?.toLocaleString() ?? '0'
}

const POPULAR = ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'AMZN', 'META', 'GOOGL', 'SPY', 'QQQ', 'AMD']

// ──────────────────────────────────────────────────────────────────
// 추천1: 올인원 대시보드 — 한 화면에 모든 정보를 카드형으로 배치
// ──────────────────────────────────────────────────────────────────

function Version1({ data }) {
  const d = data
  const w52pct = ((d.price - d.week52Low) / (d.week52High - d.week52Low) * 100).toFixed(0)

  return (
    <div>
      {/* 상단: 가격 + 핵심 지표 */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{d.name}</h2>
          <p className="text-sm text-gray-400">{d.symbol} · {d.exchange} · {d.sector}</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-gray-900">${fmtNum(d.price)}</p>
          <p className={`text-sm font-medium ${d.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {d.change >= 0 ? '+' : ''}{fmtNum(d.change)} ({fmtNum(d.changePct)}%)
          </p>
        </div>
      </div>

      {/* 메트릭 그리드 */}
      <div className="grid grid-cols-6 gap-2 mb-4">
        {[
          { label: '시가총액', value: fmtB(d.marketCap) },
          { label: 'PER', value: fmtNum(d.pe, 1) },
          { label: 'EPS', value: `$${fmtNum(d.eps)}` },
          { label: '배당수익률', value: `${fmtNum(d.dividendYield, 2)}%` },
          { label: '베타', value: fmtNum(d.beta, 2) },
          { label: '목표가', value: `$${fmtNum(d.targetPrice, 0)}` },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-lg border border-gray-200 p-2.5 text-center">
            <p className="text-[10px] text-gray-400">{label}</p>
            <p className="text-sm font-bold text-gray-900">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* 좌측: 시세 상세 */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-500 mb-3">시세 정보</p>
          <div className="space-y-2 text-xs">
            {[
              ['시가', `$${fmtNum(d.open)}`],
              ['전일종가', `$${fmtNum(d.prevClose)}`],
              ['일중 고가', `$${fmtNum(d.dayHigh)}`],
              ['일중 저가', `$${fmtNum(d.dayLow)}`],
              ['거래량', fmtVol(d.volume)],
              ['평균 거래량', fmtVol(d.avgVolume)],
              ['Forward PE', fmtNum(d.forwardPe, 1)],
              ['공매도 비율', `${fmtNum(d.shortRatio, 1)}일`],
              ['기관 보유', `${fmtNum(d.institutionalPct, 1)}%`],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <span className="text-gray-500">{k}</span>
                <span className="text-gray-900 font-medium">{v}</span>
              </div>
            ))}
          </div>
          {/* 52주 바 */}
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-[10px] text-gray-400 mb-1">52주 범위</p>
            <div className="flex items-center gap-2 text-[10px]">
              <span className="text-gray-500">${fmtNum(d.week52Low, 0)}</span>
              <div className="flex-1 bg-gray-100 rounded-full h-2 relative">
                <div className="absolute left-0 top-0 h-2 bg-blue-500 rounded-full" style={{ width: `${w52pct}%` }} />
              </div>
              <span className="text-gray-500">${fmtNum(d.week52High, 0)}</span>
            </div>
          </div>
        </div>

        {/* 중앙: EPS 서프라이즈 */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-500 mb-3">EPS 서프라이즈</p>
          <div className="space-y-2">
            {d.earnings.map(e => {
              const beat = e.actual >= e.est
              return (
                <div key={e.q} className="flex items-center justify-between text-xs">
                  <span className="text-gray-500 w-16">{e.q}</span>
                  <span className="text-gray-400">예상 ${fmtNum(e.est)}</span>
                  <span className={`font-bold ${beat ? 'text-green-600' : 'text-red-600'}`}>
                    실제 ${fmtNum(e.actual)}
                  </span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${beat ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {beat ? 'BEAT' : 'MISS'}
                  </span>
                </div>
              )
            })}
          </div>
          <p className="text-xs font-semibold text-gray-500 mt-4 mb-3">분기 매출</p>
          <div className="space-y-1.5">
            {d.revenue.map(r => (
              <div key={r.q} className="flex items-center gap-2 text-xs">
                <span className="text-gray-500 w-16">{r.q}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-3">
                  <div className="bg-blue-500 h-3 rounded-full" style={{ width: `${(r.val / d.revenue[3].val * 100).toFixed(0)}%` }} />
                </div>
                <span className="text-gray-700 font-medium w-14 text-right">{fmtB(r.val)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 우측: 뉴스 */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-500 mb-3">최신 뉴스</p>
          <div className="space-y-3">
            {d.news.map((n, i) => (
              <div key={i} className="border-b border-gray-50 pb-2 last:border-0">
                <p className="text-xs font-medium text-gray-800 leading-snug">{n.title}</p>
                <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-400">
                  <span>{n.source}</span>
                  <span>{n.time}</span>
                  <span className={`px-1.5 py-0.5 rounded-full font-medium ${
                    n.sentiment === 'positive' ? 'bg-green-100 text-green-700' :
                    n.sentiment === 'negative' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {n.sentiment === 'positive' ? '긍정' : n.sentiment === 'negative' ? '부정' : '중립'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────
// 추천2: 좌우 분할 — 좌측 핵심 지표 + 우측 탭 전환 (재무/뉴스)
// ──────────────────────────────────────────────────────────────────

function Version2({ data }) {
  const [subTab, setSubTab] = useState('overview')
  const d = data
  const w52pct = ((d.price - d.week52Low) / (d.week52High - d.week52Low) * 100).toFixed(0)

  return (
    <div className="flex gap-4">
      {/* 좌측: 고정 정보 패널 */}
      <div className="w-72 flex-shrink-0">
        <div className="bg-white rounded-lg border border-gray-200 p-4 sticky top-4">
          <h2 className="text-xl font-bold text-gray-900">{d.name}</h2>
          <p className="text-xs text-gray-400 mb-3">{d.symbol} · {d.exchange}</p>

          <p className="text-3xl font-bold text-gray-900">${fmtNum(d.price)}</p>
          <p className={`text-sm font-medium mb-4 ${d.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {d.change >= 0 ? '+' : ''}{fmtNum(d.change)} ({fmtNum(d.changePct)}%)
          </p>

          {/* 52주 바 */}
          <div className="mb-4">
            <p className="text-[10px] text-gray-400 mb-1">52주 범위</p>
            <div className="flex items-center gap-2 text-[10px]">
              <span>${fmtNum(d.week52Low, 0)}</span>
              <div className="flex-1 bg-gray-100 rounded-full h-2 relative">
                <div className="absolute left-0 top-0 h-2 bg-blue-500 rounded-full" style={{ width: `${w52pct}%` }} />
              </div>
              <span>${fmtNum(d.week52High, 0)}</span>
            </div>
          </div>

          <div className="space-y-1.5 text-xs">
            {[
              ['시가총액', fmtB(d.marketCap)],
              ['PER / Forward', `${fmtNum(d.pe, 1)} / ${fmtNum(d.forwardPe, 1)}`],
              ['EPS', `$${fmtNum(d.eps)}`],
              ['배당수익률', `${fmtNum(d.dividendYield)}%`],
              ['베타', fmtNum(d.beta, 2)],
              ['거래량', fmtVol(d.volume)],
              ['기관 보유', `${fmtNum(d.institutionalPct, 1)}%`],
              ['섹터', d.sector],
              ['업종', d.industry],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between py-0.5">
                <span className="text-gray-500">{k}</span>
                <span className="text-gray-900 font-medium">{v}</span>
              </div>
            ))}
          </div>

          {/* 애널리스트 */}
          <div className="mt-4 pt-3 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <span className={`px-2 py-1 rounded text-xs font-bold ${
                d.analystRating === 'Buy' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
              }`}>{d.analystRating}</span>
              <span className="text-xs text-gray-400">{d.analystCount}명</span>
              <span className="text-xs font-medium text-gray-700">목표 ${fmtNum(d.targetPrice, 0)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 우측: 탭 전환 콘텐츠 */}
      <div className="flex-1 min-w-0">
        <div className="flex gap-1 mb-4">
          {[
            { id: 'overview', label: '개요' },
            { id: 'financials', label: '재무' },
            { id: 'news', label: '뉴스' },
          ].map(t => (
            <button key={t.id} onClick={() => setSubTab(t.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium ${subTab === t.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {subTab === 'overview' && (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-xs font-semibold text-gray-500 mb-3">시세 상세</p>
              <div className="space-y-2 text-xs">
                {[['시가', `$${fmtNum(d.open)}`], ['전일종가', `$${fmtNum(d.prevClose)}`], ['일중 고가', `$${fmtNum(d.dayHigh)}`], ['일중 저가', `$${fmtNum(d.dayLow)}`], ['평균 거래량', fmtVol(d.avgVolume)], ['공매도', `${fmtNum(d.shortRatio, 1)}일`]].map(([k, v]) => (
                  <div key={k} className="flex justify-between"><span className="text-gray-500">{k}</span><span className="text-gray-900 font-medium">{v}</span></div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-xs font-semibold text-gray-500 mb-3">EPS 서프라이즈</p>
              <div className="space-y-2">
                {d.earnings.map(e => (
                  <div key={e.q} className="flex items-center justify-between text-xs">
                    <span className="text-gray-500 w-16">{e.q}</span>
                    <span className="text-gray-400">${fmtNum(e.est)}</span>
                    <span className={`font-bold ${e.actual >= e.est ? 'text-green-600' : 'text-red-600'}`}>${fmtNum(e.actual)}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${e.actual >= e.est ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {e.actual >= e.est ? 'BEAT' : 'MISS'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {subTab === 'financials' && (
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs font-semibold text-gray-500 mb-3">분기 매출</p>
            <div className="space-y-2">
              {d.revenue.map(r => (
                <div key={r.q} className="flex items-center gap-3 text-xs">
                  <span className="text-gray-500 w-16">{r.q}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-4 relative">
                    <div className="bg-blue-500 h-4 rounded-full flex items-center justify-end pr-2" style={{ width: `${(r.val / d.revenue[3].val * 100).toFixed(0)}%` }}>
                      <span className="text-[10px] text-white font-medium">{fmtB(r.val)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {subTab === 'news' && (
          <div className="space-y-3">
            {d.news.map((n, i) => (
              <div key={i} className="bg-white rounded-lg border border-gray-200 p-4">
                <p className="text-sm font-medium text-gray-800">{n.title}</p>
                <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-400">
                  <span>{n.source}</span><span>{n.time}</span>
                  <span className={`px-1.5 py-0.5 rounded-full font-medium ${
                    n.sentiment === 'positive' ? 'bg-green-100 text-green-700' : n.sentiment === 'negative' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                  }`}>{n.sentiment === 'positive' ? '긍정' : n.sentiment === 'negative' ? '부정' : '중립'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────
// 추천3: 컴팩트 카드 — 요약형 카드 + 확장 가능한 섹션
// ──────────────────────────────────────────────────────────────────

function Version3({ data }) {
  const [expanded, setExpanded] = useState({})
  const toggle = (k) => setExpanded(prev => ({ ...prev, [k]: !prev[k] }))
  const d = data
  const w52pct = ((d.price - d.week52Low) / (d.week52High - d.week52Low) * 100).toFixed(0)

  const Section = ({ id, title, children }) => (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <button onClick={() => toggle(id)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50">
        <span className="text-sm font-semibold text-gray-700">{title}</span>
        <span className="text-gray-400 text-xs">{expanded[id] ? '▲' : '▼'}</span>
      </button>
      {expanded[id] && <div className="px-4 pb-4 border-t border-gray-100">{children}</div>}
    </div>
  )

  return (
    <div>
      {/* 히어로 카드 */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-5 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{d.name}</h2>
            <p className="text-xs text-gray-500">{d.symbol} · {d.exchange} · {d.sector} · {d.industry}</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-gray-900">${fmtNum(d.price)}</p>
            <p className={`text-sm font-medium ${d.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {d.change >= 0 ? '+' : ''}{fmtNum(d.change)} ({fmtNum(d.changePct)}%)
            </p>
          </div>
        </div>
        <div className="grid grid-cols-8 gap-3 mt-4">
          {[
            { label: '시가총액', value: fmtB(d.marketCap) },
            { label: 'PER', value: fmtNum(d.pe, 1) },
            { label: 'Fwd PE', value: fmtNum(d.forwardPe, 1) },
            { label: 'EPS', value: `$${fmtNum(d.eps)}` },
            { label: '배당', value: `${fmtNum(d.dividendYield)}%` },
            { label: '베타', value: fmtNum(d.beta, 2) },
            { label: '목표가', value: `$${fmtNum(d.targetPrice, 0)}` },
            { label: '기관', value: `${fmtNum(d.institutionalPct, 0)}%` },
          ].map(({ label, value }) => (
            <div key={label} className="text-center">
              <p className="text-[10px] text-gray-400">{label}</p>
              <p className="text-xs font-bold text-gray-800">{value}</p>
            </div>
          ))}
        </div>
        {/* 52주 바 */}
        <div className="mt-3 flex items-center gap-2 text-[10px] text-gray-500">
          <span>52주 ${fmtNum(d.week52Low, 0)}</span>
          <div className="flex-1 bg-white/60 rounded-full h-2 relative">
            <div className="absolute left-0 top-0 h-2 bg-blue-500 rounded-full" style={{ width: `${w52pct}%` }} />
          </div>
          <span>${fmtNum(d.week52High, 0)}</span>
        </div>
      </div>

      {/* 접이식 섹션 */}
      <div className="space-y-2">
        <Section id="quote" title="시세 상세">
          <div className="grid grid-cols-3 gap-x-6 gap-y-1.5 text-xs mt-2">
            {[['시가', `$${fmtNum(d.open)}`], ['전일종가', `$${fmtNum(d.prevClose)}`], ['일중 고가', `$${fmtNum(d.dayHigh)}`], ['일중 저가', `$${fmtNum(d.dayLow)}`], ['거래량', fmtVol(d.volume)], ['평균 거래량', fmtVol(d.avgVolume)], ['공매도', `${fmtNum(d.shortRatio, 1)}일`], ['애널리스트', `${d.analystRating} (${d.analystCount}명)`], ['배당금', `$${fmtNum(d.dividend)}/주`]].map(([k, v]) => (
              <div key={k} className="flex justify-between py-0.5">
                <span className="text-gray-500">{k}</span>
                <span className="text-gray-900 font-medium">{v}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section id="earnings" title="EPS 서프라이즈">
          <div className="space-y-2 mt-2">
            {d.earnings.map(e => (
              <div key={e.q} className="flex items-center justify-between text-xs">
                <span className="text-gray-500 w-16">{e.q}</span>
                <span className="text-gray-400">예상 ${fmtNum(e.est)}</span>
                <span className={`font-bold ${e.actual >= e.est ? 'text-green-600' : 'text-red-600'}`}>실제 ${fmtNum(e.actual)}</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${e.actual >= e.est ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{e.actual >= e.est ? 'BEAT' : 'MISS'}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section id="revenue" title="분기 매출">
          <div className="space-y-1.5 mt-2">
            {d.revenue.map(r => (
              <div key={r.q} className="flex items-center gap-2 text-xs">
                <span className="text-gray-500 w-16">{r.q}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-3.5">
                  <div className="bg-blue-500 h-3.5 rounded-full" style={{ width: `${(r.val / d.revenue[3].val * 100).toFixed(0)}%` }} />
                </div>
                <span className="text-gray-700 font-medium w-14 text-right">{fmtB(r.val)}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section id="news" title="최신 뉴스">
          <div className="space-y-2 mt-2">
            {d.news.map((n, i) => (
              <div key={i} className="pb-2 border-b border-gray-50 last:border-0">
                <p className="text-xs font-medium text-gray-800">{n.title}</p>
                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-400">
                  <span>{n.source}</span><span>{n.time}</span>
                  <span className={`px-1 py-0.5 rounded-full font-medium ${n.sentiment === 'positive' ? 'bg-green-100 text-green-700' : n.sentiment === 'negative' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                    {n.sentiment === 'positive' ? '긍정' : n.sentiment === 'negative' ? '부정' : '중립'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </div>
  )
}

// ── 메인 컴포넌트 ──────────────────────────────────────────────────

export default function UsStockTab() {
  const [version, setVersion] = useState('v1')
  const [symbol, setSymbol]   = useState('AAPL')
  const [input, setInput]     = useState('')

  const handleSearch = (e) => {
    e.preventDefault()
    if (input.trim()) { setSymbol(input.trim().toUpperCase()); setInput('') }
  }

  return (
    <div data-testid="us-stock-tab">
      {/* 헤더: 버전 선택 + 종목 선택 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1">
          {[
            { id: 'v1', label: '추천1: 올인원 대시보드' },
            { id: 'v2', label: '추천2: 좌우 분할' },
            { id: 'v3', label: '추천3: 컴팩트 카드' },
          ].map(v => (
            <button key={v.id} onClick={() => setVersion(v.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                version === v.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              {v.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {POPULAR.map(s => (
              <button key={s} onClick={() => setSymbol(s)}
                className={`px-2 py-1 rounded text-xs font-medium ${symbol === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                {s}
              </button>
            ))}
          </div>
          <form onSubmit={handleSearch} className="flex gap-1">
            <input type="text" value={input} onChange={e => setInput(e.target.value)} placeholder="종목 검색"
              className="w-24 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:border-blue-500" />
            <button type="submit" className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700">검색</button>
          </form>
        </div>
      </div>

      {version === 'v1' && <Version1 data={MOCK} />}
      {version === 'v2' && <Version2 data={MOCK} />}
      {version === 'v3' && <Version3 data={MOCK} />}

      <p className="text-xs text-orange-500 mt-3">※ 현재 모의 데이터입니다. 실제 데이터 연동 예정.</p>
    </div>
  )
}
