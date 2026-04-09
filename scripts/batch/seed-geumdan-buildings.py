#!/usr/bin/env python3
"""
검단신도시 상가건물 + 매장 데이터 종합 수집 스크립트
- 카카오 Local API로 검단신도시 전체 상가 건물 ~40개 발견
- 각 건물별 반경 100m 내 카테고리 검색으로 실제 매장 데이터 수집
- Supabase REST API로 upsert
"""

import json
import math
import os
import re
import subprocess
import sys
import time
KAKAO_KEY    = os.environ.get("KAKAO_REST_API_KEY", "")
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://plwpfnbhyzblgvliiole.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")  # service key — bypasses RLS

if not KAKAO_KEY or not SUPABASE_KEY:
    print("❌ 환경변수 필요: KAKAO_REST_API_KEY, SUPABASE_SERVICE_KEY")
    sys.exit(1)

# ──────────────────────────────────────────────────────────────
# 검단신도시 상가건물 목록 (카카오 검색 + 수동 보완)
# ──────────────────────────────────────────────────────────────
BUILDINGS = [
    # ── 기존 8개 (업데이트) ──
    {"id": "b_jk",      "name": "JK타워",              "lat": 37.588837, "lng": 126.708064, "address": "인천 서구 이음3로 145"},
    {"id": "b_metro2",  "name": "메트로시티2차",         "lat": 37.603099, "lng": 126.698941, "address": "인천 서구 고산후로 216"},
    {"id": "b_aplus",   "name": "A플러스타워",           "lat": 37.594991, "lng": 126.716541, "address": "인천 서구 이음1로 389"},
    {"id": "b_syace2",  "name": "서영아너시티2차",       "lat": 37.595100, "lng": 126.716045, "address": "인천 서구 이음5로 76"},
    {"id": "b_sung",    "name": "성산프라자",            "lat": 37.589665, "lng": 126.707698, "address": "인천 서구 서로3로 112"},
    {"id": "b_covent",  "name": "코벤트워크검단1차",     "lat": 37.591243, "lng": 126.708202, "address": "인천 서구 원당대로 966"},
    {"id": "b_sinahn",  "name": "신안실크밸리상가",      "lat": 37.592346, "lng": 126.692216, "address": "인천 서구 신안로"},
    {"id": "b_daseung", "name": "다승프라자1차",         "lat": 37.594433, "lng": 126.715787, "address": "인천 서구 바리미로5번길 16"},
    # ── 새로 발견된 건물들 ──
    {"id": "b_syace3p", "name": "서영아너시티3차플러스", "lat": 37.593556, "lng": 126.712671, "address": "인천 서구 이음대로 384"},
    {"id": "b_abm",     "name": "ABM타워",               "lat": 37.593056, "lng": 126.712656, "address": "인천 서구 이음대로 388"},
    {"id": "b_daseung2","name": "다승프라자2차",         "lat": 37.594232, "lng": 126.715395, "address": "인천 서구 바리미로5번길 12"},
    {"id": "b_sejoong", "name": "검단세중시그니쳐",      "lat": 37.594652, "lng": 126.716828, "address": "인천 서구 이음1로 383"},
    {"id": "b_kumho",   "name": "금호헤리티지7",         "lat": 37.593963, "lng": 126.716706, "address": "인천 서구 원당대로 1045"},
    {"id": "b_jungseok","name": "정석프라자",            "lat": 37.592990, "lng": 126.712024, "address": "인천 서구 발산로 41"},
    {"id": "b_js2",     "name": "JS프라자2",             "lat": 37.609578, "lng": 126.698037, "address": "인천 서구 동화시로 112"},
    {"id": "b_sunwoo",  "name": "선우프라자",            "lat": 37.592935, "lng": 126.711116, "address": "인천 서구 발산로 27"},
    {"id": "b_onetower","name": "더원타워",              "lat": 37.593886, "lng": 126.711882, "address": "인천 서구 이음5로 36"},
    {"id": "b_sejoong2","name": "세중시그니쳐2차",       "lat": 37.593321, "lng": 126.710554, "address": "인천 서구 발산로5번길 8"},
    {"id": "b_jeongin", "name": "검단정인프라자",        "lat": 37.594512, "lng": 126.714870, "address": "인천 서구 이음5로 62"},
    {"id": "b_geo",     "name": "지오프라자",            "lat": 37.594335, "lng": 126.716308, "address": "인천 서구 바리미로 31"},
    {"id": "b_metro1",  "name": "메트로시티",            "lat": 37.592592, "lng": 126.712757, "address": "인천 서구 이음대로 392"},
    {"id": "b_daon2",   "name": "다온프라자2",           "lat": 37.592899, "lng": 126.710650, "address": "인천 서구 발산로 23"},
    {"id": "b_arco",    "name": "아르코",                "lat": 37.597349, "lng": 126.707898, "address": "인천 서구 서로3로 198"},
    {"id": "b_hh3",     "name": "현해타워3차",           "lat": 37.608760, "lng": 126.698280, "address": "인천 서구 고산후로 279"},
    {"id": "b_dike",    "name": "디케프라자",            "lat": 37.589190, "lng": 126.708957, "address": "인천 서구 매밭로90번길 26"},
    {"id": "b_saesaem", "name": "새샘프라자",            "lat": 37.594783, "lng": 126.715514, "address": "인천 서구 이음5로 70"},
    {"id": "b_yonsei8", "name": "연세프라자8차",         "lat": 37.593714, "lng": 126.709922, "address": "인천 서구 이음5로 20"},
    {"id": "b_mega",    "name": "메가타워",              "lat": 37.592861, "lng": 126.710245, "address": "인천 서구 발산로 17"},
    {"id": "b_golden",  "name": "골든스퀘어",            "lat": 37.594057, "lng": 126.715024, "address": "인천 서구 바리미로5번길 8"},
    {"id": "b_jeil",    "name": "제일프라자",            "lat": 37.593855, "lng": 126.711468, "address": "인천 서구 이음5로 34"},
    {"id": "b_angel",   "name": "엔젤리움윈팰리스",      "lat": 37.593398, "lng": 126.710858, "address": "인천 서구 발산로5번길 12"},
    {"id": "b_yonsei9", "name": "연세프라자9차",         "lat": 37.593775, "lng": 126.710938, "address": "인천 서구 이음5로 30"},
    {"id": "b_syace1",  "name": "서영아너시티1차",       "lat": 37.594655, "lng": 126.715122, "address": "인천 서구 이음5로 66"},
    {"id": "b_first",   "name": "검단퍼스트",            "lat": 37.595263, "lng": 126.716350, "address": "인천 서구 이음5로 80"},
    {"id": "b_keumgang","name": "금강프라자",            "lat": 37.585263, "lng": 126.713127, "address": "인천 서구 이음대로 475"},
    {"id": "b_hh1",     "name": "현해타워1차",           "lat": 37.609465, "lng": 126.697524, "address": "인천 서구 동화시로 106"},
    {"id": "b_cs_med",  "name": "CS메디컬프라자",        "lat": 37.584893, "lng": 126.712857, "address": "인천 서구 이음대로 479"},
    {"id": "b_solbo",   "name": "솔보프라자",            "lat": 37.593985, "lng": 126.715629, "address": "인천 서구 바리미로 23"},
    {"id": "b_shinhwa", "name": "신화프라자",            "lat": 37.588809, "lng": 126.707673, "address": "인천 서구 서로3로 104"},
    {"id": "b_central", "name": "검단센트럴시티",        "lat": 37.586257, "lng": 126.714075, "address": "인천 서구 이음대로 463"},
    {"id": "b_seoyeon", "name": "서연프라자",            "lat": 37.601412, "lng": 126.714224, "address": "인천 서구 서로4로 94"},
    {"id": "b_winner",  "name": "위너스프라자",          "lat": 37.588874, "lng": 126.708415, "address": "인천 서구 이음3로 149"},
    {"id": "b_joy",     "name": "조이프라자",            "lat": 37.589156, "lng": 126.707627, "address": "인천 서구 서로3로 106"},
    {"id": "b_hh2",     "name": "현해타워2차",           "lat": 37.609247, "lng": 126.698273, "address": "인천 서구 고산후로 285"},
]

