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
    shortstock.js       — 공매도 잔고/거래 상위 50 collection (코스피+코스닥)
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
      SupplyTab.jsx     — 공매도 탭 (잔고/거래 상위 100종목)
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
| 공매도 | 공매도 잔고/거래 상위 100종목 (코스피+코스닥 각 50, 가장 최근 날짜 기준) |
| 급등 | 거래량 급등 + 52주 신고가/신저가 (서브탭, 시가총액 포함) |
| 미국 ETF | 32개 ETF 시세/성과 + 자금흐름(서브탭), 보유종목 TOP20 (Yahoo+FMP) |
| 미국 매크로 | 34개 거시지표, 9개 카테고리, 위험신호 색상 (FRED) |
| 미국 13F 기관 | SEC EDGAR 13F 기관 포지션 (50개 기관, 전분기 비교) |
| 미국 IPO/실적 캘린더 | Finnhub 달력 UI, TOP10/50/100 하이라이트 |
| 미국 옵션 | 옵션 체인 + P/C Ratio + 애널리스트 (Yahoo Finance) |
| 미국 종목 정보 | S&P 500 전종목 + 목표가/괴리율 + 52주 신고가/신저가 (서브탭) |
| 미국 공매도 | S&P 500 공매도 (Short% Float, DTC, 히트맵+테이블) |
| 미국 경제 캘린더 | FRED 릴리스 13개 지표 + FOMC + 국채 경매(TreasuryDirect), 달력/목록 뷰 |

## Collection flow

`POST /api/collect` → SSE progress stream → Playwright collects:
1. ETF 시세 (all dates in range)
2. 외국인/기관 순매수 (4 periods: 1일전, 3일전, 1주전, 2주전)
3. 전종목 주식 종가
4. 업종별 등락률
5. 공매도 잔고 상위 50 × 2시장 (MDC02030304, MDCSTAT30801)
6. 공매도 거래 상위 50 × 2시장 (MDC02030204, MDCSTAT30401)

## KRX API notes

- Base URL: `https://data.krx.co.kr/comm/bldAttendant/getJsonData.cmd` (POST)
- Auth: session cookies from persistent browser profile (no API key)
- Response format: `{"output": [...]}` or `{"OutBlock_1": [...]}` — check both keys
- `foreign.js` and `stock.js` use response interception at page load to discover bld codes dynamically — do NOT hardcode these
- `MDCSTAT01501` returns 0 rows regardless of session — use `MDCSTAT18801` from `MDC0201020105`
- 공매도 메뉴: bld path가 `dbms/MDC/STAT/srt/` (standard 아님), mktTpCd=1(코스피)/2(코스닥)

## SQLite tables

- `etf_prices` — daily ETF NAV/상장주수 snapshots
- `etf_info` — ETF 기본정보 (자산분류, IRP 적격 여부)
- `investor_netbuy` — 투자자별 순매수 (외국인/기관 등)
- `stock_prices` — 전종목 종가
- `industry` — 업종별 지수
- `short_balance` — 공매도 잔고 상위 (date, code, name, balance_qty, balance_amt, balance_ratio)
- `short_trade` — 공매도 거래 상위 (date, code, name, short_val, total_val, short_ratio)
- `collected_dates` — 수집 완료 날짜 기록
