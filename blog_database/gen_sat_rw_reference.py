"""
SAT RW 분석 결과 → sat_rw_reference.json + sat_rw_reference.md 생성
실행: python3 gen_sat_rw_reference.py
"""
import json, re
from pathlib import Path
from collections import Counter, defaultdict

base = Path(__file__).parent

# ── 1. CP 파일 로드 ──────────────────────────────────────────────
CP_FILES = [
    "baseline_cp_analysis.jsonl",
    "qb_rw_98_cp_analysis.jsonl",
    "cross_text_new_5_cp_analysis.jsonl",
    "missing_cp_analysis.jsonl",
    "retry_14_cp_analysis.jsonl",
]

rows = []
seen = set()
for fname in CP_FILES:
    p = base / fname
    if not p.exists():
        continue
    with open(p) as f:
        for line in f:
            r = json.loads(line)
            qid = r.get("id") or (r.get("metadata") or {}).get("question_id", "")
            if not qid or qid in seen:
                continue
            seen.add(qid)
            rows.append(r)

print(f"로드된 CP 레코드: {len(rows):,}개")

# ── 2. 헬퍼 ─────────────────────────────────────────────────────
def get_skill(r):
    return r.get("skill") or (r.get("metadata") or {}).get("skill", "") or ""

def get_diff(r):
    return r.get("difficulty") or (r.get("metadata") or {}).get("difficulty", "") or ""

def get_seq_full(r):
    return r.get("sequence_full", "") or ""

def simplify_label(label_full: str) -> str:
    return label_full.split("_")[0] if "_" in label_full else label_full

def seq_to_simple(seq_full: str) -> str:
    if seq_full.startswith("CROSS_"):
        return seq_full  # Cross-Text: 이미 별도 포맷
    parts = seq_full.split("_", 1)
    if len(parts) < 2:
        return seq_full
    pt, labels_str = parts[0], parts[1]
    simples = [simplify_label(l) for l in labels_str.split("-")]
    return pt + "_" + "-".join(simples)

ARC_ROLES = {"I": "I", "C": "C", "CL": "CL"}
def to_arc_role(label_full: str) -> str:
    base_label = label_full.split("_")[0]
    if base_label == "CL":
        return "CL"
    if base_label.startswith("C"):
        return "C"
    # _rb suffix → RB (rebuttal from other)
    if label_full.endswith("_rb"):
        return "RB"
    # _ct suffix → CT (counter-thesis)
    if label_full.endswith("_ct"):
        return "CT"
    return "I"

def seq_to_arc(seq_full: str) -> str:
    if seq_full.startswith("CROSS_"):
        return seq_full
    parts = seq_full.split("_", 1)
    if len(parts) < 2:
        return seq_full
    pt, labels_str = parts[0], parts[1]
    arc_roles = [to_arc_role(l) for l in labels_str.split("-")]
    # dedup consecutive
    deduped = [arc_roles[0]]
    for r in arc_roles[1:]:
        if r != deduped[-1]:
            deduped.append(r)
    return pt + "_" + "-".join(deduped)

# ── 3. 시퀀스 통계 집계 ──────────────────────────────────────────
seq_full_counter = Counter()
seq_simple_counter = Counter()
arc_counter = Counter()
arc_by_pattern = defaultdict(Counter)
difficulty_by_seq = defaultdict(Counter)
skill_by_seq = defaultdict(Counter)

for r in rows:
    sf = get_seq_full(r)
    if not sf:
        continue
    ss = seq_to_simple(sf)
    arc = seq_to_arc(sf)
    pt = r.get("passage_structure_pattern", "") or ""
    diff = get_diff(r)
    skill = get_skill(r)

    seq_full_counter[sf] += 1
    seq_simple_counter[ss] += 1
    arc_counter[arc] += 1
    if pt:
        arc_by_pattern[pt][arc] += 1
    difficulty_by_seq[sf][diff or "Unknown"] += 1
    skill_by_seq[sf][skill or "Unknown"] += 1

