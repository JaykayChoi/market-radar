---
name: us_financial_data_sources
description: 미국 투자 데이터소스 전체 목록 — 소스별 접근방식, 데이터 항목, 특이사항 (2026-03 기준)
type: reference
---

## 현재 등록된 소스 (구현 완료)

| 소스 | 역할 | 구현 위치 | API 키 |
|------|------|---------|--------|
| **FRED** ⭐ | 거시경제/금리/환율/VIX/스프레드 | `server/routes/fred.js` | `.env` FRED_API_KEY |
| **BLS** ⭐ | CPI, NFP, 실업률, ECI, PPI | `server/routes/bls.js` | `.env` BLS_API_KEY (무료 등록) |
| **Finnhub** | 실시간 시세, 어닝, 경제캘린더, 지표 | `server/routes/finnhub.js` | `.env` FINNHUB_API_KEY (무료 60콜/분) |
| **FMP** | 시세, ETF 정보, 섹터 성과, 어닝캘린더 | `server/routes/fmp.js` | `.env` FMP_API_KEY (무료 250콜/일) |
| **SEC EDGAR** ⭐ | 공시(10-K/Q/8-K), 13F, XBRL 재무 | `server/routes/edgar.js` | 불필요 (User-Agent 헤더만) |
| **Yahoo Finance** ⭐ | OHLCV, 시세 요약, 심볼 검색 | `server/routes/yahoo.js` | 불필요 (비공식 API) |
| **CBOE** ⭐ | VIX/VIX9D/VIX3M/VVIX 히스토리 | `server/routes/cboe.js` | 불필요 (무료 CSV) |
| **US Treasury** ⭐ | 명목/TIPS 수익률 곡선 (1M~30Y) | `server/routes/treasury.js` | 불필요 |
| **BEA** | 실질GDP, PCE, 법인이익, 경상수지 | `server/routes/bea.js` | `.env` BEA_API_KEY (무료) |
| **Polygon.io** | OHLCV, 스냅샷, 종목정보, 뉴스, 배당 | `server/routes/polygon.js` | `.env` POLYGON_API_KEY (무료 EOD) |

테스트: `npm run test:unit:backend` (90개 전부 통과, 2026-03-21)

---

## 빠른 비교 매트릭스

