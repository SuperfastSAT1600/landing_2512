"""
sequence_full × 오답 패턴 상관관계 분석
출력: analysis_sequence_wronganswer.json + 콘솔 요약
"""
import json
from collections import Counter, defaultdict
from pathlib import Path

# ── 1. CP 데이터 로드 ──────────────────────────────────────────
CP_FILES = [
    "baseline_cp_analysis.jsonl",
    "qb_rw_98_cp_analysis.jsonl",
    "cross_text_new_5_cp_analysis.jsonl",
    "missing_cp_analysis.jsonl",
    "retry_14_cp_analysis.jsonl",
]

seq_map = {}
for fname in CP_FILES:
    p = Path(fname)
    if not p.exists():
        continue
    with open(p) as f:
        for line in f:
            r = json.loads(line)
            qid = r.get("id") or (r.get("metadata") or {}).get("question_id", "")
            if not qid or qid in seq_map:
                continue
            seq_full = r.get("sequence_full", "") or ""
            # passage_type: CROSS / ARG / EXP / LIT
            if seq_full.startswith("CROSS"):
                pt = "CROSS"
            else:
                pt = seq_full.split("_")[0] if seq_full else ""

            seq_map[qid] = {
                "sequence_full": seq_full,
                "sequence_simple": r.get("sequence_simple", "") or "",
                "passage_type": pt,
                "structure_pattern": r.get("passage_structure_pattern", "") or "",
                "cp_count": r.get("cp_count", 0) or 0,
                "skill": r.get("skill", "") or (r.get("metadata") or {}).get("skill", ""),
                "difficulty": r.get("difficulty", "") or (r.get("metadata") or {}).get("difficulty", ""),
            }

# ── 2. 오답 데이터 로드 & 조인 ────────────────────────────────
with open("wrong_answer_patterns.jsonl") as f:
    wrongs = [json.loads(l) for l in f]

# 카테고리 정규화 (대소문자 통일)
def normalize_cat(c):
    return c.strip().title() if c else "Unknown"

joined = []
for w in wrongs:
    info = seq_map.get(w["question_id"])
    if not info:
        continue
    joined.append({
        "question_id": w["question_id"],
        "skill": info["skill"],
        "difficulty": info["difficulty"],
        "passage_type": info["passage_type"],
        "structure_pattern": info["structure_pattern"],
        "sequence_simple": info["sequence_simple"],
        "cp_count": info["cp_count"],
        "wrong_category": normalize_cat(w.get("category", "")),
    })

print(f"분석 대상: {len(joined):,}개 오답 레코드 (전체 {len(wrongs):,}개 중 {len(joined)/len(wrongs)*100:.1f}% 매칭)")
print()

# ── 3. 분석 헬퍼 ──────────────────────────────────────────────
CATEGORIES = [
    "Partial Match", "Out Of Scope", "Contradiction",
    "Distortion", "Misattribution", "Pre-Pivot Reading",
    "Overgeneralization", "Degree Error",
]

def pct_table(counter, total):
    """카운터 → {cat: count, pct} 딕셔너리"""
    result = {}
    for cat in CATEGORIES:
        cnt = counter.get(cat, 0)
        result[cat] = {"count": cnt, "pct": round(cnt / total * 100, 1) if total else 0}
    return result

def top_cats(counter, n=3):
    return [k for k, _ in counter.most_common(n)]

def sep(title=""):
    line = "─" * 58
    if title:
        print(f"\n{'━'*58}")
        print(f"  {title}")
        print(f"{'━'*58}")
    else:
        print(line)

# ── 4. 분석 A: passage_type별 ─────────────────────────────────
sep("A. Passage Type별 오답 분포")

type_data = defaultdict(list)
for r in joined:
    type_data[r["passage_type"]].append(r["wrong_category"])

pt_results = {}
for pt in ["ARG", "EXP", "LIT", "CROSS", ""]:
    cats = type_data.get(pt, [])
    if not cats:
        continue
    cnt = Counter(cats)
    label = pt if pt else "(없음)"
    print(f"\n  [{label}] 총 {len(cats):,}개")
    for cat, n in cnt.most_common(4):
        print(f"    {cat:<22} {n:4d}개  ({n/len(cats)*100:.1f}%)")
    pt_results[label] = pct_table(cnt, len(cats))
    pt_results[label]["_total"] = len(cats)
    pt_results[label]["_top3"] = top_cats(cnt)

# ── 5. 분석 B: structure_pattern별 ───────────────────────────
sep("B. Structure Pattern별 오답 분포")

pattern_data = defaultdict(list)
for r in joined:
    p = r["structure_pattern"] or "(미분류)"
    pattern_data[p].append(r["wrong_category"])

