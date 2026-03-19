import React, { useEffect, useState, useMemo } from 'react'
import DataTable from '../DataTable'

const INVESTOR_TYPES = [
  { code: '9000', label: '외국인' },
  { code: '7050', label: '기관합계' },
  { code: '6000', label: '연기금 등' },
  { code: '1000', label: '금융투자' },
  { code: '2000', label: '보험' },
  { code: '3000', label: '투신' },
  { code: '3100', label: '사모' },
  { code: '4000', label: '은행' },
  { code: '5000', label: '기타금융' },
  { code: '7100', label: '기타법인' },
  { code: '9001', label: '기타외국인' },
  { code: '9999', label: '전체' },
]

const COLUMNS = [
  { key: 'rank', label: '순위', type: 'number' },
  { key: 'name', label: '종목명', type: 'text' },
  { key: 'net_val_eok', label: '순매수금액(억원)', type: 'number' },
  { key: 'net_vol', label: '순매수량', type: 'number' },
]

export default function InvestorTab({ dateRange }) {
  const [investorCode, setInvestorCode] = useState('9000')
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!dateRange.start || !dateRange.end) return
    setLoading(true)
    fetch(`/api/data/foreign?start=${dateRange.start}&end=${dateRange.end}&investor_type=${investorCode}`)
      .then(r => r.json())
      .then(res => setData(Array.isArray(res.data) ? res.data : []))
      .catch(() => setData([]))
      .finally(() => setLoading(false))
  }, [dateRange.start, dateRange.end, investorCode])

  const processed = useMemo(() => {
    return [...data]
      .sort((a, b) => (b.net_val || 0) - (a.net_val || 0))
      .map((r, i) => ({
        rank: i + 1,
        code: r.code,
        name: r.name,
        net_val_eok: Math.round((r.net_val || 0) / 1e8 * 100) / 100,
        net_vol: r.net_vol || 0,
      }))
  }, [data])

  const currentLabel = INVESTOR_TYPES.find(t => t.code === investorCode)?.label || ''

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm font-medium text-gray-700">투자자구분</span>
        <div className="flex flex-wrap gap-2">
          {INVESTOR_TYPES.map(t => (
            <button
              key={t.code}
              onClick={() => setInvestorCode(t.code)}
              className={`px-3 py-1.5 text-sm rounded border transition-colors ${
                investorCode === t.code
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <h3 className="text-base font-semibold mb-3">{currentLabel} 순매수 종목</h3>
        <DataTable
          columns={COLUMNS}
          data={processed}
          loading={loading}
          defaultSortKey="net_val_eok"
          defaultSortDir="desc"
        />
      </div>
    </div>
  )
}
