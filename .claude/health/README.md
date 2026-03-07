# Health Directory

Persistent state for the self-aware system.

## Files
- `changelog.md` — Log of all self-initiated system changes
- `README.md` — This file

## How It Works
The system continuously observes its own `.claude/` configuration during tasks.
Issues are noted, then resolved after the primary task completes.
All changes are logged here and committed to git.

See `.claude/rules/self-improvement.md` for the full behavior specification.
