# Call Transcript Capture

## Overview

Sales-call transcripts are generated on every Plaud memo and immediately discarded.
`processPlaudRecording()` returns `{ transcript, summary }`, but
`src/app/api/crm/students/[id]/plaud-memo/route.ts:91` destructures only `summary`.
The speaker-labelled Korean transcript — already produced, already paid for via Qwen
`fun-asr` — is dropped on the floor.

This feature persists it, and backfills the transcripts already lost.

Motivation is an external IntFunc data pipeline that fits a conversion-prediction pack on
real sales-call language. That pipeline is blocked: the only transcripts anywhere in the
system are in `call_sessions` (a removed VoIP feature, 2026-06-16 → 2026-08-05, volume
unverified), and `call_recordings` was dropped in migration 059. Without capture there is
no corpus and no way for one to accumulate.

**Attribution constraint.** Plaud recordings carry no student reference. The recording↔student
link exists in exactly one place: the memo header the route writes,
`🎙️ Plaud 상담 자동 요약 · {recording_name} · {YYYY-MM-DD HH:mm}` (KST). The backfill is
therefore driven by existing memos, not by the Plaud file list. A recording never turned
into a memo has no student, no label, and no corpus value.

## Requirements

### REQ-001: `call_transcripts` table
- **Priority**: Must
- **Verification**: (MANUAL) Run migration against dev, then confirm with an insert, a
  duplicate insert, and an anon-key select.
- **Description**: New table holding full transcripts, keyed to a student and optionally to
  the `ConsultationEntry` that summarised it. Deliberately NOT a field on
  `students.consultation_timeline` — that JSONB rides along on every `select *` across the
  CRM (`usePanelData`, `strategy-brief`, panel hooks), and multi-KB transcripts would inflate
  every page load for a payload nothing renders.
  Columns: `id`, `student_id` (FK CASCADE), `timeline_entry_id`, `source`
  (`'plaud' | 'voip'`), `external_id`, `recording_name`, `recorded_at`, `duration_sec`,
  `transcript` (NOT NULL), `asr_model`, `created_at`.
  Indexes on `student_id` and `recorded_at`; partial unique on `(source, external_id)` where
  `external_id IS NOT NULL`, which is what makes the backfill idempotent.
  RLS enabled with no policies — service_role only, matching the `call_sessions` pattern in
  migration 058.
- **Acceptance Criteria**: Migration applies cleanly. Insert with a valid `student_id`
  succeeds; a duplicate `(source, external_id)` is rejected; `anon` and `authenticated`
  cannot read the table.


### REQ-002: Route persists the transcript
- **Priority**: Must
- **Verification**: (TEST) Extend `plaud-memo/__tests__/route.test.ts` — assert the insert is
  called with the transcript and the entry id.
- **Description**: `plaud-memo/route.ts` keeps `transcript` alongside `summary` and writes a
  `call_transcripts` row after `appendConsultationEntry` succeeds, linking
  `timeline_entry_id` to the created entry and recording `external_id` (Plaud `file_id`),
  `recording_name`, `recorded_at`, `duration_sec`, `asr_model`.
- **Acceptance Criteria**: Posting a recording creates one memo AND one `call_transcripts`
  row whose `transcript` matches ASR output and whose `timeline_entry_id` matches the new
  entry's `id`.


### REQ-003: Transcript failure never costs the memo
- **Priority**: Must
- **Verification**: (TEST) Route test with the Supabase insert mocked to reject.
- **Description**: The memo is the operator-facing product; the transcript is secondary
  capture. A failed `call_transcripts` insert is logged and swallowed, and the route still
  returns 201 with the entry. This mirrors the existing Slack-notify isolation in the same
  route, which is already `try/catch` for the same reason.
- **Acceptance Criteria**: With the insert forced to throw, the endpoint returns 201, the
  memo exists, and the error is logged.


### REQ-004: Memo header parser
- **Priority**: Must
- **Verification**: (TEST) `src/lib/__tests__/plaud-backfill.test.ts`.
- **Description**: Pure function extracting `{ recordingName, recordedAtKst }` from a
  `raw_memo` first line. Split on ` · `, drop the leading `🎙️ Plaud 상담 자동 요약` marker;
  if the final segment matches `\d{4}-\d{2}-\d{2} \d{2}:\d{2}` treat it as the timestamp and
  rejoin the remainder as the name. Splitting rather than a single regex is deliberate — a
  recording name may itself contain ` · `.
- **Acceptance Criteria**: Correctly parses header-with-both, name-only, timestamp-only, and
  bare-header forms; returns null for non-Plaud memos; handles a name containing ` · `.


### REQ-005: Backfill matches memos to Plaud recordings
- **Priority**: Must
- **Verification**: (TEST) `src/lib/__tests__/plaud-backfill.test.ts`.
- **Description**: For each student's `consultation_timeline`, take entries whose `raw_memo`
  starts with the Plaud marker and which have no `call_transcripts` row. Parse the header
  (REQ-004), then match against `listPlaudRecordings()` across every account in
  `PLAUD_ACCOUNTS` on `name` equality AND `toKstDisplay(start_at)` equality. Ambiguous or
  unmatched entries are skipped and reported, never guessed.
- **Acceptance Criteria**: Given fixture memos and a fixture recording list, matched pairs
  resolve to the right `file_id`; a name collision at different timestamps resolves
  correctly; a bare header is reported unmatched.


