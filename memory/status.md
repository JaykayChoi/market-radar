---
name: current_implementation_status
description: 다음 구현 예정 기능 — 세션 시작 시 반드시 읽을 것
type: project
---

## 현재 상태 (2026-03-22)

**옵션 탭 구현 완료**

## 구현된 탭 목록

| 탭 | 내용 |
|----|------|
| ETF 순자산변화 | IRP 적격 ETF 순설정액 |
| 투자자별 순매수 | 외국인/기관 순매수 상위 종목 |
| 공매도 | 공매도 잔고/거래 상위 100종목 (코스피+코스닥 각 50) |
| 거래량 급등 | 전일 대비 거래량 급등 상위 종목 (코스피+코스닥) |
| 미국 ETF | 주요 ETF 27개 가격/AUM/성과 (Yahoo+FMP) |
| 미국 매크로 | 10개 핵심 거시지표 (FRED) |
| 미국 13F 기관 | SEC EDGAR 13F 기관 포지션 (50개 기관, 전분기 비교) |
| 미국 IPO/실적 캘린더 | Finnhub IPO + Earnings Calendar, 달력 UI, TOP10/50/100 하이라이트 |
| 미국 옵션 | Yahoo Finance 옵션 체인 + 만기일별 P/C Ratio |

## 미국 옵션 탭 상세

**데이터 소스:** Yahoo Finance v7 options API (crumb+cookie 인증, 30분 캐시)

**라우트:** `server/routes/yahoo.js`
- GET `/api/yahoo/options?symbol=SPY&date=` — 옵션 체인 (콜/풋, 만기일 목록)
- GET `/api/yahoo/options/pcr?symbol=SPY` — 만기일별 P/C Ratio 요약 (최대 8개)

**기능:**
- 옵션 체인 뷰: 콜|행사가|풋 미러 테이블, ITM/ATM 색상 구분, 현재가 ±15% 범위
- P/C Ratio 뷰: 만기일별 거래량/OI 기반 P/C Ratio, 심리 뱃지
- 주요 종목 빠른 선택 (SPY/QQQ/AAPL 등 10개) + 검색
- 자동 데이터 분석 (Max Pain, OI 지지/저항, P/C Ratio, IV 스큐, 거래량 급등)
- 용어 해석 가이드

**다음 작업:** feature_candidates_us.md 참고
