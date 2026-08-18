---
name: spike
description: Research and explore a technical concept or approach before implementation
---

# Spike Command

Research, explore, and document a technical approach or concept before committing to full implementation.

---

## Purpose

Conduct time-boxed investigation to answer technical questions, evaluate approaches, or de-risk implementation before committing resources.

---

## When to Use

- Evaluating multiple technical approaches
- Investigating unfamiliar technologies
- Understanding feasibility before planning
- De-risking complex features
- Researching third-party libraries/APIs

---

## What It Does

1. **Research**: Explores codebase, documentation, and relevant resources
2. **Prototype**: Creates minimal proof-of-concept if needed
3. **Document**: Records findings, pros/cons, and recommendations
4. **Recommend**: Provides clear recommendation with rationale

---

## Workflow

```
User: "/spike <topic>"

Agent:
1. Define research questions
2. Explore relevant resources
3. Create proof-of-concept (if applicable)
4. Document findings
5. Provide recommendation
```

---

## Agents Used

- `codebase-cartographer` - Map existing patterns
- `architect` - Evaluate approaches
- General exploration - Research and prototype

---

## Examples

### Example 1: Library Evaluation
```
User: "/spike authentication library for Next.js"

Agent:
Research Questions:
1. What are the popular auth libraries for Next.js?
2. How do they compare in features, bundle size, and DX?
3. Which best fits our current architecture?

Findings:
- NextAuth.js: Full-featured, 200KB, built for Next.js
- Clerk: Managed service, easy setup, monthly cost
- Auth0: Enterprise features, complex pricing
- Lucia: Lightweight, 15KB, requires more setup

Proof-of-Concept:
[Created minimal NextAuth.js setup]

Recommendation:
Use NextAuth.js because:
✅ Built specifically for Next.js
✅ Self-hosted (no monthly fees)
✅ Supports OAuth providers
❌ Larger bundle size acceptable for our needs
```

### Example 2: Architecture Decision
```
User: "/spike real-time notifications approach"

Agent:
Research Questions:
1. What are our options for real-time notifications?
2. What are the trade-offs of each approach?
3. Which scales best for our expected load?

Options Evaluated:
1. WebSocket (Socket.io)
   ✅ True bidirectional communication
   ✅ Low latency
   ❌ More complex to scale
   ❌ Requires WebSocket support

2. Server-Sent Events (SSE)
   ✅ Simple, HTTP-based
   ✅ Auto-reconnection
   ❌ Server→Client only
   ✅ Works through firewalls

3. Long Polling
   ✅ Universal support
   ❌ High overhead
   ❌ Not truly real-time

4. Third-party (Pusher, Ably)
   ✅ Managed, scalable
   ✅ Easy setup
   ❌ Monthly cost
   ❌ Vendor lock-in

Recommendation:
Use Server-Sent Events (SSE) because:
✅ Notifications are server→client only
✅ Simple to implement and scale
✅ No additional dependencies
✅ Works with existing infrastructure
```

### Example 3: Performance Investigation
```
User: "/spike why dashboard is slow"

Agent:
Investigation:
1. Profiled dashboard load
   - Initial load: 3.2s
   - LCP: 2.8s
   - Bundle size: 450KB

2. Identified bottlenecks:
   - Large lodash import: 150KB
   - Unoptimized images: 800KB
   - N+1 queries in API: 12 separate queries
   - No code splitting

3. Quick fixes tested:
   - Replace lodash with specific imports: -120KB
   - Optimize images: -600KB
   - Add eager loading: 12 queries → 2 queries

Projected Improvements:
- Load time: 3.2s → 1.1s (66% faster)
- Bundle size: 450KB → 330KB
- API calls: 12 → 2

Recommendation:
Implement all three optimizations. Priority order:
1. Fix N+1 queries (biggest impact)
2. Optimize images (easy win)
3. Replace lodash (ongoing)
```

---

## Spike Document Template

The command creates a spike document in `.claude/spikes/`:

```markdown
# Spike: [Topic]

**Date**: 2026-01-21
**Author**: Claude + User
**Time Boxed**: 2 hours

---

## Research Questions

1. [Question 1]
2. [Question 2]
3. [Question 3]

---

## Findings

### Approach 1: [Name]

**Pros:**
- Pro 1
- Pro 2

**Cons:**
- Con 1
- Con 2

**Effort:** Low/Medium/High
**Risk:** Low/Medium/High

### Approach 2: [Name]

[Same format]

---

## Proof-of-Concept

[Code snippets or description if created]

---

## Recommendation

**Chosen Approach:** [Name]

**Rationale:**
- Reason 1
- Reason 2
- Reason 3

**Implementation Plan:**
1. Step 1
2. Step 2
3. Step 3

**Estimated Effort:** [X days/weeks]
**Risk Level:** Low/Medium/High

---

## Alternative Considered

[Why rejected]

---

## Open Questions

- Question 1
- Question 2
```

---

## Time Boxing

Spikes are time-boxed to prevent endless research:

- **Simple spike**: 1-2 hours
- **Complex spike**: 4-8 hours
- **Major architecture decision**: 1-2 days

If time expires without conclusion, document what's known and escalate decision.

---

## Best Practices

### DO
- ✅ Define clear research questions upfront
- ✅ Time-box the investigation
- ✅ Create minimal proof-of-concept
- ✅ Document all findings (even negative results)
- ✅ Provide clear recommendation
- ✅ Consider maintenance and team knowledge

### DON'T
- ❌ Build a full implementation
- ❌ Spend days on research
- ❌ Only investigate one approach
- ❌ Skip documentation
- ❌ Make decision without team input (for major changes)

---

## Output

After completion, the command provides:

1. **Spike Document**: Saved to `.claude/spikes/[topic]-[date].md`
2. **Summary**: Key findings and recommendation
3. **Next Steps**: What to do with the findings

---

## Common Spike Topics

- Library/framework selection
- Architecture decisions
- Performance investigation
- Database schema design
- API design approaches
- Third-party service evaluation
- Migration strategies
- Testing strategies

---

## Follow-up Actions

After spike completion:

1. **If proceeding**: Use `/plan` to create implementation plan
2. **If uncertain**: Schedule team discussion
3. **If not proceeding**: Document why and close

---

## Example Usage

```bash
# Library evaluation
/spike "state management library for React"

# Architecture decision
/spike "monorepo vs polyrepo for our microservices"

# Performance
/spike "why checkout page is slow"

# Integration
/spike "integrate Stripe payment processing"

# Migration
/spike "migrate from REST to GraphQL"
```
