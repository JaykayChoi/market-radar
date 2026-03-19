const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')

const dataDir = path.join(__dirname, '../../data')
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })

const db = new Database(path.join(dataDir, 'market_radar.db'))

db.pragma('journal_mode = WAL')

// etf_prices 컬럼 마이그레이션
const etfCols = db.prepare("PRAGMA table_info(etf_prices)").all().map(c => c.name)
if (!etfCols.includes('total_asset')) {
  db.exec('ALTER TABLE etf_prices ADD COLUMN total_asset REAL DEFAULT 0')
}
if (!etfCols.includes('acc_trdvol')) {
  db.exec('ALTER TABLE etf_prices ADD COLUMN acc_trdvol INTEGER DEFAULT 0')
}

// foreign_flow 스키마 마이그레이션 (date → start_date/end_date)
const fCols = db.prepare("PRAGMA table_info(foreign_flow)").all().map(c => c.name)
if (fCols.length > 0 && !fCols.includes('start_date')) {
  db.exec('DROP TABLE foreign_flow')
}

// 구형 investor_type 데이터 ('foreign'/'institution' 문자열) 삭제 → 코드 방식으로 재수집
const oldFmt = db.prepare("SELECT COUNT(*) as n FROM foreign_flow WHERE investor_type IN ('foreign', 'institution')").get()
if (oldFmt && oldFmt.n > 0) {
  db.exec('DELETE FROM foreign_flow')
  console.log('[db] foreign_flow 구형 데이터 삭제 완료 (investor_type 코드 방식으로 전환, 재수집 필요)')
}

db.exec(`
  CREATE TABLE IF NOT EXISTS collected_date (
    date TEXT PRIMARY KEY,
    collected_at TEXT,
    stages_ok TEXT
  );

  CREATE TABLE IF NOT EXISTS etf_prices (
    date TEXT,
    code TEXT,
    nav REAL,
    list_shrs INTEGER,
    close_price REAL,
    mktcap REAL,
    total_asset REAL DEFAULT 0,
    acc_trdvol INTEGER DEFAULT 0,
    PRIMARY KEY (date, code)
  );

  CREATE TABLE IF NOT EXISTS etf_info (
    code TEXT PRIMARY KEY,
    name TEXT,
    theme TEXT,
    manager TEXT,
    listed_at TEXT,
    irp_eligible INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS foreign_flow (
    start_date TEXT,
    end_date TEXT,
    investor_type TEXT,
    code TEXT,
    name TEXT,
    net_val REAL,
    net_vol REAL,
    PRIMARY KEY (start_date, end_date, investor_type, code)
  );

  CREATE TABLE IF NOT EXISTS stock_prices (
    date TEXT,
    code TEXT,
    close_price REAL,
    PRIMARY KEY (date, code)
  );

  CREATE TABLE IF NOT EXISTS industry (
    date TEXT,
    index_name TEXT,
    close REAL,
    change_rate REAL,
    open REAL,
    high REAL,
    low REAL,
    PRIMARY KEY (date, index_name)
  );

  CREATE TABLE IF NOT EXISTS short_balance (
    date TEXT,
    code TEXT,
    name TEXT,
    balance_qty INTEGER,
    balance_amt REAL,
    balance_ratio REAL,
    PRIMARY KEY (date, code)
  );

  CREATE TABLE IF NOT EXISTS short_trade (
    date TEXT,
    code TEXT,
    name TEXT,
    short_vol INTEGER,
    total_vol INTEGER,
    vol_ratio REAL,
    short_val REAL,
    total_val REAL,
    val_ratio REAL,
    PRIMARY KEY (date, code)
  );

  CREATE TABLE IF NOT EXISTS program_trade (
    date TEXT,
    code TEXT,
    name TEXT,
    arb_buy REAL,
    arb_sell REAL,
    arb_net REAL,
    nonarb_buy REAL,
    nonarb_sell REAL,
    nonarb_net REAL,
    PRIMARY KEY (date, code)
  );
`)

const upsertEtfPrices = (rows) => {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO etf_prices (date, code, nav, list_shrs, close_price, mktcap, total_asset, acc_trdvol)
    VALUES (@date, @code, @nav, @list_shrs, @close_price, @mktcap, @total_asset, @acc_trdvol)
  `)
  const insertMany = db.transaction((rows) => { for (const r of rows) stmt.run(r) })
  insertMany(rows)
}

const upsertEtfInfo = (rows) => {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO etf_info (code, name, theme, manager, listed_at, irp_eligible)
    VALUES (@code, @name, @theme, @manager, @listed_at, @irp_eligible)
  `)
  const insertMany = db.transaction((rows) => { for (const r of rows) stmt.run(r) })
  insertMany(rows)
}

const upsertForeignFlow = (rows) => {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO foreign_flow (start_date, end_date, investor_type, code, name, net_val, net_vol)
    VALUES (@start_date, @end_date, @investor_type, @code, @name, @net_val, @net_vol)
  `)
  const insertMany = db.transaction((rows) => { for (const r of rows) stmt.run(r) })
  insertMany(rows)
}

const upsertStockPrices = (rows) => {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO stock_prices (date, code, close_price)
    VALUES (@date, @code, @close_price)
  `)
  const insertMany = db.transaction((rows) => { for (const r of rows) stmt.run(r) })
  insertMany(rows)
}

