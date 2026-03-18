---
name: krx_api_notes
description: KRX data portal API patterns, working bld codes, and known broken codes
type: reference
---

## Endpoint
All KRX data fetched via POST to:
`https://data.krx.co.kr/comm/bldAttendant/getJsonData.cmd`

Form body includes `bld` parameter (identifies the dataset) plus date/filter params.

## Response Interceptor Pattern
Navigate Playwright to KRX menu page → intercept network requests → capture `bld` + POST body → replay with modified dates directly via `fetch()`.

Key: update `last_req` dict on EVERY request; only copy to `captured_req` when response has >500 rows containing the target column (e.g., `TDD_CLSPRC`). This prevents capturing the wrong bld from an early navigation request.

## KRX Menu Pages → bld Codes

| Menu Page ID    | Description         | bld Code        |
|-----------------|---------------------|-----------------|
| MDC0201030101   | ETF 시세             | MDCSTAT04301    |
| MDC0201030101   | ETF 기본정보          | MDCSTAT04601    |
| MDC0201020303   | 외국인/기관 순매수     | MDCSTAT02401    |
| MDC0201020105   | 전종목 주식종가        | MDCSTAT18801    |
| MDC0201010101   | 업종별 등락률          | (intercepted)   |

## BROKEN: Do NOT use
- `MDCSTAT01501` — always returns 0 rows regardless of session/date. Confirmed broken.
  Use `MDCSTAT18801` (from MDC0201020105) instead for stock prices.

## Business Day Calculation
`prev_biz_days(base, n)` — counts exactly n trading days back using weekends-only (no holiday calendar). Matches KRX behavior for date range queries.

## ETF 순설정액 Formula
`(오늘상장주수 - 이전상장주수) × 이전NAV / 1e8`
Strips price effect — measures actual fund flows, not market value change.

## SQLite Schema (new design)
- `etf_prices` — daily ETF price/volume data
- `etf_info` — ETF metadata (irp_eligible flag included)
- `foreign_flow` — 외국인/기관 with `investor_type` discriminator column
- `stock_prices` — full market stock prices
- `industry` — 업종별 등락률
- `program_trade` — Phase 2
- `futures_oi` — Phase 2
