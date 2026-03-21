---
name: market_radar_architecture
description: Market Radar 웹앱 현재 아키텍처 및 구조
type: project
---

## 스택

- **Frontend**: React 18 + Vite + Tailwind CSS + Recharts (`src/`)
- **Backend**: Node.js + Express (`server/`)
- **DB**: SQLite via better-sqlite3 (`data/market_radar.db`)
- **Browser automation**: Playwright Chromium, persistent profile (`browser_profile/`)
- **실행**: `npm run dev` (Express:3000 + Vite:5173 동시 실행)

## 파일 구조

```
server/
  index.js              — Express 진입점 (port 3000)
  collector/
    browser.js          — Playwright 브라우저 관리 + KRX 로그인
    etf.js              — ETF 시세 수집
    foreign.js          — 투자자별 순매수 수집 (response intercept)
    stock.js            — 전종목 주식 종가 수집
    industry.js         — 업종별 등락률 수집
    shortstock.js       — 공매도 잔고/거래 상위 50 수집 (코스피+코스닥)
    naver_quant.js      — 네이버금융 거래량 급등 수집 (HTTP, iconv-lite EUC-KR)
  processor/
    etf.js              — ETF 데이터 가공 → SQLite
    foreign.js          — 투자자별 데이터 가공 → SQLite
  routes/
    collect.js          — POST /api/collect, GET /api/collect/progress (SSE)
    data.js             — GET /api/data/:type
    export.js           — GET /api/export/excel/:type
    naver.js            — GET /api/naver/volume_surge (라이브 조회)
  storage/
    db.js               — SQLite 전체 read/write
src/
  App.jsx
  components/
    tabs/
      EtfTab.jsx
      InvestorTab.jsx
      SupplyTab.jsx
      VolumeSurgeTab.jsx
data/
  market_radar.db
  raw/                  — 수집 원본 JSON 스냅샷
```

## 현재 탭

| 탭 | 내용 |
|---|---|
| ETF 순자산변화 | IRP 적격 ETF 순설정액 (주가효과 제거), 테마 분류 |
| 투자자별 순매수 | 13개 투자자구분, 기간: 1일/3일/1주/2주 |
| 공매도 | 공매도 잔고/거래 상위 100종목 (코스피+코스닥 각 50, 최근 날짜 기준) |
| 거래량 급등 | 네이버금융 라이브 조회, 코스피+코스닥 필터, 수집 버튼 불필요 |
