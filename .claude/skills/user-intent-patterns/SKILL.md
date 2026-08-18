---
name: user-intent-patterns
description: Pattern matching for natural language user requests to appropriate workflows, agents, and commands for seamless task routing.
---

# User Intent Patterns

Pattern matching for natural language user requests to appropriate workflows, agents, and commands.

## Core Principle

Users describe what they want in plain English. Classify intent, select appropriate action, execute without asking users to memorize commands.

## Intent Categories

### Feature Development
**Triggers**: "I want...", "Add...", "Build...", "Create...", "Enable...", "Implement...", "Make it so..."
**Route to**: `/full-feature` skill
**Examples**:
- "I want users to log in" → full-feature with auth-specialist
- "Add a checkout flow" → main agent implements via full-feature
- "Build a dashboard" → main agent implements (optionally with architect for complex features)

### Bug Fixes
**Triggers**: "Fix...", "Broken...", "Error...", "Bug...", "Not working...", "Issue with...", "Problem with..."
**Route to**: `/quick-fix` skill
**Examples**:
- "Fix the login button" → quick-fix workflow
- "The checkout is broken" → quick-fix workflow
- "Error on the homepage" → quick-fix workflow

### Code Review
**Triggers**: "Review...", "Check...", "Is this okay?", "Look at...", "Audit...", "Examine..."
**Route to**: `/review` skill
**Examples**:
- "Review my changes" → review
- "Check if this is secure" → review
- "Is this code good?" → code-reviewer agent

### Security Audit
**Triggers**: "Secure?", "Safe?", "Vulnerable?", "Security...", "Hack...", "Exploit..."
**Route to**: `/review` skill
**Examples**:
- "Is this secure?" → review
- "Check for vulnerabilities" → review
- "Audit security" → review

### Performance Optimization
**Triggers**: "Slow...", "Fast...", "Optimize...", "Speed up...", "Performance...", "Faster..."
**Route to**: `frontend-specialist` agent
**Examples**:
- "Make the page faster" → frontend-specialist
- "Optimize database queries" → backend-specialist
- "Speed up the app" → frontend-specialist

### Testing
**Triggers**: "Test...", "Coverage...", "TDD...", "Verify...", "E2E...", "Unit test..."
**Route to**: `/test-coverage`, `test-writer`, or `test-writer`
**Examples**:
- "Add tests" → test-coverage
- "Write unit tests" → test-writer agent
- "TDD for login" → test-writer agent
- "E2E tests" → test-writer agent

### Documentation
**Triggers**: "Document...", "README...", "API docs...", "Comment...", "Explain..."
**Route to**: `/update-docs` or `doc-updater` agent
**Examples**:
- "Update the README" → update-docs
- "Document the API" → backend-specialist agent
- "Add comments" → doc-updater agent

### Refactoring
**Triggers**: "Clean up...", "Simplify...", "Dead code...", "Modernize...", "Refactor..."
**Route to**: `/refactor-clean` or `code-reviewer` agent
**Examples**:
- "Clean up the code" → refactor-clean
- "Remove dead code" → code-reviewer agent
- "Simplify this" → code-reviewer agent

### Quality Improvements
**Triggers**: "Lint...", "Format...", "Type errors...", "TypeScript...", "ESLint..."
**Route to**: `/checkpoint` or `/type-check`
**Examples**:
- "Fix linting errors" → checkpoint
- "Fix type errors" → type-check
- "Format the code" → checkpoint

### Deployment
**Triggers**: "Deploy...", "Release...", "Ship...", "Go live...", "Publish..."
**Route to**: `release` workflow or `devops-specialist`
**Examples**:
- "Deploy to production" → release workflow
- "Ship this feature" → release workflow

### Component Creation
**Triggers**: "New component...", "Add a button/form/modal...", "Create component..."
**Route to**: `/new-component` skill
**Examples**:
- "Create a login form" → new-component
- "Add a modal component" → new-component

### Database Changes
**Triggers**: "Migration...", "Schema...", "Add field...", "Database...", "SQL..."
**Route to**: `/create-migration` or `backend-specialist`
**Examples**:
- "Add a field to users table" → create-migration
- "Create new table" → backend-specialist agent

## Context-Based Auto-Delegation

