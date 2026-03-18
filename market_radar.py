"""
최근N일 시장 데이터 생성 - 통합 실행 스크립트
  1. IRP ETF 최근N일 순설정액 순위 (주가효과 제외) - 3일/5일/7일
  2. 외국인 최근N일 순매수 상위 100 종목 - 3일/5일/7일

실행: py market_radar.py
출력:
  - 최근3일_IRP_ETF순설정액_YYYYMMDD.xlsx
  - 최근5일_IRP_ETF순설정액_YYYYMMDD.xlsx
  - 최근7일_IRP_ETF순설정액_YYYYMMDD.xlsx
  - 최근3일_외국인순매수상위100_YYYYMMDD.xlsx
  - 최근5일_외국인순매수상위100_YYYYMMDD.xlsx
  - 최근7일_외국인순매수상위100_YYYYMMDD.xlsx
"""

import asyncio
import json
import re
import pandas as pd
from datetime import datetime, timedelta
from playwright.async_api import async_playwright


# ── 날짜 설정 (영업일 기준) ──────────────────────────────────────
def prev_biz_days(base, n):
    d = base
    count = 0
    while count < n:
        d -= timedelta(days=1)
        if d.weekday() < 5:
            count += 1
    return d


today = datetime.today()
while today.weekday() >= 5:
    today -= timedelta(days=1)

three_ago = prev_biz_days(today, 3)
five_ago  = prev_biz_days(today, 5)
week_ago  = prev_biz_days(today, 7)

today_str     = today.strftime("%Y%m%d")
three_ago_str = three_ago.strftime("%Y%m%d")
five_ago_str  = five_ago.strftime("%Y%m%d")
week_ago_str  = week_ago.strftime("%Y%m%d")
file_date     = today.strftime("%Y%m%d")

OUT_DIR     = "C:/work/market_radar"
PROFILE_DIR = f"{OUT_DIR}/browser_profile"


# ════════════════════════════════════════════════════════════════
# 공통 유틸
# ════════════════════════════════════════════════════════════════

async def fetch_json(page, bld, params_str):
    result = await page.evaluate(f"""
    async () => {{
        try {{
            const resp = await fetch('/comm/bldAttendant/getJsonData.cmd', {{
                method: 'POST',
                headers: {{
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'X-Requested-With': 'XMLHttpRequest',
                }},
                body: 'bld=dbms/MDC/STAT/standard/{bld}&locale=ko_KR&{params_str}'
            }});
            const text = await resp.text();
            const d = JSON.parse(text);
            return {{ rows: d.output ? d.output.length : 0, data: d.output || [], cols: d.output && d.output.length > 0 ? Object.keys(d.output[0]) : [] }};
        }} catch(e) {{
            return {{ error: e.toString(), rows: 0, data: [], cols: [] }};
        }}
    }}
    """)
    return result


async def goto_and_wait(page, menu_id, wait=8):
    await page.goto(
        f"https://data.krx.co.kr/contents/MDC/MDI/mdiLoader/index.cmd?menuId={menu_id}",
        timeout=30000, wait_until="networkidle"
    )
    await asyncio.sleep(wait)


def fmt_num(x, sign=False, decimals=1):
    if pd.isna(x):
        return "N/A"
    fmt = f"{{:{'+'if sign else ''},{'.'+str(decimals)+'f'}}}"
    return fmt.format(x)


def to_num(s):
    try:
        return float(str(s).replace(",", "").strip())
    except:
        return None


# ════════════════════════════════════════════════════════════════
# 1단계: 데이터 수집 (브라우저)
# ════════════════════════════════════════════════════════════════