| # | 소스명 | URL | 접근방식 | API키 | 비용 | 갱신주기 |
|---|--------|-----|----------|-------|------|----------|
| 1 | **FRED** | fred.stlouisfed.org | REST API | 필요 | 무료 | 일/월/분기 |
| 2 | **SEC EDGAR** | data.sec.gov | REST API | X | 무료 | 공시 즉시 |
| 3 | **Yahoo Finance (yfinance)** | finance.yahoo.com | 비공식 래퍼 | X | 무료 | 실시간 |
| 4 | **Polygon.io** | polygon.io | REST+WebSocket | 필요 | 무료(EOD)/유료 | 실시간 |
| 5 | **Finnhub** | finnhub.io | REST+WebSocket | 필요 | 무료(60콜/분) | 실시간 |
| 6 | **Alpha Vantage** | alphavantage.co | REST API | 필요 | 무료(25콜/일)/유료 | 실시간(유료) |
| 7 | **Tiingo** | tiingo.com | REST+WebSocket | 필요 | 무료/유료 $10/월~ | EOD/실시간(유료) |
| 8 | **TwelveData** | twelvedata.com | REST+WebSocket | 필요 | 무료(800콜/일)/유료 | 실시간 |
| 9 | **Financial Modeling Prep** | financialmodelingprep.com | REST API | 필요 | 무료(250콜/일)/유료 | EOD/실시간 |
| 10 | **EODHD** | eodhd.com | REST API | 필요 | 무료(20콜/일)/유료 | EOD/실시간 |
| 11 | **Marketstack** | marketstack.com | REST API | 필요 | 무료(100콜/월)/유료 | EOD |
| 12 | **Nasdaq Data Link** | data.nasdaq.com | REST API | 필요 | 무료(일부)/유료 | 일/월 |
| 13 | **Databento** | databento.com | REST+WebSocket | 필요 | 사용량 기반 | 실시간/틱 |
| 14 | **CBOE** | cboe.com | 다운로드/API | X | 무료(통계)/유료(피드) | 장마감 후 |
| 15 | **US Treasury** | home.treasury.gov | XML/JSON | X | 무료 | 일별 |
| 16 | **BLS** | api.bls.gov | REST API | 필요 | 무료 | 월/분기 |
| 17 | **BEA** | apps.bea.gov | REST API | 필요 | 무료 | 분기/연 |
| 18 | **CME Group** | cmegroup.com | WebSocket/REST | 필요 | 유료(원천) | 실시간 |
| 19 | **Finviz** | finviz.com | 스크래핑 | X | 무료/Elite 유료 | 준실시간 |
| 20 | **Investing.com** | investing.com | 스크래핑/라이브러리 | X | 무료 | 실시간 |
| 21 | **SimFin** | simfin.com | REST API | 필요 | 무료(제한)/유료 | EOD |
| 22 | **Intrinio** | intrinio.com | REST API | 필요 | **유료** $150/월~ | 실시간 |
| 23 | **Alpaca Markets** | alpaca.markets | REST+WebSocket | 필요 | 무료(IEX)/유료 | 실시간 |
| 24 | **Interactive Brokers API** | interactivebrokers.com | 소켓/REST | 필요 | 계좌 무료/데이터 유료 | 실시간 |
| 25 | **OpenBB** | openbb.co | Python/REST/MCP | X | 오픈소스 | — |
| 26 | **Glassnode** | glassnode.com | REST API | 필요 | **유료** | 실시간 |
| 27 | **CoinGecko** | coingecko.com | REST API | 필요 | 무료(5분)/유료 | 실시간 |
| 28 | **FINRA TRACE** | finra.org | 다운로드/API | X | 무료 | 실시간 |
| 29 | **Unusual Whales** | unusualwhales.com | REST API/MCP | 필요 | 무료(웹)/유료(API) | 실시간 |
| 30 | **WhaleWisdom** | whalewisdom.com | REST API | 필요 | 무료(2년)/유료 | 분기(13F) |
| 31 | **ORTEX** | public.ortex.com | REST API | 필요 | **유료** | 일별 |
| 32 | **OpenFIGI** | openfigi.com | REST API | 필요 | 무료 | — |
| 33 | **WRDS** | wrds-www.wharton.upenn.edu | 웹/Python/R | 기관 | **기관 라이선스** | 다양 |

---

## 카테고리별 소스 상세

---

### A. 거시경제 지표

#### A1. FRED (Federal Reserve Economic Data) ⭐ 최우선
접근: REST API + `pip install fredapi`. API 키 무료 등록.
**방향: 미국 거시 데이터의 최고 권위 소스. 800,000개+ 시계열 무료.**

| 시리즈 ID | 데이터 항목 |
|-----------|------------|
| DFF | 미국 기준금리 (Fed Funds Rate) |
| GS2 / GS5 / GS10 / GS30 | 국채 수익률 2y/5y/10y/30y |
| T10Y2Y / T10Y3M | 장단기 스프레드 (경기침체 선행지표) |
| DFII10 | 10년 실질금리 (TIPS) |
| DTWEXBGS | 달러 인덱스 (무역가중) |
| VIXCLS | VIX 공포지수 |
| DEXKOUS / DEXJPUS / DEXUSEU | 원/달러, 엔/달러, 유로/달러 |
| CPIAUCSL / CPILFESL | CPI 전체/근원 |
| PCEPI / PCEPILFE | PCE 물가지수 (Fed 선호 지표) |
| UNRATE | 실업률 (U-3) |
| PAYEMS | 비농업 취업자수 (NFP) |
| GDP / GDPC1 | 명목/실질 GDP |
| M2SL | 통화량 M2 |
| BAMLH0A0HYM2 | 하이일드 스프레드 (신용위험) |
| BAMLC0A0CM | 투자등급 회사채 스프레드 |
| MORTGAGE30US | 30년 고정 모기지 금리 |
| UMCSENT | 미시간대 소비자신뢰지수 |
| ISRATIO | 재고/판매 비율 |

