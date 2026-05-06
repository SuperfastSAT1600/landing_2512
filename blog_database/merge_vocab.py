"""
vocab 최종 통합 — v1~v4 결과 병합
출력: vocab_master.json + vocab_master_top300.json
"""
import json, math
from pathlib import Path
from collections import defaultdict

base = Path(__file__).parent

# ── 각 버전 로드 ─────────────────────────────────────────────────
def load_version(fname, key):
    p = base / fname
    if not p.exists():
        return {}
    with open(p) as f:
        data = json.load(f)
    return {item["word"]: item for item in data.get(key, [])}

v1 = load_version("vocab_v1_structural.json",    "words_by_frequency")
v2 = load_version("vocab_v2_hard_weighted.json", "words_by_composite")
v3 = load_version("vocab_v3_wrong_anchored.json","words_by_wrong_anchor")
v4 = load_version("vocab_v4_llm.json",           "words_by_frequency")

# 보기 단어 로드 (빈칸형 / 서술형 분리)
choices_data = {}
choices_path = base / "vocab_choices.json"
if choices_path.exists():
    with open(choices_path) as f:
        raw = json.load(f)
    for item in raw.get("words", []):
        choices_data[item["word"]] = item

all_words = set(v1) | set(v2) | set(v3) | set(v4) | set(choices_data)
print(f"v1: {len(v1):,}  v2: {len(v2):,}  v3: {len(v3):,}  v4: {len(v4):,}  choices: {len(choices_data):,}")
print(f"전체 고유 단어: {len(all_words):,}개")

# ── 통합 ─────────────────────────────────────────────────────────
results = []
for word in all_words:
    in_v1 = word in v1
    in_v2 = word in v2
    in_v3 = word in v3
    in_v4 = word in v4
    in_choices = word in choices_data
    version_count = sum([in_v1, in_v2, in_v3, in_v4])

    # 기본 데이터는 가장 상세한 버전에서 가져옴
    base_data = v2.get(word) or v3.get(word) or v1.get(word) or v4.get(word) or {}

    total_count  = base_data.get("total_count", 0)
    hard_ratio   = base_data.get("hard_ratio", 0)
    skill_div    = base_data.get("skill_diversity", 1)
    top_label    = base_data.get("top_label", "")
    diff_dist    = base_data.get("difficulty_dist", {})
    examples     = base_data.get("examples", [])
    label_dist   = base_data.get("label_dist", {})

    # v3 오답 연결
    wrong_cats = []
    if word in v3:
        wrong_cats = v3[word].get("top_wrong_categories", [])

    # v2 복합 점수
    composite_score = v2[word]["composite_score"] if in_v2 else 0

    # v3 anchor 점수
    anchor_score = v3[word]["wrong_anchor_score"] if in_v3 else 0

    # v4 LLM 출현 횟수
    llm_count = v4[word]["total_count"] if in_v4 else 0

    # 보기(choices) 데이터
    blank_fill_count  = choices_data[word].get("blank_fill_count", 0) if in_choices else 0
    desc_count        = choices_data[word].get("descriptive_count", 0) if in_choices else 0
    is_blank_fill     = blank_fill_count > 0

    # 신뢰도 점수 (여러 버전에 나올수록 높음)
    # v4(LLM)는 가중치 0.5x 보너스 (LLM이 직접 선택한 단어)
    confidence = version_count + (0.5 if in_v4 else 0)

    # 최종 마스터 점수:
    #   blank_fill 보기 단어: +2.0 고정 보너스 (직접 시험에 나오는 단어 — 최우선)
    #   복합 점수 + anchor + LLM 보너스 + 버전 수
    blank_fill_bonus = math.log(blank_fill_count + 1) * 2.0 if blank_fill_count else 0
    master_score = round(
        composite_score * 3
        + anchor_score * 2
        + (math.log(llm_count + 1) * 0.5 if llm_count else 0)
        + confidence * 0.1
        + blank_fill_bonus,
        4
    )

    results.append({
        "word": word,
        "master_score": master_score,
        "confidence": confidence,
        "version_count": version_count,
        "in_versions": {
            "v1_structural": in_v1,
            "v2_hard_weighted": in_v2,
            "v3_wrong_anchored": in_v3,
            "v4_llm": in_v4,
            "choices": in_choices,
        },
        "is_blank_fill": is_blank_fill,
        "blank_fill_count": blank_fill_count,
        "descriptive_count": desc_count,
        "total_count": total_count,
        "hard_ratio": hard_ratio,
        "skill_diversity": skill_div,
        "composite_score": composite_score,
        "wrong_anchor_score": anchor_score,
        "llm_count": llm_count,
        "top_label": top_label,
        "label_dist": label_dist,
        "difficulty_dist": diff_dist,
        "top_wrong_categories": wrong_cats,
        "examples": examples[:2],
    })

