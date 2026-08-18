# Implementation Plan: Diagnosis Notification Emails

## Requirements

### REQ-001: Test submission email notification
- **Description**: When a student submits a diagnostic test, send an email to `minjae.lee90@gmail.com` (in addition to existing `baeby@argonautai.co.kr` recipient) containing student name, email, submission time, token ID, and report link.
- **Verification**: (TEST)
- **Priority**: Must

### REQ-002: Expired-unfinished token daily notification
- **Description**: Every day at a scheduled time, query `diagnostic_access_tokens` for tokens where `expires_at < now()`, `is_active = true`, and no matching `diagnostic_test_results.token_id` exists. Send a summary email to both recipients listing each unfinished student (name, email, token code, expiry time, days since expiry).
- **Verification**: (TEST)
- **Priority**: Must

### REQ-003: Vercel Cron job configuration
- **Description**: Configure a Vercel Cron job that hits the expired-token check API route daily at 09:00 KST (00:00 UTC).
- **Verification**: (MANUAL)
- **Priority**: Must

### REQ-004: Duplicate notification prevention
- **Description**: Prevent sending the expired-token notification more than once per token. Track notified tokens via a `expiry_notified_at` column on `diagnostic_access_tokens`.
- **Verification**: (TEST)
- **Priority**: Must

### REQ-005: Notification recipients configurable
- **Description**: Both email addresses (`minjae.lee90@gmail.com`, `baeby@argonautai.co.kr`) are defined in a single constant array in `email.ts` for easy modification.
- **Verification**: (TEST)
- **Priority**: Should

### REQ-006: Graceful failure
- **Description**: Email send failures must not break the submit flow or the cron job. Errors are logged but do not cause 5xx responses.
- **Verification**: (TEST)
- **Priority**: Must

## Traceability Matrix

| REQ ID  | Description                         | Verification | Test/Check Location                                      |
|---------|-------------------------------------|-------------|----------------------------------------------------------|
| REQ-001 | Submit notification email           | (TEST)      | `src/lib/__tests__/email-notifications.test.ts`          |
| REQ-002 | Expired-unfinished daily email      | (TEST)      | `src/app/api/cron/__tests__/expired-tokens.test.ts`      |
| REQ-003 | Vercel Cron config                  | (MANUAL)    | `vercel.json` — verify in Vercel dashboard               |
| REQ-004 | Duplicate prevention                | (TEST)      | `src/app/api/cron/__tests__/expired-tokens.test.ts`      |
| REQ-005 | Configurable recipients             | (TEST)      | `src/lib/__tests__/email-notifications.test.ts`          |
| REQ-006 | Graceful failure                    | (TEST)      | `src/lib/__tests__/email-notifications.test.ts`          |

## Technical Approach

### Architecture

```
Student submits test
  └─ POST /api/diagnosis/submit
       └─ After successful insert, fire-and-forget: sendTestSubmissionNotification()
            └─ Resend API → both recipients

Vercel Cron (daily 09:00 KST)
  └─ GET /api/cron/expired-tokens
       └─ Query: expired + active + no result + not yet notified
       └─ Send summary email → both recipients
       └─ UPDATE expiry_notified_at on each token
```

### Key Decisions

1. **Fire-and-forget on submit**: The email call is `await`ed but wrapped in try/catch so it never blocks or fails the response. This is simpler than a queue and acceptable given Resend's reliability and the low volume.

2. **Single `expiry_notified_at` column**: Adding one nullable `TIMESTAMPTZ` column to `diagnostic_access_tokens` is the simplest deduplication approach. No new table needed. If the column is non-null, the token has already been notified.

3. **Cron authorization**: The cron endpoint is protected by a `CRON_SECRET` env var. Vercel automatically sends this header. This prevents external abuse.

4. **Recipients array**: A single `NOTIFICATION_RECIPIENTS` constant in `email.ts` avoids scattered hardcoded addresses.

## Implementation Steps

