"""
32개 empty skill 채우기 — source 파일명 패턴 매핑
대상: baseline_cp_analysis.jsonl, baseline_rw_reclassified.jsonl
"""
import json
import re
from pathlib import Path

SKILL_MAP = {
    "central ideas and details": "Information and Ideas Central Ideas and Details",
    "command of evidence":       "Information and Ideas Command of Evidence",
    "inference":                 "Information and Ideas Inferences",
    "cross-text connections":    "Craft and Structure Cross-Text Connections",
}

def skill_from_source(source: str) -> str:
    source_lower = source.lower()
    for pattern, skill in SKILL_MAP.items():
        if source_lower.startswith(pattern):
            return skill
    return ""

def fix_file(path: Path) -> tuple[int, int]:
    rows = []
    with open(path) as f:
        for line in f:
            rows.append(json.loads(line))

    fixed = 0
    skipped = 0
    for row in rows:
        if row.get("skill", "").strip():
            continue
        source = row.get("source", "")
        skill = skill_from_source(source)
        if skill:
            row["skill"] = skill
            fixed += 1
        else:
            skipped += 1
            print(f"  [SKIP] id={row.get('id','?')} source={source!r}")

    with open(path, "w") as f:
        for row in rows:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")

    return fixed, skipped


base = Path(__file__).parent

targets = [
    base / "baseline_cp_analysis.jsonl",
    base / "baseline_rw_reclassified.jsonl",
]

for path in targets:
    fixed, skipped = fix_file(path)
    print(f"{path.name}: 수정 {fixed}개, 매핑 실패 {skipped}개")

print("\n완료.")
