# Implementation Plan: Passage Structural Pattern Analysis

## Overview

Run GPT-4o-mini concept-unit structural analysis across ~1,421 SAT Reading & Writing passages (1,333 baseline + 88 new, Rhetorical Synthesis excluded), then cluster the resulting `structural_pattern` strings into a frequency-ranked taxonomy. Because the full run takes ~30 minutes and costs API money, the pipeline is gated by a batch-and-review loop: every 100 passages, the operator reviews 5 random samples and confirms before continuing.

The existing script `blog_database/analyze_passage_structure.py` already covers single-pass analysis with checkpoint resume. This plan extends it with a batch-review mode and adds a downstream clustering script.

## Requirements

### REQ-001: Batch-and-review execution
- **Priority**: Must
- **Description**: The analysis script processes passages in configurable batches (default 100). After each batch, it samples 5 random results from the just-processed batch, prints them in a human-readable format, and prompts the operator with `continue? (y/n)` before processing the next batch.
- **Acceptance Criteria**: Running `python analyze_passage_structure.py baseline --batch-size 100` produces visible sample output and a y/n prompt every 100 successfully processed passages. Answering `n` exits cleanly with checkpoint preserved.
- **Verification**: (MANUAL) — operator runs the command, observes the prompt fires after batch 1, types `n`, confirms exit + checkpoint; then resumes and types `y`, confirms next batch starts.

### REQ-002: Quality check output format
- **Priority**: Must
- **Description**: Each sampled review entry shows: skill, passage (first 150 chars + ellipsis), the full `concept_structure` list (each item: text + function), and the `structural_pattern` one-liner. Items are visually separated and labeled so the reviewer can scan quickly.
- **Acceptance Criteria**: Output for each sample includes labeled fields (`Skill:`, `Passage:`, `Concepts:`, `Pattern:`), with concept items numbered or bulleted, and a separator between the 5 samples.
- **Verification**: (MANUAL) — operator reads sample output during REQ-001 verification and confirms it is legible at a glance.

### REQ-003: Full baseline completion
- **Priority**: Must
- **Description**: All baseline passages from `baseline_rw_reclassified.jsonl` excluding `Rhetorical Synthesis` skill are processed and written to `baseline_passage_structure.jsonl` with non-empty `structural_pattern` fields (except for records whose source `passage` is empty). Checkpoint at `passage_structure_checkpoint.json` allows resume on failure.
- **Acceptance Criteria**: Output JSONL line count equals the count of input baseline records minus Rhetorical Synthesis (~1,333). At least 99% of records have a non-empty `structural_pattern`.
- **Verification**: (MANUAL) — run `python -c "import json; n=sum(1 for l in open('baseline_passage_structure.jsonl', encoding='utf-8') if json.loads(l).get('structural_pattern')); print(n)"` and compare against expected count.

### REQ-004: New 98 questions completion
- **Priority**: Must
- **Description**: All passages from `qb_rw_98_reclassified.jsonl` excluding `Rhetorical Synthesis` (~88) are processed and written to `qb_rw_98_passage_structure.jsonl` after baseline run is reviewed and approved.
- **Acceptance Criteria**: Output JSONL exists with ~88 records, ≥99% having non-empty `structural_pattern`.
- **Verification**: (MANUAL) — same line-count + structural_pattern check as REQ-003 against `qb_rw_98_passage_structure.jsonl`.

### REQ-005: Pattern clustering report
- **Priority**: Must
- **Description**: A new script `cluster_passage_patterns.py` loads both output JSONL files, counts frequency of each `structural_pattern` string, groups semantically similar patterns (initial pass: exact + lowercase-trim match; second pass: GPT-assisted semantic grouping over the unique-pattern set, which is much smaller than 1,421), and prints the top 20 most frequent groups with one example passage each.
- **Acceptance Criteria**: Running `python cluster_passage_patterns.py` produces a top-20 ranked list with: rank, frequency count, group label, representative pattern string, and one short example passage (first 200 chars). Total record count and unique-pattern count are printed at the top of the report.
- **Verification**: (MANUAL) — operator runs the script and visually inspects the top-20 list for sensible groupings.

## Technical Design

### Architecture

The pipeline is three serial stages, each gated on operator approval:

```
Stage 1: analyze_passage_structure.py (baseline)
  → batch loop (100 records per batch)
    → GPT-4o-mini call per passage
    → checkpoint write at batch boundary
    → sample 5 + prompt y/n
  → baseline_passage_structure.jsonl

Stage 2: analyze_passage_structure.py (new)
  → same batch loop
  → qb_rw_98_passage_structure.jsonl

Stage 3: cluster_passage_patterns.py
  → load both output JSONLs
  → exact-match frequency count
  → optional: GPT-assisted semantic grouping over unique patterns
  → print top 20 groups with examples
```

**Key files:**
- `blog_database/analyze_passage_structure.py` — modify to add batch-review mode (argparse for `--batch-size`, sampling, y/n prompt). Existing checkpoint logic is reused unchanged.
- `blog_database/cluster_passage_patterns.py` — new file.
- `blog_database/baseline_passage_structure.jsonl` — output (Stage 1).
- `blog_database/qb_rw_98_passage_structure.jsonl` — output (Stage 2).
- `blog_database/passage_structure_checkpoint.json` — existing, reused.

**Existing patterns to reuse from `analyze_passage_structure.py`:**
- `analyze_passage(passage)` — GPT call, unchanged.
- `load_jsonl`, `load_checkpoint`, `save_checkpoint` — unchanged.
- `get_id`, `get_passage`, `get_skill` — source-aware accessors, unchanged.
- Rhetorical Synthesis filter at line 105 — unchanged.

**Modifications to `process()`:**
1. Add `batch_size` parameter (default 100).
2. Track a `batch_results` buffer of records that were *newly analyzed in the current batch* (i.e., not restored from checkpoint, not skipped for empty passage).
3. When `len(batch_results) >= batch_size`:
   - Save checkpoint.
   - Call `print_samples(batch_results, k=5)` to show 5 random entries with skill/passage/concepts/pattern.
   - Prompt `input("continue? (y/n): ")`. If not `y`, save partial output JSONL (records processed so far) and exit gracefully.
   - Reset batch_results.
4. After loop ends, save final output JSONL as before.

**Sampling/prompt function (~30 lines):**
```python
def print_samples(batch, k=5):
    samples = random.sample(batch, min(k, len(batch)))
    for i, r in enumerate(samples, 1):
        print(f"\n--- Sample {i}/{len(samples)} ---")
        print(f"Skill: {r.get('skill') or r.get('metadata', {}).get('skill', '')}")
        passage = r.get('passage') or r.get('content', {}).get('passage', '')
        print(f"Passage: {passage[:150]}{'...' if len(passage) > 150 else ''}")
        print("Concepts:")
        for j, c in enumerate(r.get('concept_structure', []), 1):
            print(f"  {j}. [{c.get('function', '')}] {c.get('text', '')}")
        print(f"Pattern: {r.get('structural_pattern', '')}")
    print("\n" + "=" * 60)
```

**Argparse addition:**
```python
parser = argparse.ArgumentParser()
parser.add_argument("mode", choices=["baseline", "new"], default="baseline", nargs="?")
parser.add_argument("--batch-size", type=int, default=100)
parser.add_argument("--no-review", action="store_true", help="Skip y/n prompts (used for the 88-record new run)")
args = parser.parse_args()
```

The `--no-review` flag lets the small new-questions run (REQ-004) finish without a prompt, since 88 records < one batch.

### Clustering script design (`cluster_passage_patterns.py`)

```
1. Load both JSONLs into one list `records`.
2. Filter to records with non-empty structural_pattern.
3. Build frequency counter:
   - Key: pattern.strip().lower() (exact normalized match)
   - Value: list of records sharing that key
4. Print: total records, unique patterns count, top-20 groups.
5. (Optional second pass — gated by --semantic flag)
   - Send all unique pattern strings to GPT-4o-mini in one batch
   - Ask GPT to group them into N semantic clusters with labels
   - Re-aggregate counts by cluster
   - Print top 20 clusters with example
```

For the first iteration, exact-normalized match is enough to surface frequency. Semantic grouping is a second pass added if exact match produces too many singletons.

### Dependencies

- `openai` (already used) — for GPT-4o-mini calls.
- `python-dotenv` (already used) — for `OPENAI_API_KEY`.
- `argparse`, `random`, `collections.Counter` — stdlib.

No new packages required.

### Data flow & cost estimate

- ~1,421 GPT-4o-mini calls at ~1500 input chars + ~800 output tokens each.
- Approx cost: ~$0.50–1.00 total (gpt-4o-mini input $0.15/1M, output $0.60/1M tokens).
- Approx wall time: ~30 min at 0.2s sleep + API latency.

