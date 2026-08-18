#!/usr/bin/env python3
"""
Study Hall 학부모 리포트 생성기
Usage: python3 scripts/report_study_hall.py --date 2026-05-20
"""

import argparse
import json
import os
import urllib.request
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://uvyzmnpdxreatmczlsds.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")
HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
}


def get(path: str) -> list:
    url = f"{SUPABASE_URL}/rest/v1{path}"
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req) as res:
        return json.loads(res.read())


def duration_minutes(started: str, ended: str) -> int:
    fmt_options = [
        "%Y-%m-%dT%H:%M:%S.%f+00:00",
        "%Y-%m-%dT%H:%M:%S+00:00",
        "%Y-%m-%dT%H:%M:%S.%f",
        "%Y-%m-%dT%H:%M:%S",
    ]
    for fmt in fmt_options:
        try:
            s = datetime.strptime(started[:26].rstrip("Z+").split("+")[0], fmt.split("+")[0])
            e = datetime.strptime(ended[:26].rstrip("Z+").split("+")[0], fmt.split("+")[0])
            return max(0, int((e - s).total_seconds() // 60))
        except ValueError:
            continue
    return 0


def collect_data(date: str) -> dict:
    date_from = f"{date}T00:00:00"
    date_to_raw = datetime.strptime(date, "%Y-%m-%d")
    # next day
    next_day = date_to_raw.replace(day=date_to_raw.day + 1)
    date_to = next_day.strftime("%Y-%m-%dT00:00:00")

    print(f"[1/5] 문제 풀이 데이터 조회 중...")
    attempts = get(
        f"/study_hall_unit_attempts"
        f"?attempted_at=gte.{date_from}&attempted_at=lt.{date_to}"
        f"&select=student_id,session_id,is_correct,time_spent_seconds,curriculum_id,lesson_id"
    )
    print(f"      → {len(attempts)}개 풀이 기록")

    print(f"[2/5] 세션 데이터 조회 중...")
    sh_sessions = get(
        f"/study_hall_session"
        f"?started_at=gte.{date_from}&started_at=lt.{date_to}"
        f"&select=session_id,started_at,ended_at"
    )
    print(f"      → {len(sh_sessions)}개 세션")

    # session_id → duration_minutes
    session_duration: dict[str, int] = {}
    for s in sh_sessions:
        if s["started_at"] and s["ended_at"]:
            session_duration[s["session_id"]] = duration_minutes(s["started_at"], s["ended_at"])

    print(f"[3/5] 학생 정보 조회 중...")
    all_session_ids = list({a["session_id"] for a in attempts})
    sessions_data = get(f"/sessions?id=in.({','.join(all_session_ids)})&select=id,student_id")
    sess_to_student: dict[str, str] = {s["id"]: s["student_id"] for s in sessions_data}

    student_ids = list({a["student_id"] for a in attempts})
    profiles = get(f"/profiles?id=in.({','.join(student_ids)})&select=id,full_name,parent_name,parent_email")
    profile_map: dict[str, dict] = {p["id"]: p for p in profiles}

    print(f"[4/5] 단원/영역 정보 조회 중...")
    curriculum_ids = list({a["curriculum_id"] for a in attempts if a.get("curriculum_id")})
    lesson_ids = list({a["lesson_id"] for a in attempts if a.get("lesson_id")})

    curricula_map: dict[str, str] = {}
    if curriculum_ids:
        curricula = get(f"/curricula?id=in.({','.join(curriculum_ids)})&select=id,title")
        curricula_map = {c["id"]: c["title"] for c in curricula}

    lesson_map: dict[str, str] = {}
    if lesson_ids:
        lessons = get(f"/lessons?id=in.({','.join(lesson_ids)})&select=id,title")
        lesson_map = {l["id"]: l["title"] for l in lessons}

    print(f"[5/5] 학생별 집계 중...")
    students: dict[str, dict] = {}
    for a in attempts:
        sid = a["student_id"]
        if sid not in students:
            p = profile_map.get(sid, {})
            students[sid] = {
                "name": p.get("full_name", "알 수 없음"),
                "parent_name": p.get("parent_name"),
                "parent_email": p.get("parent_email"),
                "total": 0,
                "correct": 0,
                "study_minutes": 0,
                "sessions_counted": set(),
                "by_curriculum": defaultdict(lambda: {"total": 0, "correct": 0}),
                "by_lesson": defaultdict(lambda: {"total": 0, "correct": 0}),
            }

        s = students[sid]
        s["total"] += 1
        if a["is_correct"]:
            s["correct"] += 1

        # Study time from session duration
        sess_id = a["session_id"]
        if sess_id not in s["sessions_counted"] and sess_id in session_duration:
            s["study_minutes"] += session_duration[sess_id]
            s["sessions_counted"].add(sess_id)

        cur_id = a.get("curriculum_id")
        if cur_id and cur_id in curricula_map:
            cur_name = curricula_map[cur_id]
            s["by_curriculum"][cur_name]["total"] += 1
            if a["is_correct"]:
                s["by_curriculum"][cur_name]["correct"] += 1

        les_id = a.get("lesson_id")
        if les_id and les_id in lesson_map:
            les_name = lesson_map[les_id]
            s["by_lesson"][les_name]["total"] += 1
            if a["is_correct"]:
                s["by_lesson"][les_name]["correct"] += 1

    return students


def accuracy(correct: int, total: int) -> str:
    if total == 0:
        return "—"
    return f"{round(correct / total * 100)}%"


def render_report(student_id: str, s: dict, date: str) -> str:
    name = s["name"]
    total = s["total"]
    correct = s["correct"]
    minutes = s["study_minutes"]
    acc = accuracy(correct, total)

    date_fmt = datetime.strptime(date, "%Y-%m-%d").strftime("%Y년 %m월 %d일")

    lines = [
        f"# {name} 학습 리포트 — {date_fmt}",
        "",
        "## 오늘의 요약",
        "",
        f"- 총 학습 시간: **{minutes}분**",
        f"- 푼 문제: **{total}개**",
        f"- 정답률: **{acc}**",
        "",
    ]

    if s["by_curriculum"]:
        lines += [
            "## 학습 영역별 성과",
            "",
            "| 영역 | 문제 수 | 정답률 |",
            "|------|--------|--------|",
        ]
        for cur_name, stat in sorted(s["by_curriculum"].items()):
            lines.append(f"| {cur_name} | {stat['total']} | {accuracy(stat['correct'], stat['total'])} |")
        lines.append("")

    if s["by_lesson"]:
        lines += [
            "## 단원별 상세",
            "",
            "| 단원 | 문제 수 | 정답률 |",
            "|------|--------|--------|",
        ]
        for les_name, stat in sorted(s["by_lesson"].items()):
            lines.append(f"| {les_name} | {stat['total']} | {accuracy(stat['correct'], stat['total'])} |")
        lines.append("")

    lines += [
        "## 선생님 코멘트",
        "",
        "> (여기에 코멘트를 입력하세요)",
        "",
        "---",
        f"*SuperfastSAT — {date_fmt} Study Hall 리포트*",
    ]

    return "\n".join(lines)


def render_summary(students: dict, date: str) -> str:
    date_fmt = datetime.strptime(date, "%Y-%m-%d").strftime("%Y년 %m월 %d일")
    total_problems = sum(s["total"] for s in students.values())
    total_correct = sum(s["correct"] for s in students.values())

    lines = [
        f"# Study Hall 전체 요약 — {date_fmt}",
        "",
        f"- 참여 학생: **{len(students)}명**",
        f"- 총 풀이 문제: **{total_problems}개**",
        f"- 전체 정답률: **{accuracy(total_correct, total_problems)}**",
        "",
        "## 학생별 요약",
        "",
        "| 학생 | 학습 시간 | 문제 수 | 정답률 |",
        "|------|---------|--------|--------|",
    ]

    for sid, s in sorted(students.items(), key=lambda x: x[1]["name"]):
        lines.append(
            f"| {s['name']} | {s['study_minutes']}분 | {s['total']}개 | {accuracy(s['correct'], s['total'])} |"
        )

    lines += [
        "",
        "---",
        f"*SuperfastSAT — {date_fmt} Study Hall 리포트*",
    ]
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="Study Hall 학부모 리포트 생성")
    parser.add_argument("--date", required=True, help="조회 날짜 (YYYY-MM-DD)")
    parser.add_argument("--out", default="reports", help="출력 폴더 (기본: reports)")
    args = parser.parse_args()

    out_dir = Path(args.out)
    out_dir.mkdir(exist_ok=True)

    students = collect_data(args.date)
    date_slug = args.date.replace("-", "")

    print(f"\n리포트 생성 중...")
    for sid, s in students.items():
        content = render_report(sid, s, args.date)
        safe_name = s["name"].replace(" ", "_").replace("/", "_")
        path = out_dir / f"{date_slug}_{safe_name}.md"
        path.write_text(content, encoding="utf-8")
        print(f"  [OK] {path.name}")

    summary = render_summary(students, args.date)
    summary_path = out_dir / f"{date_slug}_summary.md"
    summary_path.write_text(summary, encoding="utf-8")
    print(f"  [OK] {summary_path.name}")

    print(f"\n완료: {len(students) + 1}개 파일 -> {out_dir}/")


if __name__ == "__main__":
    main()
