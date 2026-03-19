import React, { useState, useEffect, useCallback } from 'react'
import DateRangePicker from './components/DateRangePicker'
import CollectButton from './components/CollectButton'
import EtfTab from './components/tabs/EtfTab'
import InvestorTab from './components/tabs/InvestorTab'
const TABS = [
  { id: 'etf', label: 'ETF 순자산변화' },
  { id: 'investor', label: '투자자별 순매수' },
]

function getDefaultDateRange() {
  const today = new Date()
  const end = toYYYYMMDD(today)
  // Default: 1주전 (7 calendar days)
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
  const [activeTab, setActiveTab] = useState('etf')
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

  const tabProps = { dateRange, key: refreshKey }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-wrap items-center gap-4 justify-between">
            <h1 className="text-xl font-bold text-gray-900">Market Radar</h1>
            <div className="flex flex-wrap items-center gap-3">
              <DateRangePicker value={dateRange} onChange={setDateRange} />
              <CollectButton
                collecting={collecting}
                onCollect={handleCollect}
                dateRange={dateRange}
                progress={progress}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Tab navigation */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex gap-1">
            {TABS.map(tab => (
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
        {activeTab === 'etf' && <EtfTab {...tabProps} />}
        {activeTab === 'investor' && <InvestorTab {...tabProps} />}
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