async def collect_all():
    async with async_playwright() as p:
        context = await p.chromium.launch_persistent_context(
            PROFILE_DIR,
            headless=False,
            args=["--start-maximized"],
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            viewport={"width": 1280, "height": 900},
        )
        page = context.pages[0] if context.pages else await context.new_page()

        # ── 로그인 확인 ────────────────────────────────────────
        print("[1/4] KRX 세션 확인...")
        await page.goto("https://data.krx.co.kr/contents/MDC/MAIN/main/index.cmd",
                        timeout=30000, wait_until="networkidle")
        await asyncio.sleep(3)

        url = page.url
        if "COMS" in url or "nid.naver" in url or "login" in url.lower():
            print("  로그인 필요 - 브라우저에서 로그인해 주세요.")
            if "data.krx.co.kr" not in url or "nid.naver" in url:
                await page.goto(
                    "https://data.krx.co.kr/contents/MDC/COMS/client/MDCCOMS001.cmd",
                    timeout=30000, wait_until="networkidle"
                )
            for i in range(36):
                await asyncio.sleep(5)
                url = page.url
                if "data.krx.co.kr" in url and "COMS" not in url and "nid.naver" not in url:
                    print("  로그인 완료!")
                    break
                print(f"  대기 중... ({(i+1)*5}초)", flush=True)
        else:
            print("  세션 유지 - 자동 로그인")

        # ── ETF 데이터 수집 ──────────────────────────────────────
        print("[2/4] ETF 시세 수집...")
        await goto_and_wait(page, "MDC0201030101", wait=8)

        url = page.url
        if "COMS" in url or "nid.naver" in url:
            print("  세션 만료 - 브라우저에서 재로그인해 주세요...")
            for i in range(36):
                await asyncio.sleep(5)
                url = page.url
                if "data.krx.co.kr" in url and "COMS" not in url and "nid.naver" not in url:
                    print("  재로그인 완료!")
                    await goto_and_wait(page, "MDC0201030101", wait=8)
                    break
                print(f"  대기 중... ({(i+1)*5}초)", flush=True)

        r_etf_today = await fetch_json(page, "MDCSTAT04301",
            f"trdDd={today_str}&share=1&money=1&csvxls_isNo=false")
        r_etf_3ago  = await fetch_json(page, "MDCSTAT04301",
            f"trdDd={three_ago_str}&share=1&money=1&csvxls_isNo=false")
        r_etf_5ago  = await fetch_json(page, "MDCSTAT04301",
            f"trdDd={five_ago_str}&share=1&money=1&csvxls_isNo=false")
        r_etf_7ago  = await fetch_json(page, "MDCSTAT04301",
            f"trdDd={week_ago_str}&share=1&money=1&csvxls_isNo=false")
        r_etf_info  = await fetch_json(page, "MDCSTAT04601",
            f"trdDd={today_str}&share=1&money=1&csvxls_isNo=false")
        print(f"  오늘: {r_etf_today['rows']}건  |  "
              f"3일전: {r_etf_3ago['rows']}건  |  "
              f"5일전: {r_etf_5ago['rows']}건  |  "
              f"7일전: {r_etf_7ago['rows']}건  |  "
              f"기본정보: {r_etf_info['rows']}건")

        # ── 외국인 순매수 수집 ────────────────────────────────────
        print("[3/4] 외국인 순매수 수집...")

        stock_today_data = []
        stock_3ago_data  = []
        stock_5ago_data  = []
        stock_7ago_data  = []

        foreign_7d = []
        captured_foreign = []
        captured_req = {"bld": None, "params": None}

        async def capture_foreign_response(response):
            if "getJsonData.cmd" in response.url and response.status == 200:
                try:
                    body = await response.text()
                    d = json.loads(body)
                    rows = d.get("output") or []
                    if len(rows) > 20:
                        first = rows[0]
                        if any(k in first for k in ["ISU_SRT_CD", "ISU_ABBRV", "ISU_NM", "SHRT_ISU_CD"]):
                            captured_foreign.clear()
                            captured_foreign.extend(rows)
                except:
                    pass

        async def capture_foreign_request(request):
            if "getJsonData.cmd" in request.url and request.post_data:
                m = re.search(r'bld=([^&]+)', request.post_data)
                if m:
                    captured_req["bld"] = m.group(1)
                    captured_req["params"] = request.post_data

        page.on("response", capture_foreign_response)
        page.on("request", capture_foreign_request)
        await goto_and_wait(page, "MDC0201020303", wait=6)

        if captured_foreign:
            foreign_7d = captured_foreign[:]
        else:
            print("  초기 로드 실패 - UI 조작으로 재시도...")
            try:
                for sel_name, val in [("strtDd", week_ago_str), ("endDd", today_str)]:
                    inp = await page.query_selector(f'input[name="{sel_name}"]')
                    if inp:
                        await inp.triple_click()
                        await inp.type(val)

                selects = await page.query_selector_all("select")
                for sel in selects:
                    options = await sel.query_selector_all("option")
                    for opt in options:
                        text = await opt.inner_text()
                        if "외국인" in text:
                            value = await opt.get_attribute("value")
                            await sel.select_option(value=value)
                            break

                btn = await page.query_selector(
                    'button.btn_inquiry, button.btn_inquire, button:has-text("조회"), input[value="조회"]'
                )
                if btn:
                    await btn.click()
                    await asyncio.sleep(6)
                else:
                    await page.keyboard.press("Enter")
                    await asyncio.sleep(6)
            except Exception as e:
                print(f"  UI 조작 오류: {e}")

            if captured_foreign:
                foreign_7d = captured_foreign[:]
            else:
                print("  [경고] 외국인 순매수 7일 데이터를 수집하지 못했습니다.")

        page.remove_listener("response", capture_foreign_response)
        page.remove_listener("request", capture_foreign_request)

        foreign_3d = []
        foreign_5d = []

        if captured_req["bld"] and captured_req["params"]:
            bld_suffix  = captured_req["bld"].replace("dbms/MDC/STAT/standard/", "")
            raw_params  = re.sub(r'bld=[^&]+&?', '', captured_req["params"])
            raw_params  = re.sub(r'locale=[^&]+&?', '', raw_params)
            base_params = raw_params.strip('&')

            for label, start_d, target in [("3일", three_ago_str, None), ("5일", five_ago_str, None)]:
                params = re.sub(r'strtDd=\d{8}', f'strtDd={start_d}', base_params)
                params = re.sub(r'endDd=\d{8}', f'endDd={today_str}', params)
                r = await fetch_json(page, bld_suffix, params)
                if label == "3일":
                    foreign_3d = r.get("data", [])
                else:
                    foreign_5d = r.get("data", [])

        print(f"  7일: {len(foreign_7d)}건  |  3일: {len(foreign_3d)}건  |  5일: {len(foreign_5d)}건")

        # ── 주식 종가 수집 ────────────────────────────────────────
        print("[4/4] 주식 종가 수집...")

        captured_stock = []
        captured_stock_req = {"bld": None, "params": None}
        last_req = {"bld": None, "params": None}

        async def capture_stock_response(response):
            if "getJsonData.cmd" in response.url and response.status == 200:
                try:
                    body = await response.text()
                    d = json.loads(body)
                    rows = d.get("output") or []
                    first = rows[0] if rows else {}
                    if len(rows) > 500 and any(k in first for k in ["TDD_CLSPRC", "CLSPRC"]):
                        captured_stock.clear()
                        captured_stock.extend(rows)
                        captured_stock_req["bld"]    = last_req["bld"]
                        captured_stock_req["params"] = last_req["params"]
                except:
                    pass

        async def capture_stock_request(request):
            if "getJsonData.cmd" in request.url and request.post_data:
                m = re.search(r'bld=([^&]+)', request.post_data)
                if m:
                    last_req["bld"]    = m.group(1)
                    last_req["params"] = request.post_data

        page.on("response", capture_stock_response)
        page.on("request", capture_stock_request)
        await goto_and_wait(page, "MDC0201020105", wait=6)
        page.remove_listener("response", capture_stock_response)
        page.remove_listener("request", capture_stock_request)

        if captured_stock and captured_stock_req["bld"]:
            stock_today_data = captured_stock[:]
            bld_s  = captured_stock_req["bld"].replace("dbms/MDC/STAT/standard/", "")
            raw_p  = re.sub(r'bld=[^&]+&?', '', captured_stock_req["params"])
            raw_p  = re.sub(r'locale=[^&]+&?', '', raw_p)
            base_p = raw_p.strip('&')

            for label, prev_str, target in [
                ("3일전", three_ago_str, stock_3ago_data),
                ("5일전", five_ago_str,  stock_5ago_data),
                ("7일전", week_ago_str,  stock_7ago_data),
            ]:
                p = re.sub(r'trdDd=\d{8}', f'trdDd={prev_str}', base_p)
                r = await fetch_json(page, bld_s, p)
                target.extend(r.get("data", []))

            print(f"  오늘: {len(stock_today_data)}건  |  "
                  f"3일전: {len(stock_3ago_data)}건  |  "
                  f"5일전: {len(stock_5ago_data)}건  |  "
                  f"7일전: {len(stock_7ago_data)}건")
        else:
            print("  [경고] 주식 종가 수집 실패 - 수익률은 N/A로 표시됩니다.")

        # ── 원본 저장 ────────────────────────────────────────────
        raw = {
            "etf_today":   r_etf_today.get("data", []),
            "etf_3ago":    r_etf_3ago.get("data", []),
            "etf_5ago":    r_etf_5ago.get("data", []),
            "etf_7ago":    r_etf_7ago.get("data", []),
            "etf_info":    r_etf_info.get("data", []),
            "stock_today": stock_today_data,
            "stock_3ago":  stock_3ago_data,
            "stock_5ago":  stock_5ago_data,
            "stock_7ago":  stock_7ago_data,
            "foreign_3d":  foreign_3d,
            "foreign_5d":  foreign_5d,
            "foreign_7d":  foreign_7d,
        }
        json_path = f"{OUT_DIR}/krx_raw_{file_date}.json"
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(raw, f, ensure_ascii=False)
        print(f"원본 저장: {json_path}")

        await asyncio.sleep(3)
        await context.close()
        return raw


