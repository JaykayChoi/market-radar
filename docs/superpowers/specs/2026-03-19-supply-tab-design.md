# 수급 탭 설계 스펙

**날짜:** 2026-03-19
**범위:** KRX 공매도 잔고, 공매도 거래, 프로그램 순매수 — 전종목 종목별 데이터

---

## 목표

기존 투자자별 순매수 탭과 동일한 UX로 수급 관련 3개 데이터셋을 새 "수급" 탭에 표시한다.
대차잔고 (#4) 는 SEIBro 스크래핑이 필요하므로 이번 범위에서 제외.

---

## 백엔드

### 새 수집기 (`server/collector/`)

**`shortstock.js`**
- 공매도 잔고 현황: KRX 메뉴 이동 → 요청 인터셉트로 bld 코드 캡처
  - bld 코드 식별: `MDCSTAT`이 포함되고 응답에 `SHRT_SELL` 계열 필드가 있을 때만 캡처 (stock.js의 `rows.length > 500 + 필드 존재` 검증 패턴 사용)
- 공매도 거래 현황: 동일 방식으로 별도 bld 캡처
- 날짜 파라미터: 단일 날짜 per 호출 (`trdDd`, stock.js 패턴) — 일별 스냅샷 데이터이므로
- bld 캡처 실패 시: 해당 항목 skip, 경고 로그, 수집 계속 진행 (전체 중단 없음)

**`program.js`**
- 프로그램 매매 현황: 동일 인터셉트 패턴, `PRGM` 계열 필드로 bld 식별
- 날짜 파라미터: 단일 날짜 per 호출 (`trdDd`)

### SQLite 테이블 3개 추가 (`server/storage/db.js`)

```sql
CREATE TABLE IF NOT EXISTS short_balance (
  date TEXT,
  code TEXT,
  name TEXT,
  balance_qty INTEGER,   -- 잔고수량
  balance_amt REAL,      -- 잔고금액 (원)
  balance_ratio REAL,    -- 잔고비율 (%, 예: 5.23 → 5.23%)
  PRIMARY KEY (date, code)
);

CREATE TABLE IF NOT EXISTS short_trade (
  date TEXT,
  code TEXT,
  name TEXT,
  short_vol INTEGER,     -- 공매도 거래량
  total_vol INTEGER,     -- 전체 거래량
  vol_ratio REAL,        -- 거래량 비율 (%)
  short_val REAL,        -- 공매도 거래대금 (원)
  total_val REAL,        -- 전체 거래대금 (원)
  val_ratio REAL,        -- 거래대금 비율 (%)
  PRIMARY KEY (date, code)
);

CREATE TABLE IF NOT EXISTS program_trade (
  date TEXT,
  code TEXT,
  name TEXT,
  arb_buy REAL,          -- 차익 매수 (원)
  arb_sell REAL,         -- 차익 매도 (원)
  arb_net REAL,          -- 차익 순매수 (원)
  nonarb_buy REAL,       -- 비차익 매수 (원)
  nonarb_sell REAL,      -- 비차익 매도 (원)
  nonarb_net REAL,       -- 비차익 순매수 (원)
  PRIMARY KEY (date, code)
);
```

### `db.js` 신규 함수 (기존 upsert/get 패턴 동일하게)

```
upsertShortBalance(rows)    — INSERT OR REPLACE INTO short_balance
upsertShortTrade(rows)      — INSERT OR REPLACE INTO short_trade
upsertProgramTrade(rows)    — INSERT OR REPLACE INTO program_trade
getShortBalanceData(start, end)
getShortTradeData(start, end)
getProgramTradeData(start, end)
```

각 getter는 `WHERE date >= ? AND date <= ? ORDER BY date, [기본정렬컬럼] DESC`.
module.exports에도 추가.

### 데이터 처리 방식

stock.js/industry.js 패턴과 동일하게 **collect.js 내에서 인라인 처리**. 별도 processor 파일 없음.
KRX 원시 필드명 → SQLite 컬럼 매핑은 collect.js 내 toNum 헬퍼 재사용.

### 파이프라인 수정 (`server/routes/collect.js`)

`TOTAL = 7`로 변경. 스테이지 재정의:

| stage | 내용 |
|-------|------|
| 0 | 브라우저 시작 |
| 1 | ETF 시세 |
| 2 | 투자자별 순매수 |
| 3 | 주식 종가 |
| 4 | 업종별 등락률 |
| 5 | 공매도 잔고 + 거래 (신규) |
| 6 | 프로그램 순매수 (신규) |
| 7 | 완료 |

기존 코드의 중복 `emitProgress(stage 3, '투자자별 순매수 완료')` (line 127) 및 잘못된 라벨 `emitProgress(stage 3, '기관 순매수 완료')` (line 137) 제거.

`upsertCollectedDate`의 stages_ok 배열에 `'short_balance'`, `'short_trade'`, `'program_trade'` 추가.

raw JSON 스냅샷: `krx_raw_${today}_short.json`, `krx_raw_${today}_program.json` 저장.

### API 엔드포인트 (`server/routes/data.js`)

기존 `router.get('/:type')` switch-case에 케이스 3개 추가:
```js
case 'short_balance': data = db.getShortBalanceData(start, end); break
case 'short_trade':   data = db.getShortTradeData(start, end);   break
case 'program_trade': data = db.getProgramTradeData(start, end); break
```
별도 라우터 파일 생성 없음.

---

## 프론트엔드

### `src/components/tabs/SupplyTab.jsx` (신규)

3개 섹션, 각 독립적으로:

| 섹션 | 기본 정렬 | 표시 컬럼 |
|------|----------|----------|
| 공매도 잔고 | balance_amt 내림차순 | 종목명, 잔고수량, 잔고금액, 잔고비율(%) |
| 공매도 거래 | val_ratio 내림차순 | 종목명, 공매도거래량, 거래량비율(%), 공매도거래대금, 거래대금비율(%) |
| 프로그램 순매수 | total_net 내림차순 | 종목명, 차익순매수, 비차익순매수, 합계순매수 |

- 컬럼 헤더 클릭 → 오름차순/내림차순 정렬 토글 (InvestorTab과 동일)
- `total_net`: 클라이언트에서 `arb_net + nonarb_net` 계산 후 정렬 (DB 컬럼 아님)
- 비율(%) 컬럼: `toFixed(2) + '%'` 포맷 적용

### `src/App.jsx` 수정

탭 목록에 `{ id: 'supply', label: '수급' }` 추가.
`SupplyTab` import 및 렌더링 추가.

---

## KRX 메뉴 ID 및 필드명 발굴 절차

메뉴 ID와 응답 필드명은 구현 전 아래 절차로 확인한다:

1. KRX 데이터포털 (`data.krx.co.kr`) 로그인 후 좌측 메뉴 탐색
   - 공매도 잔고: "주식 > 공매도 > 공매도 잔고 현황"
   - 공매도 거래: "주식 > 공매도 > 공매도 거래 현황"
   - 프로그램 매매: "주식 > 프로그램매매 > 종목별"
2. 브라우저 주소창에서 `menuId=MDCxxxxxxxxx` 값 확인 → 수집기에 하드코딩
3. DevTools Network 탭에서 `getJsonData.cmd` 요청 확인 → 응답 필드명 기록
4. 확인한 필드명으로 collect.js 내 매핑 완성 (예: `SHRT_SELL_RMNQTY` → `balance_qty`)

raw JSON 스냅샷 먼저 저장 후 필드명 확인이 가장 효율적 (data/raw/ 참고).

---

## 에러 처리 요약

- bld 캡처 실패 → 해당 단계 skip, SSE warning 이벤트, 수집 계속
- 0행 응답 → 경고 로그, upsert 생략
- KRX 응답 파싱 오류 → fetch_json 기존 처리 그대로 (빈 배열 반환)

---

## 범위 외

- #4 대차잔고 (SEIBro) — 별도 스펙
- 공매도 기간별 비교 — 우선 일별 최신 데이터만
- Excel 내보내기 확장 — 별도 작업
