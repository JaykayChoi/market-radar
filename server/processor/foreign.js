const toNum = s => parseFloat(String(s || '').replace(/,/g, '')) || 0

function processForeign(investorTypes, results, startDate, endDate, db) {
  for (const type of investorTypes) {
    const rows = (results[type.code]?.rows || [])
      .map(r => {
        const code = r.ISU_SRT_CD || r.ISU_CD || r.SHRT_ISU_CD
        if (!code) return null
        return {
          start_date: startDate,
          end_date: endDate,
          investor_type: type.code,
          code,
          name: r.ISU_ABBRV || r.ISU_NM,
          net_val: toNum(r.NETBID_TRDVAL || r.NET_TRDVAL),
          net_vol: toNum(r.NETBID_TRDVOL),
        }
      })
      .filter(Boolean)

    if (rows.length > 0) db.upsertForeignFlow(rows)
    console.log(`[processForeign] ${startDate}~${endDate} ${type.label}(${type.code}): ${rows.length}건`)
  }
}

module.exports = { processForeign }
