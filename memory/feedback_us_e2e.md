---
name: feedback_us_e2e
description: 미국 탭 개발 방식 — 항상 실제 구현 + 브라우저 E2E 테스트
type: feedback
---

미국 웹페이지 개발 시 항상 실제 구현을 완성하고 Playwright 브라우저 E2E 테스트까지 함께 작성한다.

**Why:** 유저가 명시적으로 요청 — "미국 웹페이지 개발은 항상 해줘" (2026-03-21)

**How to apply:**
- 새 미국 탭 구현 시 placeholder 금지 — 항상 실제 API 연동까지 완성
- `test/e2e/ui.spec.js`에 브라우저 E2E 케이스 추가 (data-testid 기반)
- 컴포넌트에 `data-testid` 반드시 부여 (로딩, 탭, 카드, 테이블 행 등)
- Playwright config: Express(3000) + Vite(5173) 두 서버 동시 기동
