#!/usr/bin/env python3
"""학생 이름 → 코치룸 가능 시간 줄글 출력"""

import sys
import os
import json
import urllib.request
import urllib.parse
from datetime import date, datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

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
CRM_URL = env.get("NEXT_PUBLIC_SUPABASE_URL", "")
CRM_KEY = env.get("SUPABASE_SERVICE_ROLE_KEY", "")
COACH_PREP_BASE = "https://tutoring.superfastsat.com/coach-prep"

WEEKDAYS = ["월", "화", "수", "목", "금", "토", "일"]

def minutes_to_hhmm(m: int) -> str:
    return f"{m // 60:02d}:{m % 60:02d}"

def supabase_get(path: str, base_url: str = SFV2_URL, key: str = SFV2_KEY) -> list:
    url = f"{base_url}/rest/v1/{path}"
    req = urllib.request.Request(url, headers={
        "apikey": key,
        "Authorization": f"Bearer {key}",
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

def find_coach_prep_url(profile: dict) -> str | None:
    """CRM students 행을 sfv2_profile_id 우선, 없으면 이름으로 찾아 코치 준비 링크 생성"""
    queries = [f"sfv2_profile_id=eq.{profile['id']}"]
    queries.append(f"name=ilike.{urllib.parse.quote(profile['full_name'])}")
    for q in queries:
        rows = supabase_get(f"students?select=id&{q}&limit=1", CRM_URL, CRM_KEY)
        if rows:
            return f"{COACH_PREP_BASE}/{rows[0]['id']}"
    return None

def get_availability(profile_id: str) -> list:
    return supabase_get(
        f"scheduled_availability_slots?select=*"
        f"&owner_id=eq.{profile_id}&order=weekday.asc"
    )

KST_OFFSET_MIN = 9 * 60

def safe_zone(tz: str) -> ZoneInfo:
    try:
        return ZoneInfo(tz)
    except Exception:
        return ZoneInfo("America/Los_Angeles")  # 미지원 타임존 — LA 기본값

def local_offset_min(zone: ZoneInfo, d: date) -> int:
    """해당 날짜 정오 기준 UTC 오프셋(분) — DST 전환일에도 안전"""
    return int(datetime(d.year, d.month, d.day, 12, tzinfo=zone).utcoffset().total_seconds() // 60)

def split_by_dst(tz: str, eff_from: str | None, eff_until: str | None) -> list[dict]:
    """유효 기간을 UTC 오프셋이 바뀌는 지점에서 잘라 [{from, until, diff(분), abbr}] 반환"""
    zone = safe_zone(tz)
    start = date.fromisoformat(eff_from[:10]) if eff_from else date.today()
    end = date.fromisoformat(eff_until[:10]) if eff_until else start  # 종료일 미입력 → 학생이 입력한 범위까지만

    def segment(seg_start: date, off: int) -> dict:
        abbr = datetime(seg_start.year, seg_start.month, seg_start.day, 12, tzinfo=zone).tzname()
        return {"from": seg_start, "until": None, "diff": KST_OFFSET_MIN - off, "abbr": abbr}

    segments = [segment(start, local_offset_min(zone, start))]
    d = start + timedelta(days=1)
    while d <= end:
        off = local_offset_min(zone, d)
        if KST_OFFSET_MIN - off != segments[-1]["diff"]:
            segments[-1]["until"] = d - timedelta(days=1)
            segments.append(segment(d, off))
        d += timedelta(days=1)

    segments[0]["from"] = eff_from[:10] if eff_from else None
    segments[-1]["until"] = eff_until[:10] if eff_until else None
    for seg in segments:
        seg["from"] = seg["from"].isoformat() if isinstance(seg["from"], date) else seg["from"]
        seg["until"] = seg["until"].isoformat() if isinstance(seg["until"], date) else seg["until"]
    return segments

def slot_to_kst(slot: dict) -> list[dict]:
    """로컬 슬롯 → KST 요일+시간. DST 전환이 기간 안에 있으면 구간별로 나눠 반환"""
    tz = slot.get("tz") or "America/Los_Angeles"
    results = []
    for seg in split_by_dst(tz, slot.get("effective_from"), slot.get("effective_until")):
        diff = seg["diff"]
        start_kst = slot["start_minute_local"] + diff
        end_kst   = slot["end_minute_local"]   + diff
        results.append({
            "tz": tz,
            "tz_abbr": seg["abbr"],
            "weekday_kst": (slot["weekday"] + start_kst // (24 * 60)) % 7,
            "start": minutes_to_hhmm(start_kst % (24 * 60)),
            "end":   minutes_to_hhmm(end_kst % (24 * 60)),
            "weekday_local": slot["weekday"] % 7,
            "start_local": minutes_to_hhmm(slot["start_minute_local"]),
            "end_local":   minutes_to_hhmm(slot["end_minute_local"]),
            "effective_from":  seg["from"],
            "effective_until": seg["until"],
            "notes": slot.get("notes"),
        })
    return results

def format_period(eff_from: str | None, eff_until: str | None) -> str:
    if eff_from and eff_until:
        return f"{eff_from} ~ {eff_until}"
    if eff_from:
        return f"{eff_from} ~"
    return "기간 미지정"

def tz_label(tz: str, eff_from: str | None) -> str:
    """'America/Los_Angeles (PDT, UTC-7)' 형태의 학생 시간대 표기"""
    try:
        ref = datetime.fromisoformat(eff_from[:10]) if eff_from else datetime.now()
        local = ref.replace(tzinfo=ZoneInfo(tz))
        offset = local.utcoffset().total_seconds() / 3600
        sign = "+" if offset >= 0 else "-"
        h = abs(offset)
        hours = f"{int(h)}" if h == int(h) else f"{h:g}"
        return f"{tz} ({local.tzname()}, UTC{sign}{hours})"
    except Exception:
        return tz

def format_line(s: dict) -> str:
    kst = f"{WEEKDAYS[s['weekday_kst']]}요일 {s['start']} ~ {s['end']}"
    local = f"{WEEKDAYS[s['weekday_local']]}요일 {s['start_local']} ~ {s['end_local']}"
    note = f" / {s['notes']}" if s["notes"] else ""
    return f"{kst} (학생 시간: {local}){note}"

def format_output(name: str, slots: list) -> str:
    if not slots:
        return f"{name} 학생의 가능 시간 데이터가 없습니다."

    converted = [c for s in slots for c in slot_to_kst(s)]
    converted.sort(key=lambda x: (x["effective_from"] or "", x["weekday_kst"], x["start"]))

    tzs = sorted({s["tz"] for s in converted})
    first_from = converted[0]["effective_from"]
    tz_text = ", ".join(tz_label(tz, first_from) for tz in tzs)

    multi_period = len({(s["effective_from"], s["effective_until"]) for s in converted}) > 1
    periods: dict[str, list] = {}
    for s in converted:
        key = format_period(s["effective_from"], s["effective_until"])
        if multi_period:
            key += f" · {s['tz_abbr']}"
        periods.setdefault(key, []).append(s)

    lines = [
        f"{name} 학생 코치룸 가능 시간",
        f"학생 시간대: {tz_text}",
    ]

    if len(periods) == 1:
        period, group = next(iter(periods.items()))
        lines.append(f"기간: {period}\n")
        lines += [format_line(s) for s in group]
    else:
        lines.append("")
        for period, group in periods.items():
            lines.append(f"[기간: {period}]")
            lines += [format_line(s) for s in group]
            lines.append("")
        lines.pop()

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

    coach_prep = find_coach_prep_url(profile)
    print(f"\n코치 준비 링크: {coach_prep or 'CRM에서 해당 학생을 찾을 수 없습니다'}")

if __name__ == "__main__":
    main()
