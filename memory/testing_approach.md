---
name: testing_approach
description: 데이터 소스별 테스트 전략 — KRX(브라우저 불필요), FRED(순수 HTTP)
type: project
---

## 테스트 철학

**KRX(한국)**: Playwright 브라우저 자동화 필요 → 로그인 세션, UI 의존성으로 자동 테스트 불가.
**미국 소스**: 순수 REST API → dotenv/브라우저 없이 `node --env-file=.env` 로 즉시 테스트 가능.

미국 데이터 소스는 테스트 기반으로 구축한다. 새 소스 추가 시 반드시 테스트 케이스 작성.

## 테스트 실행 방법

```bash
# FRED 전체 시리즈 테스트 (16개)
npm run test:fred
# 또는
node --env-file=.env test/fred.test.js
```

**Why:** `dotenv` 패키지 없이 Node 20+ 내장 `--env-file` 플래그 사용.
KRX는 브라우저 세션 의존으로 자동화 테스트 제외.

## npm 테스트 스크립트

| 명령 | 설명 |
|------|------|
| `npm run test:unit:backend` | 백엔드 유닛 (node:test + supertest, fetch mock) |
| `npm run test:unit:frontend` | 프론트 유닛 (vitest + testing-library, fetch mock) |
| `npm run test:unit` | 백엔드 + 프론트 유닛 순차 실행 |
| `npm run test:e2e` | E2E (Playwright, 실제 FRED API 호출) |
| `npm run test:integration` | 통합 (실제 API 호출, 16개 시리즈 전수 확인) |
| `npm run test:all` | unit + e2e 전체 |

## 테스트 파일 위치

| 파일 | 러너 | 설명 |
|------|------|------|
| `test/unit/fred-route.test.js` | node:test + supertest | FRED 라우트 유닛 (fetch mock, 15케이스) |
| `test/unit/bls-route.test.js` | node:test + supertest | BLS 라우트 유닛 (fetch mock, 10케이스) |
| `test/unit/finnhub-route.test.js` | node:test + supertest | Finnhub 라우트 유닛 (fetch mock, 10케이스) |
| `test/unit/fmp-route.test.js` | node:test + supertest | FMP 라우트 유닛 (fetch mock, 9케이스) |
| `test/unit/edgar-route.test.js` | node:test + supertest | SEC EDGAR 라우트 유닛 (fetch mock, 8케이스) |
| `test/unit/yahoo-route.test.js` | node:test + supertest | Yahoo Finance 라우트 유닛 (fetch mock, 9케이스) |
| `test/unit/cboe-route.test.js` | node:test + supertest | CBOE 라우트 유닛 (fetch mock, 7케이스) |
| `test/unit/treasury-route.test.js` | node:test + supertest | US Treasury 라우트 유닛 (fetch mock, 8케이스) |
| `test/unit/bea-route.test.js` | node:test + supertest | BEA 라우트 유닛 (fetch mock, 6케이스) |
| `test/unit/polygon-route.test.js` | node:test + supertest | Polygon.io 라우트 유닛 (fetch mock, 10케이스) |
| `test/unit/etf-route.test.js` | node:test + supertest | ETF 집계 라우트 유닛 (fetch mock, 9케이스) |
| `test/unit/UsMacroTab.test.jsx` | vitest + testing-library | React 컴포넌트 유닛 (10케이스) |
| `test/unit/setup.js` | vitest setup | jest-dom matchers |
| `test/e2e/us-macro.spec.js` | Playwright | API E2E (실제 FRED 호출, 8케이스) |
| `test/integration/fred.test.js` | node 직접 실행 | 16개 시리즈 전수 HTTP 확인 |

## 설정 파일

| 파일 | 용도 |
|------|------|
| `vitest.config.mjs` | vitest 설정 (jsdom + react plugin, .jsx만 포함) |
| `playwright.config.js` | E2E 설정 (Express webServer 자동 기동) |

## 새 소스 추가 시 체크리스트

1. `test/{source}.test.js` 작성 — 핵심 시리즈/엔드포인트 전부 커버
2. `package.json`에 `test:{source}` 스크립트 추가
3. API 키는 `.env`에 추가, `.env.example`에 키 이름만 기록
4. `server/routes/{source}.js` 라우트 작성
5. `server/index.js`에 라우트 등록

## 테스트 결과 (2026-03-21 기준)

**전체 120/120 통과**

| 테스트 | 케이스 수 | 결과 |
|--------|----------|------|
| 백엔드 유닛 (node:test) | 102 | ✅ 통과 |
| 프론트 유닛 (vitest) | 10 | ✅ 통과 |
| E2E (Playwright) | 8 | ✅ 통과 |

## FRED 통합 테스트 결과 (2026-03-21 기준)

| 시리즈 | 최신값 | 날짜 |
|--------|--------|------|
| DFF (기준금리) | 3.64 | 2026-03-19 |
| GS10 (10년 국채) | 4.13 | 2026-02-01 |
| T10Y2Y (장단기 스프레드) | 0.51 | 2026-03-20 |
| VIXCLS (VIX) | 24.06 | 2026-03-19 |
| BAMLH0A0HYM2 (HY 스프레드) | 3.27 | 2026-03-19 |
| DEXKOUS (원/달러) | 1498.88 | 2026-03-13 |
| UNRATE (실업률) | 4.4 | 2026-02-01 |
| PCEPILFE (근원 PCE) | 128.394 | 2026-01-01 |
