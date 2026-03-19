import React, { useState, useMemo } from 'react'

function formatValue(val, type) {
  if (val === null || val === undefined) return '-'
  if (type === 'number') {
    return typeof val === 'number' ? val.toLocaleString('ko-KR') : val
  }
  if (type === 'percent') {
    return typeof val === 'number' ? `${val.toFixed(2)}%` : val
  }
  return val
}

export default function DataTable({ columns = [], data = [], loading = false, defaultSortKey = null, defaultSortDir = 'desc' }) {
  const [sortKey, setSortKey] = useState(defaultSortKey)
  const [sortDir, setSortDir] = useState(defaultSortDir)

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const sorted = useMemo(() => {
    if (!sortKey) return data
    return [...data].sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      if (av === null || av === undefined) return 1
      if (bv === null || bv === undefined) return -1
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av
      }
      return sortDir === 'asc'
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av))
    })
  }, [data, sortKey, sortDir])

  if (loading) {
    return (
      <div className="animate-pulse">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-8 bg-gray-200 rounded mb-2" />
        ))}
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">데이터 없음</div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-50 border-b">
            {columns.map((col) => (
              <th
                key={col.key}
                onClick={() => handleSort(col.key)}
                className={`px-3 py-2 font-medium text-gray-700 cursor-pointer hover:bg-gray-100 select-none ${
                  col.type === 'number' || col.type === 'percent' ? 'text-right' : 'text-left'
                }`}
              >
                {col.label}
                {sortKey === col.key && (
                  <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => (
            <tr key={i} className="border-b hover:bg-gray-50">
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`px-3 py-2 ${
                    col.type === 'number' || col.type === 'percent' ? 'text-right' : 'text-left'
                  }`}
                >
                  {formatValue(row[col.key], col.type)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
