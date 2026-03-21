import React, { useState, useEffect, useCallback } from 'react'
import DateRangePicker from './components/DateRangePicker'
import CollectButton from './components/CollectButton'
import EtfTab from './components/tabs/EtfTab'
import InvestorTab from './components/tabs/InvestorTab'
import SupplyTab from './components/tabs/SupplyTab'
import VolumeSurgeTab from './components/tabs/VolumeSurgeTab'
import UsMacroTab from './components/tabs/UsMacroTab'
import UsEtfTab from './components/tabs/us/UsEtfTab'
import Us13fTab from './components/tabs/us/Us13fTab'
import UsCalendarTab from './components/tabs/us/UsCalendarTab'

const KR_TABS = [
  { id: 'etf',          label: 'ETF 순자산변화'  },
  { id: 'investor',     label: '투자자별 순매수'  },
  { id: 'supply',       label: '공매도'           },
  { id: 'volume_surge', label: '거래량 급등'       },
]

const US_TABS = [
  { id: 'us_etf',   label: 'ETF'    },
  { id: 'us_macro', label: '매크로' },
  { id: 'us_13f',      label: '13F 기관' },
  { id: 'us_calendar', label: 'IPO/실적 캘린더' },
]

const MARKETS = [
  { id: 'kr', label: '🇰🇷 한국' },
  { id: 'us', label: '🇺🇸 미국' },
]

function getDefaultDateRange() {
  const today = new Date()
  const end = toYYYYMMDD(today)
  const start = new Date(today)
  start.setDate(start.getDate() - 7)
  return { start: toYYYYMMDD(start), end }
}

function toYYYYMMDD(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}${m}${d}`
}

export default function App() {
  const [market, setMarket] = useState('kr')
  const [activeKrTab, setActiveKrTab] = useState('etf')
  const [activeUsTab, setActiveUsTab] = useState('us_etf')
  const [dateRange, setDateRange] = useState(getDefaultDateRange)
  const [collecting, setCollecting] = useState(false)
  const [progress, setProgress] = useState({ stage: 0, total: 0, label: 'idle', status: 'idle' })
  const [toast, setToast] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleCollect = useCallback(() => {
    setCollecting(true)
    const es = new EventSource('/api/collect/progress')
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        setProgress(data)
        if (data.status === 'done') {
          setCollecting(false)
          es.close()
          setRefreshKey(k => k + 1)
          showToast('데이터 수집 완료')
        } else if (data.status === 'error') {
          setCollecting(false)
          es.close()
          showToast('수집 중 오류가 발생했습니다', 'error')
        }
      } catch {}
    }
    es.onerror = () => {
      setCollecting(false)
      es.close()
    }
  }, [])

  const tabs = market === 'kr' ? KR_TABS : US_TABS
  const activeTab = market === 'kr' ? activeKrTab : activeUsTab
  const setActiveTab = market === 'kr' ? setActiveKrTab : setActiveUsTab

  const tabProps = { dateRange, key: refreshKey }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-wrap items-center gap-4 justify-between">
            <h1 className="text-xl font-bold text-gray-900">Market Radar</h1>
            <div className="flex flex-wrap items-center gap-3">
              {market === 'kr' && (
                <>
                  <DateRangePicker value={dateRange} onChange={setDateRange} />
                  <CollectButton
                    collecting={collecting}
                    onCollect={handleCollect}
                    dateRange={dateRange}
                    progress={progress}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 시장 선택 (대분류) */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-1 pt-2">
            {MARKETS.map(m => (
              <button
                key={m.id}
                onClick={() => setMarket(m.id)}
                className={`px-5 py-2 text-sm font-semibold rounded-t-lg border-b-2 transition-colors ${
                  market === m.id
                    ? 'border-blue-600 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 탭 네비게이션 (소분류) */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex gap-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* 한국 탭 */}
        {market === 'kr' && activeTab === 'etf'          && <EtfTab {...tabProps} />}
        {market === 'kr' && activeTab === 'investor'     && <InvestorTab {...tabProps} />}
        {market === 'kr' && activeTab === 'supply'       && <SupplyTab {...tabProps} />}
        {market === 'kr' && activeTab === 'volume_surge' && <VolumeSurgeTab />}
        {/* 미국 탭 */}
        {market === 'us' && activeTab === 'us_etf'   && <UsEtfTab />}
        {market === 'us' && activeTab === 'us_macro' && <UsMacroTab />}
        {market === 'us' && activeTab === 'us_13f'      && <Us13fTab />}
        {market === 'us' && activeTab === 'us_calendar' && <UsCalendarTab />}
      </main>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-4 right-4 px-4 py-2 rounded shadow-lg text-white text-sm ${
          toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'
        }`}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}
