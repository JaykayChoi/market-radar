---
name: current_implementation_status
description: 다음 구현 예정 기능 — 세션 시작 시 반드시 읽을 것
type: project
---

## 현재 상태 (2026-03-22)

**다음 작업: 옵션 탭 실제 데이터 연동**

옵션 탭 UI는 모의 데이터로 완성됨 (`UsOptionsTab.jsx`).
임시 데이터를 지우고 실제 API 연동 필요:
- **옵션 체인**: Yahoo Finance v7 options API (`/v7/finance/options/{symbol}`)
- **P/C Ratio**: CBOE 일간 데이터 (기존 `server/routes/cboe.js` 활용)
- 분석 로직 (`analyzeOptionChain`)은 이미 구현됨 — 데이터만 연결하면 동작

### 구현 순서
1. `server/routes/yahoo.js`에 옵션 체인 엔드포인트 추가
2. `server/routes/cboe.js`에 P/C Ratio 히스토리 엔드포인트 추가
3. `UsOptionsTab.jsx`에서 mock 데이터 제거 → API fetch로 교체
4. unit 테스트 + E2E 테스트