# ════════════════════════════════════════════════════════════════
# 2단계: ETF IRP 분석
# ════════════════════════════════════════════════════════════════

EXCLUDE_KW = [
    "레버리지", "인버스", "2X", "2배",
    "골드선물", "원유선물", "달러선물", "금선물", "은선물",
    "구리선물", "천연가스선물", "옥수수선물", "대두선물", "밀선물",
    "WTI", "선물레버리지", "선물인버스",
]


def classify_etf_theme(row):
    name  = str(row.get("ETF명", ""))
    asset = str(row.get("자산분류", ""))
    if asset in ["채권", "혼합채권"]:
        return "채권"
    if asset in ["해외주식", "해외혼합"]:
        return "해외주식"
    if asset in ["국내주식", "국내혼합"]:
        if any(k in name for k in ["배당", "고배당", "리츠", "REIT"]):
            return "배당/리츠"
        if any(k in name for k in ["코스피", "KOSPI", "코스닥", "KOSDAQ", "KRX", "200", "100", "300"]):
            return "국내지수"
        if any(k in name for k in ["2차전지", "배터리", "반도체", "바이오", "헬스", "AI", "로봇", "IT", "수소", "전기차"]):
            return "테마/섹터"
        return "국내섹터"
    if asset in ["원자재", "기타"]:
        return "원자재/기타"
    if any(k in name for k in ["국채", "회사채", "채권", "CD금리", "단기채", "장기채", "KOFR"]):
        return "채권"
    if any(k in name for k in ["S&P", "나스닥", "미국", "해외", "글로벌", "선진국", "신흥국"]):
        return "해외주식"
    if any(k in name for k in ["코스피", "KOSPI", "코스닥", "KOSDAQ", "KRX"]):
        return "국내지수"
    if any(k in name for k in ["배당", "리츠", "REIT"]):
        return "배당/리츠"
    return "기타"


