---
name: market_radar_spec
description: Location of approved redesign spec and key design decisions
type: reference
---

## Spec Document
`C:\work\market_radar\docs\superpowers\specs\2026-03-18-market-radar-redesign-design.md`

Passed two spec review rounds. User approved. Ready for implementation.

## Key Design Decisions (from spec)

- **SSE lock TTL**: 10 minutes — concurrent collection attempts rejected while lock held
- **Last-Event-ID replay**: SSE endpoint replays missed events on reconnect
- **Missing 이전NAV**: auto-find nearest prior collected date in SQLite DB
- **Date range**: user selects arbitrary start/end; weekend-only business day filtering applied
- **Response envelope**: `{ type, start, end, collectedDates, missingDates, data }`
- **Dev proxy**: Vite proxies `/api` → `localhost:3000` (avoids CORS in dev)
- **No Python**: Python completely removed; Node.js handles both Playwright automation and API server

## Implementation Sequence
After session clear, user will request implementation start:
1. Invoke `superpowers:writing-plans` skill to create detailed implementation plan
2. Invoke `superpowers:executing-plans` skill to execute plan with review checkpoints
