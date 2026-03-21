---
name: current_implementation_status
description: 다음 구현 예정 기능 — 세션 시작 시 반드시 읽을 것
type: project
---

## 현재 상태 (2026-03-21)

**공매도 탭 — 구현 완료**

## 구현된 탭 목록

| 탭 | 내용 |
|----|------|
| ETF 순자산변화 | IRP 적격 ETF 순설정액 |
| 투자자별 순매수 | 외국인/기관 순매수 상위 종목 |
| 공매도 | 공매도 잔고/거래 상위 100종목 (코스피+코스닥 각 50) |

## 공매도 탭 상세

**수집 메뉴:**
- 공매도 거래 상위 50: MDC02030204 (MDCSTAT30401), mktTpCd=1/2
- 공매도 잔고 상위 50: MDC02030304 (MDCSTAT30801), mktTpCd=1/2

**DB 스키마:**
- short_balance: (date, code, name, balance_qty, balance_amt, balance_ratio)
- short_trade: (date, code, name, short_val, total_val, short_ratio)

**조회 방식:** 날짜 범위 내 가장 최근 날짜 1일치만 표시

**다음 작업:** 없음 (완료)
