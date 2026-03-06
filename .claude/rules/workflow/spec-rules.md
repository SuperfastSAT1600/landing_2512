# Spec-Driven Development

Canonical spec-first rules. Referenced by `task-protocol.md` and `orchestration/routing.md`.

---

## When to Write a Spec (ALWAYS — enforced by hooks)

**DEFAULT: ALWAYS write a spec.** The SessionStart hook sets a `.plan-active` flag that blocks all coding tools until a spec is written. Do NOT try to skip this.

**The ONLY exceptions** (where you may ask the user "Skip spec for this?"):
- Single-line typo fix
- Config file tweak (tsconfig, package.json, .env)
- Doc-only change (README, comments)

Everything else gets a spec. No self-assessment, no judgment calls. Write the spec.

---

## How to Write a Spec

1. Load `Skill("spec-writing")`
2. Write to `.claude/plans/[feature].md` using `.claude/templates/spec.md.template`
3. Audit runs on save — coding tools unblock when it passes
4. Implement REQ-by-REQ (Red-Green-Refactor)

Each requirement: `REQ-XXX` ID + `(TEST)` / `(BROWSER)` / `(MANUAL)` tag + one-line acceptance criterion.

---

## Spec + Parallel Orchestration

Spec always precedes parallel implementation — it's the coordination contract (workstream boundaries, REQ ownership, verification criteria). Write spec → identify REQs → assign to agents → each agent verifies their REQs → lead runs `/checkpoint`.
