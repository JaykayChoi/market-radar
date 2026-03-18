---
name: market_radar_phase2
description: Phase 2 features planned but not yet implemented; KRX menu IDs unknown
type: project
---

Phase 2 collection features are planned but NOT in MVP scope. KRX menu page IDs need to be discovered via browser inspection before these can be implemented.

**Why:** These require additional browser discovery work to find the correct bld codes.

**How to apply:** When user asks to add Phase 2 features, first navigate to KRX and intercept network traffic to discover bld codes, then implement collection.

## Phase 2 Features Pending

| Feature          | Status              | Notes                                      |
|------------------|---------------------|--------------------------------------------|
| 공매도 현황       | Not started         | KRX menu ID unknown — needs discovery      |
| 프로그램매매      | Not started         | KRX menu ID unknown — needs discovery      |
| 선물미결제약정    | Not started         | KRX menu ID unknown — needs discovery      |
| 거래대금 상위     | Not started         | May reuse stock_prices data                |
| 신고가/신저가     | Not started         | May reuse stock_prices data                |

## SQLite tables reserved for Phase 2
- `program_trade`
- `futures_oi`