def process_etf(raw, prev_key, period_label, start_str):
    today_rows = raw.get("etf_today", [])
    prev_rows  = raw.get(prev_key, [])
    info_rows  = raw.get("etf_info", [])

    if not today_rows:
        print(f"  [경고] ETF 오늘 데이터 없음")
        return None
    if not prev_rows:
        print(f"  [경고] ETF {period_label}전 데이터 없음")
        return None

    df_t = pd.DataFrame(today_rows)[
        ["ISU_SRT_CD", "ISU_ABBRV", "LIST_SHRS", "NAV",
         "MKTCAP", "INVSTASST_NETASST_TOTAMT"]
    ].copy()
    df_t.columns = ["종목코드", "ETF명", "오늘상장주수_r", "오늘NAV_r", "시가총액_r", "순자산_r"]

    df_p = pd.DataFrame(prev_rows)[["ISU_SRT_CD", "LIST_SHRS", "NAV"]].copy()
    df_p.columns = ["종목코드", "이전상장주수_r", "이전NAV_r"]

    df_i = pd.DataFrame(info_rows)[
        ["ISU_SRT_CD", "ISU_NM", "IDX_ASST_CLSS_NM", "COM_ABBRV"]
    ].copy()
    df_i.columns = ["종목코드", "정식명", "자산분류", "운용사"]

    df = df_t.merge(df_p, on="종목코드", how="left").merge(df_i, on="종목코드", how="left")

    for col, raw_col in [("오늘상장주수", "오늘상장주수_r"), ("오늘NAV", "오늘NAV_r"),
                          ("이전상장주수", "이전상장주수_r"), ("이전NAV", "이전NAV_r")]:
        df[col] = df[raw_col].apply(to_num)

    df["오늘순자산_억"] = df.apply(
        lambda r: round(r["오늘상장주수"] * r["오늘NAV"] / 1e8, 1)
        if pd.notna(r["오늘상장주수"]) and pd.notna(r["오늘NAV"]) else None, axis=1)
    df["이전순자산_억"] = df.apply(
        lambda r: round(r["이전상장주수"] * r["이전NAV"] / 1e8, 1)
        if pd.notna(r["이전상장주수"]) and pd.notna(r["이전NAV"]) else None, axis=1)

    df["순자산변화_가격포함"] = df.apply(
        lambda r: round(r["오늘순자산_억"] - r["이전순자산_억"], 1)
        if pd.notna(r["오늘순자산_억"]) and pd.notna(r["이전순자산_억"]) else None, axis=1)
    df["순자산변화_가격제외"] = df.apply(
        lambda r: round((r["오늘상장주수"] - r["이전상장주수"]) * r["이전NAV"] / 1e8, 1)
        if pd.notna(r["오늘상장주수"]) and pd.notna(r["이전상장주수"]) and pd.notna(r["이전NAV"]) else None, axis=1)
    df["가격효과"] = df.apply(
        lambda r: round(r["순자산변화_가격포함"] - r["순자산변화_가격제외"], 1)
        if pd.notna(r["순자산변화_가격포함"]) and pd.notna(r["순자산변화_가격제외"]) else None, axis=1)

    df["수익률"] = df.apply(
        lambda r: round((r["오늘NAV"] - r["이전NAV"]) / r["이전NAV"] * 100, 2)
        if pd.notna(r["오늘NAV"]) and pd.notna(r["이전NAV"]) and r["이전NAV"] != 0 else None, axis=1)

    df["IRP가능"] = df["ETF명"].apply(lambda n: not any(kw in str(n) for kw in EXCLUDE_KW))
    df = df[df["IRP가능"]].copy()

    df = df.sort_values("순자산변화_가격제외", ascending=False, na_position="last").reset_index(drop=True)
    df.insert(0, "순위", range(1, len(df) + 1))
    df["테마"] = df.apply(classify_etf_theme, axis=1)

    df["수익률(%)"]                  = df["수익률"].apply(lambda x: fmt_num(x, sign=True, decimals=2))
    df["순자산변화_가격제외(억원)"]  = df["순자산변화_가격제외"].apply(lambda x: fmt_num(x, sign=True))
    df["순자산변화_가격포함(억원)"]  = df["순자산변화_가격포함"].apply(lambda x: fmt_num(x, sign=True))
    df["가격효과(억원)"]             = df["가격효과"].apply(lambda x: fmt_num(x, sign=True))
    df["오늘순자산총액(억원)"]       = df["오늘순자산_억"].apply(lambda x: fmt_num(x, sign=False, decimals=0))
    df[f"{period_label}전순자산총액(억원)"] = df["이전순자산_억"].apply(lambda x: fmt_num(x, sign=False, decimals=0))
    df["상장주수변화(주)"] = df.apply(
        lambda r: f"{int(r['오늘상장주수'] - r['이전상장주수']):+,}"
        if pd.notna(r["오늘상장주수"]) and pd.notna(r["이전상장주수"]) else "N/A", axis=1)

    return df[[
        "순위", "ETF명", "종목코드", "테마", "운용사",
        "수익률(%)",
        "순자산변화_가격제외(억원)",
        "순자산변화_가격포함(억원)",
        "가격효과(억원)",
        "오늘순자산총액(억원)",
        f"{period_label}전순자산총액(억원)",
        "상장주수변화(주)",
    ]]