const upsertIndustry = (rows) => {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO industry (date, index_name, close, change_rate, open, high, low)
    VALUES (@date, @index_name, @close, @change_rate, @open, @high, @low)
  `)
  const insertMany = db.transaction((rows) => { for (const r of rows) stmt.run(r) })
  insertMany(rows)
}

const upsertShortBalance = (rows) => {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO short_balance (date, code, name, balance_qty, balance_amt, balance_ratio)
    VALUES (@date, @code, @name, @balance_qty, @balance_amt, @balance_ratio)
  `)
  const insertMany = db.transaction((rows) => { for (const r of rows) stmt.run(r) })
  insertMany(rows)
}

const upsertShortTrade = (rows) => {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO short_trade (date, code, name, short_vol, total_vol, vol_ratio, short_val, total_val, val_ratio)
    VALUES (@date, @code, @name, @short_vol, @total_vol, @vol_ratio, @short_val, @total_val, @val_ratio)
  `)
  const insertMany = db.transaction((rows) => { for (const r of rows) stmt.run(r) })
  insertMany(rows)
}

const upsertProgramTrade = (rows) => {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO program_trade (date, code, name, arb_buy, arb_sell, arb_net, nonarb_buy, nonarb_sell, nonarb_net)
    VALUES (@date, @code, @name, @arb_buy, @arb_sell, @arb_net, @nonarb_buy, @nonarb_sell, @nonarb_net)
  `)
  const insertMany = db.transaction((rows) => { for (const r of rows) stmt.run(r) })
  insertMany(rows)
}

const upsertCollectedDate = (date, stagesOk) => {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO collected_date (date, collected_at, stages_ok)
    VALUES (?, ?, ?)
  `)
  stmt.run(date, new Date().toISOString(), JSON.stringify(stagesOk))
}

const getEtfData = (start, end) => {
  return db.prepare(`
    SELECT
      p.date, p.code, p.nav, p.list_shrs, p.close_price, p.mktcap, p.total_asset, p.acc_trdvol,
      i.name, i.theme, i.manager, i.listed_at, i.irp_eligible
    FROM etf_prices p
    LEFT JOIN etf_info i ON p.code = i.code
    WHERE p.date >= ? AND p.date <= ?
    ORDER BY p.date, p.mktcap DESC
  `).all(start || '19000101', end || '99991231')
}

const getForeignData = (start, end, investorType) => {
  return db.prepare(`
    SELECT start_date, end_date, investor_type, code, name, net_val, net_vol
    FROM foreign_flow
    WHERE start_date = ? AND end_date = ? AND investor_type = ?
    ORDER BY net_val DESC
  `).all(start || '', end || '', investorType || 'foreign')
}

const getStockData = (start, end) => {
  return db.prepare(`
    SELECT date, code, close_price
    FROM stock_prices
    WHERE date >= ? AND date <= ?
    ORDER BY date, code
  `).all(start || '19000101', end || '99991231')
}

const getIndustryData = (start, end) => {
  return db.prepare(`
    SELECT date, index_name, close, change_rate, open, high, low
    FROM industry
    WHERE date >= ? AND date <= ?
    ORDER BY date, index_name
  `).all(start || '19000101', end || '99991231')
}

const getShortBalanceData = (start, end) => {
  return db.prepare(`
    SELECT date, code, name, balance_qty, balance_amt, balance_ratio
    FROM short_balance
    WHERE date >= ? AND date <= ?
    ORDER BY date DESC, balance_amt DESC
  `).all(start || '19000101', end || '99991231')
}

const getShortTradeData = (start, end) => {
  return db.prepare(`
    SELECT date, code, name, short_vol, total_vol, vol_ratio, short_val, total_val, val_ratio
    FROM short_trade
    WHERE date >= ? AND date <= ?
    ORDER BY date DESC, val_ratio DESC
  `).all(start || '19000101', end || '99991231')
}

const getProgramTradeData = (start, end) => {
  return db.prepare(`
    SELECT date, code, name, arb_buy, arb_sell, arb_net, nonarb_buy, nonarb_sell, nonarb_net
    FROM program_trade
    WHERE date >= ? AND date <= ?
    ORDER BY date DESC, (arb_net + nonarb_net) DESC
  `).all(start || '19000101', end || '99991231')
}

const getCollectedDates = (start, end) => {
  return db.prepare(`
    SELECT date, collected_at, stages_ok
    FROM collected_date
    WHERE date >= ? AND date <= ?
    ORDER BY date
  `).all(start || '19000101', end || '99991231')
}

const getInvestorTypes = (start, end) => {
  return db.prepare(`
    SELECT DISTINCT investor_type
    FROM foreign_flow
    WHERE start_date = ? AND end_date = ?
    ORDER BY investor_type
  `).all(start || '', end || '').map(r => r.investor_type)
}

const getNearestPriorDate = (date) => {
  const row = db.prepare(`
    SELECT date FROM collected_date
    WHERE date < ?
    ORDER BY date DESC
    LIMIT 1
  `).get(date)
  return row ? row.date : null
}

module.exports = {
  upsertEtfPrices,
  upsertEtfInfo,
  upsertForeignFlow,
  upsertStockPrices,
  upsertIndustry,
  upsertShortBalance,
  upsertShortTrade,
  upsertProgramTrade,
  upsertCollectedDate,
  getEtfData,
  getForeignData,
  getStockData,
  getIndustryData,
  getShortBalanceData,
  getShortTradeData,
  getProgramTradeData,
  getCollectedDates,
  getNearestPriorDate,
  getInvestorTypes,
}
