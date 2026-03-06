# Spec Audit Criteria

Reference for what `audit-spec.sh` checks, in the order it runs them. Use this to write specs that pass validation without reading the script itself.

Script location: `.claude/scripts/audit-spec.sh`
Invoked automatically by: the `PostToolUse` hook when you write a file to `.claude/plans/`
Manual invocation: `bash .claude/scripts/audit-spec.sh .claude/plans/my-feature.md`

---

## Exit Codes

| Code | Meaning | Effect on coding tools |
|------|---------|------------------------|
| `0` | All checks pass | Unblocked |
| `1` | Warnings only | Unblocked (warnings are informational) |
| `2` | Critical failures | Stays blocked — fix the spec first |

---

## Checks (In Order)

### 1. REQ IDs Exist — CRITICAL (exit 2 on failure)

The spec must contain at least one requirement ID matching the pattern `REQ-[0-9]{3}` (e.g., `REQ-001`, `REQ-042`).

The audit counts unique REQ IDs found anywhere in the file. If the count is zero, it fails immediately.

**Fix**: Add at least one `### REQ-001: Title` heading in your requirements section.

---

### 2. No Duplicate REQ Definitions — CRITICAL (exit 2 on failure)

Each REQ-XXX ID may only appear as a section heading (`### REQ-XXX: ...`) once. The audit finds any REQ IDs that appear as headings more than once and fails if any are found.

Note: A REQ ID can appear multiple times in the file (e.g., in the traceability matrix), but it must not be *defined* as a heading more than once.

**Fix**: Remove or renumber any duplicate `### REQ-XXX` headings.

---

### 3. No Gaps in REQ Numbering — WARNING (exit 1)

REQs should be sequential. If you define REQ-001, REQ-002, and REQ-004, the audit warns about the gap at REQ-003.

Gaps do not block coding. They are informational — the warning helps catch typos in REQ numbers.

**Fix**: Renumber REQs to be sequential, or accept the warning.

---

### 4. All REQs Have Verification Tags — CRITICAL (exit 2 on failure)

Every `### REQ-XXX` section must have a verification tag within 3 lines of the REQ ID. The accepted formats are:

```markdown
**Verification**: (TEST)
**Verification**: (BROWSER)
**Verification**: (MANUAL)
```

The audit finds all unique REQ IDs, checks each one for a nearby `**Verification**: (TEST|BROWSER|MANUAL)` line, and fails if any REQ is missing one.

**Fix**: Add a `**Verification**:` line to every REQ section.

---

### 5. At Least One (TEST) Verification — WARNING (exit 1)

The spec should have at least one automated test (`(TEST)` tag). Specs where every requirement is `(BROWSER)` or `(MANUAL)` trigger this warning.

This does not block coding, but it signals that the feature has no automated regression coverage planned.

**Fix**: Mark at least one REQ with `(TEST)` and plan a corresponding test.

---

### 6. Traceability Matrix Present — WARNING (exit 1)

The spec should contain a section with a heading that matches (case-insensitive): "Traceability Matrix", "Traceability", or a table header like "REQ ID ... Description ... Verification".

**Fix**: Add a `## Traceability Matrix` section. See the spec template for the expected table format.

---

### 7. All REQs Appear in Traceability Matrix — WARNING (exit 1)

If a traceability matrix section is present, every REQ defined in the spec must also appear in that matrix. The audit compares REQs found before the matrix heading against REQs found within the matrix section.

This check is skipped if no matrix section is found (check 6 handles that case separately).

**Fix**: Add a row for each REQ to the traceability matrix table.

---

### 8. No Placeholder Descriptions — WARNING (exit 1)

Any `{{...}}` placeholder text left in the spec triggers a warning. Placeholders are copied from the template and should be replaced with real content before the spec is used.

**Fix**: Replace all `{{placeholder}}` text with actual values.

---

### 9. Must-Priority Requirements Present — WARNING (exit 1)

At least one REQ should have `**Priority**: Must`. Specs where all requirements are "Should" or "Could" get a warning, since it suggests no core requirements have been identified.

**Fix**: Add `**Priority**: Must` to your critical requirements.

---

## Quick Checklist

| Check | Required? | Blocks coding? |
|-------|-----------|----------------|
| At least one `REQ-XXX` ID | Yes | Yes |
| No duplicate `### REQ-XXX` headings | Yes | Yes |
| Sequential REQ numbering (no gaps) | Recommended | No |
| `**Verification**: (TEST/BROWSER/MANUAL)` on every REQ | Yes | Yes |
| At least one `(TEST)` verification | Recommended | No |
| Traceability matrix section | Recommended | No |
| All REQs listed in traceability matrix | Recommended | No |
| No `{{placeholder}}` text remaining | Recommended | No |
| At least one `**Priority**: Must` REQ | Recommended | No |

---

## Minimal Passing Spec

This is the smallest spec that clears all critical checks (exit code 0 or 1):

```markdown
# Feature: Example

## Requirements

### REQ-001: Core behavior
**Priority**: Must
**Verification**: (TEST)

The system must do X.

## Traceability Matrix

| REQ ID  | Description   | Verification | Test File          |
|---------|---------------|--------------|--------------------|
| REQ-001 | Core behavior | (TEST)       | tests/example.test.ts |
```

For a complete example, see `.claude/templates/spec.md.template`.
