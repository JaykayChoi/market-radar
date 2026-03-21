---
name: current_implementation_status
description: 다음 구현 예정 기능 — 세션 시작 시 반드시 읽을 것
type: project
---

## 현재 상태 (2026-03-21)

**미국 13F 기관 포지션 탭 — 구현 완료**

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

## 미국 13F 탭 상세

**데이터 소스:** SEC EDGAR 13F-HR (submissions JSON → infotable XML 파싱)

**라우트:** `server/routes/edgar13f.js`
- GET `/api/edgar13f/institutions` — 50개 기관 메타데이터 (AM 22 + HF 28)
- GET `/api/edgar13f/:cik/latest` — 최신 + 전분기 13F 비교, 상위 100 포지션

**기능:**
- 전분기 대비 주식수 변화 (new/increased/decreased/held)
- 청산 종목 표시 (직전 분기에 있었지만 현재 없는 종목)
- 전체 XML 기준 총 포트폴리오 금액 + 변화율
- 전체 보유 종목 수 (상위 100개만 표시)
- SEC EDGAR 페이지 링크
- 24시간 서버 캐시

**테스트:** `test/unit/edgar13f-route.test.js` — 24케이스 통과
**E2E:** `test/e2e/ui.spec.js` — 13F 탭 5케이스 포함, 18/18 통과

**다음 작업:** feature_candidates_us.md 참고 — 수익률 곡선 시각화 또는 섹터 히트맵 등
