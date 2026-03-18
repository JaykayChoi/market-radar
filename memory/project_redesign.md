---
name: market_radar_redesign
description: Node.js redesign of market_radar confirmed; Python script kept as reference only
type: project
---

Full rewrite of market_radar from Python to Node.js single stack has been designed and spec'd. Python script (`market_radar.py`) is the current working version but will be replaced entirely.

**Why:** User wants web dashboard with real-time progress, historical data, trend charts, and flexible date ranges. Node.js single stack avoids Python+Node complexity.

**How to apply:** When starting implementation, use the spec at `docs/superpowers/specs/2026-03-18-market-radar-redesign-design.md`. Do NOT modify `market_radar.py` further — it's a reference artifact only.

## New Stack
- Backend: Node.js + Express + better-sqlite3
- Frontend: React + TailwindCSS + Recharts
- Browser automation: Playwright (JS)
- Build: Vite (frontend), dev proxy `/api → localhost:3000`

## File Structure
```
server/
  collector.js    — Playwright browser automation (KRX data collection)
  processor.js    — Data transformation logic
  storage.js      — SQLite read/write
  routes.js       — Express API routes
  index.js        — Entry point
src/              — React frontend (Vite)
db/               — SQLite database files
```

## API Endpoints
- `POST /api/collect` — trigger collection with `{ start, end }` date range
- `GET /api/collect/progress` — SSE stream for real-time progress (supports Last-Event-ID replay)
- `GET /api/data/:type` — query stored data
- `GET /api/export/excel/:type` — download Excel

## Collection Stages (MVP)
1. ETF 시세 (MDCSTAT04301)
2. ETF 기본정보 (MDCSTAT04601)
3. 외국인 순매수 (MDCSTAT02401)
4. 기관 순매수 (same page, different investor_type)
5. 주식 종가 (MDCSTAT18801 via MDC0201020105)
6. 업종별 등락률 (MDC0201010101)
