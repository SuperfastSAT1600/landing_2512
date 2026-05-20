# Skill Loading Verification Test

This test verifies that subagents can access skills listed in their frontmatter.

## Test Procedure

1. **Spawn auth-specialist** (has auth-patterns, backend-patterns, rest-api-design, database-patterns)
2. **Ask about specific pattern** from one of those skills
3. **Check if response** uses the skill knowledge correctly

## Expected Behavior

✅ **PASS**: Subagent response shows knowledge from listed skills
❌ **FAIL**: Subagent gives generic answer without skill-specific patterns

## Test Command

```bash
# Test 1: Ask auth-specialist about JWT (from auth-patterns skill)
Task(subagent_type="auth-specialist", prompt="What's the correct way to implement JWT tokens? Be specific about expiry times and algorithm choices.")

# Expected: Should reference RS256, 15min expiry, specific patterns from auth-patterns/skill.md
```

## Manual Verification

If you want to manually verify:

1. Read `.claude/agents/auth-specialist.md` frontmatter → note skills list
2. Spawn the agent with Task tool
3. Ask about a specific pattern from one of those skills
4. Check if the response matches the skill content

## Known Issue?

If subagents are NOT loading skills from frontmatter, we would see:
- Generic answers instead of skill-specific patterns
- No mention of specific implementation details from skills
- Inconsistent pattern recommendations

## Fix If Broken

If skill loading is broken, we need to:
1. Verify Claude Code CLI loads agent frontmatter correctly
2. Check if `skills:` field is being processed
3. Ensure skill files are being read and provided to subagent context