CATEGORY_MAP = {
    "CE7": "카페",
    "FD6": "음식점",
    "CS2": "편의점",
    "MT1": "마트",
    "HP8": "병원/약국",
    "PM9": "병원/약국",
    "BK9": "기타",
    "CT1": "기타",
    "AG2": "기타",
    "SW8": "기타",
    "AT4": "기타",
    "OL7": "기타",
}

SEARCH_CATEGORIES = ["FD6", "CE7", "CS2", "HP8", "PM9"]
SEARCH_KEYWORDS   = ["미용실", "헤어샵", "학원", "교습소", "네일", "안경", "세탁"]


def kakao_get(url):
    result = subprocess.run(
        ["curl", "-s", "--connect-timeout", "10", "-H",
         f"Authorization: KakaoAK {KAKAO_KEY}", url],
        capture_output=True, text=True
    )
    if result.returncode != 0:
        raise RuntimeError(f"curl failed: {result.stderr}")
    return json.loads(result.stdout)


def category_search(cat_code, x, y, radius=120):
    url = (
        f"https://dapi.kakao.com/v2/local/search/category.json"
        f"?category_group_code={cat_code}&x={x}&y={y}"
        f"&radius={radius}&size=15&sort=distance"
    )
    try:
        return kakao_get(url).get("documents", [])
    except Exception as e:
        print(f"    ⚠️  category {cat_code}: {e}")
        return []


def keyword_search(query, x, y, radius=120):
    import urllib.parse
    q = urllib.parse.quote(query)
    url = (
        f"https://dapi.kakao.com/v2/local/search/keyword.json"
        f"?query={q}&x={x}&y={y}&radius={radius}&size=15&sort=distance"
    )
    try:
        return kakao_get(url).get("documents", [])
    except Exception as e:
        print(f"    ⚠️  keyword '{query}': {e}")
        return []