### Step 1: DB Migration — add `expiry_notified_at` column
**Files**: `supabase/migrations/008_add_expiry_notified_at.sql`
**Dependencies**: None
**Description**: 
```sql
ALTER TABLE diagnostic_access_tokens
  ADD COLUMN IF NOT EXISTS expiry_notified_at TIMESTAMPTZ DEFAULT NULL;
```
**Satisfies**: REQ-004

### Step 2: Extend `email.ts` with new email functions
**Files**: `src/lib/email.ts`
**Dependencies**: Step 1
**Description**:
- Add `NOTIFICATION_RECIPIENTS` constant array with both email addresses
- Add `sendTestSubmissionNotification(data)` — sends per-student submission alert with report link
- Add `sendExpiredTokensNotification(tokens[])` — sends a summary table of all expired-unfinished tokens
- Both functions: try/catch internally, log errors, never throw
- Update existing `sendApplicationNotification` to also use `NOTIFICATION_RECIPIENTS` (optional, backward compatible)

**Email content (submission)**:
- Subject: `[SuperfastSAT] 진단테스트 제출 - {studentName}`
- Body: table with student name, email, submitted time, token ID, link to `/reports/{resultId}`

**Email content (expired summary)**:
- Subject: `[SuperfastSAT] 미응시 토큰 알림 - {count}건`
- Body: table listing each expired token with student name, email, token code, expiry date, days overdue

**Satisfies**: REQ-001, REQ-002, REQ-005, REQ-006

### Step 3: Integrate submission notification into submit route
**Files**: `src/app/api/diagnosis/submit/route.ts`
**Dependencies**: Step 2
**Description**:
- After successful insert (line ~139, after `resultId` is confirmed), call:
  ```typescript
  sendTestSubmissionNotification({
    studentName,
    studentEmail: studentEmail || '',
    submittedAt: submittedAt || new Date().toISOString(),
    tokenId: tokenId || null,
    resultId,
  }).catch(err => console.error('[submit] notification email error:', err));
  ```
- Do NOT await — fire-and-forget to avoid slowing the response
- Do NOT send for idempotent/duplicate returns (only on fresh insert, status 201)

**Satisfies**: REQ-001, REQ-006

### Step 4: Create Cron API route for expired tokens
**Files**: `src/app/api/cron/expired-tokens/route.ts`
**Dependencies**: Step 2
**Description**:
- `GET` handler
- Verify `Authorization: Bearer {CRON_SECRET}` header (Vercel sends this automatically)
- Query Supabase:
  ```sql
  SELECT t.id, t.token, t.student_name, t.student_email, t.expires_at
  FROM diagnostic_access_tokens t
  LEFT JOIN diagnostic_test_results r ON r.token_id = t.id
  WHERE t.is_active = true
    AND t.expires_at < now()
    AND t.expiry_notified_at IS NULL
    AND r.id IS NULL
  ```
- If results > 0, call `sendExpiredTokensNotification(tokens)`
- Then UPDATE all matched token IDs: `SET expiry_notified_at = now()`
- Return `{ notified: count }`

**Satisfies**: REQ-002, REQ-004, REQ-006

### Step 5: Add `vercel.json` with cron configuration
**Files**: `vercel.json`
**Dependencies**: Step 4
**Description**:
```json
{
  "crons": [
    {
      "path": "/api/cron/expired-tokens",
      "schedule": "0 0 * * *"
    }
  ]
}
```
- Schedule: `0 0 * * *` = daily at 00:00 UTC = 09:00 KST
- Add `CRON_SECRET` to Vercel environment variables

**Satisfies**: REQ-003

### Step 6: Write unit tests
**Files**: 
- `src/lib/__tests__/email-notifications.test.ts`
- `src/app/api/cron/__tests__/expired-tokens.test.ts`
**Dependencies**: Steps 2, 3, 4
**Description**:

**email-notifications.test.ts**:
- Test `sendTestSubmissionNotification` calls Resend with correct recipients, subject, and body content
- Test `sendExpiredTokensNotification` calls Resend with summary of multiple tokens
- Test both functions swallow errors gracefully (mock Resend to throw)
- Test `NOTIFICATION_RECIPIENTS` contains both addresses