sp_results = {}
patterns_sorted = sorted(pattern_data.items(), key=lambda x: -len(x[1]))
for pat, cats in patterns_sorted:
    if len(cats) < 10:
        continue
    cnt = Counter(cats)
    top1 = cnt.most_common(1)[0]
    top3 = top_cats(cnt)
    print(f"\n  [{pat}] {len(cats):,}개")
    for cat, n in cnt.most_common(3):
        print(f"    {cat:<22} {n:4d}개  ({n/len(cats)*100:.1f}%)")
    sp_results[pat] = pct_table(cnt, len(cats))
    sp_results[pat]["_total"] = len(cats)
    sp_results[pat]["_top3"] = top3

# ── 6. 분석 C: skill별 ────────────────────────────────────────
sep("C. Skill별 오답 분포")

skill_data = defaultdict(list)
for r in joined:
    skill_data[r["skill"]].append(r["wrong_category"])

sk_results = {}
for skill, cats in sorted(skill_data.items(), key=lambda x: -len(x[1])):
    cnt = Counter(cats)
    top3 = top_cats(cnt)
    print(f"\n  [{skill or '(없음)'}] {len(cats):,}개")
    for cat, n in cnt.most_common(3):
        print(f"    {cat:<22} {n:4d}개  ({n/len(cats)*100:.1f}%)")
    sk_results[skill or "(없음)"] = pct_table(cnt, len(cats))
    sk_results[skill or "(없음)"]["_total"] = len(cats)
    sk_results[skill or "(없음)"]["_top3"] = top3

# ── 7. 분석 D: CP 개수별 ──────────────────────────────────────
sep("D. CP 개수(지문 길이)별 오답 분포")

cp_bucket_data = defaultdict(list)
for r in joined:
    cp = r["cp_count"]
    if cp <= 2:
        bucket = "1-2 CPs (짧은 지문)"
    elif cp <= 4:
        bucket = "3-4 CPs (중간)"
    elif cp <= 6:
        bucket = "5-6 CPs (긴 지문)"
    else:
        bucket = "7+ CPs (매우 긴)"
    cp_bucket_data[bucket].append(r["wrong_category"])

cp_results = {}
for bucket in ["1-2 CPs (짧은 지문)", "3-4 CPs (중간)", "5-6 CPs (긴 지문)", "7+ CPs (매우 긴)"]:
    cats = cp_bucket_data.get(bucket, [])
    if not cats:
        continue
    cnt = Counter(cats)
    print(f"\n  [{bucket}] {len(cats):,}개")
    for cat, n in cnt.most_common(3):
        print(f"    {cat:<22} {n:4d}개  ({n/len(cats)*100:.1f}%)")
    cp_results[bucket] = pct_table(cnt, len(cats))
    cp_results[bucket]["_total"] = len(cats)
    cp_results[bucket]["_top3"] = top_cats(cnt)

# ── 8. 분석 E: difficulty별 ──────────────────────────────────
sep("E. 난이도별 오답 분포")

diff_data = defaultdict(list)
for r in joined:
    diff_data[r["difficulty"] or "(없음)"].append(r["wrong_category"])

diff_results = {}
for diff in ["Easy", "Medium", "Hard", "(없음)"]:
    cats = diff_data.get(diff, [])
    if not cats:
        continue
    cnt = Counter(cats)
    print(f"\n  [{diff}] {len(cats):,}개")
    for cat, n in cnt.most_common(3):
        print(f"    {cat:<22} {n:4d}개  ({n/len(cats)*100:.1f}%)")
    diff_results[diff] = pct_table(cnt, len(cats))
    diff_results[diff]["_total"] = len(cats)
    diff_results[diff]["_top3"] = top_cats(cnt)

# ── 9. 분석 F: sequence_simple 상위 패턴별 ───────────────────
sep("F. 자주 나오는 Sequence 패턴 Top 10 × 오답 유형")

seq_data = defaultdict(list)
for r in joined:
    s = r["sequence_simple"]
    if s:
        seq_data[s].append(r["wrong_category"])

seq_results = {}
print()
for seq, cats in sorted(seq_data.items(), key=lambda x: -len(x[1]))[:10]:
    cnt = Counter(cats)
    top1 = cnt.most_common(1)[0]
    print(f"  {seq}")
    print(f"    → {len(cats)}개 오답  |  최다: {top1[0]} ({top1[1]/len(cats)*100:.0f}%)")
    seq_results[seq] = pct_table(cnt, len(cats))
    seq_results[seq]["_total"] = len(cats)
    seq_results[seq]["_top3"] = top_cats(cnt)

# ── 10. 결과 저장 ─────────────────────────────────────────────
output = {
    "summary": {
        "total_wrong_records": len(wrongs),
        "matched_records": len(joined),
        "match_rate_pct": round(len(joined)/len(wrongs)*100, 1),
    },
    "by_passage_type": pt_results,
    "by_structure_pattern": sp_results,
    "by_skill": sk_results,
    "by_cp_count": cp_results,
    "by_difficulty": diff_results,
    "by_sequence_simple_top10": seq_results,
}

out_path = Path("analysis_sequence_wronganswer.json")
with open(out_path, "w") as f:
    json.dump(output, f, ensure_ascii=False, indent=2)

sep()
print(f"\n결과 저장 완료: {out_path}")