# ════════════════════════════════════════════════════════════════
# 3단계: 외국인 순매수 분석
# ════════════════════════════════════════════════════════════════

def build_price_map(stock_rows):
    price_map = {}
    for row in stock_rows:
        code = (row.get("ISU_SRT_CD") or row.get("SHRT_ISU_CD")
                or row.get("SRT_CD") or row.get("ISU_CD", "")[:6])
        price = (row.get("TDD_CLSPRC") or row.get("CLSPRC")
                 or row.get("CMPPREVDD_PRC") or row.get("ACC_TRDVAL"))
        if code and price:
            v = to_num(price)
            if v and v > 0:
                price_map[str(code).strip()] = v
    return price_map


def process_foreign(raw, data_key, stock_prev_key):
    rows = raw.get(data_key, [])
    if not rows:
        print(f"  [경고] 외국인 순매수 데이터 없음 ({data_key})")
        return None

    df = pd.DataFrame(rows)

    net_val_col = next((c for c in df.columns if any(k in c.upper() for k in
        ["NETBID_TRDVAL", "NET_TRDVAL", "NETASST", "순매수금액", "NET_VAL", "NETBIDTRDVAL"])), None)
    net_vol_col = next((c for c in df.columns if any(k in c.upper() for k in
        ["NETBID_TRDVOL", "NET_TRDVOL", "순매수수량", "NETBIDTRDVOL"])), None)
    code_col  = next((c for c in df.columns if any(k in c.upper() for k in
        ["ISU_SRT_CD", "ISUCD", "SRT_CD", "종목코드"])), None)
    name_col  = next((c for c in df.columns if any(k in c.upper() for k in
        ["ISU_ABBRV", "ISUABBRV", "ISU_NM", "종목명"])), None)
    price_col = next((c for c in df.columns if any(k in c.upper() for k in
        ["TDD_CLSPRC", "CLSPRC", "현재가"])), None)
    fluc_col  = next((c for c in df.columns if any(k in c.upper() for k in
        ["FLUC_RT", "등락률"])), None)

    if not net_val_col:
        print(f"  [경고] 순매수금액 컬럼 미발견 - 컬럼 목록: {list(df.columns)}")
        return None

    df["순매수금액_num"] = df[net_val_col].apply(to_num)
    df = df.sort_values("순매수금액_num", ascending=False, na_position="last").reset_index(drop=True)
    df.insert(0, "순위", range(1, len(df) + 1))
    df_top = df.head(100).copy()

    rename = {}
    if code_col:    rename[code_col]    = "종목코드"
    if name_col:    rename[name_col]    = "종목명"
    if net_val_col: rename[net_val_col] = "외국인순매수금액(원)"
    if net_vol_col: rename[net_vol_col] = "외국인순매수수량(주)"
    if price_col:   rename[price_col]   = "현재가"
    if fluc_col:    rename[fluc_col]    = "등락률(%)"
    df_top = df_top.rename(columns=rename)

    today_prices = build_price_map(raw.get("stock_today", []))
    prev_prices  = build_price_map(raw.get(stock_prev_key, []))

    if today_prices and prev_prices and "종목코드" in df_top.columns:
        def calc_return(code):
            p_today = today_prices.get(code)
            p_prev  = prev_prices.get(code)
            if p_today and p_prev and p_prev != 0:
                return round((p_today - p_prev) / p_prev * 100, 2)
            return None

        df_top["수익률(%)"] = df_top["종목코드"].apply(calc_return)
        df_top["수익률(%)"] = df_top["수익률(%)"].apply(
            lambda x: fmt_num(x, sign=True, decimals=2) if pd.notna(x) else "N/A"
        )
    else:
        df_top["수익률(%)"] = "N/A"

    out_cols = ["순위"]
    for c in ["종목코드", "종목명", "수익률(%)", "외국인순매수금액(원)",
              "외국인순매수수량(주)", "현재가", "등락률(%)"]:
        if c in df_top.columns:
            out_cols.append(c)

    return df_top[out_cols]


