# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the script

```bash
py market_radar.py
```

No build step. Dependencies: `playwright`, `pandas`, `openpyxl`.

## What this does

Single-script tool that collects KRX (한국거래소) market data via browser automation and produces 6 Excel files:

- `최근3일_IRP_ETF순설정액_YYYYMMDD.xlsx`
- `최근5일_IRP_ETF순설정액_YYYYMMDD.xlsx`
- `최근7일_IRP_ETF순설정액_YYYYMMDD.xlsx`
- `최근3일_외국인순매수상위100_YYYYMMDD.xlsx`
- `최근5일_외국인순매수상위100_YYYYMMDD.xlsx`
- `최근7일_외국인순매수상위100_YYYYMMDD.xlsx`

All periods are **영업일(business days)** — e.g. 7일 = 7 trading days back, not calendar days.

## Architecture

The script has four sequential phases:

**Phase 1 — `collect_all()` (browser)**
Launches a persistent Chromium profile (`browser_profile/`) via Playwright to maintain KRX login session across runs. Navigates to three KRX pages and intercepts API responses:

| KRX menu ID | Data captured | bld (API code) |
|---|---|---|
| `MDC0201030101` | ETF 전종목 시세 (4 dates) | `MDCSTAT04301`, `MDCSTAT04601` |
| `MDC0201020303` | 외국인 순매수 상위종목 | `MDCSTAT02401` (response interceptor) |
| `MDC0201020105` | 전종목 주식 종가 | `MDCSTAT18801` (response interceptor) |

All data is fetched via `fetch_json()`, which calls `/comm/bldAttendant/getJsonData.cmd` via `page.evaluate()` to reuse the browser's authenticated session. Raw data is saved to `krx_raw_YYYYMMDD.json`.

**Why response interceptors for 외국인/주식**: These pages load with default parameters on page load; the interceptor captures the exact bld + params the page uses, then replays the request with modified date parameters for other periods.

**Phase 2 — `process_etf()`**
Merges today + N-days-ago ETF data. Key metric: `순자산변화_가격제외 = (오늘상장주수 - 이전상장주수) × 이전NAV / 1e8` — this strips out price appreciation to show pure capital flow. Filters out IRP-ineligible ETFs (leveraged, inverse, futures-based).

**Phase 3 — `process_foreign()`**
Sorts 외국인 순매수 by `NETBID_TRDVAL`, takes top 100, computes period stock return using `build_price_map()` on the `MDCSTAT18801` stock price data.

**Phase 4 — `save_excel()`**
Writes xlsx with auto-column widths and 2-row title headers.

## KRX API notes

- Base URL: `https://data.krx.co.kr/comm/bldAttendant/getJsonData.cmd` (POST)
- Auth: session cookies from the persistent browser profile (no API key)
- Response format: `{"output": [...]}` — the array is in `output`, not `data`
- `MDCSTAT02401` and `MDCSTAT18801` are discovered via response interception at page load; their bld codes and params should not be hardcoded as they may vary by session state
- `MDCSTAT01501` (the "official" stock price bld) returns 0 rows regardless of session — use `MDCSTAT18801` from `MDC0201020105` instead