print(f"sequence_full 종류: {len(seq_full_counter):,}개")
print(f"sequence_simple 종류: {len(seq_simple_counter):,}개")
print(f"arc_collapsed 종류: {len(arc_counter):,}개")

# ── 4. Hard 중심 시퀀스 ───────────────────────────────────────────
hard_seqs = {}
for sf, diff_cnt in difficulty_by_seq.items():
    hard_n = diff_cnt.get("Hard", 0)
    total_n = seq_full_counter[sf]
    if hard_n >= 5:
        hard_seqs[sf] = {
            "count": total_n,
            "hard_count": hard_n,
            "hard_pct": round(hard_n / total_n * 100, 1),
        }

hard_seqs_sorted = sorted(hard_seqs.items(), key=lambda x: -x[1]["hard_count"])
print(f"Hard 집중 시퀀스(≥5개): {len(hard_seqs)}개")

# ── 5. 오답 패턴 데이터 로드 ─────────────────────────────────────
wrong_path = base / "wrong_answer_patterns.jsonl"
wrong_by_seq = defaultdict(Counter)
wrong_by_pt = defaultdict(Counter)
wrong_by_skill = defaultdict(Counter)
wrong_by_diff = defaultdict(Counter)

id_to_seq = {}
id_to_pattern = {}
id_to_diff = {}
id_to_skill = {}
for r in rows:
    qid = r.get("id") or (r.get("metadata") or {}).get("question_id", "")
    if qid:
        id_to_seq[qid] = get_seq_full(r)
        id_to_pattern[qid] = r.get("passage_structure_pattern", "") or ""
        id_to_diff[qid] = get_diff(r)
        id_to_skill[qid] = get_skill(r)

wrong_total = 0
wrong_matched = 0
if wrong_path.exists():
    with open(wrong_path) as f:
        for line in f:
            w = json.loads(line)
            wrong_total += 1
            qid = w.get("question_id", "")
            cat = (w.get("category") or "").strip().title()
            if not cat:
                continue
            sf = id_to_seq.get(qid)
            if sf:
                wrong_matched += 1
                wrong_by_seq[sf][cat] += 1
                pt = id_to_pattern.get(qid, "")
                diff = id_to_diff.get(qid, "")
                skill = id_to_skill.get(qid, "")
                if pt:
                    wrong_by_pt[pt][cat] += 1
                if diff:
                    wrong_by_diff[diff][cat] += 1
                if skill:
                    wrong_by_skill[skill][cat] += 1

print(f"오답 패턴: {wrong_total:,}개 중 {wrong_matched:,}개 매칭 ({wrong_matched/wrong_total*100:.1f}%)")

# ── 6. 레이블 명세 ───────────────────────────────────────────────
LABELS = {
    "I":    {"en": "Information", "ko": "정보"},
    "C":    {"en": "Claim", "ko": "주장"},
    "CL":   {"en": "Conclusion", "ko": "결론"},
    "I_bg": {"en": "Background Info", "ko": "배경 정보"},
    "I_sup":{"en": "Supporting Info", "ko": "보완 정보"},
    "I_ex": {"en": "Example Info", "ko": "예시 정보"},
    "I_au": {"en": "Author Info", "ko": "저자 정보"},
    "I_ot": {"en": "Other's Info", "ko": "타인 정보"},
    "C_au": {"en": "Author's Claim", "ko": "저자 주장"},
    "C_ot": {"en": "Other's Claim", "ko": "타인 주장"},
    "C_ct": {"en": "Counter Claim", "ko": "반대 주장"},
    "C_rb": {"en": "Rebuttal Claim", "ko": "재반박 주장"},
    "CL_au":{"en": "Author's Conclusion", "ko": "저자 결론"},
    "CL_ot":{"en": "Other's Conclusion", "ko": "타인 결론"},
}

