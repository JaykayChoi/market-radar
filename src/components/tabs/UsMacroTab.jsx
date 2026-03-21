import React, { useState, useEffect } from 'react'

const DASHBOARD_KEYS = 'fed_rate,t2y,t10y,spread_10y2y,vix,hy_spread,usdkrw,dxy,unemployment,core_pce'

const META = {
  fed_rate:     { label: '기준금리',       unit: '%',  category: '금리' },
  t2y:          { label: '2년 국채',       unit: '%',  category: '금리' },
  t10y:         { label: '10년 국채',      unit: '%',  category: '금리' },
  spread_10y2y: { label: '장단기 스프레드 (10y-2y)', unit: '%p', category: '금리' },
  vix:          { label: 'VIX 공포지수',   unit: '',   category: '시장' },
  hy_spread:    { label: 'HY 스프레드',    unit: '%p', category: '시장' },
  usdkrw:       { label: '원/달러',        unit: '원', category: '환율' },
  dxy:          { label: '달러 인덱스',    unit: '',   category: '환율' },
  unemployment: { label: '실업률',         unit: '%',  category: '고용' },
  core_pce:     { label: '근원 PCE 지수',  unit: '',   category: '물가' },
}

const CATEGORIES = ['금리', '시장', '환율', '고용', '물가']

function formatValue(value, unit) {
  if (value === null || value === undefined) return '—'
  const num = typeof value === 'number' ? value : parseFloat(value)
  if (isNaN(num)) return '—'
  if (unit === '원') return num.toLocaleString('ko-KR', { maximumFractionDigits: 0 })
  return num.toFixed(2)
}

function MetricCard({ item }) {
  const meta = META[item.key] || { label: item.key, unit: '', category: '' }
  const hasError = !!item.error

  return (
    <div
      data-testid={`metric-card-${item.key}`}
      className="bg-white rounded-lg border border-gray-200 p-4 flex flex-col gap-1 shadow-sm"
    >
      <div className="text-xs text-gray-500">{meta.label}</div>
      {hasError ? (
        <div className="text-sm text-red-500">오류</div>
      ) : (
        <>
          <div className="text-xl font-bold text-gray-900">
            {formatValue(item.value, meta.unit)}
            {meta.unit && item.value !== null && (
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
      <div data-testid="loading" className="flex items-center justify-center py-16 text-gray-500">
        FRED 데이터 로딩 중...
      </div>
    )
  }

  if (error) {
    return (
      <div data-testid="error" className="flex items-center justify-center py-16 text-red-500">
        데이터 로드 실패: {error}
      </div>
    )
  }

  const byCategory = {}
  for (const cat of CATEGORIES) {
    byCategory[cat] = data.filter(item => META[item.key]?.category === cat)
  }

  return (
    <div data-testid="us-macro-tab" className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">미국 거시경제 지표</h2>
        <span className="text-xs text-gray-400">출처: FRED (St. Louis Fed)</span>
      </div>

      {CATEGORIES.map(cat => {
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
