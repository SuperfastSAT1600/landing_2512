"""
structure_template 시퀀스 클러스터링 → 마스터 템플릿 추출
"""
import sys
import json
from collections import Counter

sys.stdout.reconfigure(encoding='utf-8')

INPUT_FILE = "baseline_rw_structure.jsonl"
NEW_FILE = "qb_rw_98_reclassified.jsonl"
NEW_STRUCTURE_FILE = "qb_rw_98_structure.jsonl"

SKILLS_ORDER = [
    "Words in Context",
    "Central Ideas and Details",
    "Command of Evidence - Textual",
    "Command of Evidence - Quantitative",
    "Command of Evidence",
    "Inferences",
    "Cross-Text Connections",
    "Text Structure and Purpose",
    "Transitions",
    "Boundaries",
    "Form, Structure, and Sense",
]


def load_jsonl(path):
    records = []
    try:
        with open(path, encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line:
                    records.append(json.loads(line))
    except FileNotFoundError:
        print(f"파일 없음: {path}")
    return records


def get_skill(r):
    return r.get('skill') or r.get('metadata', {}).get('skill', '')


def seq_to_str(seq):
    return " → ".join(seq)


def analyze(records, label):
    valid = [r for r in records if r.get('structure_template')]
    print(f"\n{'='*65}")
    print(f"  {label}  (유효: {len(valid)}개)")
    print(f"{'='*65}")

    # 1. 전체 마스터 템플릿 Top 20
    all_seqs = Counter(seq_to_str(r['structure_template']) for r in valid)
    print(f"\n[ 전체 마스터 템플릿 Top 20 ]")
    for seq, cnt in all_seqs.most_common(20):
        print(f"  {cnt:4d}회  {seq}")

    # 2. 길이 분포
    lengths = Counter(len(r['structure_template']) for r in valid)
    print(f"\n[ 지문 문장 수 분포 ]")
    for l in sorted(lengths):
        bar = '█' * min(lengths[l], 40)
        print(f"  {l}문장: {lengths[l]:4d}개  {bar}")

    # 3. 첫 문장 레이블 분포
    first_labels = Counter(r['structure_template'][0] for r in valid if r['structure_template'])
    print(f"\n[ 첫 문장 레이블 분포 ]")
    total = len(valid)
    for label_name, cnt in first_labels.most_common():
        pct = cnt / total * 100
        print(f"  {label_name:<15} {cnt:4d} ({pct:.1f}%)")

    # 4. skill별 가장 많은 템플릿
    print(f"\n[ Skill별 Top 3 템플릿 ]")
    skill_groups = {}
    for r in valid:
        s = get_skill(r)
        skill_groups.setdefault(s, []).append(seq_to_str(r['structure_template']))

    for skill in SKILLS_ORDER:
        if skill not in skill_groups:
            continue
        seqs = Counter(skill_groups[skill])
        print(f"\n  [{skill}] (n={len(skill_groups[skill])})")
        for seq, cnt in seqs.most_common(3):
            print(f"    {cnt:3d}회  {seq}")

    return all_seqs


def compare(baseline_records, new_records):
    b_valid = [r for r in baseline_records if r.get('structure_template')]
    n_valid = [r for r in new_records if r.get('structure_template')]

    if not n_valid:
        print("\n신규 문제 구조 데이터 없음 — analyze_structure_new.py를 먼저 실행하세요")
        return

    b_seqs = Counter(seq_to_str(r['structure_template']) for r in b_valid)
    n_seqs = Counter(seq_to_str(r['structure_template']) for r in n_valid)

    print(f"\n{'='*65}")
    print(f"  기존 vs 신규 템플릿 비교")
    print(f"{'='*65}")

    # 신규에서 기존 Top10에 없는 패턴
    top10_baseline = set(s for s, _ in b_seqs.most_common(10))
    new_patterns = [(s, c) for s, c in n_seqs.most_common() if s not in top10_baseline]
    if new_patterns:
        print(f"\n[ 신규에서 기존 Top10에 없는 패턴 ]")
        for seq, cnt in new_patterns[:10]:
            print(f"  {cnt:3d}회  {seq}")
    else:
        print(f"\n신규 패턴 모두 기존 Top10 내에 포함됨")


if __name__ == "__main__":
    baseline = load_jsonl(INPUT_FILE)
    analyze(baseline, "기존 1,511개 구조 분석")

    new_qs = load_jsonl(NEW_STRUCTURE_FILE)
    if new_qs:
        analyze(new_qs, "신규 98개 구조 분석")
        compare(baseline, new_qs)
    else:
        print("\n신규 98개 구조 분석 파일 없음 — 기존 분석만 출력")