ARC_LABELS = {
    "I":  {"en": "Information", "ko": "정보"},
    "C":  {"en": "Claim", "ko": "주장"},
    "CL": {"en": "Conclusion", "ko": "결론"},
    "CT": {"en": "Counter-Thesis", "ko": "반대 주장"},
    "RB": {"en": "Rebuttal", "ko": "재반박"},
}

STRUCTURE_PATTERNS = {
    "PURE_INFO":        {"en": "Pure Information", "ko": "순수 정보형"},
    "INFO_TO_CONCL":    {"en": "Info → Conclusion", "ko": "정보→결론형"},
    "CLAIM_EVIDENCE":   {"en": "Claim + Evidence", "ko": "주장+근거형"},
    "CLASSICAL_ARG":    {"en": "Classical Argument", "ko": "고전 논증형"},
    "COUNTER_REBUTTAL": {"en": "Counter + Rebuttal", "ko": "반박+재반박형"},
    "DUAL_CLAIM":       {"en": "Dual Claim", "ko": "이중 주장형"},
}

WRONG_CATEGORIES = {
    "Partial Match":      {"ko": "부분 일치"},
    "Out Of Scope":       {"ko": "범위 초과"},
    "Contradiction":      {"ko": "모순"},
    "Distortion":         {"ko": "왜곡"},
    "Misattribution":     {"ko": "귀인 오류"},
    "Pre-Pivot Reading":  {"ko": "전환 전 독해"},
    "Overgeneralization": {"ko": "과잉 일반화"},
    "Degree Error":       {"ko": "정도 오류"},
}

PASSAGE_TYPES = {
    "ARG": {"en": "Argumentative", "ko": "논증형"},
    "EXP": {"en": "Expository",    "ko": "설명형"},
    "LIT": {"en": "Literary",      "ko": "문학형"},
}

# ── 7. 시퀀스 네이밍 ─────────────────────────────────────────────
PT_KO = {"ARG": "논증형", "EXP": "설명형", "LIT": "문학형"}
PT_EN = {"ARG": "Argument", "EXP": "Expository", "LIT": "Literary"}

ROLE_KO = {
    "I": "정보", "C": "주장", "CL": "결론",
    "I_bg": "배경", "I_sup": "보완", "I_ex": "예시",
    "I_au": "저자정보", "I_ot": "타인정보",
    "C_au": "저자주장", "C_ot": "타인주장",
    "C_ct": "반대주장", "C_rb": "재반박",
    "CL_au": "저자결론", "CL_ot": "타인결론",
}
ROLE_EN = {
    "I": "Info", "C": "Claim", "CL": "Concl",
    "I_bg": "Bg", "I_sup": "Sup", "I_ex": "Ex",
    "I_au": "AuInfo", "I_ot": "OtInfo",
    "C_au": "AuClaim", "C_ot": "OtClaim",
    "C_ct": "Counter", "C_rb": "Rebut",
    "CL_au": "AuConcl", "CL_ot": "OtConcl",
}

def seq_name(seq_full, lang="ko"):
    if seq_full.startswith("CROSS_"):
        inner = seq_full[6:]
        if "_x_" in inner:
            t1, t2 = inner.split("_x_", 1)
            n1 = seq_name(t1, lang)
            n2 = seq_name(t2, lang)
            return f"교차 텍스트: {n1} × {n2}" if lang == "ko" else f"Cross-Text: {n1} × {n2}"
        return seq_full
    parts = seq_full.split("_", 1)
    if len(parts) < 2:
        return seq_full
    pt, labels_str = parts[0], parts[1]
    labels = labels_str.split("-")
    if lang == "ko":
        pt_str = PT_KO.get(pt, pt)
        role_str = "→".join(ROLE_KO.get(l, l) for l in labels)
        return f"{pt_str}: {role_str}"
    else:
        pt_str = PT_EN.get(pt, pt)
        role_str = "→".join(ROLE_EN.get(l, l) for l in labels)
        return f"{pt_str}: {role_str}"

# ── 8. JSON 출력 구성 ────────────────────────────────────────────
WRONG_CATS_LIST = list(WRONG_CATEGORIES.keys())