### By Technology Mentioned
- Authentication/login → `auth-specialist`
- Database/schema → `backend-specialist`
- API/endpoints → `backend-specialist`
- GraphQL → `realtime-specialist`
- WebSocket/real-time → `realtime-specialist`
- Docker/containers → `devops-specialist`
- CI/CD/pipeline → `devops-specialist`
- Infrastructure → `devops-specialist`
- AI/LLM/RAG → `realtime-specialist`

### By File Context
- `.tsx`, `.jsx` files → Frontend work
- `/api` routes → Backend work
- `.sql`, `supabase/migrations/` → Database work
- `.yml` in `.github` → CI/CD work
- `.test.ts` → Testing work

### By Modifiers
- "simple", "quick", "just" → Less ceremony, skip planning
- "robust", "production" → More thorough approach
- "urgent", "asap" → Skip optional steps
- "carefully", "thoroughly" → Comprehensive approach

## Disambiguation Patterns

When intent is unclear, ask ONE clear question:

**Vague Request Patterns:**
- "Help with X" → Ask: add functionality / fix issue / improve / review?
- "Change X" → Ask: add features / fix bug / refactor / change appearance?
- "Update X" → Ask: add functionality / fix / modernize / update docs?
- "Work on X" → Ask: implement / debug / optimize / review?

**Disambiguation Format:**
```
What would you like to do?
1. Build something new (feature)
2. Fix something broken (bug)
3. Improve existing code (refactor)
4. Check code quality (review)
```

## Confirmation Rules

### Confirm Before
- Creating >3 new files
- Modifying >5 files
- Database migrations
- Deployment to production
- Deleting files/code
- Major refactoring

### Skip Confirmation
- Code reviews (read-only)
- Linting/formatting
- Single file edits
- Running tests
- Reading/exploring code

### Confirmation Format
```
I'll [action]. This will:
- [Change 1]
- [Change 2]
Proceed? (y/n)
```

## Natural Language Translation

### Technical → Plain English
- "Running /full-feature" → "Building your new feature..."
- "Delegating to agent" → "Analyzing/checking/designing..."
- "git commit" → "Saving changes..."
- "git push" → "Uploading changes..."
- "Creating PR" → "Preparing for review..."
- "Build failed" → "There's an error to fix..."
- "Tests passing" → "All checks passed!"

### Avoid Jargon
Never say technical terms when simpler words work:
- API → "Connection to [service]"
- Endpoint → "Feature/function"
- Component → "Part of the page"
- Repository → "Project"
- Deploy → "Put online"
- Environment variable → "Setting"

## Multi-Intent Detection

### Sequential Intents
Detect multiple requests in one message:
- "Add login and update the README" → feature + docs
- "Fix the bug and add tests" → fix + testing
- "Review the code and deploy" → review + deployment

### Parallel Execution
When intents are independent:
- "Check security and performance" → Run both in parallel
- "Add tests and lint" → Run both in parallel

## Confidence Levels

### High Confidence (Execute)
Clear, unambiguous intent with known pattern

### Medium Confidence (Confirm)
Intent is clear but action is significant (>5 file changes, database changes)

### Low Confidence (Clarify)
Vague or ambiguous intent, need more information

## Edge Cases

### No Clear Intent
"What should I do next?" → Suggest based on project state (tests missing, docs outdated, etc.)

### Multiple Possible Interpretations
Offer options with context for each

### Contradictory Requests
"Make it simple but add all features" → Clarify priority

## Best Practices

### DO
- Accept natural language
- Infer intent from context
- Execute when confident
- Confirm significant actions
- Use plain English in responses
- Adapt to user's technical level

### DON'T
- Force users to memorize commands
- Use jargon unless user does
- Ask "which agent?" or "which command?"
- Require precise syntax
- Assume user knows technical terms
- Execute destructive actions without confirmation

## Examples

### Good Intent Matching
- User: "Users need to reset passwords" → Feature: auth-specialist
- User: "The cart total is wrong" → Bug: quick-fix
- User: "Make the dashboard load faster" → Optimize: frontend-specialist
- User: "Is this PR ready?" → Review: review
- User: "Ship it" → Deploy: release workflow

### Handling Vagueness
- User: "Do something with auth" → Clarify: add feature / fix issue / review?
- User: "Update the app" → Clarify: new features / bug fixes / dependencies?
- User: "Fix it" → Clarify: what needs fixing?
