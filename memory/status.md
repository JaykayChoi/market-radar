---
name: current_implementation_status
description: 다음 구현 예정 기능 — 세션 시작 시 반드시 읽을 것
type: project
---

## 현재 상태 (2026-03-21)

**미국 ETF 탭 — 구현 완료**

## 구현된 탭 목록

| 탭 | 내용 |
|----|------|
| ETF 순자산변화 | IRP 적격 ETF 순설정액 |
| 투자자별 순매수 | 외국인/기관 순매수 상위 종목 |
| 공매도 | 공매도 잔고/거래 상위 100종목 (코스피+코스닥 각 50) |
| 거래량 급등 | 전일 대비 거래량 급등 상위 종목 (코스피+코스닥) |
| 미국 ETF | 주요 ETF 27개 가격/AUM/성과 (Yahoo+FMP) |

## 미국 ETF 탭 상세

**데이터 소스:**
- 가격/성과(1W%/1M%/3M%): Yahoo Finance v8 chart API (3mo range)
- AUM: FMP stable profile API (30분 서버사이드 캐시)

**라우트:** `server/routes/etf.js`
- GET `/api/etf/list` — 27개 ETF 메타데이터
- GET `/api/etf/summary` — 전체 ETF 병렬 조회 (가격+AUM+성과)
- GET `/api/etf/:symbol` — 단일 ETF 상세

**ETF 분류:** US Equity / International / Fixed Income / Commodities / Sector / Leverage

**테스트:** `test/unit/etf-route.test.js` — 9케이스 통과
**전체 백엔드 유닛:** 102/102 통과

**다음 작업:** feature_candidates_us.md 참고 — 수익률 곡선 시각화 또는 섹터 히트맵 등