**expired-tokens.test.ts**:
- Test cron route returns 401 without valid CRON_SECRET
- Test cron route queries correct filter (expired, active, no result, not yet notified)
- Test cron route updates `expiry_notified_at` after sending
- Test cron route returns `{ notified: 0 }` when no expired tokens exist
- Test cron route does not re-notify tokens where `expiry_notified_at` is already set

**Satisfies**: REQ-001 through REQ-006

## New/Modified Files Summary

| # | File | Action | Purpose |
|---|------|--------|---------|
| 1 | `supabase/migrations/008_add_expiry_notified_at.sql` | NEW | Add dedup column |
| 2 | `src/lib/email.ts` | MODIFY | Add 2 new email functions + recipients constant |
| 3 | `src/app/api/diagnosis/submit/route.ts` | MODIFY | Call submission notification |
| 4 | `src/app/api/cron/expired-tokens/route.ts` | NEW | Daily cron endpoint |
| 5 | `vercel.json` | NEW | Vercel Cron schedule |
| 6 | `src/lib/__tests__/email-notifications.test.ts` | NEW | Email function tests |
| 7 | `src/app/api/cron/__tests__/expired-tokens.test.ts` | NEW | Cron route tests |

## Testing Strategy

| REQ ID  | Test Type        | Location                                              |
|---------|------------------|-------------------------------------------------------|
| REQ-001 | Unit test        | `email-notifications.test.ts` — mock Resend, verify call args |
| REQ-002 | Unit test        | `expired-tokens.test.ts` — mock Supabase + Resend    |
| REQ-003 | Manual           | Deploy to Vercel, check Cron tab in dashboard         |
| REQ-004 | Unit test        | `expired-tokens.test.ts` — verify UPDATE + re-run returns 0 |
| REQ-005 | Unit test        | `email-notifications.test.ts` — assert recipients array |
| REQ-006 | Unit test        | `email-notifications.test.ts` — mock throw, assert no rethrow |

## Risks & Considerations

### Risk 1: Resend free tier rate limits
- **Impact**: Emails may be throttled if many tokens expire on the same day
- **Mitigation**: The expired-tokens endpoint sends a single summary email (not one per token), keeping volume at 1 email/day maximum for this trigger

### Risk 2: Cron job fails silently
- **Impact**: Expired tokens never notified
- **Mitigation**: Log all errors. Vercel Cron dashboard shows execution history. Could add Slack notification as a future enhancement.

### Risk 3: `expiry_notified_at` column migration on production
- **Impact**: Adding a nullable column with no default is a safe, non-locking operation in PostgreSQL
- **Mitigation**: None needed — this is a safe DDL operation

### Risk 4: Resend `from` address domain verification
- **Impact**: Currently using `onboarding@resend.dev` (Resend test domain). Works for development but may hit deliverability issues.
- **Mitigation**: For production, configure a verified domain in Resend (e.g., `noreply@superfastsat.com`). Not blocking for initial implementation.

### Risk 5: CRON_SECRET not set in environment
- **Impact**: Cron endpoint returns 401, no emails sent
- **Mitigation**: Document in deployment checklist. The endpoint logs a warning if CRON_SECRET is missing.

## Duplicate Prevention Deep-Dive

**Approach**: `expiry_notified_at` column on `diagnostic_access_tokens`

**Why not a separate notifications table?**
- Overkill for this use case (one notification type, one event per token)
- Would require a new table + migration + joins
- A single timestamp column is sufficient and queryable

**Why not in-memory / Redis?**
- Vercel serverless functions are stateless — no shared memory
- Redis would add infrastructure complexity
- DB column is durable and survives redeployments

**Flow**:
1. Cron query includes `WHERE expiry_notified_at IS NULL`
2. After successful email send, `UPDATE SET expiry_notified_at = now()` for matched token IDs
3. Next cron run automatically excludes already-notified tokens
4. Admin can see notification status in the tokens list (optional future enhancement)
