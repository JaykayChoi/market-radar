# 수급 탭 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** KRX 공매도 잔고, 공매도 거래, 프로그램 순매수 데이터를 수집·저장하고 수급 탭에 전종목 테이블로 표시한다.

**Architecture:** 기존 Playwright 세션을 재사용하는 request+response 이중 인터셉트 패턴(stock.js 동일)으로 수집기 2개 추가. collect.js 파이프라인에 stage 5/6으로 통합. SupplyTab.jsx는 UI가 이미 구현돼 있고 App.jsx에도 이미 등록돼 있으므로 API 호출 연결만 추가한다.

**Tech Stack:** Node.js, Playwright, better-sqlite3, React 18, Tailwind CSS

---

## 파일 목록

| 파일 | 작업 |
|------|------|
| `server/collector/shortstock.js` | 신규 — 공매도 잔고 + 거래 수집기 |
| `server/collector/program.js` | 신규 — 프로그램 순매수 수집기 |
| `server/storage/db.js` | 수정 — 테이블 3개 + 함수 6개 추가 |
| `server/routes/collect.js` | 수정 — TOTAL=7, stage 5/6 추가, 중복 emitProgress 정리 |
| `server/routes/data.js` | 수정 — switch-case 3개 추가 |
| `src/components/tabs/SupplyTab.jsx` | 수정 — API 호출 연결 (현재 파일에 MOCK_DATA 미정의 버그 있어 전체 교체) |

> **참고:** `src/App.jsx`는 이미 SupplyTab import 및 탭 등록이 완료돼 있음. 수정 불필요.

---

## Task 1: KRX 메뉴 ID 및 필드명 사전 조사

> 자동화 불가. 구현자가 직접 KRX 사이트에서 확인 후 Task 3~4 코드에 반영.

**Files:** 없음 (조사 결과를 이후 Task에 반영)

- [ ] **Step 1: KRX 데이터포털 로그인**

  브라우저에서 `https://data.krx.co.kr` 접속 후 로그인.

- [ ] **Step 2: 공매도 잔고 메뉴 ID 및 필드명 확인**

  좌측 메뉴 "주식 > 공매도 > 공매도 잔고 현황" 클릭.
  - 주소창 `menuId=` 값 기록
  - DevTools Network → `getJsonData.cmd` 응답 JSON에서 필드명 확인:
    - 종목코드: `ISU_SRT_CD` 또는 `ISU_CD`
    - 종목명: `ISU_ABBRV` 또는 `ISU_NM`
    - 잔고수량, 잔고금액, 잔고비율에 해당하는 필드명
  - 전체 종목 응답의 행 수 확인 (row count 임계값 결정용, 보통 1000행 이상)

- [ ] **Step 3: 공매도 거래 현황 메뉴 ID 및 필드명 확인**

  "주식 > 공매도 > 공매도 거래 현황" 클릭.
  - 동일하게 menuId와 필드명 기록
  - 필요 필드: 공매도거래량, 전체거래량, 거래량비율, 공매도거래대금, 전체거래대금, 거래대금비율

- [ ] **Step 4: 프로그램 매매 메뉴 ID 및 필드명 확인**

  "주식 > 프로그램매매 > 종목별" 클릭.
  - 동일하게 menuId와 필드명 기록
  - 필요 필드: 차익매수/매도/순매수, 비차익매수/매도/순매수

---

## Task 2: SQLite 테이블 및 함수 추가

**Files:**
- Modify: `server/storage/db.js`

- [ ] **Step 1: db.exec 블록에 테이블 3개 추가**

  기존 `db.exec(...)` 내부 마지막 테이블 정의 뒤에 추가:

  ```sql
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
  ```