#### A2. BLS (Bureau of Labor Statistics)
접근: REST API v2, API 키 무료.

| 시리즈 ID | 항목 |
|-----------|------|
| CES0000000001 | 비농업 취업자수 (NFP) |
| LNS14000000 | 실업률 U-3 |
| LNS13327709 | 실업률 U-6 (광의) |
| CUUR0000SA0 | CPI-U 전체 |
| CUUR0000SA0L1E | 근원 CPI |
| ECEC | 고용비용지수 (ECI) |

#### A3. BEA (Bureau of Economic Analysis)
접근: REST API, API 키 무료.

| 분류 | 데이터 항목 |
|------|------------|
| GDP | 실질/명목 GDP, 구성항목 |
| PCE | 개인소비지출 및 디플레이터 |
| 기업이익 | 세전/세후 법인이익 |
| 경상수지 | 무역수지, 서비스수지 |

#### A4. US Treasury (재무부)
접근: 공개 XML/JSON, 인증 없음.

| 분류 | 데이터 항목 |
|------|------------|
| 수익률 곡선 | 1M/2M/3M/6M/1Y/2Y/3Y/5Y/7Y/10Y/20Y/30Y 일별 |
| TIPS | 물가연동국채 실질수익률 |

API: `https://home.treasury.gov/resource-center/data-chart-center/interest-rates/...`

#### A5. Trading Economics
접근: REST API, 유료 구독.
- 196개국 300,000개+ 경제 지표
- 실제치/컨센서스/예측치 포함
- Excel 직접 연동 지원

---

### B. 주가/시세 데이터

#### B1. Yahoo Finance (yfinance) ⭐ 무료 최선택
접근: `pip install yfinance`. 비공식 API — 정책 변경 리스크 있음.

```python
import yfinance as yf
t = yf.Ticker("AAPL")
hist = t.history(period="1y")         # OHLCV
info = t.info                          # 기업 기본정보
options = t.options                    # 만기일 목록
chain = t.option_chain("2024-06-21")  # 옵션 체인
```

| 분류 | 데이터 항목 |
|------|------------|
| 주가 | OHLCV (분봉/일봉/주봉/월봉), 수정주가 |
| 기업정보 | 시총, PER/PBR/EPS, 배당수익률, 베타 |
| 재무제표 | 연간/분기 손익/대차/현금흐름 (요약) |
| 옵션 | 콜/풋 옵션 체인, 만기별 |
| ETF | 보유종목(holdings), 섹터 비중 |
| 지수 | ^GSPC(S&P500), ^IXIC(나스닥), ^DJI(다우), ^RUT(러셀2000) |
| 원자재 | CL=F(WTI), GC=F(금), SI=F(은), HG=F(구리) |

#### B2. Polygon.io ⭐ 유료 최선택
접근: REST API + WebSocket. 무료 티어(EOD), Starter $29/월~.
- 주식+옵션+선물+크립토 하나의 API로 통합
- 미국 전종목 틱 데이터, 오더북, NBBO

| 분류 | 데이터 항목 |
|------|------------|
| 주가 | 틱/집계(1분~1일)/수정주가/NBBO |
| 옵션 | 체인/그리스(델타/감마/세타/베가)/미결제약정(유료) |
| 지수 | S&P500 구성종목, 지수값 |
| 이벤트 | 주식분할, 배당, 상장/상폐 |
| 뉴스 | 종목별 뉴스 피드 |

#### B3. Finnhub
접근: REST API + WebSocket. 무료 60콜/분, WebSocket 50심볼 무료.

| 분류 | 데이터 항목 |
|------|------------|
| 주가 | 실시간 호가/체결, OHLCV |
| 기업 | 재무지표, EPS 서프라이즈, 컨센서스 |
| 기관 수급 | 13F 기반 기관 포지션 변화 |
| 내부자 거래 | Form 4 집계 |
| 경제지표 | 경제 캘린더 (예상치/실제치) |
| 뉴스 | 감성 점수 포함 |
| 의회 거래 | 의원 매수/매도 데이터 |

