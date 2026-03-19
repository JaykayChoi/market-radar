const IRP_EXCLUDE = [
  '레버리지', '인버스', '2X', '2배', '골드', '원유', '달러', '금', '은', '구리',
  '천연가스', '옥수수', '대두', '밀 선물', 'WTI'
]

function isIrpEligible(name) {
  return !IRP_EXCLUDE.some(kw => name.includes(kw))
}

const toNum = s => parseFloat(String(s || '').replace(/,/g, '')) || 0
const toInt = s => parseInt(String(s || '').replace(/,/g, ''), 10) || 0

function processEtf(pricesMap, infoRows, db) {
  // ETF 기본정보 upsert (MDCSTAT04601 필드: ISU_SRT_CD, ISU_NM, IDX_ASST_CLSS_NM, COM_ABBRV)
  const infoMap = {}
  const processedInfo = infoRows.map(r => {
    const code = r.ISU_SRT_CD || r.ISU_CD
    const name = r.ISU_NM || r.ISU_ABBRV
    const eligible = isIrpEligible(name || '')
    const row = {
      code,
      name,
      theme: r.IDX_ASST_CLSS_NM || r.IDX_NM,
      manager: r.COM_ABBRV || r.MASTER_NM,
      listed_at: r.LIST_DD,
      irp_eligible: eligible ? 1 : 0
    }
    infoMap[code] = row
    return row
  })
  if (processedInfo.length > 0) db.upsertEtfInfo(processedInfo)

  // ETF 시세 upsert (MDCSTAT04301 필드: ISU_SRT_CD, ISU_ABBRV, LIST_SHRS, NAV, MKTCAP)
  for (const [date, rows] of Object.entries(pricesMap)) {
    if (!rows || rows.length === 0) continue
    const priceRows = rows
      .map(r => {
        const nav = toNum(r.NAV || r.NASS_CLSPRC)
        if (nav === 0) return null  // NAV 미공시 날짜는 저장 안 함
        const list_shrs = toInt(r.LIST_SHRS)
        const totalAssetRaw = toNum(r.INVSTASST_NETASST_TOTAMT)
        return {
          date,
          code: r.ISU_SRT_CD || r.ISU_CD,
          nav,
          list_shrs,
          close_price: toNum(r.TDD_CLSPRC || r.CLSPRC),
          mktcap: toNum(r.MKTCAP),
          total_asset: totalAssetRaw > 0 ? totalAssetRaw : list_shrs * nav,
          acc_trdvol: toInt(r.ACC_TRDVOL)
        }
      })
      .filter(Boolean)
    if (priceRows.length > 0) db.upsertEtfPrices(priceRows)
  }

  // 순설정액 계산: (오늘상장주수 - 이전상장주수) × 이전NAV / 1e8
  const dates = Object.keys(pricesMap).sort().reverse() // 최신 먼저
  const result = []

  if (dates.length >= 2) {
    const today = dates[0]
    const prevDate = dates[1]
    const todayRows = pricesMap[today] || []
    const prevRows = pricesMap[prevDate] || []
    const prevMap = {}
    prevRows.forEach(r => {
      const code = r.ISU_SRT_CD || r.ISU_CD
      prevMap[code] = r
    })

    todayRows.forEach(r => {
      const code = r.ISU_SRT_CD || r.ISU_CD
      const name = r.ISU_ABBRV || r.ISU_NM
      const prev = prevMap[code]
      if (!prev) return
      const todayShrs = toInt(r.LIST_SHRS)
      const prevShrs = toInt(prev.LIST_SHRS)
      const prevNav = toNum(prev.NAV || prev.NASS_CLSPRC)
      const netFlow = (todayShrs - prevShrs) * prevNav / 1e8

      result.push({
        code,
        name,
        theme: infoMap[code]?.theme,
        manager: infoMap[code]?.manager,
        irp_eligible: infoMap[code]?.irp_eligible ?? 1,
        net_flow: netFlow,
        nav: toNum(r.NAV || r.NASS_CLSPRC),
        list_shrs: todayShrs
      })
    })
  }

  return result.sort((a, b) => b.net_flow - a.net_flow)
}

module.exports = { processEtf, isIrpEligible }