def top_wrong(counter, n=3):
    total = sum(counter.values())
    if not total:
        return []
    result = []
    for cat, cnt in counter.most_common(n):
        result.append({"category": cat, "count": cnt, "pct": round(cnt/total*100, 1)})
    return result

structure_patterns_json = {}
for pat, info in STRUCTURE_PATTERNS.items():
    pat_count = sum(arc_by_pattern[pat].values()) if pat in arc_by_pattern else 0
    top_arcs = arc_by_pattern[pat].most_common(5) if pat in arc_by_pattern else []
    structure_patterns_json[pat] = {
        "en": info["en"],
        "ko": info["ko"],
        "count": pat_count,
        "top_arcs": [{"arc": a, "count": c} for a, c in top_arcs],
        "top_wrong": top_wrong(wrong_by_pt.get(pat, Counter())),
    }

hard_seqs_json = []
for sf, info in hard_seqs_sorted[:20]:
    hard_seqs_json.append({
        "seq_full": sf,
        "seq_simple": seq_to_simple(sf),
        "arc": seq_to_arc(sf),
        "name_ko": seq_name(sf, "ko"),
        "name_en": seq_name(sf, "en"),
        "count": info["count"],
        "hard_count": info["hard_count"],
        "hard_pct": info["hard_pct"],
        "top_wrong": top_wrong(wrong_by_seq.get(sf, Counter())),
    })

# top 50 sequences
top_seqs_json = []
for sf, cnt in seq_full_counter.most_common(50):
    diff_dist = dict(difficulty_by_seq.get(sf, {}))
    top_seqs_json.append({
        "seq_full": sf,
        "seq_simple": seq_to_simple(sf),
        "arc": seq_to_arc(sf),
        "name_ko": seq_name(sf, "ko"),
        "count": cnt,
        "difficulty": diff_dist,
        "top_wrong": top_wrong(wrong_by_seq.get(sf, Counter())),
    })

# arc collapsed top
arc_top_json = []
for arc, cnt in arc_counter.most_common(56):
    arc_top_json.append({"arc": arc, "count": cnt})

output = {
    "meta": {
        "generated": "2026-04-30",
        "total_rw_questions": len(rows),
        "seq_full_types": len(seq_full_counter),
        "seq_simple_types": len(seq_simple_counter),
        "arc_collapsed_types": len(arc_counter),
        "hard_core_seqs": len(hard_seqs),
        "wrong_total": wrong_total,
        "wrong_matched": wrong_matched,
        "wrong_match_pct": round(wrong_matched/wrong_total*100, 1) if wrong_total else 0,
    },
    "labels": LABELS,
    "arc_roles": ARC_LABELS,
    "passage_types": PASSAGE_TYPES,
    "structure_patterns": structure_patterns_json,
    "wrong_categories": WRONG_CATEGORIES,
    "abstraction_hierarchy": {
        "level_0_structure_pattern": {"types": 6, "desc": "글의 논리 골격 (e.g. CLASSICAL_ARG)"},
        "level_1_arc_collapsed": {"types": len(arc_counter), "desc": "역할 압축 + 연속 중복 제거 (I/C/CT/RB/CL)"},
        "level_2_seq_simple": {"types": len(seq_simple_counter), "desc": "접미사 제거 (I/C/CL)"},
        "level_3_seq_full": {"types": len(seq_full_counter), "desc": "완전한 레이블 시퀀스 (접미사 포함)"},
    },
    "top_sequences_50": top_seqs_json,
    "arc_collapsed_all": arc_top_json,
    "hard_core_sequences": hard_seqs_json,
    "wrong_by_structure_pattern": {
        pat: top_wrong(wrong_by_pt.get(pat, Counter()))
        for pat in STRUCTURE_PATTERNS
    },
    "wrong_by_difficulty": {
        diff: top_wrong(cnt)
        for diff, cnt in sorted(wrong_by_diff.items())
    },
    "wrong_by_skill": {
        skill: top_wrong(cnt)
        for skill, cnt in sorted(wrong_by_skill.items(), key=lambda x: -sum(x[1].values()))[:10]
    },
}

