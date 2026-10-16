#!/usr/bin/env python3
"""학생 이름 → 코치룸 가능 시간 줄글 출력"""

import sys
import os
import json
import urllib.request
import urllib.parse
from pathlib import Path

# .env.local 로드 — 스크립트 위치와 무관하게 git 루트에서 찾음
def find_env_local() -> Path:
    candidate = Path(__file__).resolve()
    for _ in range(6):
        candidate = candidate.parent
        p = candidate / ".env.local"
        if p.exists():
            return p
    raise FileNotFoundError(".env.local을 찾을 수 없습니다")

env_path = find_env_local()
env = {}
for line in env_path.read_text().splitlines():
    if "=" in line and not line.startswith("#"):
        k, _, v = line.partition("=")
        env[k.strip()] = v.strip()

SFV2_URL = env.get("SUPERFASTSAT_V2_SUPABASE_URL", "")
SFV2_KEY = env.get("SUPERFASTSAT_V2_SUPABASE_SERVICE_KEY", "")

WEEKDAYS = ["월", "화", "수", "목", "금", "토", "일"]

# 10월 PDT(UTC-7) 기준. DST 종료(11/1) 전후 자동 처리
def la_to_kst_offset(month: int) -> int:
    # PDT(3월~11월 첫째 일): UTC-7 → KST diff = +16
    # PST(그 외): UTC-8 → KST diff = +17
    return 16 if 3 <= month <= 10 else 17

def minutes_to_hhmm(m: int) -> str:
    return f"{m // 60:02d}:{m % 60:02d}"

def supabase_get(path: str) -> list:
    url = f"{SFV2_URL}/rest/v1/{path}"
    req = urllib.request.Request(url, headers={
        "apikey": SFV2_KEY,
        "Authorization": f"Bearer {SFV2_KEY}",
    })
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())

def find_profile(name: str) -> dict | None:
    encoded = urllib.parse.quote(name)
    results = supabase_get(
        f"profiles?select=id,full_name,first_name,last_name,email"
        f"&full_name=ilike.*{encoded}*&role=eq.student&limit=10"
    )
    if not results:
        # 성/이름 분리 시도
        parts = name.split()
        if len(parts) >= 2:
            last = urllib.parse.quote(parts[-1])
            results = supabase_get(
                f"profiles?select=id,full_name,first_name,last_name,email"
                f"&last_name=ilike.*{last}*&role=eq.student&limit=10"
            )
    return results[0] if results else None

def get_availability(profile_id: str) -> list:
    return supabase_get(
        f"scheduled_availability_slots?select=*"
        f"&owner_id=eq.{profile_id}&order=weekday.asc"
    )

def slot_to_kst(slot: dict) -> dict:
    """로컬 슬롯 → KST 요일+시간 (tz 자동 처리)"""
    tz = slot.get("tz", "America/Los_Angeles")
    eff_from = slot.get("effective_from") or ""
    month = int(eff_from[5:7]) if len(eff_from) >= 7 else 10

    if tz == "Asia/Seoul":
        # 이미 KST — 변환 없음
        diff = 0
    elif "Los_Angeles" in tz or "Pacific" in tz:
        diff = la_to_kst_offset(month) * 60
    elif "New_York" in tz or "Eastern" in tz:
        # EDT(UTC-4) → KST: +13h / EST(UTC-5) → KST: +14h
        diff = (13 if 3 <= month <= 10 else 14) * 60
    elif "Chicago" in tz or "Central" in tz:
        # CDT(UTC-5) → KST: +14h / CST(UTC-6) → KST: +15h
        diff = (14 if 3 <= month <= 10 else 15) * 60
    else:
        # 미지원 타임존 — LA 기본값
        diff = la_to_kst_offset(month) * 60

    start_kst = slot["start_minute_local"] + diff
    end_kst   = slot["end_minute_local"]   + diff

    day_shift   = start_kst // (24 * 60)
    kst_weekday = (slot["weekday"] + day_shift) % 7
    kst_start_h = (start_kst // 60) % 24
    kst_start_m = start_kst % 60
    kst_end_h   = (end_kst // 60) % 24
    kst_end_m   = end_kst % 60

    return {
        "weekday_kst": kst_weekday,
        "start": f"{kst_start_h:02d}:{kst_start_m:02d}",
        "end":   f"{kst_end_h:02d}:{kst_end_m:02d}",
        "effective_from":  slot.get("effective_from"),
        "effective_until": slot.get("effective_until"),
        "notes": slot.get("notes"),
    }

def format_output(name: str, slots: list) -> str:
    if not slots:
        return f"{name} 학생의 가능 시간 데이터가 없습니다."

    kst_slots = sorted([slot_to_kst(s) for s in slots], key=lambda x: x["weekday_kst"])

    lines = [f"{name} 학생 코치룸 가능 시간 (KST 기준)\n"]

    for s in kst_slots:
        wd = WEEKDAYS[s["weekday_kst"]]
        time_range = f"{s['start']} ~ {s['end']}"
        period = ""
        if s["effective_from"] and s["effective_until"]:
            period = f" ({s['effective_from']} ~ {s['effective_until']})"
        elif s["effective_from"]:
            period = f" ({s['effective_from']}~)"
        note = f" / {s['notes']}" if s["notes"] else ""
        lines.append(f"{wd}요일 {time_range}{period}{note}")

    return "\n".join(lines)

def main():
    if len(sys.argv) < 2:
        print("사용법: python3 student-availability.py '학생 이름'")
        sys.exit(1)

    name = " ".join(sys.argv[1:])
    print(f"'{name}' 검색 중...\n")

    profile = find_profile(name)
    if not profile:
        print(f"학생을 찾을 수 없습니다: {name}")
        sys.exit(1)

    full_name = profile["full_name"]
    profile_id = profile["id"]
    print(f"프로필 확인: {full_name} ({profile['email']})\n")
    print("-" * 40)

    slots = get_availability(profile_id)
    print(format_output(full_name, slots))

if __name__ == "__main__":
    main()
