---
name: investor_tab
description: 투자자별 순매수 탭 구현 현황 및 수집 구조
type: project
---

## 현재 구현 상태 (2026-03-19 기준)

외국인/기관 탭이 "투자자별 순매수" 단일 탭으로 통합됨.

**Why:** 투자자구분이 9000(외국인), 7050(기관합계) 외에도 13개 타입이 있어 통합 UI가 필요.

**How to apply:** 새 투자자 타입 추가 시 InvestorTab.jsx의 INVESTOR_TYPES 배열과 collector의 DEFAULT_TYPES 배열 동시 업데이트 필요. 단, 실제 코드는 페이지 자동 추출이 우선이므로 DEFAULT_TYPES는 fallback용.

## 수집 구조

- 4개 기간 × 13개 투자자 타입 = 52회 API 호출 (수집 시간 길어짐)
- 4개 기간: 1영업일전, 3영업일전, 1주전(달력), 2주전(달력)
- KRX 페이지에서 select 옵션 자동 추출 → DEFAULT_TYPES는 fallback

## UI 구조

- `src/components/tabs/InvestorTab.jsx`
- 투자자구분 버튼 선택 → `/api/data/foreign?investor_type=CODE` 쿼리
- 기본 선택: 외국인(9000)
- 개인(8000) 버튼은 의도적으로 제외

## 표시되는 투자자구분 버튼 목록
외국인(9000), 기관합계(7050), 연기금 등(6000), 금융투자(1000), 보험(2000),
투신(3000), 사모(3100), 은행(4000), 기타금융(5000), 기타법인(7100),
기타외국인(9001), 전체(9999)
