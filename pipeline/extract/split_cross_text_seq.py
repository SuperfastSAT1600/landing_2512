"""
Cross-Text 62개에 Text1/Text2 분리 시퀀싱 적용

각 항목에 추가되는 필드:
- cps[*].text_group: "text1" | "text2"
- text1_sequence, text2_sequence
- sequence_full → "CROSS_{text1_seq}_x_{text2_seq}"
- sequence_simple → "CROSS_{text1_simple}_x_{text2_simple}"
"""
import json
import re
from pathlib import Path


def split_passage(passage: str) -> tuple[str, str]:
    """passage를 Text1 본문과 Text2 본문으로 분리."""
    # 패턴 시도 순서: newline 구분 → 콜론 구분 → 공백 구분
    patterns = [
        r'\n\s*Text\s+2\s*\n',   # "\nText 2\n"
        r'\n\s*Text\s+2\s*:',     # "\nText 2:"
        r'\s+Text\s+2\s*:',       # " Text 2:" (콜론 포함, 공백 앞)
        r'\s+Text\s+2\s*\n',      # " Text 2\n"
    ]
    for pat in patterns:
        match = re.search(pat, passage, re.IGNORECASE)
        if match:
            text1_body = passage[:match.start()]
            # 콜론 포함 패턴이면 콜론 이후부터
            after = passage[match.end():]
            return text1_body.strip(), after.strip()
    return passage.strip(), ""


def get_passage(row: dict) -> str:
    """중첩 구조(content.passage) 또는 직접 passage 필드 반환."""
    direct = row.get("passage", "")
    if direct:
        return direct
    content = row.get("content", {})
    if isinstance(content, dict):
        return content.get("passage", "")
    return ""


def get_skill(row: dict) -> str:
    """중첩 구조(metadata.skill) 또는 직접 skill 필드 반환."""
    direct = row.get("skill", "")
    if direct:
        return direct
    meta = row.get("metadata", {})
    if isinstance(meta, dict):
        return meta.get("skill", "")
    return ""


def assign_text_group(cps: list[dict], text1_body: str, text2_body: str) -> list[dict]:
    """각 CP에 text_group 필드 추가."""
    # 먼저 텍스트 매칭으로 분류
    groups = []
    for cp in cps:
        cp_text = cp.get("text", "").strip()
        # 부분 매칭 (CP 텍스트의 앞 30자로 확인)
        snippet = cp_text[:50]
        if snippet and snippet in text1_body:
            groups.append("text1")
        elif snippet and snippet in text2_body:
            groups.append("text2")
        else:
            groups.append(None)  # fallback 필요

    # fallback: None인 것들은 이웃 그룹 + 순서로 추론
    # 일반적으로 Text1 CPs가 앞에, Text2 CPs가 뒤에 오는 구조
    # None이 있으면 마지막으로 확정된 그룹 기준으로 채움
    last_known = "text1"
    for i, g in enumerate(groups):
        if g is not None:
            last_known = g
        else:
            # 앞뒤 컨텍스트 확인
            next_known = next((groups[j] for j in range(i+1, len(groups)) if groups[j] is not None), None)
            if next_known == "text1":
                groups[i] = "text1"
            elif last_known == "text2":
                groups[i] = "text2"
            else:
                # text1에서 text2로 전환점 근처 → text2로 처리
                groups[i] = "text2"

    result = []
    for cp, group in zip(cps, groups):
        updated = dict(cp)
        updated["text_group"] = group
        result.append(updated)
    return result


def infer_passage_type(cps: list[dict]) -> str:
    """CPs 목록에서 passage_type 추론."""
    labels = [cp.get("label_full", cp.get("label", "")) for cp in cps]
    has_cl = any("CL" in l for l in labels)
    has_c = any(l.startswith("C") and "CL" not in l for l in labels)
    if has_cl:
        return "ARG"
    if has_c:
        return "EXP"
    return "EXP"


def simplify_label(label_full: str) -> str:
    """I_bg → I, C_au → C, CL_au → CL"""
    return label_full.split("_")[0] if "_" in label_full else label_full


def build_sequence(passage_type: str, cps: list[dict]) -> tuple[str, str]:
    """(sequence_full, sequence_simple) 반환."""
    full_parts = [cp.get("label_full", cp.get("label", "")) for cp in cps]
    simple_parts = [simplify_label(l) for l in full_parts]
    seq_full = passage_type + "_" + "-".join(full_parts)
    seq_simple = passage_type + "_" + "-".join(simple_parts)
    return seq_full, seq_simple


def process_record(row: dict) -> dict:
    """Cross-Text 레코드에 분리 시퀀싱 적용."""
    passage = get_passage(row)
    cps = row.get("cps", [])

    if not cps:
        return row

    text1_body, text2_body = split_passage(passage)

    rid = row.get("id") or (row.get("metadata") or {}).get("question_id", "?")
    if not text2_body:
        # Text2 분리 실패 → 원본 유지 + 플래그
        print(f"  [WARN] Text2 분리 실패(passage 불완전): id={rid}")
        updated = dict(row)
        updated["cross_text_split_failed"] = True
        return updated

    updated_cps = assign_text_group(cps, text1_body, text2_body)

    text1_cps = [cp for cp in updated_cps if cp.get("text_group") == "text1"]
    text2_cps = [cp for cp in updated_cps if cp.get("text_group") == "text2"]

    if not text1_cps or not text2_cps:
        print(f"  [WARN] CP 분배 실패(text1={len(text1_cps)}, text2={len(text2_cps)}): id={rid}")
        updated = dict(row)
        updated["cross_text_split_failed"] = True
        return updated

    pt1 = infer_passage_type(text1_cps) if text1_cps else "EXP"
    pt2 = infer_passage_type(text2_cps) if text2_cps else "EXP"

    t1_full, t1_simple = build_sequence(pt1, text1_cps)
    t2_full, t2_simple = build_sequence(pt2, text2_cps)

    updated = dict(row)
    updated["cps"] = updated_cps
    updated["text1_sequence"] = t1_full
    updated["text2_sequence"] = t2_full
    updated["sequence_full"] = f"CROSS_{t1_full}_x_{t2_full}"
    updated["sequence_simple"] = f"CROSS_{t1_simple}_x_{t2_simple}"
    return updated


def process_file(path: Path) -> tuple[int, int]:
    rows = []
    with open(path) as f:
        for line in f:
            rows.append(json.loads(line))

    processed = 0
    skipped = 0
    result = []
    for row in rows:
        skill = get_skill(row)
        if "Cross-Text" in skill or "cross-text" in skill.lower() or "Cross-text" in skill:
            # 이미 처리된 항목 스킵
            if row.get("text1_sequence") or row.get("cross_text_split_failed"):
                result.append(row)
                continue
            updated = process_record(row)
            result.append(updated)
            if updated.get("text1_sequence"):
                processed += 1
            elif updated.get("cross_text_split_failed"):
                skipped += 1
        else:
            result.append(row)

    with open(path, "w") as f:
        for row in result:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")

    return processed, skipped


base = Path(__file__).parent

targets = [
    base / "baseline_cp_analysis.jsonl",
    base / "qb_rw_98_cp_analysis.jsonl",
    base / "cross_text_new_5_cp_analysis.jsonl",
]

total_processed = 0
for path in targets:
    processed, skipped = process_file(path)
    total_processed += processed
    print(f"{path.name}: 처리 {processed}개, 실패 {skipped}개")

print(f"\n총 Cross-Text 처리: {total_processed}개")
print("완료.")