#### B4. Tiingo
접근: REST API + WebSocket. `pip install tiingo`. 무료 1,000콜/일, $10/월~.
- IEX Cloud 2024-08-31 종료 이후 주요 대체 소스로 부상
- 학술 연구용 할인 가격 제공

#### B5. TwelveData
접근: REST API + WebSocket. 무료 800콜/일, 8콜/분. $29/월~.
- 전세계 주식/ETF/인덱스/외환/크립토 통합
- 기술적 지표 내장 (SMA/EMA/RSI/MACD 등)

#### B6. Alpha Vantage
접근: REST API. 무료 25콜/일, 유료 $50/월~.
- 기술적 지표 50개+ 내장
- 취미/학술용. 하루 25콜은 매우 제한적.

#### B7. EODHD (EOD Historical Data)
접근: REST API. 무료 20콜/일, All-In-One $79.99/월.
- 70개국+ 60,000개+ 종목 커버
- 재무 데이터 + 뉴스 + 감성 분석 올인원

#### B8. Financial Modeling Prep (FMP)
접근: REST API. 무료 250콜/일, Starter $14.99/월~.
- 재무 데이터 API 중 무료 티어 가장 관대한 편
- 10-K/10-Q 구조화, 어닝 컨센서스, 13F, IPO 캘린더

#### B9. Databento
접근: REST API + WebSocket + Python/C++ SDK. 사용량 기반($125 무료 크레딧).
- 기관급 데이터 품질. HFT·퀀트용.
- CME 공식 제3자 재배포 파트너
- 주식/옵션/선물 틱 데이터, 전체 오더북(L2/L3)

---

### C. 공시/재무 데이터

#### C1. SEC EDGAR ⭐ 공시 최우선 (한국 DART에 해당)
접근: REST API, 인증 불필요. User-Agent 헤더 필수.

| 분류 | 데이터 항목 |
|------|------------|
| 공시 | 10-K(연간), 10-Q(분기), 8-K(수시), DEF 14A(위임장) |
| 재무제표 | XBRL 형식 손익/대차/현금흐름 |
| 지분 변동 | Form 4 (임원/주요주주 매매), 13D/G (5% 이상 보유) |
| **기관 보유** | **13F — 헤지펀드 분기 포지션** |
| 공매도 | FINRA 공매도 잔고 (격주 공시) |
| 특수 공시 | S-1(IPO), S-3(추가 발행) |

주요 API:
- `https://data.sec.gov/submissions/CIK{cik}.json` — 회사별 공시 목록
- `https://data.sec.gov/api/xbrl/companyfacts/CIK{cik}.json` — 재무 전체

#### C2. SimFin
접근: REST API + Python 라이브러리. 무료(기본), SimFin+ 유료(전체 히스토리).
- 2003년~ 재무제표, 일별 재무 비율 7,000개+
- AI/ML 연구용 고품질에 초점
- 벌크 다운로드 지원

#### C3. Intrinio
접근: REST API. 유료 $150~$1,600/월.
- 15년+ 미국 상장사 표준화 재무제표
- As-reported + 표준화 두 형식 제공
- 옵션/ETF/실시간 주가 통합

#### C4. sec-api.io
접근: REST API. 유료 구독.
- EDGAR 원본을 구조화된 JSON으로 자동 파싱
- 13F/Form 4/10-K 실시간 스트리밍
- 역사 데이터 1993년~

#### C5. WRDS (Wharton Research Data Services)
접근: 웹/Python/R. **기관 라이선스 전용 (개인 불가).**
- CRSP(주가/수익률), Compustat(재무), IBES(컨센서스), TAQ(틱), 290개+ 데이터셋
- 학술 연구 최고 권위 DB — 대학 소속 필수

---

### D. 옵션 데이터

#### D1. CBOE
접근: 역사 통계 무료 다운로드 (CSV), 실시간 피드는 기업 계약.

| 분류 | 데이터 항목 |
|------|------------|
| **VIX** | **VIX/VIX9D/VIX3M/VIX6M 과거 (1990~)** |
| VIX 선물 | 만기별 settlement 가격 (콘탱고/백워데이션 분석) |
| Put/Call Ratio | 전체/지수/개별 주식 |
| 거래량 통계 | 거래소별 월별 옵션 볼륨 |

