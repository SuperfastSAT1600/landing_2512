"""
5-dimension comparison: existing 1,511 RW questions vs new 98 questions
"""
import sys
import json
from collections import Counter

sys.stdout.reconfigure(encoding='utf-8')

BASELINE = "../master_sat_ontology_v2.jsonl"
NEW_FILE = "qb_rw_98_parsed.jsonl"


def load_jsonl(path):
    records = []
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                records.append(json.loads(line))
    return records


def get_field(record, *keys, default="Unknown"):
    val = record
    for k in keys:
        if isinstance(val, dict):
            val = val.get(k, None)
        else:
            return default
    return val if val else default


def pct(count, total):
    return f"{count:3d} ({count/total*100:.1f}%)"


def print_comparison(label, baseline_counter, new_counter, baseline_total, new_total):
    all_keys = sorted(set(list(baseline_counter.keys()) + list(new_counter.keys())))
    print(f"\n{'─'*60}")
    print(f"  {label}")
    print(f"{'─'*60}")
    print(f"  {'항목':<40} {'기존':>12} {'신규(98)':>12}")
    print(f"  {'─'*40} {'─'*12} {'─'*12}")
    for k in all_keys:
        b = baseline_counter.get(k, 0)
        n = new_counter.get(k, 0)
        b_str = pct(b, baseline_total)
        n_str = pct(n, new_total)
        flag = " ◀ NEW" if b == 0 and n > 0 else (" ▲" if n/new_total > b/baseline_total + 0.05 else "")
        print(f"  {k:<40} {b_str:>12} {n_str:>12}{flag}")


def analyze():
    print("Loading data...")
    baseline_all = load_jsonl(BASELINE)
    baseline = [r for r in baseline_all if r.get("domain") == "Reading and Writing"]
    new_qs = load_jsonl(NEW_FILE)

    print(f"Baseline RW: {len(baseline)} questions")
    print(f"New QB RW98: {len(new_qs)} questions")

    # skill 이름 정규화 (기존: "Craft and Structure Words in Context" -> "Words in Context")
    def normalize_skill(s):
        prefixes = ["Craft and Structure ", "Information and Ideas ", "Expression of Ideas ",
                    "Standard English Conventions "]
        for p in prefixes:
            if s.startswith(p):
                return s[len(p):]
        return s

    # 1. Skill 분포
    b_skill = Counter(normalize_skill(get_field(r, "skill")) for r in baseline)
    n_skill = Counter(get_field(r, "metadata", "skill") for r in new_qs)
    print_comparison("1. SKILL 분포", b_skill, n_skill, len(baseline), len(new_qs))

    # ── 2. Difficulty 분포 ───────────────────────────────────────
    b_diff = Counter(get_field(r, "difficulty") for r in baseline)
    n_diff = Counter(get_field(r, "metadata", "difficulty") for r in new_qs)
    print_comparison("2. DIFFICULTY 분포", b_diff, n_diff, len(baseline), len(new_qs))

    # ── 3. Passage Topic 분포 ────────────────────────────────────
    def b_topic(r):
        t = get_field(r, "knowledge_graph", "passage_topic")
        if t == "Unknown":
            t = get_field(r, "analysis", "passage_topic")
        return t
    b_top = Counter(b_topic(r) for r in baseline)
    n_top = Counter(get_field(r, "analysis", "passage_topic") for r in new_qs)
    # Top 15만 출력
    top15_keys = [k for k, _ in (b_top + n_top).most_common(15)]
    print_comparison("3. PASSAGE TOPIC 분포 (Top 15)",
                     Counter({k: b_top[k] for k in top15_keys}),
                     Counter({k: n_top[k] for k in top15_keys}),
                     len(baseline), len(new_qs))

    # 4. 정답 개념 (신규만)
    concepts = [get_field(r, "analysis", "correct_answer_concept") for r in new_qs]
    print(f"\n{'='*60}")
    print("  4. 정답 이유 개념 (신규 문제 - 전체 목록)")
    print(f"{'='*60}")
    for i, c in enumerate(concepts, 1):
        qid = get_field(new_qs[i-1], "metadata", "question_id")
        skill = get_field(new_qs[i-1], "metadata", "skill")
        diff = get_field(new_qs[i-1], "metadata", "difficulty")
        print(f"  [{i:02d}] [{diff}/{skill[:20]}] {c[:100]}")

    # 5. 오답 패턴 요약 (신규만)
    wrong_patterns = []
    for r in new_qs:
        correct = get_field(r, "content", "correct_answer")
        analysis = get_field(r, "analysis", "incorrect_answer_analysis", default={})
        if isinstance(analysis, dict):
            for letter, reason in analysis.items():
                if letter != correct and reason:
                    wrong_patterns.append(reason)

    # 키워드 빈도로 패턴 파악
    keywords = ["too extreme", "out of scope", "contradicts", "too broad", "too narrow",
                "not supported", "distortion", "opposite", "irrelevant", "partially"]
    pattern_count = Counter()
    for p in wrong_patterns:
        p_lower = p.lower()
        for kw in keywords:
            if kw in p_lower:
                pattern_count[kw] += 1

    print(f"\n{'─'*60}")
    print("  5. 오답 패턴 키워드 빈도 (신규 98문제)")
    print(f"{'─'*60}")
    for kw, cnt in pattern_count.most_common():
        print(f"  {kw:<25} {cnt:3d}회")

    print(f"\n{'═'*60}")
    print("  분석 완료")
    print(f"{'═'*60}")


if __name__ == "__main__":
    analyze()
