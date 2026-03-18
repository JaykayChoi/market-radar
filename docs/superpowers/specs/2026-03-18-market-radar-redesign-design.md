# Market Radar — 전면 재설계 스펙

**작성일:** 2026-03-18
**상태:** 확정 (구현 대기)

---

## 개요

기존 Python 기반 KRX 데이터 수집 + Excel 출력 도구를 Node.js 단일 스택 웹 애플리케이션으로 전면 재작성한다. 브라우저에서 수집을 트리거하고, 결과를 인터랙티브 대시보드로 확인하며, 누적 데이터의 추이를 차트로 시각화한다.

---

## 확정된 기술 스택

| 역할 | 기술 | 선택 이유 |
|---|---|---|
| KRX 수집 | Playwright JS | Python보다 먼저 나온 네이티브 구현, 동일 기능 |
| 서버 | Express | 안정적, 생태계 풍부 |
| 프론트엔드 | React + TailwindCSS | 컴포넌트 재사용, 모던 UI |
| 차트 | Recharts | React 네이티브, 커스터마이징 용이 |
| DB | SQLite (better-sqlite3) | 서버리스, 설치 불필요, 시계열 쿼리 적합 |
| Excel 출력 | ExcelJS | Node.js 생태계 표준 |
| 빌드 | Vite | 빠른 HMR, 개발 생산성 |
| 동시 실행 | concurrently | dev 모드에서 Vite + Express 함께 실행 |

**Python 완전 제거.** 수집(Playwright), 서버(Express), 프론트(React) 모두 Node.js 단일 언어.

---

## 파일 구조

```
market_radar/
├── package.json
├── vite.config.js              ← Vite proxy: /api → localhost:3000
├── index.html                  ← React 진입점 (Vite)
│
├── src/                        ← 프론트엔드 (React)
│   ├── main.jsx
│   ├── App.jsx
│   └── components/
│       ├── CollectButton.jsx   ← 수집 시작 버튼 + 진행률 바
│       ├── DateRangePicker.jsx ← 퀵버튼 + 커스텀 날짜 범위
│       ├── DataTable.jsx       ← 공통 정렬/필터 테이블
│       ├── TrendChart.jsx      ← Recharts 래퍼 (라인/바/히트맵)
│       └── tabs/
│           ├── EtfTab.jsx
│           ├── ForeignTab.jsx
│           ├── InstitutionTab.jsx
│           ├── MarketTab.jsx
│           ├── FlowTab.jsx
│           └── FuturesTab.jsx
│
├── server/
│   ├── index.js                ← Express 서버 진입점 (포트 3000)
│   ├── routes/
│   │   ├── collect.js          ← POST /api/collect
│   │   │                          GET  /api/collect/progress (SSE)
│   │   ├── data.js             ← GET  /api/data/:type?start=&end=
│   │   └── export.js           ← GET  /api/export/excel/:type
│   ├── collector/
│   │   ├── browser.js          ← Playwright 세션/로그인 공통 (싱글톤)
│   │   ├── etf.js              ← ETF 시세(MDCSTAT04301) + 기본정보(MDCSTAT04601)
│   │   ├── foreign.js          ← 외국인 + 기관 순매수 (동일 페이지, 투자자 전환)
│   │   ├── stock.js            ← 전종목 주식 종가 (MDCSTAT18801)
│   │   └── extra.js            ← 업종/공매도/프로그램/선물 (MVP 이후)
│   ├── processor/
│   │   ├── etf.js              ← 순설정액, IRP 필터, 괴리율, 신규상장
│   │   ├── foreign.js          ← 외국인/기관 순매수 가공
│   │   └── extra.js            ← 업종/공매도/프로그램/선물 가공
│   └── storage/
│       └── db.js               ← SQLite CRUD (better-sqlite3)
│
└── data/
    ├── market_radar.db
    └── raw/                    ← krx_raw_YYYYMMDD.json (백업)
```

---

## 실행 방법

```bash
npm run dev    # 개발: Vite(5173) + Express(3000) 동시 실행
npm start      # 프로덕션: React 빌드 후 Express(3000)로 서빙
```