무료: `https://cdn.cboe.com/api/global/us_indices/daily_prices/VIX_History.csv`

#### D2. Polygon.io (옵션)
- 옵션 체인, 그리스 지표 (델타/감마/세타/베가), 미결제약정
- 1.4M+ 미국 주식 옵션 계약
- 무료 EOD, Starter $29/월~

#### D3. Unusual Whales ⭐ 옵션 플로우 특화
접근: REST API + MCP Server. 무료(웹), API 유료.
- **비정상 옵션 거래(대형 블록) 탐지** — 옵션 플로우 분석
- 다크풀 데이터, Put/Call Ratio, 기관 포지션
- OpenAPI spec + MCP 서버 제공

#### D4. Market Data App
접근: REST API + 스프레드시트 애드온.
- 실시간 옵션 체인 (DTE/델타 필터)
- 수십 년 역사 옵션 가격

---

### E. 선물 데이터

#### E1. CME Group (원천)
접근: WebSocket/REST, 기업 계약.
- CME/CBOT/NYMEX/COMEX 전 선물·옵션
- 금리(SOFR)/에너지/농산물/외환/주가지수 전체 커버

#### E2. Databento (CME 재배포)
- CME Globex MDP 3.0 틱 데이터
- 주가지수(ES/NQ/RTY) + 에너지 + 금속 + 금리 선물

#### E3. Nasdaq Data Link
- 에너지/농산물/금속/통화/금리 선물 역사 데이터
- **CFTC COT (Commitments of Traders) 무료 포함**

COT 무료: cftc.gov/MarketReports/CommitmentsofTraders

#### E4. FRED (금리 선물)
- Fed Funds 선물 내재 금리 → FOMC 인상 확률 계산 가능

---

### F. 수급/기관투자자 데이터

#### F1. SEC EDGAR 13F (무료)
- 기관 분기별 포지션 공시 (자산 1억불 이상 의무)
- 지연 45일 (다음 분기 15일까지 제출)

#### F2. WhaleWisdom
접근: REST API. 무료(최근 8분기), $90/3개월~.
- 13F/13D/내부자 거래/헤지펀드 포트폴리오 추적
- 비구독자도 최근 8분기 API 접근 가능

#### F3. Fintel
접근: 웹사이트/데이터 다운로드. Freemium.
- 13F 기관 보유, Form 4 내부자 거래
- **공매도 잔고 + 대차 잔량 + 기관 Put/Call Ratio**

#### F4. ORTEX ⭐ 공매도 특화
접근: REST API + Python SDK + Excel 애드인. 유료 (기업급).
- **실시간 공매도 잔고, Cost to Borrow, 대차 잔량**
- 700,000개+ 유동성 풀 집계. 세계 최대 공매도 데이터 풀 중 하나
- 매일 EST 7:30 업데이트

#### F5. FINRA TRACE (채권/공매도 무료)
접근: 웹 다운로드/제한적 API. 완전 무료.
- FINRA 공매도 잔고 격주 공시
- 미국 회사채/국채/ABS/MBS 실시간 거래 보고

---

### G. 스크리닝/시각화

#### G1. Finviz ⭐ 스크리너 최선택
접근: `pip install finvizfinance` 라이브러리. 무료 (EOD), Elite 구독 시 실시간.

| 분류 | 데이터 항목 |
|------|------------|
| **스크리너** | **150+ 필터 (PER/PBR/RSI/52주 고저/섹터/시총 등)** |
| **섹터 히트맵** | **S&P500 섹터별/종목별 등락률 히트맵** |
| 기술적 분석 | 차트 패턴 자동 인식 |
| 내부자 거래 | Form 4 집계 |
| 뉴스 | 종목별 최신 뉴스 |

#### G2. Macrotrends
접근: 스크래핑 (공식 API 없음). 무료.
- 장기 주가/재무 비율/거시 데이터 시각화
- 50년+ 히스토리 차트

#### G3. Stockanalysis.com
접근: 스크래핑. 무료(기본)/Pro 유료.
- 재무제표, 밸류에이션, ETF 정보 웹 뷰

