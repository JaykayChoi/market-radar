import React, { useEffect, useState, useMemo } from 'react'
import DataTable from '../DataTable'

const COLUMNS = [
  { key: 'rank',            label: '순위',            type: 'number' },
  { key: 'name',            label: 'ETF명',           type: 'text' },
  { key: 'code',            label: '종목코드',        type: 'text' },
  { key: 'irp',             label: 'IRP',             type: 'text' },
  { key: 'net_inflow',      label: '순유입(억)',      type: 'number' },
  { key: 'shrs_change',     label: '발행주수변화(주)', type: 'number' },
  { key: 'net_change',      label: '순자산변화(억)',  type: 'number' },
  { key: 'net_change_pct',  label: '순자산변화(%)',   type: 'percent' },
  { key: 'return_pct',      label: '수익률(%)',       type: 'percent' },
  { key: 'total_asset',     label: '순자산총액(억)',  type: 'number' },
]

export default function EtfTab({ dateRange }) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!dateRange.start || !dateRange.end) return
    setLoading(true)
    fetch(`/api/data/etf?start=${dateRange.start}&end=${dateRange.end}`)
      .then(r => r.json())
      .then(res => setData(Array.isArray(res.data) ? res.data : []))
      .catch(() => setData([]))
      .finally(() => setLoading(false))
  }, [dateRange.start, dateRange.end])

  const processed = useMemo(() => {
    if (!data.length) return []

    // 종목코드별로 날짜 묶기
    const byCode = {}
    for (const row of data) {
      if (!byCode[row.code]) byCode[row.code] = []
      byCode[row.code].push(row)
    }

    const result = []
    for (const [code, rows] of Object.entries(byCode)) {
      const sorted = [...rows]
        .filter(r => (r.nav || 0) > 0)  // NAV 미공시 날짜 제외
        .sort((a, b) => a.date.localeCompare(b.date))
      if (sorted.length < 2) continue
      const prev = sorted[0]           // 이전 (시작일)
      const today = sorted[sorted.length - 1]  // 오늘 (종료일)

      const prevNav = prev.nav || 0
      const todayNav = today.nav || 0
      // 순자산변화 = 종료일 순자산총액 - 시작일 순자산총액 (억 단위)
      const prevTotalAsset = prev.total_asset || 0
      const todayTotalAsset = today.total_asset || 0
      const netChange = (todayTotalAsset - prevTotalAsset) / 1e8
      const netChangePct = prevTotalAsset > 0 ? (todayTotalAsset - prevTotalAsset) / prevTotalAsset * 100 : 0
      // 수익률 = (오늘NAV - 이전NAV) / 이전NAV × 100
      const returnPct = prevNav > 0 ? (todayNav - prevNav) / prevNav * 100 : 0
      // 오늘 순자산총액 (억 단위)
      const totalAsset = todayTotalAsset / 1e8

      const prevShrs = prev.list_shrs || 0
      const todayShrs = today.list_shrs || 0
      const shrsChange = todayShrs - prevShrs
      // 순유입 = 발행주수변화 × 시작NAV (가격 효과 제거)
      const netInflow = Math.round(shrsChange * prevNav / 1e8 * 10) / 10

      result.push({
        code,
        name: today.name || code,
        irp:             today.irp_eligible ? 'O' : 'X',
        net_inflow:      netInflow,
        shrs_change:     shrsChange,
        net_change:      Math.round(netChange     * 10) / 10,
        net_change_pct:  Math.round(netChangePct  * 100) / 100,
        return_pct:      Math.round(returnPct     * 100) / 100,
        total_asset:     Math.round(totalAsset),
      })
    }

    // 순유입 기준 내림차순 정렬
    result.sort((a, b) => b.net_inflow - a.net_inflow)
    return result.map((r, i) => ({ ...r, rank: i + 1 }))
  }, [data])

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold mb-3">ETF 순자산변화 순위</h3>
        <DataTable columns={COLUMNS} data={processed} loading={loading} defaultSortKey="net_inflow" defaultSortDir="desc" />
      </div>
    </div>
  )
}
