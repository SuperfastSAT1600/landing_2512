#!/usr/bin/env python3
"""
dedup-mappings.json 기반으로 상담DB.csv 미매칭 행 재마이그레이션
- CSV 이름 → DB 이름 매핑 적용
- 이미 동일 메모 있으면 스킵
"""

import csv
import json
import uuid
import re
import urllib.request

SUPABASE_URL = "https://ualucbrrfvysmfytkdew.supabase.co"
SUPABASE_KEY = "sb_secret_Fw8dv9bMP5CMMYxWhhzsaQ_0DUeEMdP"
HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal",
}

def get(path):
    req = urllib.request.Request(f"{SUPABASE_URL}{path}",
        headers={k: v for k, v in HEADERS.items() if k not in ("Content-Type", "Prefer")})
    with urllib.request.urlopen(req) as r:
        return json.load(r)

def patch(path, data):
    body = json.dumps(data).encode()
    req = urllib.request.Request(f"{SUPABASE_URL}{path}", data=body, headers=HEADERS, method="PATCH")
    with urllib.request.urlopen(req) as r:
        return r.status

def fetch_all_students():
    all_s = []
    offset = 0
    while True:
        batch = get(f"/rest/v1/students?select=id,name,consultation_timeline&offset={offset}&limit=1000")
        all_s.extend(batch)
        if len(batch) < 1000:
            break
        offset += 1000
    return all_s

def parse_date(s):
    if not s: return None
    m = re.match(r"(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})", s.strip())
    if m:
        y, mo, d = int(m.group(1)), int(m.group(2)), int(m.group(3))
        return f"{y:04d}-{mo:02d}-{d:02d}T09:00:00+09:00"
    return None

def main():
    # 1. dedup 매핑 로드 — deleted → keep 역방향 맵
    with open("/workspace/crm/dedup-mappings.json", encoding="utf-8") as f:
        dedup = json.load(f)

    alias_map: dict[str, str | None] = {}  # CSV이름 → DB이름 (None이면 무시)
    for entry in dedup["mappings"]:
        keep = entry.get("keep")
        for deleted in entry.get("deleted", []):
            alias_map[deleted] = keep

    print(f"매핑 엔트리: {len(alias_map)}건")

    # 2. DB 전체 조회
    print("DB 학생 조회 중...")
    students = fetch_all_students()
    name_map: dict[str, dict] = {}
    for s in students:
        name_map.setdefault(s["name"], s)
    print(f"  총 {len(students)}명")

    # 3. CSV 파싱 — 직접 매칭 안 되는 행만 대상
    with open("/workspace/crm/세일즈 상담 관리 - 상담DB.csv", encoding="utf-8-sig") as f:
        rows = [r for r in csv.DictReader(f) if r.get("학생 이름", "").strip()]

    direct_names = set(name_map.keys())
    target_rows = [r for r in rows if r["학생 이름"].strip() not in direct_names]
    print(f"직접 매칭 안 된 행: {len(target_rows)}건")

    # 4. 매핑 적용 후 학생별 묶기
    updates: dict[str, dict] = {}
    skipped_ignored = skipped_no_map = skipped_no_memo = skipped_dup = applied = 0

    for row in target_rows:
        csv_name = row["학생 이름"].strip()
        memo = row.get("상담 내용", "").strip()
        manager = row.get("상담인", "").strip()
        consult_date = row.get("상담일", "").strip()

        if not memo:
            skipped_no_memo += 1
            continue

        if csv_name not in alias_map:
            skipped_no_map += 1
            continue

        db_name = alias_map[csv_name]
        if db_name is None:
            skipped_ignored += 1
            continue

        student = name_map.get(db_name)
        if not student:
            skipped_no_map += 1
            print(f"  매핑 대상 DB에 없음: '{csv_name}' → '{db_name}'")
            continue

        applied += 1
        sid = student["id"]
        if sid not in updates:
            updates[sid] = {
                "student": student,
                "timeline": list(student.get("consultation_timeline") or []),
                "existing": {e.get("raw_memo", "").strip() for e in (student.get("consultation_timeline") or [])},
                "added": 0,
            }

        if memo in updates[sid]["existing"]:
            skipped_dup += 1
            continue

        updates[sid]["timeline"].append({
            "id": str(uuid.uuid4()),
            "created_at": parse_date(consult_date) or "2024-09-01T09:00:00+09:00",
            "raw_memo": memo,
            "published": False,
            "manager_id": manager or None,
        })
        updates[sid]["existing"].add(memo)
        updates[sid]["added"] += 1

    to_update = {sid: u for sid, u in updates.items() if u["added"] > 0}
    print(f"\n적용 가능: {applied}건 / 중복 스킵: {skipped_dup} / 무시: {skipped_ignored} / 매핑 없음: {skipped_no_map}")
    print(f"실제 업데이트 대상: {len(to_update)}명")

    # 5. PATCH
    print("\nDB 업데이트 중...")
    success = errors = 0
    for sid, u in to_update.items():
        u["timeline"].sort(key=lambda e: e["created_at"])
        try:
            status = patch(f"/rest/v1/students?id=eq.{sid}", {"consultation_timeline": u["timeline"]})
            if status in (200, 204):
                success += 1
                print(f"  완료: {u['student']['name']} (+{u['added']}건)")
            else:
                errors += 1
        except Exception as e:
            errors += 1
            print(f"  오류 [{u['student']['name']}]: {e}")

    total_added = sum(u["added"] for u in to_update.values())
    print(f"\n=== 완료 ===")
    print(f"  업데이트 성공: {success}명 / 오류: {errors}건")
    print(f"  총 추가 메모: {total_added}건")

if __name__ == "__main__":
    main()
