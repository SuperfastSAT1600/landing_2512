#!/usr/bin/env python3
"""
세일즈 상담 관리 - 상담DB.csv → students.consultation_timeline 마이그레이션
- 상담 내용 컬럼을 raw_memo로 append
- 이미 동일 메모 있으면 스킵
- 날짜 형식: '2024. 9. 23' → ISO timestamp
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
}

def supabase_get(path):
    req = urllib.request.Request(f"{SUPABASE_URL}{path}", headers=HEADERS)
    with urllib.request.urlopen(req) as resp:
        return json.load(resp)

def supabase_patch(path, data):
    body = json.dumps(data).encode()
    req = urllib.request.Request(
        f"{SUPABASE_URL}{path}",
        data=body,
        headers={**HEADERS, "Prefer": "return=minimal"},
        method="PATCH",
    )
    with urllib.request.urlopen(req) as resp:
        return resp.status

def fetch_all_students():
    all_students = []
    offset = 0
    while True:
        path = f"/rest/v1/students?select=id,name,consultation_timeline&offset={offset}&limit=1000"
        batch = supabase_get(path)
        all_students.extend(batch)
        if len(batch) < 1000:
            break
        offset += 1000
    return all_students

def parse_date(date_str):
    """'2024. 9. 23' → '2024-09-23T09:00:00+09:00'"""
    if not date_str or not date_str.strip():
        return None
    m = re.match(r"(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})", date_str.strip())
    if m:
        y, mo, d = int(m.group(1)), int(m.group(2)), int(m.group(3))
        return f"{y:04d}-{mo:02d}-{d:02d}T09:00:00+09:00"
    return None

def main():
    print("1. DB 학생 전체 조회 중...")
    students = fetch_all_students()
    print(f"   총 {len(students)}명")

    name_map: dict[str, dict] = {}
    for s in students:
        name_map.setdefault(s["name"], s)

    print("2. CSV 파싱 중...")
    with open("/workspace/crm/세일즈 상담 관리 - 상담DB.csv", encoding="utf-8-sig") as f:
        rows = [r for r in csv.DictReader(f) if r.get("학생 이름", "").strip()]
    print(f"   총 {len(rows)}행")

    # 학생별로 묶어서 한 번에 PATCH (API 호출 최소화)
    updates: dict[str, dict] = {}  # student_id → {student, new_entries}

    matched = no_match = dup = no_memo = 0

    for row in rows:
        name = row.get("학생 이름", "").strip()
        memo = row.get("상담 내용", "").strip()
        manager = row.get("상담인", "").strip()
        consult_date = row.get("상담일", "").strip()

        if not memo:
            no_memo += 1
            continue

        student = name_map.get(name)
        if not student:
            no_match += 1
            continue
        matched += 1

        sid = student["id"]
        if sid not in updates:
            updates[sid] = {
                "student": student,
                "timeline": list(student.get("consultation_timeline") or []),
                "existing_memos": {
                    e.get("raw_memo", "").strip()
                    for e in (student.get("consultation_timeline") or [])
                },
                "added": 0,
            }

        if memo in updates[sid]["existing_memos"]:
            dup += 1
            continue

        new_entry = {
            "id": str(uuid.uuid4()),
            "created_at": parse_date(consult_date) or "2024-09-01T09:00:00+09:00",
            "raw_memo": memo,
            "published": False,
            "manager_id": manager or None,
        }
        updates[sid]["timeline"].append(new_entry)
        updates[sid]["existing_memos"].add(memo)
        updates[sid]["added"] += 1

    print(f"\n   매칭: {matched} / 미매칭: {no_match} / 중복 스킵: {dup} / 메모 없음: {no_memo}")
    to_update = {sid: u for sid, u in updates.items() if u["added"] > 0}
    print(f"   실제 업데이트 대상: {len(to_update)}명")

    print("\n3. DB 업데이트 중...")
    success = errors = 0
    for i, (sid, u) in enumerate(to_update.items(), 1):
        if i % 50 == 0:
            print(f"   진행: {i}/{len(to_update)}")
        try:
            status = supabase_patch(
                f"/rest/v1/students?id=eq.{sid}",
                {"consultation_timeline": u["timeline"]},
            )
            if status in (200, 204):
                success += 1
            else:
                errors += 1
        except Exception as e:
            errors += 1
            print(f"   오류 [{u['student']['name']}]: {e}")

    print(f"\n=== 완료 ===")
    print(f"  업데이트 성공: {success}명")
    print(f"  오류: {errors}건")
    print(f"  총 추가된 상담 메모: {sum(u['added'] for u in to_update.values())}건")

if __name__ == "__main__":
    main()
