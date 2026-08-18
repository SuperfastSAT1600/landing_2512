#!/usr/bin/env python3
"""
SAT Ontology Corpus Quality Validator
Validates master_sat_ontology_v2.jsonl for structural and taxonomic correctness.

Usage:
    python3 validate_corpus.py [path/to/corpus.jsonl]

Exit codes:
    0 — all checks pass (no FAILs)
    1 — one or more FAIL results
"""

import json
import sys
import os
from collections import Counter, defaultdict

# ---------------------------------------------------------------------------
# Taxonomy
# ---------------------------------------------------------------------------

VALID_ERROR_TYPES = {
    "Expression of Ideas Transitions": [
        "addition_trap", "contrast_trap", "causal_trap",
        "sequence_trap", "example_trap", "paraphrase_trap",
    ],
    "Craft and Structure Words in Context": [
        "wrong_denotation", "near_synonym_trap", "wrong_connotation", "out_of_scope",
    ],
    "Craft and Structure Cross-Text Connections": [
        "unsupported_inference", "not_in_text", "wrong_text_source",
        "too_extreme", "recycles_language",
    ],
    "Craft and Structure Text Structure and Purpose": [
        "introduces_absent_element", "too_narrow", "too_broad",
        "misidentifies_structure", "wrong_author_purpose",
    ],
    "Expression of Ideas Rhetorical Synthesis": [
        "wrong_emphasis", "incomplete_task", "wrong_task",
        "missing_required_info", "factually_wrong_order",
    ],
    "Information and Ideas Central Ideas and Details": [
        "contradicts_text", "out_of_scope", "too_narrow",
        "misattributes_claim", "wrong_focus",
    ],
    "Information and Ideas Command of Evidence": [
        "misreads_data", "wrong_direction", "irrelevant_evidence",
        "partial_support", "wrong_variable",
    ],
    "Information and Ideas Inferences": [
        "overreach", "not_in_text", "confuses_elements", "reversal", "too_specific",
    ],
    "Standard English Conventions Boundaries": [
        "comma_splice", "run_on", "fragment",
        "unnecessary_punctuation", "wrong_junction_type",
    ],
    "Standard English Conventions Form, Structure, and Sense": [
        "dangling_modifier", "tense_inconsistency", "number_agreement",
        "wrong_verb_form", "possessive_error", "pronoun_case_error",
    ],
}

# Build flat set per skill for O(1) lookup
VALID_ERROR_TYPE_SETS = {skill: set(types) for skill, types in VALID_ERROR_TYPES.items()}

REQUIRED_FIELDS = {"id", "skill", "difficulty", "passage", "question", "choices", "correct_answer", "rationale"}
REQUIRED_CHOICES = {"A", "B", "C", "D"}

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def resolve_corpus_path(arg: str | None) -> str:
    if arg:
        return arg
    # Default: project root relative to this script (scripts/ontology/ → ../../)
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(os.path.dirname(script_dir))
    return os.path.join(project_root, "master_sat_ontology_v2.jsonl")


def parse_entries(path: str):
    """Yield (line_number, entry_or_None, parse_error_or_None) per line."""
    with open(path, "r", encoding="utf-8") as fh:
        for lineno, raw in enumerate(fh, start=1):
            raw = raw.strip()
            if not raw:
                continue
            try:
                yield lineno, json.loads(raw), None
            except json.JSONDecodeError as exc:
                yield lineno, None, str(exc)

# ---------------------------------------------------------------------------
# Checks
# ---------------------------------------------------------------------------

def check_duplicate_ids(entries: list[dict]) -> tuple[str, list[str]]:
    id_counts: Counter = Counter()
    for e in entries:
        eid = e.get("id")
        if eid is not None:
            id_counts[eid] += 1

    duplicates = [(eid, count) for eid, count in id_counts.items() if count > 1]
    total_unique = len(id_counts)

    if duplicates:
        lines = [f"  - id={eid}: appears {count} times" for eid, count in sorted(duplicates)]
        return "FAIL", [f"[FAIL] Duplicate IDs found ({len(duplicates)} ids duplicated):"] + lines
    return "PASS", [f"[PASS] No duplicate IDs ({total_unique} unique)"]


