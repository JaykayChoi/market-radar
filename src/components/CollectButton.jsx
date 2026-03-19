import React from 'react'

export default function CollectButton({ collecting, onCollect, dateRange, progress }) {
  const handleClick = async () => {
    try {
      await fetch('/api/collect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dateRange),
      })
      onCollect()
    } catch (e) {
      console.error('Collect failed:', e)
    }
  }

  const progressPct = progress && progress.total > 0
    ? Math.round((progress.stage / progress.total) * 100)
    : 0

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleClick}
        disabled={collecting}
        className={`px-4 py-2 rounded font-medium transition-colors ${
          collecting
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
      >
        {collecting ? '수집 중...' : '데이터 수집'}
      </button>

      {collecting && progress && (
        <div className="w-full">
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>{progress.label}</span>
            <span>{progress.stage}/{progress.total}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
