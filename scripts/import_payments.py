#!/usr/bin/env python3
"""
CSV 결제 데이터 → payments 테이블 SQL INSERT 생성기
Usage: python3 scripts/import_payments.py > /tmp/payments_import.sql
Then run the SQL in Supabase SQL Editor.
"""

import csv
import re
import sys
from pathlib import Path

CSV_PATH = Path(__file__).parent.parent / "crm" / "아르고노트에이아이 현금흐름 - 현금흐름_260527.csv"


def parse_korean_date(s: str) -> str | None:
    """'24년 9월 24일' → '2024-09-24'"""
    m = re.match(r"(\d+)년\s*(\d+)월\s*(\d+)일", s.strip())
    if not m:
        return None
    yy, mm, dd = int(m.group(1)), int(m.group(2)), int(m.group(3))
    year = 2000 + yy if yy < 100 else yy
    return f"{year}-{mm:02d}-{dd:02d}"


def parse_amount(s: str) -> int | None:
    """' ₩ 1,000,000 ' → 1000000"""
    clean = re.sub(r"[₩,\s()]", "", s)
    try:
        val = int(clean)
        return val if val > 0 else None
    except ValueError:
        return None


ALLOWED_TYPES = {
    "01. 수업료(최초 결제)",
    "07. 그룹수업(최초결제)",
    "04. 체험수업",
    "05. 콘텐츠(최초 결제)",
}

TYPE_MAP = {
    "01. 수업료(최초 결제)": "수업료",
    "07. 그룹수업(최초결제)": "그룹수업",
    "04. 체험수업": "체험수업",
    "05. 콘텐츠(최초 결제)": "콘텐츠",
}

METHOD_MAP = {
    "계좌이체": "계좌이체",
    "게좌이체": "계좌이체",   # CSV 오타
    "토스결제": "토스결제",
    "신용카드": "신용카드",
    "stripe": "Stripe",
    "Stripe": "Stripe",
    "카카오톡": "카카오페이",
    "Rho 결제": "Rho",
    "paypal": "PayPal",
}


def escape_sql(s: str) -> str:
    return s.replace("'", "''")


def main():
    if not CSV_PATH.exists():
        print(f"-- ERROR: CSV not found at {CSV_PATH}", file=sys.stderr)
        sys.exit(1)

    with open(CSV_PATH, encoding="utf-8") as f:
        reader = csv.reader(f)
        next(reader)  # skip header
        rows = list(reader)

    income_rows = [
        r for r in rows
        if r and r[0].strip() == "들어온 돈"
        and len(r) > 7
        and r[7].strip() in ALLOWED_TYPES
    ]

    print("-- payments 테이블 임포트 (아르고노트에이아이 현금흐름)")
    print(f"-- 총 {len(income_rows)}건 | 생성일: {Path(__file__).name}")
    print("-- Supabase SQL Editor에서 실행하세요.")
    print()
    print("BEGIN;")
    print()

    ok, skipped = 0, 0
    for r in income_rows:
        date_str = parse_korean_date(r[3]) if len(r) > 3 else None
        amount = parse_amount(r[4]) if len(r) > 4 else None
        method_raw = r[5].strip() if len(r) > 5 else ""
        sub_raw = r[7].strip() if len(r) > 7 else ""
        student_name = r[11].strip() if len(r) > 11 else ""
        coach_name = r[13].strip() if len(r) > 13 else ""
        notes = r[15].strip() if len(r) > 15 else ""

        if not date_str or not amount or not student_name:
            skipped += 1
            continue

        payment_type = TYPE_MAP.get(sub_raw, sub_raw)
        payment_method = METHOD_MAP.get(method_raw, method_raw or "계좌이체")

        coach_sql = f"'{escape_sql(coach_name)}'" if coach_name else "NULL"
        notes_sql = f"'{escape_sql(notes)}'" if notes else "NULL"

        print(
            f"INSERT INTO payments (student_name, coach_name, amount, payment_type, "
            f"payment_method, paid_at, notes) VALUES ("
            f"'{escape_sql(student_name)}', {coach_sql}, {amount}, "
            f"'{payment_type}', '{escape_sql(payment_method)}', "
            f"'{date_str} 09:00:00+09', {notes_sql});"
        )
        ok += 1

    print()
    print("COMMIT;")
    print()
    print(f"-- 삽입 성공: {ok}건 | 스킵: {skipped}건")
    print()
    print("-- 다음 단계: students 테이블과 이름으로 연결")
    print("-- UPDATE payments p SET student_id = s.id")
    print("--   FROM students s WHERE p.student_name = s.name AND p.student_id IS NULL;")


if __name__ == "__main__":
    main()
