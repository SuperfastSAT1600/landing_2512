#!/usr/bin/env python3
"""
Normalize PDF-extracted JSONL files from raw blog_database format to unified schema.
Adds missing: skill, test, domain, id, source fields.
"""
import json
import hashlib
from pathlib import Path

ROOT = Path(__file__).parent.parent.parent
OUT = ROOT / "ontology"

# Map source file → CB skill
FILENAME_TO_SKILL = {
    "boundaries": "Standard English Conventions Boundaries",
    "form_structure_sense": "Standard English Conventions Form, Structure, and Sense",
    "form, structure, and sense": "Standard English Conventions Form, Structure, and Sense",
    "rhetorical synthesis": "Expression of Ideas Rhetorical Synthesis",
    "text structure and purpose": "Craft and Structure Text Structure and Purpose",
}

KG_DEFAULTS = {
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
}


def infer_skill(source_file: str) -> str:
    lower = source_file.lower()
    for keyword, skill in FILENAME_TO_SKILL.items():
        if keyword in lower:
            return skill
    return ""


def make_id(question_id: str) -> str:
    if len(question_id) == 8 and all(c in "0123456789abcdef" for c in question_id.lower()):
        return question_id.lower()
    return hashlib.md5(question_id.encode()).hexdigest()[:8]


def normalize_entry(entry: dict) -> dict:
    if "metadata" not in entry:
        return entry  # already normalized or unknown format

    meta = entry["metadata"]
    content = entry["content"]
    analysis = entry.get("analysis") or {}
    source_file = meta.get("source_file", "")
    skill = infer_skill(source_file)
    kg_def = KG_DEFAULTS.get(skill, {})

    # Build knowledge_graph
    kg = entry.get("knowledge_graph", {})
    enriched_kg = {
        "parent_concept": kg.get("parent_concept") or kg_def.get("parent_concept", "SAT Reading and Writing"),
        "prerequisite": kg.get("prerequisite") or kg_def.get("prerequisite", "Reading Comprehension"),
        "concept_tags": kg_def.get("concept_tags", []),
    }
    if analysis.get("passage_topic"):
        enriched_kg["passage_topic"] = analysis["passage_topic"]

    return {
        "id": make_id(meta.get("question_id", "")),
        "test": "SAT",
        "domain": "Reading and Writing",
        "skill": skill,
        "difficulty": meta.get("difficulty", ""),
        "passage": content.get("passage", ""),
        "question": content.get("question_text", ""),
        "choices": content.get("choices", {}),
        "correct_answer": content.get("correct_answer", ""),
        "rationale": content.get("explanation", ""),
        "knowledge_graph": enriched_kg,
        "analysis": analysis,
        "source": source_file,
    }


def normalize_file(path: Path) -> int:
    entries = []
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                entries.append(json.loads(line))

    # Only normalize if entries have metadata/content format
    needs_norm = sum(1 for e in entries if "metadata" in e)
    if needs_norm == 0:
        print(f"  [SKIP] {path.name} — already normalized")
        return 0

    normalized = [normalize_entry(e) for e in entries]

    with open(path, "w", encoding="utf-8") as f:
        for e in normalized:
            f.write(json.dumps(e, ensure_ascii=False) + "\n")

    print(f"  [OK] {path.name}: {needs_norm}/{len(entries)} entries normalized")
    return needs_norm


FILES_TO_NORMALIZE = [
    "boundaries.jsonl",
    "form_structure_sense.jsonl",
    "rhetorical_synthesis.jsonl",
    "text_structure_purpose.jsonl",
]

for fname in FILES_TO_NORMALIZE:
    normalize_file(OUT / fname)

print("\nDone.")