def check_missing_fields(entries: list[dict]) -> tuple[str, list[str]]:
    violations: list[str] = []
    for e in entries:
        eid = e.get("id", "<no-id>")
        missing = REQUIRED_FIELDS - set(e.keys())
        if missing:
            violations.append(f"  - id={eid}: missing {', '.join(sorted(repr(f) for f in missing))}")
        # Check choices sub-keys
        choices = e.get("choices")
        if isinstance(choices, dict):
            missing_choices = REQUIRED_CHOICES - set(choices.keys())
            if missing_choices:
                violations.append(
                    f"  - id={eid}: choices missing keys {', '.join(sorted(missing_choices))}"
                )
        elif "choices" in e:
            violations.append(f"  - id={eid}: 'choices' is not a dict (got {type(choices).__name__})")

    if violations:
        return "FAIL", [f"[FAIL] Missing required fields: {len(violations)} entries"] + violations
    return "PASS", [f"[PASS] All entries have required fields"]


def check_analysis_coverage(entries: list[dict]) -> tuple[str, list[str]]:
    """Count entries with/without `analysis` field, broken down per skill."""
    skill_total: Counter = Counter()
    skill_with: Counter = Counter()

    for e in entries:
        skill = e.get("skill", "<unknown>")
        skill_total[skill] += 1
        if "analysis" in e and e["analysis"]:
            skill_with[skill] += 1

    total_entries = len(entries)
    total_with = sum(skill_with.values())

    lines = ["[INFO] Analysis coverage:"]
    for skill in sorted(skill_total):
        t = skill_total[skill]
        w = skill_with[skill]
        pct = int(100 * w / t) if t else 0
        lines.append(f"  {skill}: {w}/{t} ({pct}%)")
    lines.append(f"  TOTAL: {total_with}/{total_entries} ({int(100 * total_with / total_entries) if total_entries else 0}%)")

    return "INFO", lines


def check_wrong_answer_analysis(entries: list[dict]) -> tuple[str, list[str]]:
    """
    For entries that have analysis.wrong_answer_analysis:
      - correct_answer key must NOT appear in wrong_answer_analysis keys
      - each wrong_answer_analysis sub-entry must have an 'error_type' field
    """
    checked = 0
    violations: list[str] = []

    for e in entries:
        analysis = e.get("analysis")
        if not isinstance(analysis, dict):
            continue
        waa = analysis.get("wrong_answer_analysis")
        if not isinstance(waa, dict):
            continue

        checked += 1
        eid = e.get("id", "<no-id>")
        correct = e.get("correct_answer", "")

        # correct answer must not be a key in wrong_answer_analysis
        if correct in waa:
            violations.append(
                f"  - id={eid}: correct_answer '{correct}' appears as a key in wrong_answer_analysis"
            )

        # each entry must have error_type
        for choice_key, choice_data in waa.items():
            if not isinstance(choice_data, dict) or "error_type" not in choice_data:
                violations.append(
                    f"  - id={eid}, choice={choice_key}: missing 'error_type' field"
                )

    if not checked:
        return "INFO", ["[INFO] wrong_answer_analysis: no entries have this field (0 checked)"]

    if violations:
        return "WARN", (
            [f"[WARN] wrong_answer_analysis issues: {len(violations)} violations ({checked} entries checked)"]
            + violations
        )
    return "PASS", [
        f"[PASS] wrong_answer_analysis: correct answer not included in wrong choices ({checked} entries checked)"
    ]


