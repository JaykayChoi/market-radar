import React, { useEffect, useState, useMemo } from 'react'
import DataTable from '../DataTable'

const COLUMNS = [
  { key: 'name',        label: '종목명',       type: 'text'    },
  { key: 'surge_ratio', label: '증가율(배수)',  type: 'number'  },
  { key: 'close',       label: '현재가',        type: 'number'  },
  { key: 'change_rate', label: '등락률(%)',     type: 'percent' },
  { key: 'volume',      label: '거래량',        type: 'number'  },
  { key: 'prev_volume', label: '전일거래량',    type: 'number'  },
  { key: 'per',         label: 'PER',           type: 'number'  },
  { key: '_link',       label: '',              type: 'link', href: row => `https://alphasquare.co.kr/home/stock-summary?code=${row.code}`, linkLabel: '종목' },
]

const MARKETS = [
  { id: 'all',    label: '전체'   },
  { id: 'kospi',  label: '코스피' },
  { id: 'kosdaq', label: '코스닥' },
]

export default function VolumeSurgeTab() {
  const [rawData, setRawData] = useState([])
  const [loading, setLoading] = useState(false)
  const [market, setMarket] = useState('all')

  useEffect(() => {
    setLoading(true)
    fetch('/api/naver/volume_surge')
      .then(r => r.json())
      .then(res => setRawData(Array.isArray(res.data) ? res.data : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const data = useMemo(() => {
    if (market === 'all') return rawData
    return rawData.filter(r => r.market === market)
  }, [market, rawData])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm font-medium text-gray-700">시장</span>
        <div className="flex flex-wrap gap-2">
          {MARKETS.map(m => (
            <button
              key={m.id}
              onClick={() => setMarket(m.id)}
              className={`px-3 py-1.5 text-sm rounded border transition-colors ${
                market === m.id
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <h3 className="text-base font-semibold mb-3">거래량 급등 상위 종목</h3>
        <DataTable
          columns={COLUMNS}
          data={data}
          loading={loading}
          defaultSortKey="surge_ratio"
          defaultSortDir="desc"
        />
      </div>
    </div>
  )
}
