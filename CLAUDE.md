# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Session start

**세션 시작 시 반드시 `memory/status.md`를 읽어 현재 구현 진행 상태를 파악할 것.**

## Running the app

```bash
npm run dev      # dev mode: Express (port 3000) + Vite (port 5173) concurrently
npm run start    # production: vite build + node server/index.js
```

## What this is

Web dashboard that collects KRX (한국거래소) market data via browser automation and displays it in a React UI.

## Stack

- **Frontend**: React 18 + Vite + Tailwind CSS + Recharts (`src/`)
- **Backend**: Node.js + Express (`server/`)
- **Database**: SQLite via better-sqlite3 (`data/market_radar.db`)
- **Browser automation**: Playwright (Chromium, persistent profile at `browser_profile/`)
- **Dev proxy**: Vite proxies `/api` → `localhost:3000`

## Project structure

```
server/
  index.js              — Express entry point (port 3000)
  collector/
    browser.js          — Playwright browser launch + KRX login session
    etf.js              — ETF 시세 collection (MDCSTAT04301, MDCSTAT04601)
    foreign.js          — 외국인/기관 순매수 collection (response intercept)
    stock.js            — 전종목 주식 종가 collection (MDCSTAT18801)
    industry.js         — 업종별 등락률 collection
  processor/
    etf.js              — ETF data transformation → SQLite
    foreign.js          — 투자자별 순매수 transformation → SQLite
  routes/
    collect.js          — POST /api/collect, GET /api/collect/progress (SSE)
    data.js             — GET /api/data/:type
    export.js           — GET /api/export/excel/:type
  storage/
    db.js               — All SQLite read/write operations
src/
  App.jsx               — Root: tab nav, date range picker, collect button
  components/
    CollectButton.jsx
    DataTable.jsx
    DateRangePicker.jsx
    tabs/
      EtfTab.jsx        — ETF 순자산변화 탭
      InvestorTab.jsx   — 투자자별 순매수 탭
data/
  market_radar.db       — SQLite DB (git-ignored)
  raw/                  — Raw JSON snapshots per collection run
browser_profile/        — Chromium persistent profile (KRX login session)
```

## Current tabs

| Tab | 내용 |
|---|---|
| ETF 순자산변화 | IRP 적격 ETF 순설정액 (주가효과 제거), 테마 분류 |
| 투자자별 순매수 | 외국인/기관 순매수 상위 종목, 기간: 1일/3일/1주/2주 |

## Collection flow

`POST /api/collect` → SSE progress stream → Playwright collects:
1. ETF 시세 (all dates in range)
2. 외국인/기관 순매수 (4 periods: 1일전, 3일전, 1주전, 2주전)
3. 전종목 주식 종가
4. 업종별 등락률

## KRX API notes

- Base URL: `https://data.krx.co.kr/comm/bldAttendant/getJsonData.cmd` (POST)
- Auth: session cookies from persistent browser profile (no API key)
- Response format: `{"output": [...]}` — array is in `output`, not `data`
- `foreign.js` and `stock.js` use response interception at page load to discover bld codes dynamically — do NOT hardcode these
- `MDCSTAT01501` returns 0 rows regardless of session — use `MDCSTAT18801` from `MDC0201020105`

## SQLite tables

- `etf_prices` — daily ETF NAV/상장주수 snapshots
- `etf_info` — ETF 기본정보 (자산분류, IRP 적격 여부)
- `investor_netbuy` — 투자자별 순매수 (외국인/기관 등)
- `stock_prices` — 전종목 종가
- `industry` — 업종별 지수
- `collected_dates` — 수집 완료 날짜 기록
