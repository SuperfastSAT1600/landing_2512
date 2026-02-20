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

The planner provides:

### 1. Feature Overview
- Goal and scope
- User-facing changes
- Technical requirements

### 2. Implementation Steps
```
Step 1: [Component Name]
  - Files to modify: [list]
  - New files needed: [list]
  - Dependencies: [what must exist first]
  - Complexity: Low/Medium/High

Step 2: [Next Component]
  ...
```

### 3. Testing Strategy
- Unit tests needed
- Integration tests
- E2E scenarios

### 4. Risks & Considerations
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

**User-Facing Changes:**
- Users receive instant notifications
- Notification badge shows unread count
- In-app notification center

**Technical Requirements:**
- WebSocket server
- Notification storage
- Client-side notification handling

---

### Implementation Steps

**Step 1: Database Schema**
Files to modify: `db/migrations/`
New files: `YYYYMMDD_create_notifications.sql`
Dependencies: None (can start immediately)
Complexity: Low

Create notifications table:
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  type VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Step 2: Notification Service**
Files to modify: None
New files: `src/services/NotificationService.ts`
Dependencies: Step 1 (database schema)
Complexity: Medium

Core notification logic:
- Create notification
- Mark as read
- Get unread count
- Get notification history

**Step 3: WebSocket Server**
Files to modify: `src/server.ts`
New files: `src/websocket/NotificationSocket.ts`
Dependencies: Step 2 (notification service)
Complexity: High

WebSocket implementation:
- Connection management
- Authentication
- Room-based broadcasting (per-user rooms)
- Heartbeat/reconnection logic

**Step 4: Frontend WebSocket Client**
Files to modify: `src/App.tsx`
New files: `src/hooks/useNotifications.ts`
Dependencies: Step 3 (WebSocket server)
Complexity: Medium

Client-side handling:
- WebSocket connection hook
- Auto-reconnection
- Notification state management
- Toast notifications

**Step 5: Notification UI Components**
Files to modify: None
New files:
  - `src/components/NotificationBell.tsx`
  - `src/components/NotificationCenter.tsx`
  - `src/components/NotificationItem.tsx`
Dependencies: Step 4 (WebSocket client)
Complexity: Low

UI implementation:
- Bell icon with badge
- Dropdown notification center
- Individual notification items
- Mark as read interactions

---

### Testing Strategy

**Unit Tests:**
- NotificationService methods
- WebSocket message handling
- Notification state reducer

**Integration Tests:**
- Database queries
- WebSocket server setup
- Notification creation flow

**E2E Tests:**
- User receives notification
- Notification appears in UI
- Mark as read functionality
- Unread count updates

---

### Risks & Considerations

**Scalability:**
- WebSocket connections can be resource-intensive
- Consider Redis for pub/sub in multi-server setup

**Security:**
- Authenticate WebSocket connections
- Validate user can only receive their notifications
- Rate limit notification creation

**Performance:**
- Limit notification history fetched
- Implement pagination
- Consider archiving old notifications

**Browser Support:**
- Fallback for browsers without WebSocket support
- Handle connection interruptions gracefully

---

### Recommended Implementation Order
1. Database schema (foundation)
2. Notification service (business logic)
3. WebSocket server (real-time layer)
4. Frontend client (connection)
5. UI components (presentation)

**Estimated Time**: 2-3 days for experienced developer

---

Ready to start? I recommend beginning with Step 1 (database schema).
```

---

## Command Behavior

**Delegates to**: `planner` agent

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

**Benefits**:
- Reference during implementation
- Share with team for review
- Track progress against plan
- Document decisions made

---

## Related Commands

- `/tdd` - Implement feature with TDD
- `/review-changes` - Review implementation against plan
- `/security-review` - Security audit planned changes

---

## Tips

**Be Specific**: Detailed feature descriptions yield better plans

**Ask Questions**: If plan is unclear, ask planner to elaborate

**Adapt as Needed**: Plans are guides, not rigid requirements

**Start Simple**: Implement MVP first, enhance later

**Review Dependencies**: Make sure prerequisite steps are complete

---

Good planning saves debugging time later!
