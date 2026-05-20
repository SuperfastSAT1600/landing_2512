# Defensive Patch Scanner

Scan code for defensive patches that mask root causes instead of fixing them.

## Usage

```
/defensive-scan [path or glob]
```

Default: `src/` — pass a path or glob to narrow scope.

## Instructions

Search the target path for these anti-patterns. For each hit, determine whether it's a **legitimate boundary check** (user input, external API, DB result) or a **defensive patch masking a bug**.

### Patterns to detect

**Fallback defaults hiding bad data flow:**
- `|| ''`, `|| []`, `|| {}`, `|| 0`, `|| false`
- `?? defaultValue` where the nullish case shouldn't be possible

**Excessive optional chaining:**
- `a?.b?.c?.d` — 3+ levels suggests the data shape is wrong upstream

**Silent error swallowing:**
- Empty `catch {}` blocks or `catch { /* ignore */ }`
- `catch (e) { return null }` hiding real failures

**Type coercion guards:**
- `as any`, `as unknown as X` — forcing types to avoid fixing the real type
- `// @ts-ignore`, `// @ts-expect-error` without linked issue

**Redundant null checks:**
- Null-checking values that should be guaranteed by the caller/provider
- `if (x) { ... }` wrapping code that should never receive falsy values

### Analysis per finding

For each suspicious pattern, report:

```
📍 file:line — `code snippet`
🔍 Verdict: DEFENSIVE PATCH | LEGITIMATE | BORDERLINE
💡 Root fix: [what should actually be fixed]
```

### Summary

End with a table:

| Severity | Count | Top root causes |
|----------|-------|-----------------|
| Defensive patches | N | ... |
| Borderline | N | ... |
| Legitimate (skip) | N | — |

Propose fixes for the top 3 worst offenders — trace each to its root cause.
