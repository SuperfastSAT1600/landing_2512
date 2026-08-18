#!/usr/bin/env python3
"""
REQ-003: Migrate master_sat_ontology.jsonl to unified schema.
Filters 3 corrupt entries (garbled skill names from table extraction).

Output: ontology/master_unified.jsonl
"""

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent.parent
MASTER = ROOT / "master_sat_ontology.jsonl"
OUT = ROOT / "ontology" / "master_unified.jsonl"
OUT.parent.mkdir(exist_ok=True)

VALID_SKILLS = {
    "Craft and Structure Words in Context",
    "Craft and Structure Text Structure and Purpose",
    "Craft and Structure Cross-Text Connections",
    "Information and Ideas Central Ideas and Details",
    "Information and Ideas Command of Evidence",
    "Information and Ideas Inferences",
    "Standard English Conventions Boundaries",
    "Standard English Conventions Form, Structure, and Sense",
    "Expression of Ideas Rhetorical Synthesis",
    "Expression of Ideas Transitions",
}


def is_corrupt_skill(skill: str) -> bool:
    """Detect garbled skill strings (extra whitespace/chars from table extraction)."""
    # Legitimate skills are clean strings matching known patterns
    return skill not in VALID_SKILLS


def migrate_entry(entry: dict) -> dict:
    """Convert master flat format to unified schema (adds source, normalizes fields)."""
    kg = entry.get("knowledge_graph", {})

    return {
        "id": entry["id"],
        "test": entry.get("test", "SAT"),
        "domain": entry.get("domain", "Reading and Writing"),
        "skill": entry["skill"],
        "difficulty": entry["difficulty"],
        "passage": entry["passage"],
        "question": entry["question"],
        "choices": entry["choices"],
        "correct_answer": entry["correct_answer"],
        "rationale": entry["rationale"],
        "knowledge_graph": {
            "parent_concept": kg.get("parent_concept", ""),
            "prerequisite": kg.get("prerequisite", ""),
        },
        "analysis": None,   # master entries lack skill-specific analysis
        "source": "master_sat_ontology.jsonl",
    }


def main():
    raw_entries = []
    with open(MASTER, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                raw_entries.append(json.loads(line))

    print(f"Loaded {len(raw_entries)} entries from master_sat_ontology.jsonl")

    corrupt = [e for e in raw_entries if is_corrupt_skill(e.get("skill", ""))]
    valid = [e for e in raw_entries if not is_corrupt_skill(e.get("skill", ""))]

    print(f"Corrupt entries filtered: {len(corrupt)}")
    for c in corrupt:
        print(f"  - id={c['id']} skill='{c['skill'][:60]}...'")

    migrated = [migrate_entry(e) for e in valid]

    # Validate
    errors = []
    required = {"id", "test", "domain", "skill", "difficulty", "passage",
                "question", "choices", "correct_answer", "rationale", "knowledge_graph", "source"}
    seen_ids: set[str] = set()

    for i, e in enumerate(migrated):
        missing = required - set(e.keys())
        if missing:
            errors.append(f"Entry {i} missing: {missing}")
        if e["id"] in seen_ids:
            errors.append(f"Duplicate ID: {e['id']}")
        seen_ids.add(e["id"])
        if e["skill"] not in VALID_SKILLS:
            errors.append(f"Entry {i} invalid skill: {e['skill']}")
        if e["difficulty"] not in ("Easy", "Medium", "Hard"):
            errors.append(f"Entry {i} invalid difficulty: {e['difficulty']}")

    if errors:
        print("\nVALIDATION ERRORS:")
        for err in errors:
            print(f"  {err}")
        sys.exit(1)

    with open(OUT, "w", encoding="utf-8") as f:
        for e in migrated:
            f.write(json.dumps(e, ensure_ascii=False) + "\n")

    print(f"\n[OK] master_unified.jsonl: {len(migrated)} entries → {OUT}")
    print(f"     Filtered {len(corrupt)} corrupt entries")

    # Skill breakdown
    from collections import Counter
    skill_counts = Counter(e["skill"] for e in migrated)
    print("\nSkill distribution:")
    for skill, count in skill_counts.most_common():
        short = skill.split()[-1] if len(skill.split()) > 3 else skill
        print(f"  {count:4d}  {skill}")


if __name__ == "__main__":
    main()
