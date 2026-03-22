import React, { useState, useEffect } from 'react'

const DASHBOARD_KEYS = [
  'fed_rate', 't2y', 't5y', 't10y', 't30y', 'spread_10y2y', 'spread_10y3m', 'tips_10y',
  'vix', 'hy_spread', 'ig_spread',
  'bei_10y', 'bei_5y', 'cpi', 'core_cpi', 'pce', 'core_pce',
  'unemployment', 'nfp',
  'dxy', 'usdkrw', 'usdjpy', 'eurusd', 'usdcny',
  'm2', 'walcl',
  'mortgage30', 'houst',
  'umcsent', 'rsxfs',
  'indpro', 'capacity',
  'gdp', 'bopgstb',
].join(',')

const META = {
  // 금리
  fed_rate:       { label: '기준금리 (Fed Funds)',     unit: '%',  category: '금리' },
  t2y:            { label: '2년 국채',                unit: '%',  category: '금리' },
  t5y:            { label: '5년 국채',                unit: '%',  category: '금리' },
  t10y:           { label: '10년 국채',               unit: '%',  category: '금리' },
  t30y:           { label: '30년 국채',               unit: '%',  category: '금리' },
  spread_10y2y:   { label: '장단기 스프레드 (10y-2y)', unit: '%p', category: '금리' },
  spread_10y3m:   { label: '장단기 스프레드 (10y-3m)', unit: '%p', category: '금리' },
  tips_10y:       { label: '10년 실질금리 (TIPS)',     unit: '%',  category: '금리' },
  // 시장 심리/신용
  vix:            { label: 'VIX 공포지수',            unit: '',   category: '시장/신용' },
  hy_spread:      { label: '하이일드 스프레드',        unit: '%p', category: '시장/신용' },
  ig_spread:      { label: '투자등급 스프레드',        unit: '%p', category: '시장/신용' },
  // 인플레이션
  bei_10y:        { label: '10년 기대 인플레이션 (BEI)', unit: '%', category: '물가' },
  bei_5y:         { label: '5년 기대 인플레이션 (BEI)',  unit: '%', category: '물가' },
  cpi:            { label: 'CPI (소비자물가)',         unit: '',   category: '물가' },
  core_cpi:       { label: '근원 CPI',                unit: '',   category: '물가' },
  pce:            { label: 'PCE 물가',                unit: '',   category: '물가' },
  core_pce:       { label: '근원 PCE (Fed 선호)',      unit: '',   category: '물가' },
  // 고용
  unemployment:   { label: '실업률',                  unit: '%',  category: '고용' },
  nfp:            { label: '비농업 취업자수',          unit: '천명', category: '고용' },
  // 환율
  dxy:            { label: '달러 인덱스 (DXY)',        unit: '',   category: '환율' },
  usdkrw:         { label: '원/달러',                 unit: '원', category: '환율' },
  usdjpy:         { label: '엔/달러',                 unit: '¥',  category: '환율' },
  eurusd:         { label: '유로/달러',               unit: '$',  category: '환율' },
  usdcny:         { label: '위안/달러',               unit: '¥',  category: '환율' },
  // 유동성
  m2:             { label: '통화량 M2',               unit: 'B$', category: '유동성' },
  walcl:          { label: '연준 총자산 (QT)',         unit: 'M$', category: '유동성' },
  // 부동산
  mortgage30:     { label: '30년 모기지 금리',         unit: '%',  category: '부동산' },
  houst:          { label: '주택착공건수',             unit: '천건', category: '부동산' },
  // 소비/심리
  umcsent:        { label: '미시간 소비자심리지수',     unit: '',   category: '소비/심리' },
  rsxfs:          { label: '소매판매 (식품서비스 제외)', unit: 'M$', category: '소비/심리' },
  // 산업/경제
  indpro:         { label: '산업생산지수',             unit: '',   category: '산업/경제' },
  capacity:       { label: '설비가동률',               unit: '%',  category: '산업/경제' },
  gdp:            { label: '실질 GDP',                unit: 'B$', category: '산업/경제' },
  bopgstb:        { label: '무역수지',                unit: 'M$', category: '산업/경제' },
}

const CATEGORIES = ['금리', '시장/신용', '물가', '고용', '환율', '유동성', '부동산', '소비/심리', '산업/경제']

