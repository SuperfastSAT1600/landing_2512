---
description: Create detailed implementation plans for features
allowed-tools: Read, Grep, Glob
---

# Plan Command

Create detailed implementation plans for features.

---

## Usage

```
/plan [feature-description]
```

**Examples:**
```
/plan add user authentication
/plan implement payment processing
/plan refactor database layer
```

---

## What This Command Does

1. **Analyzes Requirements**: Breaks down feature into components
2. **Identifies Dependencies**: Maps what needs to be built first
3. **Creates Step-by-Step Plan**: Ordered implementation steps
4. **Estimates Complexity**: Flags complex or risky areas
5. **Suggests Testing Strategy**: How to verify each component

---

## Output Format

The architect provides a **structured spec** with traceable requirements:

### 1. Feature Overview
- Goal and scope
- User-facing changes
- Technical requirements

### 2. Requirements (with IDs and Verification Tags)
```
### REQ-001: [Requirement title]
- **Description**: [Observable behavior]
- **Verification**: (TEST) | (BROWSER) | (MANUAL)
- **Priority**: Must | Should | Could

### REQ-002: [Next requirement]
  ...
```

**Verification tags**:
- `(TEST)` = automated unit/integration test
- `(BROWSER)` = visual/DOM check via Playwright/Cypress
- `(MANUAL)` = human verification (use sparingly)

### 3. Traceability Matrix
```
| REQ ID  | Description        | Verification | Test/Check Location       |
|---------|--------------------|-------------|---------------------------|
| REQ-001 | User can register  | (TEST)      | src/__tests__/auth.test.ts |
| REQ-002 | Form shows errors  | (BROWSER)   | e2e/registration.spec.ts  |
```

### 4. Implementation Steps
```
Step 1: [Component Name]
  - Files to modify: [list]
  - New files needed: [list]
  - Dependencies: [what must exist first]
  - Satisfies: REQ-001, REQ-002
  - Complexity: Low/Medium/High

Step 2: [Next Component]
  ...
```

### 5. Testing Strategy
- Maps to REQ IDs: `REQ-001 → unit test in AuthService.test.ts`
- Unit tests needed
- Integration tests
- E2E scenarios

### 6. Risks & Considerations
- Potential blockers
- Security concerns
- Performance implications

---

## Example Session

