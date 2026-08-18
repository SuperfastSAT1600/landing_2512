#!/usr/bin/env python3
"""
최초상담db.csv → students.consultation_timeline 마이그레이션
- 이름 매칭으로 DB 학생 찾기
- 고객 정보 컬럼을 raw_memo로 consultation_timeline에 append
- 이미 동일 날짜+메모 있으면 스킵 (중복 방지)
"""

import csv
import json
import uuid
import urllib.request
import urllib.parse
from datetime import datetime

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
    """2206명 전체 페이지네이션"""
    all_students = []
    offset = 0
    page_size = 1000
    while True:
        path = f"/rest/v1/students?select=id,name,consultation_timeline&offset={offset}&limit={page_size}"
        batch = supabase_get(path)
        all_students.extend(batch)
        if len(batch) < page_size:
            break
        offset += page_size
    return all_students

def parse_date(date_str):
    """'24년 9월 2일' → ISO timestamp"""
    if not date_str or not date_str.strip():
        return None
    s = date_str.strip()
    try:
        # '24년 9월 2일' or '26년 5월 13일'
        import re
        m = re.match(r"(\d+)년\s*(\d+)월\s*(\d+)일", s)
        if m:
            y, mo, d = int(m.group(1)), int(m.group(2)), int(m.group(3))
            year = 2000 + y if y < 100 else y
            return f"{year:04d}-{mo:02d}-{d:02d}T09:00:00+09:00"
    except Exception:
        pass
    return None

def main():
    print("1. DB 학생 전체 조회 중...")
    students = fetch_all_students()
    print(f"   총 {len(students)}명 조회 완료")

    # 이름 → student 매핑 (중복 이름은 리스트로)
    name_map: dict[str, list] = {}
    for s in students:
        name_map.setdefault(s["name"], []).append(s)

    print("2. CSV 파싱 중...")
    with open("/workspace/crm/세일즈 상담 관리 - 최초상담db.csv", encoding="utf-8-sig") as f:
        rows = [r for r in csv.DictReader(f) if r.get("학생 이름", "").strip()]
    print(f"   총 {len(rows)}행 (유효)")

    matched = 0
    skipped_no_match = 0
    skipped_duplicate = 0
    skipped_no_memo = 0
    updated = 0
    errors = []

    for row in rows:
        name = row.get("학생 이름", "").strip()
        raw_memo = row.get("고객 정보", "").strip()
        summary = row.get("정리", "").strip()
        consult_date = row.get("상담일", "") or row.get("최초 상담일", "")
        manager = row.get("상담인", "").strip()

        # 메모 없으면 스킵
        if not raw_memo and not summary:
            skipped_no_memo += 1
            continue

        # 메모 내용 조합 (고객 정보 우선, 없으면 정리)
        memo_content = raw_memo or summary

        # DB 매칭
        candidates = name_map.get(name, [])
        if not candidates:
            skipped_no_match += 1
            continue
        matched += 1

        # 중복 이름이면 첫 번째 사용 (동명이인은 2명뿐)
        student = candidates[0]
        timeline: list = student.get("consultation_timeline") or []

        # 중복 체크: 동일 메모 내용 있으면 스킵
        existing_memos = {e.get("raw_memo", "").strip() for e in timeline}
        if memo_content.strip() in existing_memos:
            skipped_duplicate += 1
            continue

        # 새 entry 생성
        created_at = parse_date(consult_date) or "2024-09-01T09:00:00+09:00"
        new_entry = {
            "id": str(uuid.uuid4()),
            "created_at": created_at,
            "raw_memo": memo_content,
            "published": False,
            "manager_id": manager or None,
        }
        timeline.append(new_entry)

        # PATCH
        try:
            status = supabase_patch(
                f"/rest/v1/students?id=eq.{student['id']}",
                {"consultation_timeline": timeline},
            )
            if status in (200, 204):
                updated += 1
            else:
                errors.append(f"{name}: HTTP {status}")
        except Exception as e:
            errors.append(f"{name}: {e}")

    print("\n=== 마이그레이션 결과 ===")
    print(f"  이름 매칭: {matched}명")
    print(f"  업데이트 완료: {updated}명")
    print(f"  중복 스킵: {skipped_duplicate}건")
    print(f"  메모 없음 스킵: {skipped_no_memo}건")
    print(f"  DB 미매칭(이름 없음): {skipped_no_match}건")
    if errors:
        print(f"  에러: {len(errors)}건")
        for e in errors[:10]:
            print(f"    - {e}")

if __name__ == "__main__":
    main()
