---
name: feedback_memory_update
description: 메모리 업데이트 요청 시 반드시 status.md와 feature_candidates 파일을 포함해야 함
type: feedback
---

메모리 업데이트 요청 시 반드시 다음 두 파일을 포함해서 업데이트한다:
1. `memory/status.md` — 현재 구현 진행 상태
2. `memory/feature_candidates_kr.md` 또는 `memory/feature_candidates_us.md` — 구현 완료 항목 반영

**Why:** 유저가 명시적으로 요청 — "메모리 업데이트 해달라고 할 때 반드시 status와 feature_candidates는 업데이트되어야 돼" (2026-03-21)

**How to apply:**
- 메모리 업데이트 요청을 받으면 위 두 파일을 최우선으로 확인하고 업데이트
- 새 기능 구현 완료 시 feature_candidates에서 해당 항목을 "구현 완료" 섹션으로 이동
- status.md의 "다음 작업"을 항상 최신 상태로 유지
