#!/usr/bin/env python3
"""
REQ-009: Merge all ontology/*.jsonl files into master_sat_ontology_v2.jsonl.
Deduplicates by question ID. Master unified entries take priority over PDF extractions
when the same question_id appears in both.

Output: master_sat_ontology_v2.jsonl + inventory report
"""

import json
import sys
from pathlib import Path
from collections import Counter

ROOT = Path(__file__).parent.parent.parent
OUT = ROOT / "ontology"
MASTER_OUT = ROOT / "master_sat_ontology_v2.jsonl"

# Priority order: master_unified has authoritative data; blog_db has rich analysis
PRIORITY = {
    "master_unified.jsonl": 1,    # highest priority
    "transitions.jsonl": 2,
    "wic.jsonl": 2,
    "boundaries.jsonl": 3,
    "form_structure_sense.jsonl": 3,
    "rhetorical_synthesis.jsonl": 3,
    "text_structure_purpose.jsonl": 3,
}


def merge_entries(master: dict, supplement: dict) -> dict:
    """Merge supplement into master: fill in missing fields, especially analysis."""
    merged = dict(master)
    # If master lacks analysis and supplement has it, add it
    if not merged.get("analysis") and supplement.get("analysis"):
        merged["analysis"] = supplement["analysis"]
    # Merge knowledge_graph: supplement passage_topic if missing
    sup_kg = supplement.get("knowledge_graph", {})
    if sup_kg.get("passage_topic") and not merged.get("knowledge_graph", {}).get("passage_topic"):
        merged.setdefault("knowledge_graph", {})["passage_topic"] = sup_kg["passage_topic"]
    return merged


def load_file(path: Path) -> list[dict]:
    entries = []
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                entries.append(json.loads(line))
            except json.JSONDecodeError as e:
                print(f"  WARN: JSON parse error in {path.name}: {e}")
    return entries


def normalize_id(entry: dict) -> str:
    return entry.get("id") or entry.get("metadata", {}).get("question_id", "")


def normalize_entry(entry: dict, source_file: str) -> dict | None:
    """Ensure entry has unified schema fields."""
    # Handle blog_database nested format (in case it wasn't already migrated)
    if "metadata" in entry and "content" in entry:
        # Already in blog_db format — it should have been migrated but handle gracefully
        meta = entry["metadata"]
        content = entry["content"]
        analysis = entry.get("analysis")
        return {
            "id": meta.get("question_id", ""),
            "test": "SAT",
            "domain": "Reading and Writing",
            "skill": entry.get("skill", ""),
            "difficulty": meta.get("difficulty", ""),
            "passage": content.get("passage", ""),
            "question": content.get("question_text", ""),
            "choices": content.get("choices", {}),
            "correct_answer": content.get("correct_answer", ""),
            "rationale": content.get("explanation", ""),
            "knowledge_graph": entry.get("knowledge_graph", {}),
            "analysis": analysis,
            "source": meta.get("source_file", source_file),
        }
    # Already in unified format
    if "question" in entry or "passage" in entry:
        entry.setdefault("source", source_file)
        return entry
    return None


def main():
    jsonl_files = sorted(OUT.glob("*.jsonl"), key=lambda p: PRIORITY.get(p.name, 99))

    print("=== Corpus Merge & Deduplication ===\n")
    print("Files to merge (in priority order):")
    for f in jsonl_files:
        if "_progress" not in f.name:
            print(f"  {PRIORITY.get(f.name, 99)}. {f.name}")

    # Load and normalize all entries
    all_by_id: dict[str, dict] = {}  # id → entry (first seen = highest priority)
    no_id_count = 0
    file_stats = {}

    for path in jsonl_files:
        if "_progress" in path.name:
            continue
        raw_entries = load_file(path)
        normalized = []
        for e in raw_entries:
            n = normalize_entry(e, path.name)
            if n:
                normalized.append(n)

        accepted = 0
        merged_count = 0
        for entry in normalized:
            eid = normalize_id(entry)
            if not eid:
                no_id_count += 1
                continue
            if eid not in all_by_id:
                all_by_id[eid] = entry
                accepted += 1
            else:
                # Merge supplementary data into existing entry
                all_by_id[eid] = merge_entries(all_by_id[eid], entry)
                merged_count += 1

        file_stats[path.name] = {
            "raw": len(raw_entries),
            "accepted": accepted,
            "merged": merged_count,
        }
        print(f"  {path.name}: {len(raw_entries)} raw → {accepted} new + {merged_count} merged")

    print(f"\n  Entries with no ID (skipped): {no_id_count}")

    entries = list(all_by_id.values())

    # Final validation
    errors = []
    for e in entries:
        if not e.get("skill"):
            errors.append(f"No skill: id={normalize_id(e)}")
        if not e.get("difficulty"):
            errors.append(f"No difficulty: id={normalize_id(e)}")

    if errors:
        print(f"\nValidation warnings ({len(errors)}):")
        for err in errors[:10]:
            print(f"  {err}")

    # Write output
    with open(MASTER_OUT, "w", encoding="utf-8") as f:
        for e in entries:
            f.write(json.dumps(e, ensure_ascii=False) + "\n")

    # Inventory report
    print(f"\n{'='*50}")
    print(f"OUTPUT: {MASTER_OUT}")
    print(f"Total entries: {len(entries)}")
    print()

    skill_counts = Counter(e.get("skill", "unknown") for e in entries)
    diff_counts = Counter(e.get("difficulty", "?") for e in entries)
    domain_counts = Counter(e.get("domain", "?") for e in entries)
    has_analysis = sum(1 for e in entries if e.get("analysis"))
    has_topic = sum(1 for e in entries if e.get("knowledge_graph", {}).get("passage_topic"))

    print("Skill distribution:")
    for skill, count in skill_counts.most_common():
        short = skill if len(skill) <= 50 else skill[:47] + "..."
        print(f"  {count:4d}  {short}")

    print(f"\nDifficulty: {dict(diff_counts)}")
    print(f"Domain: {dict(domain_counts)}")
    print(f"\nEnrichment coverage:")
    print(f"  analysis field: {has_analysis}/{len(entries)} ({100*has_analysis//len(entries)}%)")
    print(f"  passage_topic:  {has_topic}/{len(entries)} ({100*has_topic//len(entries)}%)")

    print(f"\n[OK] Merge complete: {len(entries)} unique questions")
    sys.exit(0 if len(entries) >= 1000 else 1)


if __name__ == "__main__":
    main()