# ════════════════════════════════════════════════════════════════
# 4단계: Excel 저장
# ════════════════════════════════════════════════════════════════

def save_excel(df, path, sheet_name, title_rows=None):
    try:
        with pd.ExcelWriter(path, engine="openpyxl") as writer:
            start_row = len(title_rows) if title_rows else 0
            df.to_excel(writer, sheet_name=sheet_name, index=False, startrow=start_row)

            ws = writer.sheets[sheet_name]

            if title_rows:
                for i, text in enumerate(title_rows):
                    ws.cell(row=i+1, column=1, value=text)

            for col in ws.columns:
                max_len = max((len(str(cell.value or "")) for cell in col), default=0)
                ws.column_dimensions[col[0].column_letter].width = min(max_len + 2, 40)

        print(f"  저장: {path}")
    except Exception as e:
        csv_path = path.replace(".xlsx", ".csv")
        df.to_csv(csv_path, index=False, encoding="utf-8-sig")
        print(f"  Excel 저장 실패({e}) → CSV: {csv_path}")


# ════════════════════════════════════════════════════════════════
# 실행
# ════════════════════════════════════════════════════════════════

print("=" * 60)
print(f"최근N일 시장 데이터 생성  |  기준일: {today_str}")
print(f"조회 기간: 3일({three_ago_str}~)  5일({five_ago_str}~)  7일({week_ago_str}~)")
print("=" * 60)