---

### H. 경제 캘린더/이벤트

#### H1. Investing.com
접근: `pip install investiny` 또는 스크래핑.
- **경제 캘린더: FOMC/CPI/NFP/PCE/ISM 발표일 + 예상치/실제치/이전치**
- 전세계 경제 이벤트 (중요도 필터)

#### H2. Finnhub (어닝/IPO 캘린더)
- 어닝 캘린더, IPO 캘린더, 경제지표 캘린더
- 무료 티어 포함

#### H3. FMP (캘린더)
- 어닝/IPO/배당 캘린더
- 무료 250콜/일

#### H4. Econoday
접근: 기업 계약 기반. Bloomberg 터미널 내장.
- 미국+18개국 경제 지표 + FOMC + 재무부 경매 일정
- 시장 영향 전문가 코멘터리 포함

---

### I. 채권/신용 데이터

#### I1. FRED (스프레드) ⭐ 무료 최선택
- ICE BofA IG/HY 스프레드 (BAMLC0A0CM / BAMLH0A0HYM2)
- 국채 수익률 곡선 (명목 + TIPS 실질)

#### I2. FINRA TRACE
- 미국 회사채 실시간 거래 보고 (OTC 채권 투명성)
- 무료 역사 데이터 다운로드

#### I3. CBonds
접근: REST API. 유료 구독.
- 전세계 채권 가격/쿠폰/만기/신용등급
- 유럽·신흥시장 채권 커버리지 강함

---

### J. 암호화폐 데이터

#### J1. CoinGecko ⭐ 무료 최선택
접근: REST API. 무료 (5분 단위), Analyst $129/월, Enterprise $999/월+.
- 18,000개+ 코인, 1,000개+ 거래소, 12년+ 역사
- GeckoTerminal: 온체인 DEX 데이터 포함

#### J2. CoinMarketCap
접근: REST API. Freemium.
- 코인 가격/시총/거래량, 거래소 정보, 글로벌 통계

#### J3. Glassnode ⭐ 온체인 분석 최선택
접근: REST API. Professional 구독 + API 애드온 (고가).
- **800개+ 온체인 지표 — BTC/ETH 중심**
- NUPL, SOPR, MVRV, 고래 포지션 추적
- 온체인 분석 최고 권위

---

### K. ETF 데이터

#### K1. yfinance (무료)
- ETF 보유 종목, 순자산, 운용사 정보

#### K2. ETFdb
접근: 웹사이트. 무료(기본)/Pro 유료.
- 미국 상장 전 ETF 자금 유출입 추적
- ETF 흐름 분석 참조 소스

#### K3. iShares/SSGA/Vanguard 직접
접근: `pip install etf-scraper`. 공식 API 없음.
- ETF 보유 종목 일별 파일 다운로드 (iShares/SSGA/Vanguard/Invesco 통합)

---

### L. 뉴스/감성 데이터

#### L1. Finnhub (무료)
- 종목별 뉴스 + 감성 점수. 무료 티어.

#### L2. Benzinga API
접근: REST API. 유료 + AWS Marketplace 무료 기본 티어.
- 하루 130~160건 전문 기사, 600~900건 실시간 헤드라인
- 티커/카테고리/임팩트 지표 포함

#### L3. EODHD 뉴스
- 금융 뉴스 피드 + 감성 점수. 유료 플랜.

#### L4. StockNewsAPI
접근: REST API. Freemium.
- 종목별 뉴스, 감성 점수 (긍정/부정/중립)

---

### M. 브로커리지 API (데이터 포함)

#### M1. Interactive Brokers (IBKR)
접근: TWS API(소켓) + Client Portal REST API.
- **170개 시장, 40개국 글로벌 커버리지**
- 주식/옵션/선물/외환/채권/펀드 실시간
- 계좌 개설 무료, 데이터 구독 별도. TWS 실행 필요.

#### M2. Alpaca Markets
접근: REST API + WebSocket. Python/JS SDK.
- 무료 기본 (IEX 피드), Algo Trader Plus $99/월 (전 마켓)
- Paper trading 지원. 알고 트레이딩에 최적화.

