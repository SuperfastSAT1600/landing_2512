# SAT Question Bank Ontology Pipeline

## Overview

Build a unified SAT question ontology system from two incompatible data sources in `blog_database/` and `master_sat_ontology.jsonl`. Three sequential phases: (1) schema unification + migration, (2) PDF extraction for 4 unprocessed skills, (3) knowledge graph enrichment.

## Requirements

### REQ-001: Define unified canonical schema
- **Priority**: Must
- **Description**: Design a single JSON schema that merges both formats — flat CB fields from master + rich analysis section from blog_database
- **Acceptance Criteria**: Schema documented in `src/app/api/ontology/schema.ts`; all required fields typed
- **Verification**: (TEST) TypeScript compilation passes with zero errors

### REQ-002: Migration script — blog_database JSONL → unified format
- **Priority**: Must
- **Description**: Convert `transitions_master.jsonl` and `words_in_context_master.jsonl` to unified schema; preserve all fields including skill-specific analysis
- **Acceptance Criteria**: Script outputs `ontology/transitions.jsonl` and `ontology/wic.jsonl` with 100% field coverage and correct CB metadata
- **Verification**: (TEST) Script converts all 387 entries; output passes schema validation

### REQ-003: Migration script — master_sat_ontology.jsonl → unified format
- **Priority**: Must
- **Description**: Convert existing 1,177 master entries to unified schema; filter 3 corrupt entries; map nested knowledge_graph to unified enrichment block
- **Acceptance Criteria**: Output `ontology/master_unified.jsonl` with 1,174 valid entries
- **Verification**: (TEST) Entry count = 1174; no corrupt skill names; all required fields present

### REQ-004: PDF extraction — Boundaries skill
- **Priority**: Must
- **Description**: Parse `boundaries_easy_55.pdf`, `boundaries_medium_48.pdf`, `boundaries_hard_77.pdf` → structured JSONL using pdfplumber
- **Acceptance Criteria**: Output `ontology/boundaries.jsonl` with ~180 entries; passage/choices/answer extracted correctly
- **Verification**: (MANUAL) Spot-check 5 entries per difficulty against PDF source

### REQ-005: PDF extraction — Form, Structure, and Sense
- **Priority**: Must
- **Description**: Parse 3 FSS PDFs → structured JSONL
- **Acceptance Criteria**: Output `ontology/form_structure_sense.jsonl` with ~167 entries
- **Verification**: (MANUAL) Spot-check 5 entries per difficulty

### REQ-006: PDF extraction — Rhetorical Synthesis
- **Priority**: Must
- **Description**: Parse 3 rhetorical synthesis PDFs → structured JSONL
- **Acceptance Criteria**: Output `ontology/rhetorical_synthesis.jsonl` with ~182 entries
- **Verification**: (MANUAL) Spot-check 5 entries per difficulty

### REQ-007: PDF extraction — Text Structure and Purpose
- **Priority**: Must
- **Description**: Parse 3 TSP PDFs → structured JSONL
- **Acceptance Criteria**: Output `ontology/text_structure_purpose.jsonl` with ~130 entries
- **Verification**: (MANUAL) Spot-check 5 entries per difficulty

### REQ-008: Knowledge graph enrichment
- **Priority**: Should
- **Description**: Backfill shallow knowledge_graph (2 fields) in master entries with passage_topic, concept_tags, prerequisite_skills
- **Acceptance Criteria**: All unified entries have knowledge_graph with ≥4 fields
- **Verification**: (TEST) Field coverage 100% across unified corpus

### REQ-009: Unified corpus merge + dedup
- **Priority**: Must
- **Description**: Merge all ontology/*.jsonl into single `master_sat_ontology_v2.jsonl`; deduplicate by question content hash; report final counts by skill/difficulty
- **Acceptance Criteria**: Output file exists; no duplicate question IDs; inventory report printed
- **Verification**: (TEST) No duplicate IDs; total count ≥ 1,500

## Technical Design

### Architecture
- Scripts: `scripts/ontology/` — one script per step
- Output: `ontology/` directory — intermediate per-skill JSOLs + final merged file
- Schema: `src/app/api/ontology/schema.ts` — TypeScript types for unified format
- No new npm deps — use Python (pdfplumber already in project) for extraction scripts

### Unified Schema (canonical)
```typescript
{
  id: string              // 8-char hex
  test: "SAT"
  domain: "Reading and Writing" | "Math"
  skill: string           // CB full skill name
  difficulty: "Easy" | "Medium" | "Hard"
  passage: string
  question: string
  choices: { A: string; B: string; C: string; D: string }
  correct_answer: "A" | "B" | "C" | "D"
  rationale: string
  knowledge_graph: {
    parent_concept: string
    prerequisite: string
    passage_topic?: string
    concept_tags?: string[]
  }
  analysis?: Record<string, unknown>   // skill-specific enrichment
  source: string          // source file
}
```

### Dependencies
- Python: pdfplumber (already present via vision_extractor.py)
- No new npm packages

## Traceability Matrix

| REQ ID  | Description                        | Verification | Status  |
|---------|------------------------------------|--------------|---------|
| REQ-001 | Unified schema TypeScript types    | (TEST)       | Pending |
| REQ-002 | blog_database JSONL migration      | (TEST)       | Pending |
| REQ-003 | master_sat_ontology migration      | (TEST)       | Pending |
| REQ-004 | Boundaries PDF extraction          | (MANUAL)     | Pending |
| REQ-005 | FSS PDF extraction                 | (MANUAL)     | Pending |
| REQ-006 | Rhetorical Synthesis PDF extraction| (MANUAL)     | Pending |
| REQ-007 | TSP PDF extraction                 | (MANUAL)     | Pending |
| REQ-008 | Knowledge graph enrichment         | (TEST)       | Pending |
| REQ-009 | Unified corpus merge + dedup       | (TEST)       | Pending |

## Implementation Order

1. REQ-001 — schema first, all scripts depend on it
2. REQ-002 — JSONL migration (no external deps, fast to validate)
3. REQ-003 — master migration (1,174 entries, filter corrupt)
4. REQ-004–007 — PDF extractions in parallel (independent per skill)
5. REQ-008 — enrichment after all data is in unified format
6. REQ-009 — final merge after all sources ready

## Out of Scope

- Math domain questions
- Web API / Next.js routes for serving ontology (separate feature)
- LLM-based concept extraction (Phase 3)