## Traceability Matrix

| REQ ID  | Description                              | Verification | Test/Check Location                                                                                          | Status  |
|---------|------------------------------------------|--------------|--------------------------------------------------------------------------------------------------------------|---------|
| REQ-001 | Batch-and-review prompt every 100        | (MANUAL)     | Operator runs `python analyze_passage_structure.py baseline --batch-size 100`; answers n then y              | Pending |
| REQ-002 | Sample output is legible (5 fields)      | (MANUAL)     | Operator inspects output during REQ-001 verification                                                         | Pending |
| REQ-003 | Baseline complete (~1,333 records)       | (MANUAL)     | Line count + non-empty `structural_pattern` count of `baseline_passage_structure.jsonl`                      | Pending |
| REQ-004 | New 98 complete (~88 records)            | (MANUAL)     | Line count + non-empty `structural_pattern` count of `qb_rw_98_passage_structure.jsonl`                      | Pending |
| REQ-005 | Top-20 cluster report prints             | (MANUAL)     | Operator runs `python cluster_passage_patterns.py` and inspects top-20 list                                  | Pending |

## Implementation Order

1. **Step 1 — Modify `analyze_passage_structure.py`** (REQ-001, REQ-002)
   - Add `argparse` for `mode`, `--batch-size`, `--no-review`.
   - Add `print_samples(batch, k=5)` helper.
   - In `process()`: track `batch_results` buffer of newly-analyzed records. When buffer hits `batch_size`, save checkpoint, print samples, prompt y/n, reset buffer. On `n`, save partial output and `sys.exit(0)`.
   - Smoke test: run with `--batch-size 5` on baseline; confirm prompt fires after 5 new records, partial output JSONL is written on `n`, checkpoint persists, resume works.

2. **Step 2 — Run baseline** (REQ-003)
   - Command: `python analyze_passage_structure.py baseline --batch-size 100`
   - Operator reviews after each 100. If quality is poor, operator answers `n`, the issue is diagnosed (prompt, model, passage source), and the run resumes after fix.
   - On completion, verify: `wc -l baseline_passage_structure.jsonl` ≈ 1,333.

3. **Step 3 — Run new 98** (REQ-004)
   - Only after baseline review passes.
   - Command: `python analyze_passage_structure.py new --no-review` (small set, no review needed).
   - Verify: `wc -l qb_rw_98_passage_structure.jsonl` ≈ 88.

4. **Step 4 — Write `cluster_passage_patterns.py`** (REQ-005)
   - Load both output JSONLs.
   - Frequency-count by `pattern.strip().lower()`.
   - Print top-20 with rank, count, pattern, one example passage (first 200 chars).
   - Print total records and unique pattern count at top.
   - Operator inspects the output. If too many singletons, add `--semantic` flag for GPT-assisted grouping over the unique-pattern set (small enough for one or two GPT calls).

## Risks & Considerations

- **Risk: GPT output quality drift across batches** — mitigated by REQ-001 review gate; operator can stop at any 100-record boundary.
- **Risk: API key missing or rate limit** — existing script catches exceptions per record and continues; checkpoint allows safe resume.
- **Risk: Sample function shows already-checkpointed records and operator wastes review time on old data** — mitigated by tracking `batch_results` only for newly-analyzed records, not restored ones.
- **Risk: Partial save on `n` exit overwrites a previous full output file** — mitigated by writing to output file only on clean completion or explicit early exit; the checkpoint is the source of truth for resume.
- **Risk: Stage 3 produces too many singleton patterns** — exact-match is the first pass; the `--semantic` flag (GPT grouping over unique strings only) is the fallback. Unique-pattern set is small (likely < 500), so this is one cheap GPT call.
- **Risk: Rhetorical Synthesis filter mismatch between baseline and new schemas** — already handled by `get_skill(r, source)` accessor.
- **Cost & time visibility** — print elapsed time + API call count at end of each batch so operator can extrapolate completion ETA.

## Out of Scope

- Re-analyzing Rhetorical Synthesis passages (intentionally excluded).
- Storing results in a database — JSONL only.
- Web UI for review — CLI prompt only.
- Re-running after prompt-engineering changes — that would be a follow-up plan.
- Embedding-based clustering — exact-match + optional GPT-semantic is sufficient for this round.