function formatValue(value, unit, key) {
  if (value === null || value === undefined) return '—'
  const num = typeof value === 'number' ? value : parseFloat(value)
  if (isNaN(num)) return '—'
  if (unit === '원') return num.toLocaleString('ko-KR', { maximumFractionDigits: 0 })
  if (unit === 'B$') return `${(num / 1000).toFixed(1)}T`
  if (unit === 'M$' && Math.abs(num) >= 1000) return `${(num / 1000).toFixed(1)}B`
  if (unit === 'M$') return `${num.toFixed(0)}M`
  if (unit === '천명') return `${(num / 1000).toFixed(0)}M`
  if (unit === '천건') return num.toFixed(0)
  return num.toFixed(2)
}

function getSignalColor(key, value) {
  if (value === null || value === undefined) return ''
  const num = typeof value === 'number' ? value : parseFloat(value)
  if (isNaN(num)) return ''

  // 스프레드 < 0 = 경기침체 경고
  if (key === 'spread_10y2y' || key === 'spread_10y3m') {
    if (num < 0) return 'border-l-4 border-l-red-500'
    if (num < 0.3) return 'border-l-4 border-l-yellow-500'
  }
  // VIX > 30 = 공포
  if (key === 'vix') {
    if (num >= 30) return 'border-l-4 border-l-red-500'
    if (num >= 20) return 'border-l-4 border-l-yellow-500'
  }
  // HY 스프레드 > 5 = 신용 위험
  if (key === 'hy_spread') {
    if (num >= 5) return 'border-l-4 border-l-red-500'
    if (num >= 4) return 'border-l-4 border-l-yellow-500'
  }
  return ''
}

function MetricCard({ item }) {
  const meta = META[item.key] || { label: item.key, unit: '', category: '' }
  const hasError = !!item.error
  const signal = getSignalColor(item.key, item.value)

  return (
    <div
      data-testid={`metric-card-${item.key}`}
      className={`bg-white rounded-lg border border-gray-200 p-4 flex flex-col gap-1 shadow-sm ${signal}`}
    >
      <div className="text-xs text-gray-500">{meta.label}</div>
      {hasError ? (
        <div className="text-sm text-red-500">오류</div>
      ) : (
        <>
          <div className="text-xl font-bold text-gray-900">
            {formatValue(item.value, meta.unit, item.key)}
            {meta.unit && !['B$', 'M$', '천명', '천건'].includes(meta.unit) && item.value !== null && (
              <span className="text-sm font-normal text-gray-500 ml-1">{meta.unit}</span>
            )}
          </div>
          <div className="text-xs text-gray-400">{item.date || ''}</div>
        </>
      )}
    </div>
  )
}

export default function UsMacroTab() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('전체')

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch(`/api/fred/multi?keys=${DASHBOARD_KEYS}`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(json => {
        setData(json.data || [])
        setLoading(false)
      })
      .catch(e => {
        setError(e.message)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div data-testid="loading" className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-3" />
        <span className="text-sm text-gray-500">FRED 데이터 로딩 중... ({DASHBOARD_KEYS.split(',').length}개 지표)</span>
      </div>
    )
  }

  if (error) {
    return (
      <div data-testid="error" className="flex flex-col items-center justify-center py-16">
        <p className="text-3xl mb-2">⚠️</p>
        <p className="text-red-500">데이터 로드 실패: {error}</p>
      </div>
    )
  }

  const categories = filter === '전체' ? CATEGORIES : [filter]
  const byCategory = {}
  for (const cat of CATEGORIES) {
    byCategory[cat] = data.filter(item => META[item.key]?.category === cat)
  }

  return (
    <div data-testid="us-macro-tab" className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">미국 거시경제 지표</h2>
        <span className="text-xs text-gray-400">출처: FRED (St. Louis Fed) · {data.length}개 지표</span>
      </div>

      {/* 카테고리 필터 */}
      <div className="flex gap-1 flex-wrap">
        {['전체', ...CATEGORIES].map(cat => (
          <button key={cat} onClick={() => setFilter(cat)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filter === cat ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>
            {cat}
          </button>
        ))}
      </div>

      {/* 경고 신호 범례 */}
      <div className="flex gap-4 text-[10px] text-gray-400">
        <span className="flex items-center gap-1"><span className="w-1 h-4 bg-red-500 inline-block rounded" /> 위험 신호</span>
        <span className="flex items-center gap-1"><span className="w-1 h-4 bg-yellow-500 inline-block rounded" /> 주의 신호</span>
        <span>(장단기 스프레드 역전, VIX 30+, HY 스프레드 5%+ 등)</span>
      </div>

      {categories.map(cat => {
        const items = byCategory[cat]
        if (!items || items.length === 0) return null
        return (
          <div key={cat}>
            <h3 className="text-sm font-medium text-gray-600 mb-2">{cat}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {items.map(item => <MetricCard key={item.key} item={item} />)}
            </div>
          </div>
        )
      })}
    </div>
  )
}
