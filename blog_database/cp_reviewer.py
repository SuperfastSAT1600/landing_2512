"""
CP 분석 결과 품질 검토 스크립트
cp_analyzer.py 완료 후 실행

사용법:
  python cp_reviewer.py baseline   # baseline 결과 검토
  python cp_reviewer.py new        # 신규 98개 검토
  python cp_reviewer.py all        # 두 파일 합산 검토
  python cp_reviewer.py sample 10  # 랜덤 10개 샘플 출력
"""
import sys
import json
import random
import argparse
from collections import Counter
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')

OUTPUT_BASELINE = "baseline_cp_analysis.jsonl"
OUTPUT_NEW      = "qb_rw_98_cp_analysis.jsonl"
ERROR_LOG       = "cp_error_log.jsonl"
REVIEW_REPORT   = "cp_review_report.md"

VALID_PASSAGE_TYPES  = {"ARG", "EXP", "LIT"}
VALID_BASE_LABELS    = {"I", "C", "CL"}
VALID_CONNECTORS     = {
    "CONN_ADD", "CONN_CONT", "CONN_CAUSE", "CONN_COMP",
    "CONN_EMPH", "CONN_SEQ", "CONN_EX", "CONN_NONE"
}
VALID_PATTERNS = {
    "PURE_INFO", "INFO_TO_CONCL", "CLAIM_EVIDENCE",
    "CLASSICAL_ARG", "COUNTER_REBUTTAL", "DUAL_CLAIM", "NARRATIVE_CONCL"
}


def load_jsonl(path):
    if not Path(path).exists():
        return []
    records = []
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                records.append(json.loads(line))
    return records


# ── 검토 항목 ─────────────────────────────────────────────
def check_record(r) -> list[str]:
    """단일 레코드에서 문제점 반환. 빈 리스트 = 정상."""
    issues = []
    pt  = r.get("passage_type", "")
    cps = r.get("cps", [])
    seq = r.get("sequence_simple", "")
    sf  = r.get("sequence_full", "")

    if pt not in VALID_PASSAGE_TYPES:
        issues.append(f"invalid passage_type: {pt!r}")

    if not cps:
        issues.append("no CPs")
        return issues

    # sequence vs cp_count 일치
    seq_labels = seq.split("_", 1)[-1].split("-") if "_" in seq else []
    if len(seq_labels) != len(cps):
        issues.append(f"cp_count mismatch: {len(cps)} CPs vs {len(seq_labels)} in seq")

    # ARG에 C/CL 없음
    base_labels = [l.split("_")[0] for l in seq_labels]
    if pt == "ARG" and not any(b in ("C", "CL") for b in base_labels):
        issues.append("ARG passage has no C or CL")

    # CL 위치 (마지막/마지막-1만 허용)
    for i, lbl in enumerate(seq_labels):
        if lbl.split("_")[0] == "CL" and i < len(seq_labels) - 2:
            issues.append(f"CL at position {i} (should be last or second-to-last)")

    # connector 유효성
    for cp in cps:
        conn = cp.get("connector_to_next")
        if conn is not None and conn not in VALID_CONNECTORS:
            issues.append(f"invalid connector: {conn!r}")

    # 라벨 유효성
    for cp in cps:
        base = cp.get("label", "")
        if base not in VALID_BASE_LABELS:
            issues.append(f"invalid label: {base!r}")

    return issues