results.sort(key=lambda x: -x["master_score"])

# 버전 3개 이상 교집합 (고신뢰도)
high_confidence = [r for r in results if r["version_count"] >= 3]
blank_fill_words = [r for r in results if r["is_blank_fill"]]
print(f"버전 3+ 교집합 (고신뢰도): {len(high_confidence):,}개")
print(f"빈칸형 보기 단어 (직접 시험): {len(blank_fill_words):,}개")

output_full = {
    "meta": {
        "total_words": len(results),
        "high_confidence_words": len(high_confidence),
        "blank_fill_words": len(blank_fill_words),
        "version_sizes": {
            "v1": len(v1), "v2": len(v2), "v3": len(v3), "v4": len(v4),
            "choices": len(choices_data),
        },
        "master_score_formula": (
            "composite×3 + anchor×2 + log(llm+1)×0.5 + confidence×0.1"
            " + log(blank_fill+1)×2.0"
        ),
    },
    "all_words": results,
    "high_confidence": high_confidence,
    "blank_fill": blank_fill_words,
}

out_path = base / "vocab_master.json"
with open(out_path, "w", encoding="utf-8") as f:
    json.dump(output_full, f, ensure_ascii=False, indent=2)
print(f"저장: {out_path}")

# Top 300 (교육용 핵심 목록)
top300 = results[:300]
out_top = base / "vocab_master_top300.json"
with open(out_top, "w", encoding="utf-8") as f:
    json.dump({
        "meta": {"description": "SAT RW 핵심 300 단어 — 구조 위치 + Hard 가중치 + 오답 역산 + LLM 복합 선정"},
        "words": top300,
    }, f, ensure_ascii=False, indent=2)
print(f"저장: {out_top} (Top 300)")

# ── 콘솔 요약 ───────────────────────────────────────────────────
print()
print("── 마스터 점수 Top 60 ──────────────────────────")
for item in results[:60]:
    vers = ("v1" if item["in_versions"]["v1_structural"] else "  ") + \
           ("v2" if item["in_versions"]["v2_hard_weighted"] else "  ") + \
           ("v3" if item["in_versions"]["v3_wrong_anchored"] else "  ") + \
           ("v4" if item["in_versions"]["v4_llm"] else "  ") + \
           ("Ch" if item["in_versions"]["choices"] else "  ")
    bf = f"BF:{item['blank_fill_count']}" if item["is_blank_fill"] else ""
    w1 = item["top_wrong_categories"][0]["category"][:15] if item["top_wrong_categories"] else "-"
    print(f"  {item['word']:<28} score:{item['master_score']:6.3f}  "
          f"[{vers}]  H:{item['hard_ratio']*100:.0f}%  "
          f"skills:{item['skill_diversity']}  {bf}  {w1}")

print()
print("── 고신뢰도 단어 (v3+ 교집합) ─────────────────")
for item in high_confidence[:30]:
    w1 = item["top_wrong_categories"][0]["category"][:20] if item["top_wrong_categories"] else "-"
    print(f"  {item['word']:<28} v:{item['version_count']}  "
          f"H:{item['hard_ratio']*100:.0f}%  {w1}  [{item['top_label']}]")