### CORS / Vite 프록시

`vite.config.js`에 프록시 설정을 추가해 dev 환경에서 CORS 없이 동작:
```js
server: { proxy: { '/api': 'http://localhost:3000' } }
```
Express에는 별도 CORS 미들웨어 불필요 (프록시가 처리).

---

## MVP 범위 (1단계)

다음 5개 수집 단계만 MVP에 포함한다. 공매도/프로그램매매/선물은 KRX 메뉴 ID 탐색이 필요하여 2단계로 분리한다.

| # | 단계 | KRX 메뉴 ID | bld | 비고 |
|---|---|---|---|---|
| 1a | ETF 시세 | MDC0201030101 | MDCSTAT04301 | 오늘 + N일전 날짜 4개 |
| 1b | ETF 기본정보 | MDC0201030101 | MDCSTAT04601 | 동일 세션, 상장일(LIST_DD) 포함 |
| 2 | 외국인 순매수 | MDC0201020303 | MDCSTAT02401 | response interceptor |
| 3 | 기관 순매수 | MDC0201020303 | MDCSTAT02401 | 동일 페이지, UI로 기관합계 전환 후 재조회 |
| 4 | 전종목 주식 종가 | MDC0201020105 | MDCSTAT18801 | response interceptor |
| 5 | 업종별 등락률 | MDC0201010101 | 자동 발견 | 34개 업종 지수 |

**단계 2→3 처리 방식:** `collector/foreign.js`가 단일 브라우저 세션에서 아래 순서로 실행한다.
1. `MDC0201020303` 로드 → response interceptor로 외국인 데이터 캡처
2. 동일 페이지에서 투자자 타입 드롭다운 → `기관합계` 선택 → 조회 버튼 클릭
3. response interceptor로 기관 데이터 캡처
4. 캡처된 bld/params에 `investor_type` 필드(`invstTpCd`) 를 명시적으로 주입하여 `foreign_flow` 테이블 저장 시 구분

**2단계 (MVP 이후):**

| # | 단계 | 상태 |
|---|---|---|
| 6 | 공매도 상위 | KRX 메뉴 ID 탐색 필요 — response interceptor 패턴으로 발견 |
| 7 | 프로그램 매매 | KRX 메뉴 ID 탐색 필요 |
| 8 | 선물 미결제약정 | KRX 메뉴 ID 탐색 필요, 파생상품 섹션 (MDC030X) |

---

## 수집 플로우

```
[브라우저] 수집 시작 버튼 클릭
    ↓
POST /api/collect
  → 이미 수집 중이면 409 반환, 버튼 비활성화 유지
  → lock 획득, 수집 시작
    ↓
SSE: GET /api/collect/progress
  → Last-Event-ID 헤더로 재연결 시 마지막 수신 이벤트 이후부터 재전송
  → 이벤트 포맷: { id, stage, total, label, status }
    ↓
단계별 수집 완료 시 SSE 이벤트 emit
    ↓
전체 완료 → SQLite 저장 + raw JSON 백업 → lock 해제
    ↓
SSE done 이벤트 → 프론트 자동 데이터 갱신
```

### SSE 재연결 처리

서버는 각 이벤트에 `id` 필드를 포함한다. 클라이언트가 재연결할 때 `Last-Event-ID` 헤더를 전송하면 서버는 해당 id 이후의 이벤트를 재전송한다. 서버는 완료된 이벤트 목록을 수집 세션 단위로 메모리에 보관한다.

### 수집 잠금 (Lock) 관리

- `POST /api/collect` 호출 시 서버 메모리에 lock 설정
- **TTL: 10분** — Playwright가 KRX 로그인 대기 중 hang하거나 crash 시 자동 해제
- TTL 만료 또는 정상 완료/오류 시 lock 해제
- lock 상태는 `GET /api/collect/progress` SSE 스트림에서 확인 가능

### 진행률 바 (5단계, MVP)

```
█████░░░░░ 40% — 기관 순매수 수집 중...
```

단계: ETF → 외국인 → 기관 → 주식 종가 → 업종별

---

## 데이터 저장

### SQLite 테이블

