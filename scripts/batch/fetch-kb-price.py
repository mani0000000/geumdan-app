#!/usr/bin/env python3
"""
fetch-kb-price.py
KB부동산 아파트 매매가격지수 → Supabase apt_price_index 저장 스크립트

== 사전 준비 ==
  pip install PublicDataReader requests

== 사용법 ==
  SUPABASE_URL=https://xxx.supabase.co \
  SUPABASE_SERVICE_KEY=sb_secret_... \
    python scripts/batch/fetch-kb-price.py [--months=15]

== Supabase 테이블 생성 SQL (최초 1회) ==
  CREATE TABLE IF NOT EXISTS apt_price_index (
    id          BIGSERIAL PRIMARY KEY,
    source      TEXT NOT NULL,           -- 'kb' | 'reb'
    region      TEXT NOT NULL,           -- '인천시 서구' 등
    period      TEXT NOT NULL,           -- YYYYMM
    index_value FLOAT,
    change_rate FLOAT,
    trade_count INT,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (source, region, period)
  );
"""

import os
import sys
import datetime
import json

import requests

# ── 환경변수 ──────────────────────────────────────────────────────
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌  환경변수 SUPABASE_URL, SUPABASE_SERVICE_KEY 를 설정하세요.")
    sys.exit(1)

# ── 파라미터 파싱 ─────────────────────────────────────────────────
args = sys.argv[1:]
months_arg = next((a for a in args if a.startswith("--months=")), "--months=15")
MONTHS = min(24, int(months_arg.split("=")[1]))


# ── Supabase 유틸 ─────────────────────────────────────────────────
def upsert_rows(table: str, rows: list) -> bool:
    """Supabase REST API로 upsert (on conflict: source + region + period)"""
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=minimal",
    }
    res = requests.post(url, headers=headers, data=json.dumps(rows), timeout=30)
    if res.status_code not in (200, 201):
        print(f"  ❌  upsert 실패 ({res.status_code}): {res.text[:300]}")
        return False
    return True


# ── 조회 기간 생성 ────────────────────────────────────────────────
def get_months(n: int) -> list:
    """최근 n개월 YYYYMM 리스트 (과거→최근 순)"""
    today = datetime.date.today().replace(day=1)
    result = []
    for i in range(n, 0, -1):
        m = today.month - i
        y = today.year
        while m <= 0:
            m += 12
            y -= 1
        result.append(f"{y}{m:02d}")
    return result


# ── PublicDataReader Kbland ───────────────────────────────────────
def collect_kb(months: list) -> list:
    """
    PublicDataReader의 Kbland 클래스로 KB 아파트 매매가격지수 조회.
    인천 서구(sigungu_code=28260) 우선, 없으면 인천광역시(28) fallback.
    """
    try:
        from PublicDataReader import Kbland  # type: ignore
    except ImportError:
        print("❌  PublicDataReader 미설치. pip install PublicDataReader 실행하세요.")
        sys.exit(1)

    kb = Kbland()
    rows = []
    start = months[0]
    end   = months[-1]

    print(f"  KB 조회: {start} ~ {end} (인천 서구 → 인천광역시 fallback)")

    for region_code, region_name in [("28260", "인천시 서구"), ("28", "인천광역시")]:
        try:
            df = kb.get_price_index(
                property_type="아파트",
                trade_type="매매",
                sigungu_code=region_code,
                start_date=start,
                end_date=end,
            )
        except Exception as e:
            print(f"  ⚠️  KB API 오류 ({region_name}): {e}")
            df = None

        if df is None or df.empty:
            print(f"  ⚠️  {region_name} 데이터 없음")
            continue

        print(f"  ✅ {region_name}: {len(df)}개 레코드")

        for _, row in df.iterrows():
            # 컬럼명은 PublicDataReader 버전에 따라 다를 수 있음
            period_val = str(row.get("기간", row.get("yearMonth", ""))).replace("-", "")[:6]
            if not period_val:
                continue
            idx  = float(row.get("지수",   row.get("index",      0) or 0))
            rate = float(row.get("변동률", row.get("changeRate", 0) or 0))
            rows.append({
                "source":       "kb",
                "region":       region_name,
                "period":       period_val,
                "index_value":  idx,
                "change_rate":  rate,
                "trade_count":  None,
            })

        # 서구 데이터를 얻었으면 광역시 조회는 생략
        if rows:
            break

    return rows


