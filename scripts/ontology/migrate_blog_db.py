#!/usr/bin/env python3
"""
REQ-002: Migrate blog_database JSONL files to unified SAT ontology schema.
Handles transitions_master.jsonl and words_in_context_master.jsonl.

Output: ontology/transitions.jsonl, ontology/wic.jsonl
"""

import json
import hashlib
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent.parent
BLOG_DB = ROOT / "blog_database"
OUT = ROOT / "ontology"
OUT.mkdir(exist_ok=True)

SKILL_MAP = {
    "transitions": "Expression of Ideas Transitions",
    "words_in_context": "Craft and Structure Words in Context",
}

DOMAIN = "Reading and Writing"
TEST = "SAT"


def make_id(question_id: str) -> str:
    """Use existing question_id if 8-char hex, else hash."""
    if len(question_id) == 8 and all(c in "0123456789abcdef" for c in question_id):
        return question_id
    return hashlib.md5(question_id.encode()).hexdigest()[:8]


def migrate_entry(entry: dict, skill: str, source_key: str) -> dict:
    meta = entry["metadata"]
    content = entry["content"]
    analysis = entry.get("analysis", {})

    # Build knowledge_graph from analysis (preserve passage_topic if present)
    knowledge_graph: dict = {
        "parent_concept": _parent_concept(skill),
        "prerequisite": _prerequisite(skill),
    }
    if "passage_topic" in analysis:
        knowledge_graph["passage_topic"] = analysis["passage_topic"]

    return {
        "id": make_id(meta["question_id"]),
        "test": TEST,
        "domain": DOMAIN,
        "skill": skill,
        "difficulty": meta["difficulty"],
        "passage": content["passage"],
        "question": content["question_text"],
        "choices": content["choices"],
        "correct_answer": content["correct_answer"],
        "rationale": content["explanation"],
        "knowledge_graph": knowledge_graph,
        "analysis": analysis,
        "source": meta["source_file"],
    }


def _parent_concept(skill: str) -> str:
    mapping = {
        "Expression of Ideas Transitions": "Logical Coherence & Text Flow",
        "Craft and Structure Words in Context": "Vocabulary & Context Analysis",
    }
    return mapping.get(skill, "SAT Reading and Writing")


def _prerequisite(skill: str) -> str:
    mapping = {
        "Expression of Ideas Transitions": "Understanding Logical Relationships",
        "Craft and Structure Words in Context": "Contextual Inference & Semantic Nuance",
    }
    return mapping.get(skill, "Reading Comprehension")


def migrate_file(jsonl_path: Path, skill: str, source_key: str, out_path: Path) -> int:
    entries = []
    with open(jsonl_path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            raw = json.loads(line)
            entries.append(migrate_entry(raw, skill, source_key))

    with open(out_path, "w", encoding="utf-8") as f:
        for e in entries:
            f.write(json.dumps(e, ensure_ascii=False) + "\n")

    return len(entries)


def validate_output(out_path: Path, expected_count: int) -> list[str]:
    errors = []
    required_fields = {"id", "test", "domain", "skill", "difficulty", "passage",
                       "question", "choices", "correct_answer", "rationale",
                       "knowledge_graph", "source"}
    seen_ids: set[str] = set()

    with open(out_path, encoding="utf-8") as f:
        entries = [json.loads(l) for l in f if l.strip()]

    if len(entries) != expected_count:
        errors.append(f"Count mismatch: expected {expected_count}, got {len(entries)}")

    for i, e in enumerate(entries):
        missing = required_fields - set(e.keys())
        if missing:
            errors.append(f"Entry {i} missing fields: {missing}")
        if e["id"] in seen_ids:
            errors.append(f"Duplicate ID: {e['id']}")
        seen_ids.add(e["id"])
        if e["test"] != "SAT":
            errors.append(f"Entry {i}: test != SAT")
        if e["domain"] != "Reading and Writing":
            errors.append(f"Entry {i}: domain wrong")
        if e["difficulty"] not in ("Easy", "Medium", "Hard"):
            errors.append(f"Entry {i}: invalid difficulty '{e['difficulty']}'")
        if e["correct_answer"] not in ("A", "B", "C", "D"):
            errors.append(f"Entry {i}: invalid correct_answer '{e['correct_answer']}'")

    return errors


def main():
    results = {}

    # Transitions
    t_in = BLOG_DB / "transitions_master.jsonl"
    t_out = OUT / "transitions.jsonl"
    count = migrate_file(t_in, SKILL_MAP["transitions"], "transitions", t_out)
    errors = validate_output(t_out, count)
    results["transitions"] = {"count": count, "errors": errors, "out": str(t_out)}

    # WIC
    w_in = BLOG_DB / "words_in_context_master.jsonl"
    w_out = OUT / "wic.jsonl"
    count = migrate_file(w_in, SKILL_MAP["words_in_context"], "words_in_context", w_out)
    errors = validate_output(w_out, count)
    results["wic"] = {"count": count, "errors": errors, "out": str(w_out)}

    # Report
    ok = True
    for skill, r in results.items():
        status = "OK" if not r["errors"] else "FAIL"
        if r["errors"]:
            ok = False
        print(f"[{status}] {skill}: {r['count']} entries → {r['out']}")
        for err in r["errors"]:
            print(f"       ERROR: {err}")

    total = sum(r["count"] for r in results.values())
    print(f"\nTotal migrated: {total} entries")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
