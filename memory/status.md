---
name: current_implementation_status
description: 다음 구현 예정 기능 — 세션 시작 시 반드시 읽을 것
type: project
---

## 현재 상태 (2026-03-22)

**S&P 500 종목 리스트 + 옵션/애널리스트 탭 — 구현 완료**

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
| 미국 IPO/실적 캘린더 | Finnhub 달력 UI, TOP10/50/100 하이라이트 |
| 미국 옵션 | 옵션 체인 + P/C Ratio + 애널리스트 (Yahoo Finance) |
| 미국 종목 정보 | S&P 500 전종목 리스트 + 애널리스트 목표가/괴리율 |

## 미국 종목 정보 탭 상세

**데이터 소스:** Wikipedia (S&P 500 구성종목) + Yahoo Finance v7 벌크 quote + v10 quoteSummary

**라우트:** `server/routes/yahoo.js`
- GET `/api/yahoo/stocks` — S&P 500 전종목 시세 + 애널리스트 목표가 (벌크)
- GET `/api/yahoo/options?symbol=&date=` — 옵션 체인 (crumb 인증)
- GET `/api/yahoo/options/pcr?symbol=` — 만기일별 P/C Ratio
- GET `/api/yahoo/analyst?symbol=` — 애널리스트 목표가 + 투자의견 히스토리

**기능:**
- S&P 500 ~501종목 시총순 테이블 (정렬/검색/섹터필터)
- 애널리스트 목표가 + 현재가 대비 괴리율% 컬럼
- 각 종목에서 옵션 탭 바로 이동 버튼
- 옵션 체인: 콜/풋 미러 테이블, ITM/ATM 색상, 자동 데이터 분석
- P/C Ratio: 만기일별 거래량/OI 기반
- 애널리스트: 투자의견 분포 바, 목표가 범위 바, 증권사별 등급 히스토리

**다음 작업:** feature_candidates_us.md 참고