```
User: /plan add real-time notifications

Planner: Implementation Plan for Real-Time Notifications

### Overview
Add real-time push notifications for user events using WebSockets.

---

### Requirements

#### REQ-001: Real-time notification delivery
- **Description**: Users receive notifications within 2 seconds of the triggering event
- **Verification**: (TEST)
- **Priority**: Must

#### REQ-002: Unread notification count
- **Description**: Notification badge shows accurate unread count
- **Verification**: (TEST)
- **Priority**: Must

#### REQ-003: Notification center UI
- **Description**: Users can view, scroll, and manage all notifications in a dropdown
- **Verification**: (BROWSER)
- **Priority**: Must

#### REQ-004: Mark as read
- **Description**: Users can mark individual or all notifications as read
- **Verification**: (TEST)
- **Priority**: Must

#### REQ-005: WebSocket reconnection
- **Description**: Client auto-reconnects on connection loss without losing notifications
- **Verification**: (TEST)
- **Priority**: Should

#### REQ-006: Cross-browser rendering
- **Description**: Notifications render correctly in Chrome, Firefox, Safari
- **Verification**: (BROWSER)
- **Priority**: Should

---

### Traceability Matrix

| REQ ID  | Description                  | Verification | Test/Check Location                   |
|---------|------------------------------|-------------|---------------------------------------|
| REQ-001 | Real-time delivery           | (TEST)      | src/__tests__/NotificationService.test.ts |
| REQ-002 | Unread count                 | (TEST)      | src/__tests__/NotificationService.test.ts |
| REQ-003 | Notification center UI       | (BROWSER)   | e2e/notifications.spec.ts             |
| REQ-004 | Mark as read                 | (TEST)      | src/__tests__/NotificationService.test.ts |
| REQ-005 | WebSocket reconnection       | (TEST)      | src/__tests__/NotificationSocket.test.ts  |
| REQ-006 | Cross-browser rendering      | (BROWSER)   | e2e/notifications.spec.ts             |

---

### Implementation Steps

**Step 1: Database Schema**
Files: `db/migrations/YYYYMMDD_create_notifications.sql`
Dependencies: None
Satisfies: Foundation for REQ-001, REQ-002, REQ-004
Complexity: Low

**Step 2: Notification Service**
Files: `src/services/NotificationService.ts`
Dependencies: Step 1
Satisfies: REQ-001, REQ-002, REQ-004
Complexity: Medium

**Step 3: WebSocket Server**
Files: `src/server.ts`, `src/websocket/NotificationSocket.ts`
Dependencies: Step 2
Satisfies: REQ-001, REQ-005
Complexity: High

**Step 4: Frontend Client**
Files: `src/hooks/useNotifications.ts`
Dependencies: Step 3
Satisfies: REQ-001, REQ-005
Complexity: Medium

**Step 5: UI Components**
Files: `src/components/NotificationBell.tsx`, `NotificationCenter.tsx`, `NotificationItem.tsx`
Dependencies: Step 4
Satisfies: REQ-003, REQ-006
Complexity: Low

---

### Testing Strategy

**Unit Tests:**
- REQ-001 → NotificationService.test.ts: `test('REQ-001: delivers notification within service')`
- REQ-002 → NotificationService.test.ts: `test('REQ-002: returns accurate unread count')`
- REQ-004 → NotificationService.test.ts: `test('REQ-004: marks notification as read')`
- REQ-005 → NotificationSocket.test.ts: `test('REQ-005: reconnects after disconnect')`

**E2E Tests:**
- REQ-003 → e2e/notifications.spec.ts: `test('REQ-003: notification center shows all notifications')`
- REQ-006 → e2e/notifications.spec.ts: `test('REQ-006: renders correctly in target browsers')`

---

### Risks & Considerations

| Risk | Impact | Mitigation |
|------|--------|------------|
| WebSocket connections resource-intensive | High | Redis pub/sub for multi-server |
| Connection interruptions lose messages | Medium | Queue unsent notifications server-side |
| Rate limiting needed | Medium | Max 100 notifications/min per user |
```

---

## Command Behavior

**Delegates to**: `architect` agent

**Analyzes**:
- Existing codebase structure
- Related files and patterns
- Current architecture
- Testing setup

**Produces**:
- Ordered implementation steps
- File modification list
- Dependency graph
- Risk assessment

---

## Best Practices

### Do:
- ✅ Review plan before implementing
- ✅ Follow suggested order
- ✅ Address risks early
- ✅ Test after each step
- ✅ Update plan as you learn

### Don't:
- ❌ Skip foundational steps
- ❌ Ignore security considerations
- ❌ Forget testing strategy
- ❌ Overcomplicate initial implementation
- ❌ Work on dependent steps simultaneously

---

## When to Use

- ✅ Before starting new features
- ✅ When requirements are unclear
- ✅ For complex refactoring
- ✅ When onboarding to new codebase
- ✅ Before architectural changes

---

## Plan Outputs

**Files**:
Plans are saved to `.claude/plans/[feature-name].md`

**Spec Template Variants** (choose the best fit):
- `spec.md.template` — Full-featured (default, use for general features)
- `spec-api.md.template` — API endpoints (method/path/auth/validation)
- `spec-bugfix.md.template` — Bug fixes (repro steps/root cause/regression guard)
- `spec-ui.md.template` — UI components (states/interactions/accessibility)

**Benefits**:
- Reference during implementation
- Share with team for review
- Track progress against plan
- Document decisions made

---

## Related Commands

- `/tdd` - Implement feature with TDD
- `/review` - Review implementation against plan

---

## Tips

**Be Specific**: Detailed feature descriptions yield better plans

**Ask Questions**: If plan is unclear, ask architect to elaborate

**Adapt as Needed**: Plans are guides, not rigid requirements

**Start Simple**: Implement MVP first, enhance later

**Review Dependencies**: Make sure prerequisite steps are complete

---

Good planning saves debugging time later!