# ── 한국부동산원(REB) 주간 동향 (선택적 보완) ─────────────────────
def collect_reb_via_api(months: list, api_key: str) -> list:
    """
    공공데이터포털 B552555 한국부동산원 주간 아파트 동향 API.
    API_KEY 가 있을 때만 실행; 없으면 빈 리스트 반환.
    (주: 실패해도 스크립트는 계속 진행)
    """
    if not api_key:
        return []

    base = "https://apis.data.go.kr/B552555/weekMKTSttus/getWeekMKTSttus"
    rows = []

    # 월 → 대략적인 주차 변환 (월 초 기준)
    for yyyymm in months:
        y, m = int(yyyymm[:4]), int(yyyymm[4:])
        jan1 = datetime.date(y, 1, 1)
        first_day = datetime.date(y, m, 1)
        week_no = (first_day - jan1).days // 7 + 1
        week = f"{y}{week_no:02d}"

        params = {
            "serviceKey": api_key,
            "LAWD_CD": "28260",
            "START_WEEK": week,
            "END_WEEK": week,
            "pageNo": "1",
            "numOfRows": "20",
            "_type": "json",
        }
        try:
            res = requests.get(base, params=params, timeout=10)
            if not res.ok:
                continue
            items_raw = res.json().get("response", {}).get("body", {}).get("items", {}).get("item", [])
            if not items_raw:
                continue
            if not isinstance(items_raw, list):
                items_raw = [items_raw]

            # 인천 서구 행 탐색
            row = next(
                (it for it in items_raw if "28260" in str(it.get("지역코드", "")) or "서구" in str(it.get("지역명", ""))),
                items_raw[0] if items_raw else None,
            )
            if not row:
                continue

            change_rate = float(str(row.get("매매변동률", row.get("변동률", 0))).replace(",", "") or 0)
            rows.append({
                "source":       "reb",
                "region":       "인천시 서구",
                "period":       yyyymm,
                "index_value":  None,
                "change_rate":  change_rate,
                "trade_count":  None,
            })
            print(f"  ✅ REB {yyyymm}: 변동률 {change_rate:+.2f}%")
        except Exception as e:
            print(f"  ⚠️  REB {yyyymm}: {e}")

    return rows


# ── 메인 ─────────────────────────────────────────────────────────
def main():
    print(f"\n📊 KB·REB 아파트 가격지수 수집 시작 (최근 {MONTHS}개월)\n")

    months = get_months(MONTHS)
    print(f"📅 기간: {months[0]} ~ {months[-1]}\n")

    all_rows: list = []

    # 1. KB 지수
    print("── KB부동산 지수 ──────────────────────────")
    kb_rows = collect_kb(months)
    all_rows.extend(kb_rows)
    print(f"  KB 수집: {len(kb_rows)}건\n")

    # 2. 한국부동산원 주간 (선택적)
    api_key = os.environ.get("DATA_GO_KR_API_KEY", "")
    if api_key:
        print("── 한국부동산원(REB) 주간 동향 ────────────")
        reb_rows = collect_reb_via_api(months, api_key)
        all_rows.extend(reb_rows)
        print(f"  REB 수집: {len(reb_rows)}건\n")
    else:
        print("ℹ️  DATA_GO_KR_API_KEY 미설정 → REB 주간 동향 생략\n")

    if not all_rows:
        print("⚠️  저장할 데이터가 없습니다.")
        sys.exit(0)

    # 3. Supabase 저장
    print(f"📥 총 {len(all_rows)}건 → Supabase apt_price_index 저장...")
    if upsert_rows("apt_price_index", all_rows):
        print(f"✅  완료: {len(all_rows)}건 저장")
    else:
        sys.exit(1)


if __name__ == "__main__":
    main()