# ── 메인 검토 함수 ────────────────────────────────────────
def review(records, label):
    total = len(records)
    if total == 0:
        print(f"{label}: 파일 없거나 레코드 0개")
        return {}

    pt_counter      = Counter()
    pattern_counter = Counter()
    seq_counter     = Counter()
    skill_counter   = Counter()
    cp_len_counter  = Counter()
    issue_records   = []
    ambiguous       = 0

    for r in records:
        pt = r.get("passage_type", "MISSING")
        pt_counter[pt] += 1
        pattern_counter[r.get("passage_structure_pattern", "MISSING")] += 1
        seq_counter[r.get("sequence_simple", "")] += 1
        skill_counter[r.get("skill", "")] += 1
        cp_len_counter[r.get("cp_count", 0)] += 1
        if r.get("ambiguous_flag"):
            ambiguous += 1

        issues = check_record(r)
        if issues:
            issue_records.append({
                "id": r.get("id") or r.get("metadata", {}).get("question_id", "?"),
                "issues": issues,
                "seq": r.get("sequence_simple", ""),
            })

    # 커버리지 계산
    top15 = seq_counter.most_common(15)
    top15_cov = sum(v for _, v in top15)

    lines = [f"\n{'='*60}", f"  {label} 검토 결과 ({total}개)", f"{'='*60}"]

    # 1. Passage Type 분포
    lines.append("\n[1] Passage Type 분포")
    for pt, cnt in pt_counter.most_common():
        bar = "█" * int(cnt / total * 30)
        lines.append(f"  {pt:5s}: {cnt:4d} ({cnt/total*100:5.1f}%)  {bar}")
    if "MISSING" in pt_counter:
        lines.append("  ⚠️  MISSING 있음 — passage_type 필드 누락")

    # 2. Structure Pattern 분포
    lines.append("\n[2] Passage Structure Pattern 분포")
    for pat, cnt in pattern_counter.most_common():
        bar = "█" * int(cnt / total * 20)
        lines.append(f"  {pat:20s}: {cnt:4d} ({cnt/total*100:5.1f}%)  {bar}")

    # 3. 시퀀스 커버리지
    lines.append(f"\n[3] 시퀀스 다양성")
    lines.append(f"  고유 시퀀스 수: {len(seq_counter)}개")
    lines.append(f"  Top 15 커버리지: {top15_cov}/{total} ({top15_cov/total*100:.1f}%)")
    lines.append("  Top 15 시퀀스:")
    for seq, cnt in top15:
        lines.append(f"    {cnt:3d}회  {seq}")

    # 4. CP 길이 분포
    lines.append("\n[4] CP 개수 분포")
    for length in sorted(cp_len_counter):
        cnt = cp_len_counter[length]
        lines.append(f"  CP {length}개: {cnt:4d} ({cnt/total*100:.1f}%)")

    # 5. 오류/경고
    lines.append(f"\n[5] 품질 검토")
    lines.append(f"  Ambiguous 레코드: {ambiguous}개 ({ambiguous/total*100:.1f}%)")
    lines.append(f"  검증 실패 레코드: {len(issue_records)}개 ({len(issue_records)/total*100:.1f}%)")
    if issue_records:
        lines.append("  검증 실패 샘플 (최대 5개):")
        for ir in issue_records[:5]:
            lines.append(f"    id={ir['id']} seq={ir['seq']}")
            for iss in ir["issues"]:
                lines.append(f"      ⚠️  {iss}")

    # 6. skill별 분포
    lines.append("\n[6] Skill별 레코드 수")
    for skill, cnt in skill_counter.most_common():
        lines.append(f"  {skill[:50]:50s}: {cnt}")

    # 7. 판정
    lines.append("\n[7] 종합 판정")
    coverage_ok = top15_cov / total >= 0.50
    type_ok     = all(pt_counter.get(t, 0) > 0 for t in ("ARG", "EXP"))
    error_ok    = len(issue_records) / total < 0.05
    ambig_ok    = ambiguous / total < 0.10

    judgements = [
        ("Top 15 커버리지 ≥ 50%", coverage_ok, f"{top15_cov/total*100:.1f}%"),
        ("ARG+EXP 모두 존재",      type_ok,     str(dict(pt_counter))),
        ("검증 실패 < 5%",         error_ok,    f"{len(issue_records)/total*100:.1f}%"),
        ("Ambiguous < 10%",       ambig_ok,    f"{ambiguous/total*100:.1f}%"),
    ]
    all_pass = all(ok for _, ok, _ in judgements)
    for name, ok, val in judgements:
        icon = "✅" if ok else "❌"
        lines.append(f"  {icon} {name}: {val}")
    lines.append(f"\n  {'✅ 전체 통과' if all_pass else '❌ 일부 미통과 — 확인 필요'}")

    report = "\n".join(lines)
    print(report)

    return {
        "total": total,
        "issue_count": len(issue_records),
        "ambiguous": ambiguous,
        "top15_coverage": top15_cov / total,
        "all_pass": all_pass,
        "pt_counter": dict(pt_counter),
        "pattern_counter": dict(pattern_counter),
        "unique_sequences": len(seq_counter),
    }


# ── 샘플 출력 ─────────────────────────────────────────────
def show_samples(records, n=10):
    sample = random.sample(records, min(n, len(records)))
    for i, r in enumerate(sample, 1):
        qid   = r.get("id") or r.get("metadata", {}).get("question_id", "?")
        skill = r.get("skill") or r.get("metadata", {}).get("skill", "")
        diff  = r.get("difficulty") or r.get("metadata", {}).get("difficulty", "")
        print(f"\n{'─'*60}")
        print(f"[{i}] id={qid} | {skill} | {diff}")
        print(f"    Passage type: {r.get('passage_type')}  |  Pattern: {r.get('passage_structure_pattern')}")
        print(f"    Sequence: {r.get('sequence_simple')}")
        passage = r.get("passage") or r.get("content", {}).get("passage", "")
        print(f"    Passage: {passage[:120]}...")
        print("    CPs:")
        for cp in r.get("cps", []):
            conn = cp.get("connector_to_next") or ""
            print(f"      [{cp['label_full']:10s}] {cp['text'][:70]}")
            if conn:
                print(f"             → {conn}")
        if r.get("ambiguous_flag"):
            print(f"    ⚠️  Ambiguous: {r['ambiguous_flag']}")


# ── 에러 로그 요약 ────────────────────────────────────────
def show_error_summary():
    records = load_jsonl(ERROR_LOG)
    if not records:
        print("\n에러 로그 없음")
        return
    reason_counter = Counter(r.get("reason", "") for r in records)
    print(f"\n에러 로그 총 {len(records)}개:")
    for reason, cnt in reason_counter.most_common():
        print(f"  {cnt:3d}건  {reason}")


# ── 메인 ─────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("mode", choices=["baseline", "new", "all", "sample"])
    parser.add_argument("n", nargs="?", type=int, default=10,
                        help="샘플 수 (sample 모드에서 사용)")
    parser.add_argument("--save", action="store_true",
                        help="검토 결과를 cp_review_report.md로 저장")
    args = parser.parse_args()

    if args.mode == "sample":
        baseline = load_jsonl(OUTPUT_BASELINE)
        new      = load_jsonl(OUTPUT_NEW)
        all_recs = baseline + new
        if not all_recs:
            print("분석 결과 파일 없음")
            return
        show_samples(all_recs, args.n)
        return

    if args.mode in ("baseline", "all"):
        b = load_jsonl(OUTPUT_BASELINE)
        review(b, "baseline")

    if args.mode in ("new", "all"):
        n = load_jsonl(OUTPUT_NEW)
        review(n, "신규 98")

    if args.mode == "all":
        combined = load_jsonl(OUTPUT_BASELINE) + load_jsonl(OUTPUT_NEW)
        print(f"\n{'='*60}")
        print(f"  합산 ({len(combined)}개)")
        review(combined, "전체")

    show_error_summary()


if __name__ == "__main__":
    main()
