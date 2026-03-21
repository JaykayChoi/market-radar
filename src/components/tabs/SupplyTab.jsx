import React, { useEffect, useState, useMemo } from 'react'
import DataTable from '../DataTable'

const CATEGORIES = [
  { id: 'short_balance', label: '공매도 잔고' },
  { id: 'short_trade',   label: '공매도 거래' },
]

const COLUMNS = {
  short_balance: [
    { key: 'name',          label: '종목명',       type: 'text'    },
    { key: 'balance_qty',   label: '잔고수량',     type: 'number'  },
    { key: 'balance_amt',   label: '잔고금액(원)', type: 'number'  },
    { key: 'balance_ratio', label: '잔고비율',     type: 'percent' },
  ],
  short_trade: [
    { key: 'name',        label: '종목명',             type: 'text'    },
    { key: 'short_val',   label: '공매도거래대금(원)', type: 'number'  },
    { key: 'total_val',   label: '전체거래대금(원)',   type: 'number'  },
    { key: 'short_ratio', label: '공매도비율(%)',      type: 'percent' },
  ],
}

const DEFAULT_SORT = {
  short_balance: 'balance_ratio',
  short_trade:   'short_ratio',
}

export default function SupplyTab({ dateRange }) {
  const [category, setCategory] = useState('short_balance')
  const [rawData, setRawData] = useState({
    short_balance: [], short_trade: [],
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!dateRange.start || !dateRange.end) return
    setLoading(true)
    Promise.all([
      fetch(`/api/data/short_balance?start=${dateRange.start}&end=${dateRange.end}`).then(r => r.json()),
      fetch(`/api/data/short_trade?start=${dateRange.start}&end=${dateRange.end}`).then(r => r.json()),
    ])
      .then(([sb, st]) => setRawData({
        short_balance: Array.isArray(sb.data) ? sb.data : [],
        short_trade:   Array.isArray(st.data) ? st.data : [],
      }))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [dateRange.start, dateRange.end])

  const data = useMemo(() => rawData[category], [category, rawData])

  const currentLabel = CATEGORIES.find(c => c.id === category)?.label || ''

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm font-medium text-gray-700">카테고리</span>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(c => (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              className={`px-3 py-1.5 text-sm rounded border transition-colors ${
                category === c.id
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <h3 className="text-base font-semibold mb-3">{currentLabel}</h3>
        <DataTable
          columns={COLUMNS[category]}
          data={data}
          loading={loading}
          defaultSortKey={DEFAULT_SORT[category]}
          defaultSortDir="desc"
        />
      </div>
    </div>
  )
}
