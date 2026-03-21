---
name: current_implementation_status
description: 다음 구현 예정 기능 — 세션 시작 시 반드시 읽을 것
type: project
---

## 현재 상태 (2026-03-21)

**거래량 급등 탭 — 구현 완료**

## 구현된 탭 목록

| 탭 | 내용 |
|----|------|
| ETF 순자산변화 | IRP 적격 ETF 순설정액 |
| 투자자별 순매수 | 외국인/기관 순매수 상위 종목 |
| 공매도 | 공매도 잔고/거래 상위 100종목 (코스피+코스닥 각 50) |
| 거래량 급등 | 전일 대비 거래량 급등 상위 종목 (코스피+코스닥) |

## 거래량 급등 탭 상세

**수집 소스:** 네이버금융 `sise_quant_high.naver` (HTTP, 브라우저 불필요)
- sosok=0: 코스피, sosok=1: 코스닥
- iconv-lite로 EUC-KR 디코딩, type_2 테이블 파싱

**DB 스키마:**
- volume_surge: (date, code, market, name, surge_ratio, close, change_rate, volume, prev_volume, per)

**조회 방식:** 날짜 범위 내 가장 최근 날짜 1일치, 전체/코스피/코스닥 필터

**다음 작업:** 없음 (완료)