json_path = base / "sat_rw_reference.json"
with open(json_path, "w", encoding="utf-8") as f:
    json.dump(output, f, ensure_ascii=False, indent=2)
print(f"JSON 저장: {json_path}")

# ── 9. Markdown 출력 ─────────────────────────────────────────────
lines = []
def h(n, t): lines.append("#"*n + " " + t)
def p(t=""): lines.append(t)
def sep(): lines.append("---")
def table_row(*cells): lines.append("| " + " | ".join(str(c) for c in cells) + " |")
def table_sep(n): lines.append("| " + " | ".join(["---"]*n) + " |")

h(1, "SAT RW 지문 분석 레퍼런스")
p(f"생성일: 2026-04-30 | 총 {len(rows):,}개 문제 분석")
sep()

h(2, "1. 추상화 계층 (Abstraction Hierarchy)")
p()
p("| 레벨 | 이름 | 종류 수 | 설명 |")
p("| --- | --- | --- | --- |")
p(f"| L0 | structure_pattern | 6 | 글의 논리 골격 (CLASSICAL_ARG 등) |")
p(f"| L1 | arc_collapsed | {len(arc_counter)} | 역할 압축 + 연속 중복 제거 (I/C/CT/RB/CL) |")
p(f"| L2 | sequence_simple | {len(seq_simple_counter)} | 접미사 제거 (I/C/CL만 남김) |")
p(f"| L3 | sequence_full | {len(seq_full_counter)} | 완전한 레이블 시퀀스 (접미사 포함) |")
p()
p("> **핵심 인사이트**: sequence_simple(L2)은 seq_full(384→207)을 거의 압축하지 못함. L1 arc_collapsed가 의미 있는 중간 단계.")
p()

h(2, "2. 레이블 체계")
p()
h(3, "2-1. CP 레이블 (sequence_full 구성 요소)")
p()
p("| 레이블 | 영문 | 한글 | 설명 |")
p("| --- | --- | --- | --- |")
label_descs = {
    "I":    "정보 — 사실/관찰/데이터",
    "I_bg": "배경 정보 — 주제 도입 배경",
    "I_sup":"보완 정보 — 앞 주장/정보 보완",
    "I_ex": "예시 정보 — 구체적 사례",
    "I_au": "저자 정보 — 저자 관련 사실",
    "I_ot": "타인 정보 — 타인 관련 사실",
    "C":    "주장 — 의견/해석/입장",
    "C_au": "저자 주장 — 글쓴이의 핵심 주장",
    "C_ot": "타인 주장 — 타인의 주장 인용",
    "C_ct": "반대 주장 — 저자 입장과 대립",
    "C_rb": "재반박 — 반박에 대한 재반박",
    "CL":   "결론 — 논증 마무리",
    "CL_au":"저자 결론 — 저자의 최종 결론",
    "CL_ot":"타인 결론 — 타인의 최종 결론",
}
for lbl, desc in label_descs.items():
    info = LABELS.get(lbl, {})
    en = info.get("en", lbl)
    ko = info.get("ko", "")
    p(f"| `{lbl}` | {en} | {ko} | {desc} |")
p()

h(3, "2-2. Arc 역할 (arc_collapsed 구성 요소)")
p()
p("| Arc | 영문 | 한글 |")
p("| --- | --- | --- |")
for arc, info in ARC_LABELS.items():
    p(f"| `{arc}` | {info['en']} | {info['ko']} |")
p()

h(2, "3. 구조 패턴 (Structure Pattern) 6종")
p()
p("| 패턴 | 한글 | 문제 수 | 주요 Arc | 주요 오답 |")
p("| --- | --- | --- | --- | --- |")
for pat, info in structure_patterns_json.items():
    top_arc_str = ", ".join(f"{a['arc']}({a['count']})" for a in info["top_arcs"][:3])
    top_wr_str = ", ".join(f"{w['category']}({w['pct']}%)" for w in info["top_wrong"][:2])
    p(f"| `{pat}` | {info['ko']} | {info['count']} | {top_arc_str} | {top_wr_str} |")
