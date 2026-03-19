import React from 'react'

function addBusinessDays(date, days) {
  let d = new Date(date)
  let count = 0
  while (count < days) {
    d.setDate(d.getDate() - 1)
    const dow = d.getDay()
    if (dow !== 0 && dow !== 6) count++
  }
  return d
}

function addCalendarDays(date, days) {
  let d = new Date(date)
  d.setDate(d.getDate() - days)
  return d
}

function toYYYYMMDD(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}${m}${d}`
}

function toInputValue(yyyymmdd) {
  if (!yyyymmdd || yyyymmdd.length !== 8) return ''
  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`
}

function fromInputValue(val) {
  return val.replace(/-/g, '')
}

// biz: 영업일 기준, cal: 절대 달력 기준
const QUICK_BUTTONS = [
  { label: '1일전(영업일)', biz: 1 },
  { label: '3일전(영업일)', biz: 3 },
  { label: '1주전', cal: 7 },
  { label: '2주전', cal: 14 },
]

export default function DateRangePicker({ value, onChange }) {
  const today = new Date()
  const todayStr = toYYYYMMDD(today)

  const handleQuick = ({ biz, cal }) => {
    const start = biz != null
      ? addBusinessDays(today, biz)
      : addCalendarDays(today, cal)
    onChange({ start: toYYYYMMDD(start), end: todayStr })
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-500">{value.start ? `${value.start.slice(0,4)}-${value.start.slice(4,6)}-${value.start.slice(6,8)}` : ''} ~ {value.end ? `${value.end.slice(0,4)}-${value.end.slice(4,6)}-${value.end.slice(6,8)}` : ''}</span>
      <div className="flex gap-1">
        {QUICK_BUTTONS.map((btn) => (
          <button
            key={btn.label}
            onClick={() => handleQuick(btn)}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded border border-gray-300 transition-colors"
          >
            {btn.label}
          </button>
        ))}
      </div>
    </div>
  )
}