- [ ] **Step 2: upsert 함수 3개 추가** (기존 `upsertIndustry` 뒤에)

  ```js
  const upsertShortBalance = (rows) => {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO short_balance
        (date, code, name, balance_qty, balance_amt, balance_ratio)
      VALUES (@date, @code, @name, @balance_qty, @balance_amt, @balance_ratio)
    `)
    const insertMany = db.transaction((rows) => { for (const r of rows) stmt.run(r) })
    insertMany(rows)
  }

  const upsertShortTrade = (rows) => {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO short_trade
        (date, code, name, short_vol, total_vol, vol_ratio, short_val, total_val, val_ratio)
      VALUES (@date, @code, @name, @short_vol, @total_vol, @vol_ratio, @short_val, @total_val, @val_ratio)
    `)
    const insertMany = db.transaction((rows) => { for (const r of rows) stmt.run(r) })
    insertMany(rows)
  }

  const upsertProgramTrade = (rows) => {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO program_trade
        (date, code, name, arb_buy, arb_sell, arb_net, nonarb_buy, nonarb_sell, nonarb_net)
      VALUES (@date, @code, @name, @arb_buy, @arb_sell, @arb_net, @nonarb_buy, @nonarb_sell, @nonarb_net)
    `)
    const insertMany = db.transaction((rows) => { for (const r of rows) stmt.run(r) })
    insertMany(rows)
  }
  ```

- [ ] **Step 3: getter 함수 3개 추가** (기존 `getIndustryData` 뒤에)

  ```js
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
  ```

- [ ] **Step 4: module.exports에 6개 함수 추가**

  기존 `module.exports = { ... }` 객체에 추가:
  ```js
  upsertShortBalance,
  upsertShortTrade,
  upsertProgramTrade,
  getShortBalanceData,
  getShortTradeData,
  getProgramTradeData,
  ```

- [ ] **Step 5: 서버 시작해서 오류 없는지 확인**

  ```bash
  npm run dev
  ```
  콘솔에 SQLite 관련 오류 없으면 완료.

- [ ] **Step 6: 커밋**

  ```bash
  git add server/storage/db.js
  git commit -m "feat: short_balance/short_trade/program_trade 테이블 및 db 함수 추가"
  ```

---

## Task 3: 공매도 수집기 구현

> Task 1에서 확인한 menuId, 필드명, row 임계값을 아래 코드에 반영한다.
> 인터셉트 패턴은 stock.js와 동일: onRequest로 마지막 요청 저장, onResponse에서 행 수 + 필드 존재로 검증 후 확정.

**Files:**
- Create: `server/collector/shortstock.js`

- [ ] **Step 1: 파일 생성**

  ```js
  const { gotoMenu, fetch_json } = require('./browser')

  // Task 1에서 확인한 값으로 교체
  const SHORT_BALANCE_MENU = 'MDC0201060201'  // ← 실제 확인값으로 교체
  const SHORT_TRADE_MENU   = 'MDC0201060101'  // ← 실제 확인값으로 교체
  // 전종목 공매도 응답의 예상 최소 행 수 (Task 1에서 확인, 보통 1000 이상)
  const MIN_ROWS = 500

  async function collectShortBalance(page, dates) {
    let capturedBld = null
    let capturedParams = null
    let lastReqBld = null
    let lastReqParams = null

    const onRequest = (request) => {
      if (request.url().includes('getJsonData.cmd') && request.postData()) {
        const m = request.postData().match(/bld=([^&]+)/)
        if (m) {
          lastReqBld = m[1]
          lastReqParams = request.postData()
        }
      }
    }

    const onResponse = async (response) => {
      if (!response.url().includes('getJsonData.cmd') || capturedBld) return
      try {
        const d = JSON.parse(await response.text())
        const rows = d.output || []
        const first = rows[0] || {}
        // Task 1에서 확인한 필드명으로 조건 교체
        if (rows.length > MIN_ROWS && Object.keys(first).some(k => k.toUpperCase().includes('BAL'))) {
          capturedBld = lastReqBld
          capturedParams = lastReqParams
        }
      } catch {}
    }

    page.on('request', onRequest)
    page.on('response', onResponse)
    await gotoMenu(page, SHORT_BALANCE_MENU, 6000)
    page.removeListener('request', onRequest)
    page.removeListener('response', onResponse)

    if (!capturedBld) throw new Error('[shortstock] 공매도 잔고 bld 캡처 실패')

    const bldSuffix = capturedBld.replace('dbms/MDC/STAT/standard/', '')
    const baseObj = Object.fromEntries(
      new URLSearchParams(
        capturedParams
          .replace(/bld=[^&]+&?/, '')
          .replace(/locale=[^&]+&?/, '')
          .replace(/^&+|&+$/g, '')
      )
    )

    const results = {}
    for (const date of dates) {
      const rows = await fetch_json(page, bldSuffix, { ...baseObj, trdDd: date })
      results[date] = rows
      console.log(`[shortstock] 공매도 잔고 ${date}: ${rows.length}건`)
    }
    return results
  }

  async function collectShortTrade(page, dates) {
    let capturedBld = null
    let capturedParams = null
    let lastReqBld = null
    let lastReqParams = null

    const onRequest = (request) => {
      if (request.url().includes('getJsonData.cmd') && request.postData()) {
        const m = request.postData().match(/bld=([^&]+)/)
        if (m) {
          lastReqBld = m[1]
          lastReqParams = request.postData()
        }
      }
    }

    const onResponse = async (response) => {
      if (!response.url().includes('getJsonData.cmd') || capturedBld) return
      try {
        const d = JSON.parse(await response.text())
        const rows = d.output || []
        const first = rows[0] || {}
        // Task 1에서 확인한 필드명으로 조건 교체
        if (rows.length > MIN_ROWS && Object.keys(first).some(k => k.toUpperCase().includes('SHRT'))) {
          capturedBld = lastReqBld
          capturedParams = lastReqParams
        }
      } catch {}
    }

    page.on('request', onRequest)
    page.on('response', onResponse)
    await gotoMenu(page, SHORT_TRADE_MENU, 6000)
    page.removeListener('request', onRequest)
    page.removeListener('response', onResponse)

    if (!capturedBld) throw new Error('[shortstock] 공매도 거래 bld 캡처 실패')

    const bldSuffix = capturedBld.replace('dbms/MDC/STAT/standard/', '')
    const baseObj = Object.fromEntries(
      new URLSearchParams(
        capturedParams
          .replace(/bld=[^&]+&?/, '')
          .replace(/locale=[^&]+&?/, '')
          .replace(/^&+|&+$/g, '')
      )
    )

    const results = {}
    for (const date of dates) {
      const rows = await fetch_json(page, bldSuffix, { ...baseObj, trdDd: date })
      results[date] = rows
      console.log(`[shortstock] 공매도 거래 ${date}: ${rows.length}건`)
    }
    return results
  }

  module.exports = { collectShortBalance, collectShortTrade }
  ```

- [ ] **Step 2: 커밋**

  ```bash
  git add server/collector/shortstock.js
  git commit -m "feat: 공매도 잔고/거래 수집기 추가"
  ```

---

## Task 4: 프로그램 순매수 수집기 구현

**Files:**
- Create: `server/collector/program.js`

- [ ] **Step 1: 파일 생성**

  ```js
  const { gotoMenu, fetch_json } = require('./browser')

  // Task 1에서 확인한 값으로 교체
  const PROGRAM_MENU = 'MDC0201070101'  // ← 실제 확인값으로 교체
  const MIN_ROWS = 500

  async function collectProgramTrade(page, dates) {
    let capturedBld = null
    let capturedParams = null
    let lastReqBld = null
    let lastReqParams = null

    const onRequest = (request) => {
      if (request.url().includes('getJsonData.cmd') && request.postData()) {
        const m = request.postData().match(/bld=([^&]+)/)
        if (m) {
          lastReqBld = m[1]
          lastReqParams = request.postData()
        }
      }
    }

    const onResponse = async (response) => {
      if (!response.url().includes('getJsonData.cmd') || capturedBld) return
      try {
        const d = JSON.parse(await response.text())
        const rows = d.output || []
        const first = rows[0] || {}
        // Task 1에서 확인한 필드명으로 조건 교체
        if (rows.length > MIN_ROWS && Object.keys(first).some(k => k.toUpperCase().includes('PRGM'))) {
          capturedBld = lastReqBld
          capturedParams = lastReqParams
        }
      } catch {}
    }

    page.on('request', onRequest)
    page.on('response', onResponse)
    await gotoMenu(page, PROGRAM_MENU, 6000)
    page.removeListener('request', onRequest)
    page.removeListener('response', onResponse)

    if (!capturedBld) throw new Error('[program] 프로그램 순매수 bld 캡처 실패')

    const bldSuffix = capturedBld.replace('dbms/MDC/STAT/standard/', '')
    const baseObj = Object.fromEntries(
      new URLSearchParams(
        capturedParams
          .replace(/bld=[^&]+&?/, '')
          .replace(/locale=[^&]+&?/, '')
          .replace(/^&+|&+$/g, '')
      )
    )

    const results = {}
    for (const date of dates) {
      const rows = await fetch_json(page, bldSuffix, { ...baseObj, trdDd: date })
      results[date] = rows
      console.log(`[program] 프로그램 순매수 ${date}: ${rows.length}건`)
    }
    return results
  }

  module.exports = { collectProgramTrade }
  ```

- [ ] **Step 2: 커밋**

  ```bash
  git add server/collector/program.js
  git commit -m "feat: 프로그램 순매수 수집기 추가"
  ```

---

## Task 5: collect.js 파이프라인 확장

**Files:**
- Modify: `server/routes/collect.js`

- [ ] **Step 1: import 2개 추가** (`runCollection` 함수 상단 require 블록에)

  ```js
  const { collectShortBalance, collectShortTrade } = require('../collector/shortstock')
  const { collectProgramTrade } = require('../collector/program')
  ```

- [ ] **Step 2: TOTAL 값 변경**

  ```js
  // 변경 전
  const TOTAL = 5
  // 변경 후
  const TOTAL = 7
  ```

- [ ] **Step 3: stage 번호 정리 (중복/오류 제거)**

  현재 코드의 중복·잘못된 emitProgress 4줄을 삭제한다:
  - `emitProgress(sessionId, 3, TOTAL, '투자자별 순매수 완료', 'running')` (외국인 수집 직후 중복 emit, line 127 근처)
  - `emitProgress(sessionId, 3, TOTAL, '기관 순매수 완료', 'running')` (주식 수집 중 잘못된 라벨, line 137 근처)

  그리고 주식 종가·업종별 stage 번호를 재정의:
  ```js
  // 주식 종가: 기존 stage 4 → stage 3
  emitProgress(sessionId, 3, TOTAL, '주식 종가 수집 중...', 'running')
  // ...수집 완료 후
  emitProgress(sessionId, 3, TOTAL, '주식 종가 완료', 'running')

  // 업종별 등락률: 기존 stage 5 → stage 4
  emitProgress(sessionId, 4, TOTAL, '업종별 등락률 수집 중...', 'running')
  ```

  정리 후 stage 구조:
  | stage | 내용 |
  |-------|------|
  | 0 | 브라우저 시작 |
  | 1 | ETF 시세 |
  | 2 | 투자자별 순매수 |
  | 3 | 주식 종가 |
  | 4 | 업종별 등락률 |
  | 5 | 공매도 잔고 + 거래 (신규) |
  | 6 | 프로그램 순매수 (신규) |
  | 7 | 완료 |

- [ ] **Step 4: 공매도 수집 단계 추가** (업종별 등락률 완료 직후, `upsertCollectedDate` 호출 전)

  ```js
  // 5. 공매도 잔고 + 거래 (각각 독립 try/catch — 하나 실패해도 나머지 계속)
  emitProgress(sessionId, 5, TOTAL, '공매도 데이터 수집 중...', 'running')
  const toNum = s => parseFloat(String(s || '').replace(/,/g, '')) || 0
  const toInt = s => parseInt(String(s || '').replace(/,/g, ''), 10) || 0
  let shortBalanceRaw = {}
  let shortTradeRaw = {}

  try {
    shortBalanceRaw = await collectShortBalance(page, allDates)
    const balanceRows = Object.entries(shortBalanceRaw).flatMap(([date, rows]) =>
      rows.map(r => ({
        date,
        code: r.ISU_SRT_CD || r.ISU_CD,
        name: r.ISU_ABBRV || r.ISU_NM,
        balance_qty: toInt(r.BALANCE_QTY),   // ← Task 1 실제 필드명으로 교체
        balance_amt: toNum(r.BALANCE_AMT),   // ← Task 1 실제 필드명으로 교체
        balance_ratio: toNum(r.BALANCE_RT),  // ← Task 1 실제 필드명으로 교체
      }))
    )
    if (balanceRows.length > 0) db.upsertShortBalance(balanceRows)
    else console.warn('[collect] 공매도 잔고 0건 — upsert 생략')
  } catch (err) {
    console.warn('[collect] 공매도 잔고 수집 실패 (skip):', err.message)
  }

  try {
    shortTradeRaw = await collectShortTrade(page, allDates)
    const tradeRows = Object.entries(shortTradeRaw).flatMap(([date, rows]) =>
      rows.map(r => ({
        date,
        code: r.ISU_SRT_CD || r.ISU_CD,
        name: r.ISU_ABBRV || r.ISU_NM,
        short_vol: toInt(r.SHRT_SELL_VOL),     // ← Task 1 실제 필드명으로 교체
        total_vol: toInt(r.TOT_TRDVOL),        // ← Task 1 실제 필드명으로 교체
        vol_ratio:  toNum(r.SHRT_SELL_RT),     // ← Task 1 실제 필드명으로 교체
        short_val:  toNum(r.SHRT_SELL_AMT),    // ← Task 1 실제 필드명으로 교체
        total_val:  toNum(r.TOT_TRDVAL),       // ← Task 1 실제 필드명으로 교체
        val_ratio:  toNum(r.SHRT_SELL_AMT_RT), // ← Task 1 실제 필드명으로 교체
      }))
    )
    if (tradeRows.length > 0) db.upsertShortTrade(tradeRows)
    else console.warn('[collect] 공매도 거래 0건 — upsert 생략')
  } catch (err) {
    console.warn('[collect] 공매도 거래 수집 실패 (skip):', err.message)
  }

  fs.writeFileSync(
    path.join(rawDir, `krx_raw_${today}_short.json`),
    JSON.stringify({ shortBalanceRaw, shortTradeRaw })
  )
  emitProgress(sessionId, 5, TOTAL, '공매도 데이터 완료', 'running')
  ```

- [ ] **Step 5: 프로그램 순매수 단계 추가** (공매도 단계 직후)

  ```js
  // 6. 프로그램 순매수
  emitProgress(sessionId, 6, TOTAL, '프로그램 순매수 수집 중...', 'running')
  try {
    const toNum = s => parseFloat(String(s || '').replace(/,/g, '')) || 0

    const programRaw = await collectProgramTrade(page, allDates)
    const programRows = Object.entries(programRaw).flatMap(([date, rows]) =>
      rows.map(r => ({
        date,
        code: r.ISU_SRT_CD || r.ISU_CD,
        name: r.ISU_ABBRV || r.ISU_NM,
        arb_buy:     toNum(r.PRGM_BUY_AMT),    // ← Task 1 실제 필드명으로 교체
        arb_sell:    toNum(r.PRGM_SELL_AMT),   // ← Task 1 실제 필드명으로 교체
        arb_net:     toNum(r.PRGM_NETBID_AMT), // ← Task 1 실제 필드명으로 교체
        nonarb_buy:  toNum(r.PRGM_BUY_AMT2),   // ← Task 1 실제 필드명으로 교체
        nonarb_sell: toNum(r.PRGM_SELL_AMT2),  // ← Task 1 실제 필드명으로 교체
        nonarb_net:  toNum(r.PRGM_NETBID_AMT2),// ← Task 1 실제 필드명으로 교체
      }))
    )
    if (programRows.length > 0) db.upsertProgramTrade(programRows)
    else console.warn('[collect] 프로그램 순매수 0건 — upsert 생략')

    fs.writeFileSync(
      path.join(rawDir, `krx_raw_${today}_program.json`),
      JSON.stringify(programRaw)
    )
    emitProgress(sessionId, 6, TOTAL, '프로그램 순매수 완료', 'running')
  } catch (err) {
    console.warn('[collect] 프로그램 순매수 수집 실패 (skip):', err.message)
    emitProgress(sessionId, 6, TOTAL, '프로그램 순매수 실패 (skip)', 'running')
  }
  ```

- [ ] **Step 6: upsertCollectedDate 및 완료 emit 수정**

  ```js
  // 변경 전
  db.upsertCollectedDate(today, JSON.stringify(['etf','foreign','institution','stock','industry']))
  // ...
  emitProgress(sessionId, 5, TOTAL, '완료', 'done')

  // 변경 후 (stages_ok는 배열 그대로 전달 — db.js 내부에서 JSON.stringify 처리)
  db.upsertCollectedDate(today, ['etf','foreign','stock','industry','short_balance','short_trade','program_trade'])
  // ...
  emitProgress(sessionId, 7, TOTAL, '완료', 'done')
  ```

- [ ] **Step 7: 커밋**

  ```bash
  git add server/routes/collect.js
  git commit -m "feat: collect 파이프라인에 공매도/프로그램 단계 추가 (TOTAL=7)"
  ```

---

## Task 6: API 라우트 확장

**Files:**
- Modify: `server/routes/data.js`

- [ ] **Step 1: switch-case에 3개 추가**

  기존 switch-case 블록 내 적절한 위치에:
  ```js
  case 'short_balance': data = db.getShortBalanceData(start, end); break
  case 'short_trade':   data = db.getShortTradeData(start, end);   break
  case 'program_trade': data = db.getProgramTradeData(start, end); break
  ```

- [ ] **Step 2: 커밋**

  ```bash
  git add server/routes/data.js
  git commit -m "feat: /api/data 에 short_balance/short_trade/program_trade 추가"
  ```

---

## Task 7: SupplyTab.jsx API 연결

> 현재 파일에 정의되지 않은 `MOCK_DATA`를 참조하는 버그가 있어 전체 교체.

**Files:**
- Modify: `src/components/tabs/SupplyTab.jsx`

- [ ] **Step 1: 파일 전체 교체**

  ```jsx
  import React, { useEffect, useState, useMemo } from 'react'
  import DataTable from '../DataTable'

  const CATEGORIES = [
    { id: 'short_balance', label: '공매도 잔고' },
    { id: 'short_trade',   label: '공매도 거래' },
    { id: 'program_trade', label: '프로그램 순매수' },
  ]

  const COLUMNS = {
    short_balance: [
      { key: 'name',          label: '종목명',       type: 'text'    },
      { key: 'balance_qty',   label: '잔고수량',     type: 'number'  },
      { key: 'balance_amt',   label: '잔고금액(원)', type: 'number'  },
      { key: 'balance_ratio', label: '잔고비율',     type: 'percent' },
    ],
    short_trade: [
      { key: 'name',      label: '종목명',             type: 'text'    },
      { key: 'short_vol', label: '공매도거래량',       type: 'number'  },
      { key: 'vol_ratio', label: '거래량비율',         type: 'percent' },
      { key: 'short_val', label: '공매도거래대금(원)', type: 'number'  },
      { key: 'val_ratio', label: '거래대금비율',       type: 'percent' },
    ],
    program_trade: [
      { key: 'name',       label: '종목명',          type: 'text'   },
      { key: 'arb_net',    label: '차익순매수(원)',   type: 'number' },
      { key: 'nonarb_net', label: '비차익순매수(원)', type: 'number' },
      { key: 'total_net',  label: '합계순매수(원)',   type: 'number' },
    ],
  }

  const DEFAULT_SORT = {
    short_balance: 'balance_amt',
    short_trade:   'val_ratio',
    program_trade: 'total_net',
  }

  export default function SupplyTab({ dateRange }) {
    const [category, setCategory] = useState('short_balance')
    const [rawData, setRawData] = useState({
      short_balance: [], short_trade: [], program_trade: [],
    })
    const [loading, setLoading] = useState(false)

    useEffect(() => {
      if (!dateRange.start || !dateRange.end) return
      setLoading(true)
      Promise.all([
        fetch(`/api/data/short_balance?start=${dateRange.start}&end=${dateRange.end}`).then(r => r.json()),
        fetch(`/api/data/short_trade?start=${dateRange.start}&end=${dateRange.end}`).then(r => r.json()),
        fetch(`/api/data/program_trade?start=${dateRange.start}&end=${dateRange.end}`).then(r => r.json()),
      ])
        .then(([sb, st, pt]) => setRawData({
          short_balance: Array.isArray(sb.data) ? sb.data : [],
          short_trade:   Array.isArray(st.data) ? st.data : [],
          program_trade: Array.isArray(pt.data) ? pt.data : [],
        }))
        .catch(() => {})
        .finally(() => setLoading(false))
    }, [dateRange.start, dateRange.end])

    const data = useMemo(() => {
      if (category !== 'program_trade') return rawData[category]
      return rawData.program_trade.map(r => ({
        ...r,
        total_net: (r.arb_net || 0) + (r.nonarb_net || 0),
      }))
    }, [category, rawData])

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
  ```

- [ ] **Step 2: 커밋**

  ```bash
  git add src/components/tabs/SupplyTab.jsx
  git commit -m "feat: SupplyTab API 연결 완료"
  ```

---

## Task 8: 통합 테스트

- [ ] **Step 1: 서버 시작**

  ```bash
  npm run dev
  ```

- [ ] **Step 2: 수집 실행 후 확인**

  1. `http://localhost:5173` 접속
  2. 날짜 선택 후 수집 버튼 클릭
  3. SSE 진행바 7단계로 증가 확인
  4. 콘솔에서 공매도/프로그램 수집 로그 확인:
     ```
     [shortstock] 공매도 잔고 YYYYMMDD: N건
     [shortstock] 공매도 거래 YYYYMMDD: N건
     [program] 프로그램 순매수 YYYYMMDD: N건
     ```
  5. 수급 탭 → 데이터 표시 확인
  6. 카테고리 버튼 전환 + 컬럼 정렬 확인

- [ ] **Step 3: raw 스냅샷 확인**

  ```bash
  ls data/raw/
  # krx_raw_YYYYMMDD_short.json, krx_raw_YYYYMMDD_program.json 존재 확인
  ```

- [ ] **Step 4: 최종 커밋**

  ```bash
  git add server/routes/collect.js server/storage/db.js server/routes/data.js
  git add server/collector/shortstock.js server/collector/program.js
  git add src/components/tabs/SupplyTab.jsx
  git commit -m "feat: 수급 탭 구현 완료 (공매도 잔고/거래, 프로그램 순매수)"
  ```