```sql
-- 수집 메타
collected_date (
  date TEXT PRIMARY KEY,       -- YYYYMMDD
  collected_at TEXT,           -- ISO timestamp
  stages_ok TEXT               -- JSON array: ["etf","foreign","institution","stock","industry"]
)

-- ETF 시세 (날짜별 스냅샷)
etf_prices (
  date TEXT, code TEXT,
  nav REAL, list_shrs INTEGER,
  close_price REAL,            -- TDD_CLSPRC (괴리율 계산용)
  mktcap REAL,
  PRIMARY KEY (date, code)
)

-- ETF 기본정보 (변경 시에만 갱신)
etf_info (
  code TEXT PRIMARY KEY,
  name TEXT, theme TEXT, manager TEXT,
  listed_at TEXT,              -- LIST_DD (YYYYMMDD)
  irp_eligible INTEGER         -- 1/0: EXCLUDE_KW 필터 적용 결과
)

-- 외국인/기관 순매수 (investor_type으로 구분)
foreign_flow (
  date TEXT, investor_type TEXT,  -- 'foreign' | 'institution'
  code TEXT, name TEXT,
  net_val REAL,                -- NETBID_TRDVAL (원)
  net_vol REAL,                -- NETBID_TRDVOL (주)
  PRIMARY KEY (date, investor_type, code)
)

-- 전종목 주식 종가
stock_prices (
  date TEXT, code TEXT,
  close_price REAL,
  PRIMARY KEY (date, code)
)

-- 업종별 등락률 (시장 지수 34개)
industry (
  date TEXT, index_name TEXT,
  close REAL, change_rate REAL,
  open REAL, high REAL, low REAL,
  PRIMARY KEY (date, index_name)
)

-- (2단계 이후) 공매도, 프로그램 매매, 선물 미결제약정
```

### 날짜 경계 처리

`GET /api/data/:type?start=YYYYMMDD&end=YYYYMMDD`에서 `start` 이전 날짜의 데이터가 DB에 없으면, ETF 순설정액 계산(`이전NAV × Δ상장주수`)에 필요한 `이전NAV`를 구할 수 없다. 이 경우:

- DB에서 `start` 이전에 가장 최근 수집된 날짜의 데이터를 자동으로 조회
- 조회 불가 시 해당 종목의 순설정액을 `null`로 반환하고 UI에서 "N/A" 표시

### Raw JSON 백업

- 경로: `data/raw/krx_raw_YYYYMMDD.json`
- 수집 성공 단계만 포함 (skip된 단계는 빈 배열 `[]`로 저장, 불완전 수집임을 명시)
- 재수집 시 덮어씀

---

## KRX 수집 핵심 지식 (Python → JS 포팅 시 유지)

- **API 엔드포인트:** `POST https://data.krx.co.kr/comm/bldAttendant/getJsonData.cmd`
- **인증:** 브라우저 persistent context 세션 쿠키 (`data/browser_profile/`)
- **응답 구조:** `{ output: [...] }` — 배열이 `output` 키에 있음
- **ETF 순설정액 공식:** `(오늘상장주수 - 이전상장주수) × 이전NAV / 1e8` (주가효과 제거)
- **IRP 제외 키워드:** 레버리지, 인버스, 2X, 2배, 골드/원유/달러/금/은/구리/천연가스/옥수수/대두/밀 선물, WTI
- **MDCSTAT01501** (공식 전종목 시세 bld) → 0건 반환, **MDCSTAT18801** (`MDC0201020105`) 사용
- **bld 자동 발견 패턴:** response interceptor로 페이지 로드 시 캡처한 bld/params 재사용, 날짜만 치환
- **KRX 로그인 대기:** 세션 만료 시 브라우저 창 오픈 → 사용자 로그인 완료까지 폴링 (최대 3분)

---

## 날짜 선택

프론트엔드 DateRangePicker:
```
[1주] [2주] [1개월] [3개월]  |  2026-03-01 ──────── 2026-03-18
```

