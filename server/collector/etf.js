const { gotoMenu, fetch_json } = require('./browser')

async function collectEtf(page, dates) {
  // dates[0] = 오늘(endDate), dates[last] = startDate
  await gotoMenu(page, 'MDC0201030101', 8000)

  const prices = {}
  for (const date of dates) {
    const rows = await fetch_json(page, 'MDCSTAT04301', {
      trdDd: date,
      share: '1',
      money: '1',
      csvxls_isNo: 'false'
    })
    prices[date] = rows
  }

  const info = await fetch_json(page, 'MDCSTAT04601', {
    trdDd: dates[0],
    share: '1',
    money: '1',
    csvxls_isNo: 'false'
  })

  return { prices, info }
}

module.exports = { collectEtf }
