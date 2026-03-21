---
name: current_implementation_status
description: 다음 구현 예정 기능 — 세션 시작 시 반드시 읽을 것
type: project
---

## 현재 상태 (2026-03-22)

**풋/콜 옵션 탭 — 구현 진행 중 (UI 먼저)**

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

## 미국 IPO/실적 캘린더 탭 상세

**데이터 소스:** Finnhub Calendar API (IPO + Earnings)

**라우트:** `server/routes/finnhub.js` (기존 라우트에 추가)
- GET `/api/finnhub/calendar/ipo?from=&to=`
- GET `/api/finnhub/calendar/earnings?from=&to=` (기업명 자동 조회, 인메모리 캐시)

**기능:**
- 월별 달력 그리드 (IPO 초록 / 실적 파랑)
- 시총 3단계 하이라이트 (TOP10 빨강 / TOP50 노랑 / TOP100 파랑)
- 날짜 클릭 → 우측 상세 패널 (IPO 상세 + 실적 EPS/매출)
- 필터 (전체/IPO/실적발표)
- 모든 기업 회사명 표시 (Finnhub profile API + 캐시)

**다음 작업:** 풋/콜 옵션 탭 구현