### REQ-006: Backfill script is resumable and bounded
- **Priority**: Must
- **Verification**: (TEST) Unit tests with Plaud client and ASR mocked, plus (MANUAL) a
  `--limit 3` run against dev.
- **Description**: `scripts/backfill-call-transcripts.ts`, run via `npx tsx` (matching the
  `generate-embeddings.ts` precedent). Supports `--dry-run`, `--limit N`, `--account <key>`.
  For each matched entry: `getPlaudFile` → `transcribeAudioUrl` → insert. Re-running skips
  rows already present via the REQ-001 unique constraint. ASR failures are logged per-entry
  and do not abort the run. Prints a final tally of inserted / skipped / unmatched / failed.
- **Acceptance Criteria**: `--dry-run` writes nothing and reports what it would do. A second
  full run inserts zero rows. A forced ASR failure on one entry leaves the others intact.


### REQ-007: No CRM regression
- **Priority**: Should
- **Verification**: (BROWSER) Playwright — open a student panel, create a memo from a
  recording, confirm the draft appears unchanged and unpublished.
- **Description**: The recording picker and memo panel behave exactly as before; transcript
  capture is invisible to operators in this feature.


## Technical Design

### Architecture

| Layer | File | Change |
|-------|------|--------|
| Schema | `supabase/migrations/119_call_transcripts.sql` | New (REQ-001) |
| Route | `src/app/api/crm/students/[id]/plaud-memo/route.ts` | Keep `transcript`, insert row (REQ-002/003) |
| Lib | `src/lib/call-transcripts.ts` | `insertCallTranscript()` — single write path |
| Lib | `src/lib/plaud-backfill.ts` | Header parser + matcher, pure (REQ-004/005) |
| Lib | `src/lib/plaud-backfill-run.ts` | `runBackfill()` — orchestration with injected I/O (REQ-006) |
| Script | `scripts/backfill-call-transcripts.ts` | Orchestration + CLI (REQ-006) |

`toKstDisplay` currently lives privately in the route. Both the route and the matcher need
it, so it moves to `src/lib/plaud-backfill.ts` (or a shared date util) and the route imports
it — same formatting, one definition, so header writing and header matching cannot drift.

Nothing in `qwen-asr.ts`, `plaud-transcribe.ts`, or `plaud-process.ts` changes. The
transcription pipeline already works; this feature only stops discarding its output.

### Dependencies

No new packages. Existing: Qwen DashScope `fun-asr` (`QWEN_API_KEY`), Plaud MCP
(`PLAUD_REFRESH_TOKEN`, `PLAUD_REFRESH_TOKEN_WOOYOUNG`), Supabase service role.

Backfill cost is one Qwen ASR call per recovered recording — roughly 22s for a 21-minute
file per the `qwen-asr.ts` comments. Bound the first run with `--limit`.

## Traceability Matrix

| REQ ID  | Description                        | Verification | Test File                                               | Status  |
|---------|------------------------------------|--------------|---------------------------------------------------------|---------|
| REQ-001 | `call_transcripts` table + RLS     | (MANUAL)     | PGlite harness 18/18; dev apply pending                   | Verified (local) |
| REQ-002 | Route persists transcript          | (TEST)       | `src/app/api/crm/students/[id]/plaud-memo/__tests__/route.test.ts` | Done    |
| REQ-003 | Insert failure preserves memo      | (TEST)       | `src/app/api/crm/students/[id]/plaud-memo/__tests__/route.test.ts` | Done    |
| REQ-004 | Memo header parser                 | (TEST)       | `src/lib/__tests__/plaud-backfill.test.ts`                | Done    |
| REQ-005 | Memo→recording matcher             | (TEST)       | `src/lib/__tests__/plaud-backfill.test.ts`                | Done    |
| REQ-006 | Backfill resumable + bounded       | (TEST)       | `src/lib/__tests__/plaud-backfill-run.test.ts` (11)        | Done (TEST); MANUAL pending |
| REQ-007 | No CRM regression                  | (BROWSER)    | Playwright MCP spot-check                                 | Pending |

## Implementation Order

1. REQ-001 — everything writes to this table; nothing else can be verified without it.
2. REQ-004 — pure function, no dependencies, and REQ-005 needs it.
3. REQ-005 — matcher builds on the parser.
4. REQ-002 — route capture; forward flow starts working here.
5. REQ-003 — failure isolation, tested against the REQ-002 path.
6. REQ-006 — backfill composes REQ-001/004/005 and is the only step that spends ASR budget.
7. REQ-007 — browser check once the route work is settled.

## Out of Scope

- **Migrating `call_sessions.transcript`.** The `source` column admits `'voip'` so it can be
  absorbed later, but its contents are unverified and it may hold zero rows. Separate task.
- **Exposing transcripts in the CRM UI.** Capture only; no reader, no panel changes.
- **Redaction.** Transcripts are stored raw. PII redaction belongs to the IntFunc export
  pipeline, not to capture — redacting at write time would destroy the operational record.
- **The IntFunc export itself** — extraction, labelling, Parquet, training job. Separate plan.
- **Retention policy.** No TTL or purge for `call_transcripts` in this feature. Worth
  deciding before the table grows; flagged, not solved here.
- **Scrubbing the leaked `service_role` key** from git history (`crm/migrate_*.py`). Unrelated
  security task, already raised.
