"""
SAT blog_database 프로젝트 현재 상태 즉시 확인
실행: python3 project_status.py
"""
import json, sys
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')

def count_jsonl(path, key_check=None):
    p = Path(path)
    if not p.exists():
        return 0, "파일 없음"
    count = 0
    issues = []
    with open(p, encoding='utf-8') as f:
        for line in f:
            try:
                r = json.loads(line.strip())
                count += 1
                if key_check:
                    for k, v_check in key_check.items():
                        val = r.get(k, '')
                        if v_check == 'nonempty' and not str(val).strip():
                            issues.append(r.get('id', '?'))
            except:
                pass
    return count, issues


def check_latex_pct(path):
    p = Path(path)
    if not p.exists():
        return 0, 0
    total, has_latex = 0, 0
    with open(p, encoding='utf-8') as f:
        for line in f:
            r = json.loads(line.strip())
            total += 1
            if '$' in r.get('question_text', '') or '$' in r.get('content', {}).get('question_text', ''):
                has_latex += 1
    return total, has_latex


def sep():
    print("─" * 55)


print()
print("=" * 55)
print("  SAT blog_database 프로젝트 상태")
print("=" * 55)

# RW CP 분석
sep()
print("  [RW CP 분석]")
sep()
files = [
    ("baseline_cp_analysis.jsonl",         "baseline (비RS 1,333 + missing)"),
    ("qb_rw_98_cp_analysis.jsonl",         "QB RW 98 신규"),
    ("cross_text_new_5_cp_analysis.jsonl", "Cross-Text 신규 5"),
    ("retry_14_cp_analysis.jsonl",         "retry 14"),
    ("missing_cp_analysis.jsonl",          "missing 117"),
]
rw_total = 0
for fname, label in files:
    cnt, _ = count_jsonl(fname)
    rw_total += cnt
    status = "✅" if cnt > 0 else "❌"
    print(f"  {status} {label}: {cnt}개  [{fname}]")

# skill 빈 것
cnt_base, _ = count_jsonl("baseline_cp_analysis.jsonl")
empty_skill = 0
if Path("baseline_cp_analysis.jsonl").exists():
    with open("baseline_cp_analysis.jsonl", encoding='utf-8') as f:
        for line in f:
            r = json.loads(line.strip())
            if not r.get('skill', '').strip():
                empty_skill += 1

print()
print()
print(f"  RW CP 라벨링 총합: {rw_total}개")
status_skill = "✅" if empty_skill == 0 else "⚠️"
print(f"  {status_skill}  skill 빈 것: {empty_skill}개 (baseline_cp_analysis 내)")

# Math
sep()
print("  [Math QB]")
sep()
math_total, math_latex = check_latex_pct("math_qb_parsed.jsonl")
latex_pct = int(100 * math_latex / math_total) if math_total else 0
status = "✅" if math_total == 75 else "⚠️"
print(f"  {status} math_qb_parsed.jsonl: {math_total}개 / 목표 75개")
print(f"     LaTeX 포함: {math_latex}개 ({latex_pct}%)")

# Cross-Text 분리 현황 집계
ct_total, ct_split, ct_failed = 0, 0, 0
for ct_file in ["baseline_cp_analysis.jsonl", "qb_rw_98_cp_analysis.jsonl", "cross_text_new_5_cp_analysis.jsonl"]:
    if Path(ct_file).exists():
        with open(ct_file, encoding='utf-8') as f:
            for line in f:
                r = json.loads(line.strip())
                sk = r.get('skill') or (r.get('metadata') or {}).get('skill', '')
                if 'Cross-Text' in sk or 'cross-text' in sk.lower():
                    ct_total += 1
                    if r.get('text1_sequence'):
                        ct_split += 1
                    elif r.get('cross_text_split_failed'):
                        ct_failed += 1

sep()
print("  [Cross-Text Text1/Text2 분리]")
sep()
ct_icon = "✅" if ct_failed == 0 else "⚠️"
print(f"  {ct_icon} 분리 완료: {ct_split}/{ct_total}개  |  passage 불완전(미분리): {ct_failed}개")

# 온톨로지
sep()
print("  [온톨로지]")
sep()
ont_cnt, _ = count_jsonl("../master_sat_ontology_v3.jsonl")
print(f"  master_sat_ontology_v3.jsonl: {ont_cnt}개")

# Math가 온톨로지에 추가되었는지
math_in_ont = 0
if Path("math_qb_parsed.jsonl").exists() and Path("../master_sat_ontology_v3.jsonl").exists():
    math_ids = set()
    with open("math_qb_parsed.jsonl", encoding='utf-8') as f:
        for line in f:
            math_ids.add(json.loads(line.strip()).get('question_id', ''))
    ont_ids = set()
    with open("../master_sat_ontology_v3.jsonl", encoding='utf-8') as f:
        for line in f:
            r = json.loads(line.strip())
            ont_ids.add(r.get('id', '') or r.get('metadata', {}).get('question_id', ''))
    math_in_ont = len(math_ids & ont_ids)
    print(f"  Math → 온톨로지 추가: {math_in_ont}/75개 {'✅' if math_in_ont == 75 else '⚠️ 미추가'}")

# TODO
sep()
print("  [다음 TODO]")
sep()
todos = []
if empty_skill > 0:
    todos.append(f"skill 빈 것 {empty_skill}개 수동 확인 또는 PDF 재파싱")
if math_in_ont < 75:
    todos.append(f"math_qb_parsed.jsonl → 온톨로지 추가 ({75 - math_in_ont}개 미추가)")
todos.append("sequence_full 분포 분석 + 오답 패턴 상관관계")
if ct_failed > 0:
    todos.append(f"Cross-Text 분리 미완 {ct_failed}개 — passage 불완전, 원본 PDF 재파싱 필요")

for i, todo in enumerate(todos, 1):
    print(f"  {i}. {todo}")

sep()
print()
