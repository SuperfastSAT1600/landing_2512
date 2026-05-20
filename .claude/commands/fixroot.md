---
description: Trace a bug to its structural origin and eliminate it — not patch it
allowed-tools: Read, Bash(grep:*), Bash(find:*), Bash(git:*), Bash(npm test:*), Bash(npm run test:*), Bash(npx vitest:*), Edit, Write
---

# Fix Root Command

Investigate a bug by tracing it backwards to its origin, identify the broken contract or invariant, and propose a structural fix — before touching a single line of code.

---

## Usage

```
/fixroot <symptom-description>
```

**Examples:**
```
/fixroot TypeError: Cannot read properties of undefined reading 'id'
/fixroot cart items disappear on page refresh
/fixroot null check in three different places for the same value
/fixroot API response sometimes returns [] instead of the real data
```

---

## Core Philosophy

Most fixes add code. The best root-cause fix deletes it.

Surface patches handle bad state. Root fixes eliminate the conditions that produce it. The symptom location is almost never the bug location — it's the first place downstream code noticed something was wrong. The bug lives upstream.

**The north star**: if the fix is correct, the downstream guards, null checks, and fallbacks that were defending against the bug become unreachable — and can be deleted.

---

## What This Command Does NOT Do

- Add a null check where null shouldn't exist
- Wrap errors in try/catch instead of preventing them
- Add a fallback `|| []` to mask a contract violation
- Move a guard to a "better" location (still a patch)
- Touch any code before the investigation is complete and signed off

---

## Workflow

### Phase 1 — LOCATE: Find the symptom

Identify where the bug manifests. Note the surface-patch pattern already present (if any):

| Pattern | What it signals |
|---------|----------------|
| `?.` optional chain | Caller doesn't trust callee to return defined value |
| `\|\| []` / `\|\| {}` fallback | Bad data reaching a consumer that expects clean data |
| `try/catch` returning null/empty | Error being swallowed instead of prevented |
| `setTimeout` / `useEffect` timing hack | Async ordering assumption that isn't guaranteed |
| `as SomeType` TypeScript cast | Type system being bypassed because actual type is wrong |
| Same null-check in 2+ places | **Rule of Two** — contract is broken at the source |

### Phase 2 — TRACE: Follow the bad value upstream

Walk backwards through the call stack and data flow. Ask at each step:

> "Where does this value come from? Could it be wrong there?"

Keep going until you reach either:
- The system boundary (user input, external API, database read) — that's the origin
- A component that violates a contract it promised to fulfill — that's the bug

### Phase 3 — NAME: Identify the broken contract or invariant

State explicitly:
- **What should always be true** at the bug site that isn't
- **Which two layers** have a mismatched assumption (caller expects X, callee produces Y)
- **Why the type/schema/model permits a state** that should be impossible

### Phase 4 — PROPOSE: Deletion-first fix

Present the structural fix. The proposal must answer:

1. Where exactly does the fix live? (origin, not symptom site)
2. What code gets deleted as a result?
3. What minimal change makes the bad state structurally impossible?

Show a before/after. Net lines should go down or stay flat — never up.

### Phase 5 — GATE: Await sign-off

**Stop here.** Present the full investigation report and ask:

> "Does this match what you expected? Should I implement it?"

Do not proceed until confirmed.

### Phase 6 — IMPLEMENT: Fix at the origin

- Change the source, not the consumers
- Delete downstream guards that are now unreachable
- Run tests

### Phase 7 — VERIFY: Confirm structural improvement

Report:
- Tests passing
- Net lines deleted
- Which downstream guards were removed

---

## Investigation Report Format

```
## Symptom
[Where and how it manifests. File:line if known.]

## Trace
[The path backwards. Origin → ... → symptom site.]

## Broken Contract
[Caller assumed X. Callee produces Y. The mismatch.]

## Invariant That Should Hold
[What should always be true here. Why it currently isn't.]

## Proposed Fix
[What changes, where, and why it's structural not cosmetic.]

**Origin file**: path/to/file.ts:line
**Fix type**: [delete bad state / enforce type / fix contract / restructure data flow]

Before:
[relevant code]

After:
[structural fix]

**Code deleted downstream** (now unreachable):
- path/to/file.ts:line — [the guard/fallback/check that becomes dead]
- ...

**Net change**: -N lines

---
Proceed? (y / adjust / explain more)
```

---

## Example Session

```
User: /fixroot user.settings is undefined three places in the codebase

Agent:

## Symptom
`user.settings` is accessed with optional chaining (`user.settings?.theme`,
`user.settings?.notifications`, `user.settings?.timezone`) in three files:
  - src/components/Header.tsx:42
  - src/pages/Dashboard.tsx:88
  - src/hooks/usePreferences.ts:15

The Rule of Two applies — same guard in 3 places means the contract
is broken upstream, not in each consumer.

## Trace
Following `user` object upstream:

usePreferences.ts:15 → receives `user` from useAuth()
useAuth.ts:34 → returns user from Supabase session
supabase/auth.ts:21 → maps raw session to User type

Found: User type definition
  type User = { id: string; email: string; settings?: UserSettings }
                                                         ^
`settings` is optional. But the Supabase session always includes settings
(confirmed in DB schema — settings column is NOT NULL with default).
The type is lying about what the data actually guarantees.

## Broken Contract
Caller (every component) assumes `settings` may be undefined.
DB schema guarantees it's always present.
Type definition is wrong — it declared optional what is actually required.

## Invariant That Should Hold
Every authenticated user object should have a fully populated `settings`
object. The DB enforces this. The application type should too.

## Proposed Fix

**Origin file**: src/types/user.ts:8
**Fix type**: enforce type at the boundary

Before:
  type User = {
    id: string
    email: string
    settings?: UserSettings  // optional — wrong
  }

After:
  type User = {
    id: string
    email: string
    settings: UserSettings   // required — matches DB guarantee
  }

Parse-validate at the one boundary where raw Supabase data enters:
  // supabase/auth.ts — already the only mapping point
  const user = UserSchema.parse(rawSession.user) // Zod throws if malformed

**Code deleted downstream** (now unreachable):
  - src/components/Header.tsx:42 — `user.settings?.theme` → `user.settings.theme`
  - src/pages/Dashboard.tsx:88 — `user.settings?.notifications` → `user.settings.notifications`
  - src/hooks/usePreferences.ts:15 — `user.settings?.timezone` → `user.settings.timezone`

**Net change**: -6 lines (3 optional chains removed, 1 type field tightened, 1 parse call already existed)

---
Proceed? (y / adjust / explain more)
```

---

## When to Use

- A null/undefined error that keeps recurring in different places
- The same guard pattern appears in 2+ files for the same value
- A bug fix was applied before but came back
- "Defensive code" is accumulating around the same data structure
- A try/catch is hiding what the real problem is
- You suspect the fix location and the bug location are different files

## When NOT to Use

- The bug and fix are clearly in the same place (`/quick-fix` is faster)
- It's a UI/layout issue with no data involvement
- You already know the root cause and just need to implement

---

## Related Commands

- `/quick-fix` — surface fix, same file, obvious cause
- `/refactor-clean` — clean up code after root fix removes the guards
- `/spike` — investigate before committing to an architectural approach
