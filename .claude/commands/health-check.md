---
description: Run comprehensive system health check on .claude/ configuration
allowed-tools: Bash(.claude/scripts/health-check.sh:*), Read, Grep, Glob
---

# Health Check

Run a comprehensive audit of the .claude/ system configuration.

## Usage
Use periodically to validate system integrity, or when the self-aware system suggests it (>10 accumulated observations).

## Instructions

1. **Run Static Checks**
   - Execute `.claude/scripts/health-check.sh`
   - Capture all pass/warn/fail results

2. **Semantic Analysis** (if static checks find issues)
   - For each finding, analyze root cause
   - Check for contradictions between rules, skills, and agent definitions
   - Check for knowledge staleness (skills referencing outdated patterns)
   - Check for coverage gaps (common user tasks with no agent/skill)

3. **Report Findings**
   - Summary: X critical, Y warnings, Z info
   - Detail each finding with file path, description, and proposed fix
   - Group by type: structural, knowledge, consistency, performance

4. **Propose Resolutions**
   - For each finding, propose a specific fix
   - Respect approval tiers from `.claude/rules/self-improvement.md`
   - Batch related fixes together

5. **Review Changelog**
   - Read `.claude/user/changelog.md` for patterns
   - Flag recurring issues that keep being healed (indicates deeper problem)

## Output Format

```
System Health Report
====================

Status: HEALTHY | DEGRADED | UNHEALTHY

Structural: X issues
Knowledge:  Y issues
Consistency: Z issues
Performance: W issues

[Detailed findings grouped by category]

Proposed Actions:
[Numbered list of fixes with approval tier noted]
```