- 퀵버튼: `today - N 영업일`로 계산 (주말만 제외, 공휴일 미적용 — 기존 Python과 동일 방식)
- 커스텀: 캘린더 피커로 start/end 직접 선택
- API에 `?start=YYYYMMDD&end=YYYYMMDD` 형식의 **캘린더 날짜**로 전달
- 영업일 계산은 서버에서 처리

---

## API 명세

### `POST /api/collect`
수집 시작. 이미 수집 중이면 `409 Conflict`.

Response (시작 성공): `{ ok: true, sessionId: "uuid" }`

### `GET /api/collect/progress`
SSE 스트림. `Last-Event-ID` 헤더로 재연결 시 누락 이벤트 재전송.

```json
// 진행 이벤트
{ "id": "3", "stage": 3, "total": 5, "label": "기관 순매수 수집 중...", "status": "running" }

// 완료 이벤트
{ "id": "6", "stage": 5, "total": 5, "label": "완료", "status": "done" }

// 오류 이벤트
{ "id": "4", "stage": 3, "total": 5, "label": "기관 순매수 실패", "status": "error", "error": "..." }
```

### `GET /api/data/:type?start=YYYYMMDD&end=YYYYMMDD`

Response 공통 envelope:
```json
{
  "type": "etf",
  "start": "20260311",
  "end": "20260318",
  "collectedDates": ["20260311", "20260312", "..."],
  "missingDates": [],
  "data": [ ...rows ]
}
```

`:type` 값: `etf` / `foreign` / `institution` / `industry` / `shortsell` / `program` / `futures`

### `GET /api/export/excel/:type?start=YYYYMMDD&end=YYYYMMDD`
ExcelJS로 생성된 xlsx 파일 다운로드.
형식: 2행 타이틀 헤더 + 데이터 + 자동 열 너비 (기존 Python 출력과 동일).

---

## 웹 UI 설계

### 탭 구성 (MVP)

| 탭 | 테이블 | 차트 |
|---|---|---|
| ETF 순설정액 | 순위, ETF명, 테마, 순설정액(억원), 수익률(%) | 테마별 바 차트, 순설정액 추이 라인 |
| 외국인 순매수 | 상위 100, 순매수금액, 수익률(%) | 상위 10개 종목 누적 순매수 라인 |
| 기관 순매수 | 상위 100, 순매수금액, 수익률(%) | 상위 10개 종목 누적 순매수 라인 |
| 시장 현황 | 업종별 등락률 | 업종별 등락률 바 차트 |

2단계 탭 (수집 구현 후 추가): 수급 심화 (공매도/프로그램), 선물/파생

### 수집 중 UI
- 진행률 바: `████░░ 3/5 — 기관 순매수 수집 중...`
- 수집 중에도 다른 탭은 이전 데이터 열람 가능
- 완료 시 토스트 알림 + 현재 탭 자동 갱신
- 수집 버튼: 진행 중 비활성화 (lock TTL 10분 이후 자동 재활성화)

---

## 기능 확장 예정

현재 스펙은 MVP이며, 아래 기능들이 추후 확장 예정이다.

### 단기 (2단계 수집 구현)
- **공매도 상위 100** — KRX 메뉴 ID 탐색 후 추가
- **프로그램 매매 동향** — 차익/비차익 분리
- **선물 미결제약정** — 파생상품 섹션

### 단기 (기능)
- **커스텀 관심 종목** — 사용자가 지정한 종목 별도 탭에서 추적
- **자동 수집 스케줄** — 장 마감 후 자동 실행 (`node-cron`)
- **알림** — 순매수 임계값 초과 시 브라우저 알림

### 중기
- **종목 드릴다운** — 특정 종목 클릭 → 상세 수급 히스토리 팝업
- **수급 점수** — 외국인+기관 동시 순매수 강도 복합 점수화
- **공매도 ↔ 외국인 크로스 분석** — 동일 종목 상관관계
- **ETF 괴리율 상위** — `(close_price - NAV) / NAV × 100`, 이미 DB에 데이터 존재
- **ETF 신규상장** — `etf_info.listed_at` 기준 최근 N일 필터

### 장기
- **모바일 반응형** 레이아웃
- **뉴스/공시 연계** — 외부 데이터 통합
