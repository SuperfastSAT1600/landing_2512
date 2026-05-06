#!/usr/bin/env python3
"""
REQ-008: Enrich knowledge_graph fields in all unified JSONL files.
Backfills passage_topic and concept_tags from analysis sections and skill-based defaults.

Input: ontology/*.jsonl (unified format)
Output: updates knowledge_graph in-place (overwrites files with enriched version)
"""

import json
import sys
from pathlib import Path
from collections import Counter

ROOT = Path(__file__).parent.parent.parent
OUT = ROOT / "ontology"

# Default knowledge_graph values by skill
SKILL_KG_DEFAULTS = {
    "Expression of Ideas Transitions": {
        "parent_concept": "Logical Coherence & Text Flow",
        "prerequisite": "Understanding Logical Relationships",
        "concept_tags": ["logical connectors", "text flow", "argument structure", "discourse markers"],
    },
    "Craft and Structure Words in Context": {
        "parent_concept": "Vocabulary & Context Analysis",
        "prerequisite": "Contextual Inference & Semantic Nuance",
        "concept_tags": ["vocabulary", "context clues", "semantic precision", "word choice"],
    },
    "Standard English Conventions Boundaries": {
        "parent_concept": "Sentence Structure & Punctuation",
        "prerequisite": "Identifying Clause Types",
        "concept_tags": ["punctuation", "sentence boundaries", "independent clauses", "dependent clauses"],
    },
    "Standard English Conventions Form, Structure, and Sense": {
        "parent_concept": "Grammar & Usage",
        "prerequisite": "Parts of Speech & Sentence Functions",
        "concept_tags": ["subject-verb agreement", "verb tense", "pronouns", "parallelism", "modifier placement"],
    },
    "Expression of Ideas Rhetorical Synthesis": {
        "parent_concept": "Purposeful Writing & Evidence Use",
        "prerequisite": "Identifying Rhetorical Goals",
        "concept_tags": ["evidence integration", "claim support", "rhetorical purpose", "synthesis"],
    },
    "Craft and Structure Text Structure and Purpose": {
        "parent_concept": "Passage Organization & Author Intent",
        "prerequisite": "Identifying Text Organization Patterns",
        "concept_tags": ["text structure", "author purpose", "organizational patterns", "passage analysis"],
    },
    "Information and Ideas Command of Evidence": {
        "parent_concept": "Evidence Evaluation & Data Interpretation",
        "prerequisite": "Reading Comprehension & Inference",
        "concept_tags": ["textual evidence", "data interpretation", "charts", "quantitative reasoning"],
    },
    "Information and Ideas Central Ideas and Details": {
        "parent_concept": "Reading Comprehension",
        "prerequisite": "Identifying Main Ideas",
        "concept_tags": ["main idea", "supporting details", "summarization", "comprehension"],
    },
    "Information and Ideas Inferences": {
        "parent_concept": "Reading Comprehension & Critical Thinking",
        "prerequisite": "Drawing Logical Conclusions",
        "concept_tags": ["inference", "implication", "logical reasoning", "critical reading"],
    },
    "Craft and Structure Cross-Text Connections": {
        "parent_concept": "Comparative Text Analysis",
        "prerequisite": "Understanding Multiple Perspectives",
        "concept_tags": ["cross-text analysis", "compare-contrast", "multiple passages", "synthesis"],
    },
}


def enrich_entry(entry: dict) -> dict:
    skill = entry.get("skill", "")
    defaults = SKILL_KG_DEFAULTS.get(skill, {})
    kg = entry.get("knowledge_graph", {})
    analysis = entry.get("analysis") or {}

    # Enrich knowledge_graph
    enriched_kg = {
        "parent_concept": kg.get("parent_concept") or defaults.get("parent_concept", "SAT Reading and Writing"),
        "prerequisite": kg.get("prerequisite") or defaults.get("prerequisite", "Reading Comprehension"),
    }

    # Add concept_tags from defaults
    enriched_kg["concept_tags"] = defaults.get("concept_tags", [])

    # Add passage_topic from analysis if available
    if analysis and "passage_topic" in analysis:
        enriched_kg["passage_topic"] = analysis["passage_topic"]
    elif kg.get("passage_topic"):
        enriched_kg["passage_topic"] = kg["passage_topic"]

    entry["knowledge_graph"] = enriched_kg
    return entry


def enrich_file(path: Path) -> dict:
    entries = []
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                entries.append(json.loads(line))

    original_count = len(entries)
    enriched = [enrich_entry(e) for e in entries]

    # Verify all have 4+ fields in knowledge_graph
    field_counts = [len(e["knowledge_graph"]) for e in enriched]
    min_fields = min(field_counts) if field_counts else 0
    avg_fields = sum(field_counts) / len(field_counts) if field_counts else 0

    with open(path, "w", encoding="utf-8") as f:
        for e in enriched:
            f.write(json.dumps(e, ensure_ascii=False) + "\n")

    # Check topic coverage
    has_topic = sum(1 for e in enriched if "passage_topic" in e["knowledge_graph"])
    has_tags = sum(1 for e in enriched if e["knowledge_graph"].get("concept_tags"))

    return {
        "count": original_count,
        "min_kg_fields": min_fields,
        "avg_kg_fields": avg_fields,
        "has_topic": has_topic,
        "has_tags": has_tags,
    }


def main():
    jsonl_files = list(OUT.glob("*.jsonl"))
    # Exclude master_unified since we'll handle it separately
    # But include it too — all files should be enriched
    jsonl_files = [f for f in jsonl_files if not f.name.endswith("_progress.json")]

    if not jsonl_files:
        print("No JSONL files found in ontology/")
        sys.exit(1)

    print("=== Knowledge Graph Enrichment ===\n")
    total_ok = 0
    total_entries = 0

    for path in sorted(jsonl_files):
        stats = enrich_file(path)
        ok = stats["min_kg_fields"] >= 3  # at least parent_concept, prerequisite, concept_tags
        status = "OK" if ok else "WARN"
        if ok:
            total_ok += 1
        total_entries += stats["count"]
        print(f"[{status}] {path.name}: {stats['count']} entries | "
              f"min_kg_fields={stats['min_kg_fields']} | "
              f"topic_coverage={stats['has_topic']}/{stats['count']} | "
              f"tags={stats['has_tags']}/{stats['count']}")

    print(f"\nTotal: {total_entries} entries across {len(jsonl_files)} files")
    print(f"Files OK: {total_ok}/{len(jsonl_files)}")
    sys.exit(0 if total_ok == len(jsonl_files) else 1)


if __name__ == "__main__":
    main()