raw = asyncio.run(collect_all())

print("\n데이터 처리 및 저장...")

PERIODS = [
    ("3일", "etf_3ago", "foreign_3d", "stock_3ago", three_ago_str),
    ("5일", "etf_5ago", "foreign_5d", "stock_5ago", five_ago_str),
    ("7일", "etf_7ago", "foreign_7d", "stock_7ago", week_ago_str),
]

for period_label, etf_key, foreign_key, stock_prev_key, start_str in PERIODS:
    print(f"\n{'─'*55}")
    print(f"  최근{period_label}  ({start_str} ~ {today_str})")
    print(f"{'─'*55}")

    # ETF IRP
    df_etf = process_etf(raw, etf_key, period_label, start_str)
    if df_etf is not None:
        etf_path = f"{OUT_DIR}/최근{period_label}_IRP_ETF순설정액_{file_date}.xlsx"
        save_excel(df_etf, etf_path, "ETF순설정액",
            title_rows=[
                f"IRP 투자가능 ETF 최근{period_label} 순설정액 순위  |  기준일: {start_str} ~ {today_str}",
                "정렬기준: 순자산변화_가격제외(억원) = Δ상장주수 × 이전NAV  (주가효과 제거한 순수 자금유입)",
            ])

        tmp = df_etf.copy()
        tmp["_val"] = tmp["순자산변화_가격제외(억원)"].apply(
            lambda x: float(str(x).replace("+", "").replace(",", "")) if x != "N/A" else None
        )
        theme_sum = tmp.groupby("테마")["_val"].sum().sort_values(ascending=False)
        print(f"  ETF IRP ({len(df_etf)}개) 테마별 순설정액:")
        for theme, total in theme_sum.items():
            if pd.notna(total):
                sign = "+" if total >= 0 else ""
                bar  = "█" * max(0, int(abs(total) / 300))
                print(f"    {theme:<12} {sign}{total:>8,.0f}억  {bar}")

    # 외국인 순매수
    df_foreign = process_foreign(raw, foreign_key, stock_prev_key)
    if df_foreign is not None and len(df_foreign) > 0:
        foreign_path = f"{OUT_DIR}/최근{period_label}_외국인순매수상위100_{file_date}.xlsx"
        save_excel(df_foreign, foreign_path, "외국인순매수",
            title_rows=[
                f"외국인 최근{period_label} 순매수 상위 100 종목  |  기준일: {start_str} ~ {today_str}",
                "정렬기준: 외국인 순매수금액(원) 내림차순",
            ])
        print(f"  외국인 순매수 ({len(df_foreign)}개)")
    else:
        print(f"  [경고] 외국인 순매수 데이터({period_label})를 수집하지 못했습니다.")

print("\n완료!")