def normalize_category(group_code, cat_name):
    if group_code in CATEGORY_MAP:
        return CATEGORY_MAP[group_code]
    cat = cat_name or ""
    if any(k in cat for k in ["카페", "커피", "베이커리", "디저트"]):
        return "카페"
    if any(k in cat for k in ["음식", "식당", "한식", "일식", "중식", "양식", "분식", "패스트푸드", "치킨", "피자"]):
        return "음식점"
    if "편의점" in cat:
        return "편의점"
    if any(k in cat for k in ["마트", "슈퍼", "할인점"]):
        return "마트"
    if any(k in cat for k in ["약국", "병원", "의원", "치과", "한의원", "안과", "내과", "외과"]):
        return "병원/약국"
    if any(k in cat for k in ["미용", "헤어", "네일", "뷰티", "피부"]):
        return "미용"
    if any(k in cat for k in ["학원", "교습", "교육", "스터디"]):
        return "학원"
    return "기타"


def supabase_upsert(table, rows, conflict="id"):
    data = json.dumps(rows)
    result = subprocess.run([
        "curl", "-s", "-X", "POST",
        f"{SUPABASE_URL}/rest/v1/{table}?on_conflict={conflict}",
        "-H", f"apikey: {SUPABASE_KEY}",
        "-H", f"Authorization: Bearer {SUPABASE_KEY}",
        "-H", "Content-Type: application/json",
        "-H", "Prefer: resolution=merge-duplicates,return=representation",
        "-d", data,
    ], capture_output=True, text=True)
    if result.returncode != 0:
        print(f"  ❌ curl error: {result.stderr}")
        return False
    resp = result.stdout
    if '"code"' in resp and '"error"' in resp.lower():
        print(f"  ❌ Supabase error: {resp[:300]}")
        return False
    return True


def make_store_id(building_id, kakao_id):
    return f"kakao_{building_id}_{kakao_id}"


# ──────────────────────────────────────────────────────────────
# MAIN
# ──────────────────────────────────────────────────────────────
print(f"🏙️  검단신도시 상가 데이터 종합 수집 시작")
print(f"   건물 {len(BUILDINGS)}개 처리 예정\n")

total_stores = 0
total_buildings = 0

for b in BUILDINGS:
    print(f"🏢 {b['name']} ({b['id']})")

    # ── 1. 건물 upsert ──
    brow = {
        "id":          b["id"],
        "name":        b["name"],
        "address":     b["address"],
        "lat":         b["lat"],
        "lng":         b["lng"],
        "has_data":    True,
    }
    supabase_upsert("buildings", [brow])

    # ── 2. 매장 수집 ──
    seen = {}  # kakao_id → place dict

    for cat in SEARCH_CATEGORIES:
        places = category_search(cat, b["lng"], b["lat"], radius=120)
        for p in places:
            if p["id"] not in seen:
                seen[p["id"]] = p
        time.sleep(0.2)

    for kw in SEARCH_KEYWORDS:
        places = keyword_search(kw, b["lng"], b["lat"], radius=120)
        for p in places:
            if p["id"] not in seen:
                seen[p["id"]] = p
        time.sleep(0.2)

    # ── 3. 매장 rows 만들기 ──
    store_rows = []
    for i, p in enumerate(seen.values()):
        cat = normalize_category(
            p.get("category_group_code", ""),
            p.get("category_name", "")
        )
        # floor label: 카카오는 층 정보 없음 → 기본 1F
        floor_label = "1F"
        # 주소에 층 정보 있으면 파싱
        addr = p.get("address_name", "") or ""
        m = re.search(r"(\d+)층", p.get("place_name", "") + addr)
        if m:
            fl = int(m.group(1))
            floor_label = f"{fl}F"

        store_rows.append({
            "id":          make_store_id(b["id"], p["id"]),
            "building_id": b["id"],
            "name":        p["place_name"],
            "category":    cat,
            "floor_label": floor_label,
            "phone":       p.get("phone") or None,
            "hours":       None,
            "is_open":     True,
            "x":           0,
            "y":           0,
            "w":           10,
            "h":           10,
            "is_premium":  False,
        })

    if store_rows:
        ok = supabase_upsert("stores", store_rows)
        if ok:
            # 건물 총 매장 수 업데이트
            supabase_upsert("buildings", [{
                **brow,
                "total_stores": len(store_rows),
                "categories": list(set(s["category"] for s in store_rows)),
            }])
            print(f"  ✅ {len(store_rows)}개 매장 저장")
            total_stores += len(store_rows)
        else:
            print(f"  ❌ 저장 실패")
    else:
        print(f"  ⚠️  매장 데이터 없음")

    total_buildings += 1
    time.sleep(0.5)

print(f"\n✅ 완료: 건물 {total_buildings}개, 매장 {total_stores}개")
