# Full Feature Development Command

Complete feature development cycle from planning through PR creation.

---

## Usage

```
/full-feature <feature-description>
```

**Examples:**
```
/full-feature user authentication with OAuth
/full-feature add dark mode support
/full-feature implement search functionality with filters
```

---

## What This Command Does

Orchestrates a complete feature development workflow:

1. **Plan**: Create structured spec with REQ-XXX IDs and verification tags
2. **Spec Audit**: Validate spec quality (all requirements have IDs and verification methods)
3. **Implement**: Write the code following the plan
4. **Test**: Write tests mapped to REQ-XXX IDs using TDD principles
5. **Review**: Security and code quality review
6. **Checkpoint**: Run full verification gate (types, lint, tests, build, security)
7. **Document**: Update relevant documentation
8. **Commit**: Create PR-ready commit

---

## Workflow Steps

### Phase 1: Planning (Architect Agent)
```
- Analyze requirements
- Create structured spec with REQ-XXX IDs
- Tag each requirement with verification method: (TEST), (BROWSER), (MANUAL)
- Build traceability matrix (REQ → test file)
- Identify dependencies and risks
```

### Phase 1.5: Spec Audit
```
- Run .claude/scripts/audit-spec.sh on the plan
- Verify all requirements have IDs and verification tags
- Verify at least one (TEST) verification exists
- Verify traceability matrix is present
- Gate: spec must pass audit before implementation begins
```

### Phase 2: Implementation
```
- Create/modify source files
- Follow existing patterns
- Implement incrementally
- Handle edge cases
- Add error handling
```

### Phase 3: Testing (TDD Guide Agent)
```
- Write tests mapped to REQ-XXX IDs from spec
- Test names include REQ ID: test('REQ-001: user can register with email', ...)
- Write unit tests (Red-Green-Refactor)
- Write integration tests if needed
- Ensure adequate coverage
- Test edge cases
- Verify error handling
- Optionally use /test-ladder for progressive escalation
```

### Phase 4: Review
```
- Security review (code-reviewer agent)
- Code quality check (code-reviewer agent)
- Performance considerations
- Address review findings
```

### Phase 5: Documentation (Doc Updater Agent)
```
- Update README if needed
- Add JSDoc/TSDoc comments
- Update API documentation
- Add inline comments for complex logic
```

### Phase 6: Commit & PR
```
- Stage changes
- Create conventional commit
- Prepare PR description
- Ready for review
```

---

## Example Session

**User**: `/full-feature user profile page with avatar upload`

**Claude**:

### Phase 1: Planning

I'll delegate to the architect agent to create an implementation plan.

**Implementation Plan:**

1. **Create Profile Page Component** (`src/components/Profile/ProfilePage.tsx`)
   - User info display
   - Edit mode toggle
   - Avatar component

2. **Avatar Upload Feature** (`src/components/Profile/AvatarUpload.tsx`)
   - File input with drag-and-drop
   - Image preview
   - Upload to S3
   - Crop functionality

3. **API Endpoints** (`src/app/api/profile/route.ts`)
   - GET /api/profile - Fetch profile
   - PATCH /api/profile - Update profile
   - POST /api/profile/avatar - Upload avatar

4. **Database** (`supabase/migrations/`)
   - Add avatarUrl to users table
   - Create migration file

**Dependencies**: AWS S3 SDK, react-dropzone
**Estimated Effort**: 4-6 hours

---

### Phase 2: Implementation

Implementing ProfilePage component...
[Creates ProfilePage.tsx]

Implementing AvatarUpload component...
[Creates AvatarUpload.tsx]

Creating API routes...
[Creates route files]

---

### Phase 3: Testing

Writing tests following TDD...
[Creates ProfilePage.test.tsx]
[Creates AvatarUpload.test.tsx]
[Creates profile API tests]

Coverage: 87% ✓

---

### Phase 4: Review

Running security review...
✓ No hardcoded secrets
✓ File upload validation present
✓ Authentication checks on endpoints
⚠️ Suggestion: Add rate limiting to upload endpoint

Running code review...
✓ Code follows patterns
✓ Proper error handling
✓ Types are correct

Addressing feedback...
[Adds rate limiting]

---

### Phase 5: Documentation

Updating documentation...
[Updates README with profile feature]
[Adds JSDoc to new functions]

---

### Phase 6: Commit

```
feat(profile): add user profile page with avatar upload

- Create ProfilePage component with edit mode
- Add AvatarUpload with drag-and-drop
- Implement profile API endpoints
- Add avatar upload to S3
- Include rate limiting on upload
- Add comprehensive test coverage (87%)

Closes #123
```

---

## Command Behavior

### On Success
- All files created/modified
- Tests passing
- Documentation updated
- Commit created
- Ready for PR

### On Failure
- Stops at failing phase
- Reports what failed
- Suggests remediation
- Preserves completed work

### Interruption Points
The command pauses for confirmation at:
- After planning (before implementation)
- After tests (before commit)

---

## Best Practices

1. **Clear Feature Description**: Be specific about requirements
2. **Review the Plan**: Ensure the plan matches expectations before proceeding
3. **Incremental Progress**: Each phase builds on the previous
4. **Test Coverage**: Aim for >80% coverage on new code
5. **Documentation**: Keep docs in sync with code

---

## Related Commands

- `/plan` - Just the planning phase (with spec-driven output)
- `/checkpoint` - Run full verification gate independently
- `/test-ladder` - Progressive test escalation tied to spec
- `/tdd` - Just the testing phase
- `/review` - Just review phase
- `/commit-push-pr` - Just the commit/PR phase

---

## When to Use

- Starting a new feature from scratch
- Medium to large features (>2 hours work)
- Features requiring multiple components
- Features needing comprehensive testing

---

## When NOT to Use

- Quick bug fixes (use `/quick-fix`)
- Simple changes (<30 minutes)
- Documentation-only changes
- Refactoring (use `/refactor-clean`)
