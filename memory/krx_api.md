---
name: krx_api_notes
description: KRX data portal API patterns, bld codes, 투자자구분 코드, SQLite 스키마
type: reference
---

## Endpoint

모든 KRX 데이터는 POST 요청:
`https://data.krx.co.kr/comm/bldAttendant/getJsonData.cmd`

Form body에 `bld` 파라미터(데이터셋 식별) + 날짜/필터 파라미터 포함.
인증: `browser_profile/`의 Chromium persistent session 쿠키 (별도 API 키 없음).
응답 형식: `{"output": [...]}` — 배열은 `output` 키에 있음 (`data` 아님).

## Response Interceptor 패턴

Playwright로 KRX 메뉴 페이지 이동 → 네트워크 요청 인터셉트 → `bld` + POST body 캡처 → 날짜 변경 후 `fetch()`로 직접 재호출.

핵심: 모든 요청에서 `last_req` 갱신, 응답에 목표 컬럼(예: `TDD_CLSPRC`) 포함 + 500행 이상일 때만 `captured_req`로 복사. (잘못된 bld 캡처 방지)

## KRX 메뉴 ID → bld 코드

| Menu Page ID    | 설명                  | bld Code      |
|-----------------|-----------------------|---------------|
| MDC0201030101   | ETF 시세               | MDCSTAT04301  |
| MDC0201030101   | ETF 기본정보            | MDCSTAT04601  |
| MDC0201020303   | 외국인/기관 순매수       | MDCSTAT02401  |
| MDC0201020105   | 전종목 주식종가          | MDCSTAT18801  |
| MDC0201010101   | 업종별 등락률           | (인터셉트)     |

## 사용 불가

- `MDCSTAT01501` — 세션/날짜 무관하게 항상 0행 반환. **사용 금지.**
  주식 종가는 `MDCSTAT18801` (MDC0201020105) 사용.

## 투자자구분 코드 (MDCSTAT02401)

페이지 select에서 자동 추출. 코드가 직관적이지 않으므로 참고:

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

주의: 기관합계=7050, 사모=3100, 개인=8000. collector가 페이지에서 자동 추출하므로 코드 변경 시 자동 반영됨.

## 영업일 계산

`prev_biz_days(base, n)` — 주말만 제외, 공휴일 달력 없음. KRX 날짜 범위 쿼리 동작과 일치.

## ETF 순설정액 산식

`(오늘상장주수 - 이전상장주수) × 이전NAV / 1e8`
주가 상승 효과 제거 — 실제 자금 유입/유출만 측정.

## SQLite 테이블

| 테이블명          | 내용                                      |
|-------------------|-------------------------------------------|
| `etf_prices`      | ETF 일별 시세/상장주수                     |
| `etf_info`        | ETF 기본정보 (irp_eligible 포함)           |
| `investor_netbuy` | 투자자별 순매수 (investor_type = KRX 코드) |
| `stock_prices`    | 전종목 종가                                |
| `industry`        | 업종별 지수/등락률                         |
| `collected_dates` | 수집 완료 날짜 기록                        |