p()

h(2, "4. 오답 카테고리 8종")
p()
p("| 카테고리 | 한글 | 설명 |")
p("| --- | --- | --- |")
wrong_descs = {
    "Partial Match":      "지문 내용 일부만 반영, 전체 주장 왜곡",
    "Out Of Scope":       "지문에 없는 내용, 범위 초과",
    "Contradiction":      "지문 내용과 직접 모순",
    "Distortion":         "지문 내용을 과장·축소·비틀기",
    "Misattribution":     "주체 혼동 (저자 vs 타인)",
    "Pre-Pivot Reading":  "전환점 이전 내용만 읽은 오답",
    "Overgeneralization": "특정 사례를 과잉 일반화",
    "Degree Error":       "강도·빈도 표현 오류 (always vs sometimes)",
}
for cat, info in WRONG_CATEGORIES.items():
    desc = wrong_descs.get(cat, "")
    p(f"| {cat} | {info['ko']} | {desc} |")
p()

h(2, "5. Hard 집중 시퀀스 Top 14")
p()
p(f"Hard 문제 ≥5개 보유 시퀀스: {len(hard_seqs)}종")
p()
p("| 시퀀스 | 한글명 | 전체 | Hard | Hard% | 주요 오답 |")
p("| --- | --- | --- | --- | --- | --- |")
for item in hard_seqs_json[:14]:
    top_wr = ", ".join(f"{w['category']}({w['pct']}%)" for w in item["top_wrong"][:2])
    p(f"| `{item['seq_full']}` | {item['name_ko']} | {item['count']} | {item['hard_count']} | {item['hard_pct']}% | {top_wr} |")
p()

h(2, "6. Arc Collapsed 상위 30개")
p()
p("| Arc 시퀀스 | 문제 수 |")
p("| --- | --- |")
for item in arc_top_json[:30]:
    p(f"| `{item['arc']}` | {item['count']} |")
p()

h(2, "7. 오답 패턴 × 난이도")
p()
p("| 난이도 | 1위 오답 | 2위 오답 | 3위 오답 |")
p("| --- | --- | --- | --- |")
for diff in ["Easy", "Medium", "Hard"]:
    top = output["wrong_by_difficulty"].get(diff, [])
    cats = [f"{w['category']}({w['pct']}%)" for w in top[:3]]
    while len(cats) < 3:
        cats.append("-")
    p(f"| {diff} | {cats[0]} | {cats[1]} | {cats[2]} |")
p()

h(2, "8. 오답 패턴 × Skill")
p()
p("| Skill | 1위 오답 | 2위 오답 |")
p("| --- | --- | --- |")
for skill, top in output["wrong_by_skill"].items():
    skill_short = skill.split()[-1] if skill else "Unknown"
    cats = [f"{w['category']}({w['pct']}%)" for w in top[:2]]
    while len(cats) < 2:
        cats.append("-")
    p(f"| {skill_short} | {cats[0]} | {cats[1]} |")
p()

h(2, "9. 빈출 시퀀스 Top 20")
p()
p("| 시퀀스 | 한글명 | 문제 수 | Easy/Medium/Hard |")
p("| --- | --- | --- | --- |")
for item in top_seqs_json[:20]:
    d = item.get("difficulty", {})
    dist = f"E:{d.get('Easy',0)} M:{d.get('Medium',0)} H:{d.get('Hard',0)}"
    p(f"| `{item['seq_full']}` | {item['name_ko']} | {item['count']} | {dist} |")
p()

sep()
p(f"*이 문서는 `gen_sat_rw_reference.py`로 자동 생성됩니다.*")

md_path = base / "sat_rw_reference.md"
with open(md_path, "w", encoding="utf-8") as f:
    f.write("\n".join(lines) + "\n")
print(f"MD 저장: {md_path}")
print("완료.")