#### M3. Tradier
접근: REST API.
- 미국 주식/ETF/옵션 실시간
- QuantConnect 통합. 옵션 트레이딩 특화.

---

### N. 통합 플랫폼 / 유틸리티

#### N1. OpenBB ⭐ 블룸버그 오픈소스 대안
접근: Python 라이브러리 + REST API + Excel + MCP 서버.
오픈소스 (AGPL), GitHub 50,000+ 스타.
- 100개+ 데이터 소스 통합
- 주식/옵션/크립토/외환/거시/고정수익/대안 데이터
- 로컬 실행, 데이터 프라이버시 보장
- AI 에이전트·MCP 서버 지원

#### N2. OpenFIGI
접근: REST API. API 키 무료. Bloomberg LP 운영.
- **금융 상품 식별자 변환**: FIGI ↔ ISIN ↔ CUSIP ↔ 블룸버그 티커
- 데이터 조인·표준화 시 필수 유틸리티

#### N3. Nasdaq Data Link (구 Quandl)
- 2,000만+ 지표, 250개+ 소스 통합
- CFTC COT 무료 포함. 대안 데이터/거시 데이터 강점.

---

## 분석 유형별 추천 조합

| 분석 유형 | 필수 소스 |
|-----------|-----------|
| 거시경제/금리 | FRED (국채/스프레드/VIX), US Treasury (수익률곡선), BLS (NFP/CPI) |
| 수익률 곡선 역전 모니터링 | FRED T10Y2Y/T10Y3M (자동 알림 가능) |
| 개별 종목 분석 | yfinance (시세), SEC EDGAR (재무/공시), Finnhub (컨센서스) |
| 옵션 분석 | CBOE (VIX/PCR), Unusual Whales (플로우), Polygon.io (그리스) |
| 공매도 분석 | ORTEX (실시간 잔고), FINRA (격주 공시), Fintel (기관 PCR) |
| 기관 수급 추적 | SEC EDGAR 13F, WhaleWisdom (집계), Finnhub (기관 포지션) |
| 이벤트 드리븐 | Investing.com (캘린더), Finnhub (서프라이즈), FMP (어닝 캘린더) |
| 선물/COT 분석 | CME/Databento (원천), Nasdaq Data Link (COT 무료) |
| 퀀트 백테스팅 | Polygon.io/Databento (틱), SimFin (재무), WRDS (학술기관) |
| 크립토 온체인 | Glassnode (온체인 지표), CoinGecko (시세) |
| 채권/신용 | FRED (스프레드), FINRA TRACE (거래), CBonds (글로벌) |
| 섹터/테마 스크리닝 | Finviz (히트맵/필터), FMP (섹터 성과) |

## 핵심 거시 모니터링 FRED 시리즈

```
금리: DFF, GS2, GS5, GS10, GS30, T10Y2Y (수익률곡선 역전)
물가: CPIAUCSL, CPILFESL, PCEPILFE (Fed 선호)
고용: UNRATE, PAYEMS
신용: BAMLH0A0HYM2 (HY 스프레드), BAMLC0A0CM (IG 스프레드)
공포: VIXCLS
달러: DTWEXBGS, DEXKOUS
유동성: M2SL, MORTGAGE30US
```

## 무료 vs 유료 선택 기준

| 필요 | 무료 선택 | 유료 업그레이드 시점 |
|------|-----------|---------------------|
| EOD 주가 | yfinance | API 안정성 필요 시 → Tiingo |
| 실시간 주가 | Finnhub (60콜/분) | 다수 종목 → Polygon.io |
| 재무 데이터 | FMP (250콜/일) / SimFin | 전체 히스토리 → SimFin+ / Intrinio |
| 공시/13F | SEC EDGAR (무료) | 자동 파싱 → sec-api.io |
| 거시 데이터 | FRED / BLS / BEA | 전세계 → Trading Economics |
| 옵션 통계 | CBOE 다운로드 | 실시간 그리스 → Polygon.io |
| 공매도 | FINRA 격주 무료 | 실시간 → ORTEX |
| 크립토 | CoinGecko | 온체인 → Glassnode |