def check_error_type_taxonomy(entries: list[dict]) -> tuple[str, list[str]]:
    """
    Validate error_types in analysis.wrong_answer_analysis against known taxonomy.
    Also checks top-level analysis.error_type if present.
    """
    violations: list[str] = []

    for e in entries:
        skill = e.get("skill", "")
        eid = e.get("id", "<no-id>")
        valid_set = VALID_ERROR_TYPE_SETS.get(skill)

        analysis = e.get("analysis")
        if not isinstance(analysis, dict):
            continue

        # Check top-level analysis.error_type
        top_error_type = analysis.get("error_type")
        if top_error_type is not None:
            if valid_set is None:
                violations.append(
                    f"  - id={eid}, skill={skill!r}: skill not in taxonomy (cannot validate error_type '{top_error_type}')"
                )
            elif top_error_type not in valid_set:
                violations.append(
                    f"  - id={eid}, skill={skill}: error_type '{top_error_type}' not in taxonomy"
                )

        # Check wrong_answer_analysis entries
        waa = analysis.get("wrong_answer_analysis")
        if not isinstance(waa, dict):
            continue
        for choice_key, choice_data in waa.items():
            if not isinstance(choice_data, dict):
                continue
            et = choice_data.get("error_type")
            if et is None:
                continue
            if valid_set is None:
                violations.append(
                    f"  - id={eid}, skill={skill!r}, choice={choice_key}: skill not in taxonomy"
                )
            elif et not in valid_set:
                violations.append(
                    f"  - id={eid}, skill={skill}, choice={choice_key}: error_type '{et}' not in taxonomy"
                )

    if violations:
        return "WARN", (
            [f"[WARN] error_type taxonomy violations: {len(violations)} entries"] + violations
        )
    return "PASS", ["[PASS] All error_type values match taxonomy"]


def check_skill_distribution(entries: list[dict]) -> tuple[str, list[str]]:
    counts: Counter = Counter(e.get("skill", "<unknown>") for e in entries)
    lines = ["[INFO] Skill distribution:"]
    for skill, count in sorted(counts.items()):
        lines.append(f"  {skill}: {count}")
    return "INFO", lines


def check_difficulty_distribution(entries: list[dict]) -> tuple[str, list[str]]:
    counts: Counter = Counter(e.get("difficulty", "<unknown>") for e in entries)
    easy = counts.get("Easy", 0)
    medium = counts.get("Medium", 0)
    hard = counts.get("Hard", 0)
    unknown = {k: v for k, v in counts.items() if k not in {"Easy", "Medium", "Hard"}}

    line = f"[INFO] Difficulty distribution:\n  Easy: {easy}, Medium: {medium}, Hard: {hard}"
    if unknown:
        line += f"\n  Unknown values: {dict(unknown)}"
    return "INFO", [line]

# ---------------------------------------------------------------------------
# Runner
# ---------------------------------------------------------------------------

def main() -> int:
    path = resolve_corpus_path(sys.argv[1] if len(sys.argv) > 1 else None)

    if not os.path.isfile(path):
        print(f"[ERROR] Corpus file not found: {path}", file=sys.stderr)
        return 1

    print("=== SAT Corpus Quality Report ===\n")

    # Load all entries (streaming, accumulate for multi-pass checks)
    entries: list[dict] = []
    parse_errors: list[str] = []

    for lineno, entry, err in parse_entries(path):
        if err:
            parse_errors.append(f"  - line {lineno}: {err}")
        else:
            entries.append(entry)

    if parse_errors:
        print(f"[FAIL] JSON parse errors ({len(parse_errors)} lines):")
        for msg in parse_errors:
            print(msg)
        print()

    # Run all checks
    results: list[tuple[str, list[str]]] = [
        check_duplicate_ids(entries),
        check_missing_fields(entries),
        check_analysis_coverage(entries),
        check_wrong_answer_analysis(entries),
        check_error_type_taxonomy(entries),
        check_skill_distribution(entries),
        check_difficulty_distribution(entries),
    ]

    fail_count = len(parse_errors)  # parse errors count as FAILs
    warn_count = 0
    pass_count = 0

    for status, lines in results:
        for line in lines:
            print(line)
        print()
        if status == "FAIL":
            fail_count += 1
        elif status == "WARN":
            warn_count += 1
        elif status == "PASS":
            pass_count += 1

    summary_parts = []
    if fail_count:
        summary_parts.append(f"{fail_count} FAIL")
    if warn_count:
        summary_parts.append(f"{warn_count} WARN")
    if pass_count:
        summary_parts.append(f"{pass_count} PASS")

    print(f"=== Summary: {', '.join(summary_parts) if summary_parts else 'nothing checked'} ===")

    return 1 if fail_count else 0


if __name__ == "__main__":
    sys.exit(main())
