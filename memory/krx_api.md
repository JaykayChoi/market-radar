---
name: krx_api_notes
description: KRX data portal API patterns, working bld codes, known broken codes, and investor type codes
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

## MDCSTAT02401 투자자구분 코드 (실제 확인값)
페이지 select에서 자동 추출됨. 코드가 예상과 다르니 반드시 이 목록 참고:

| 코드  | 투자자구분  |
|-------|------------|
| 1000  | 금융투자    |
| 2000  | 보험        |
| 3000  | 투신        |
| 3100  | 사모        |
| 4000  | 은행        |
| 5000  | 기타금융    |
| 6000  | 연기금 등   |
| 7050  | 기관합계    |
| 7100  | 기타법인    |
| 8000  | 개인        |
| 9000  | 외국인      |
| 9001  | 기타외국인  |
| 9999  | 전체        |

주의: 기관합계=7050 (8000 아님), 사모=3100 (4000 아님), 개인=8000
collector는 페이지 select에서 자동 추출하므로 코드 변경 시 자동 반영됨.

## Business Day Calculation
`prev_biz_days(base, n)` — counts exactly n trading days back using weekends-only (no holiday calendar). Matches KRX behavior for date range queries.

## ETF 순설정액 Formula
`(오늘상장주수 - 이전상장주수) × 이전NAV / 1e8`
Strips price effect — measures actual fund flows, not market value change.

## SQLite Schema
- `etf_prices` — daily ETF price/volume data
- `etf_info` — ETF metadata (irp_eligible flag included)
- `foreign_flow` — 투자자별 순매수, investor_type = KRX 코드 문자열 (e.g. '9000', '7050')
- `stock_prices` — full market stock prices
- `industry` — 업종별 등락률
- `collected_date` — 수집 완료 날짜 기록

## foreign_flow 스키마 마이그레이션 이력
- 1차: date → start_date/end_date (기간별 저장)
- 2차: investor_type 'foreign'/'institution' 문자열 → KRX 코드 ('9000', '7050' 등)
  db.js 시작 시 구형 데이터 자동 삭제 후 재수집 필요
