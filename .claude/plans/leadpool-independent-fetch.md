# LeadPool Independent Fetch

## Overview

Decouple LeadPool's data fetching from page.tsx. Currently page.tsx fetches both kanban and pool students on mount (double fetch), passing pool students as props. This refactor makes LeadPool fetch its own data independently, reducing initial kanban load and avoiding redundant fetches.

## Requirements

### REQ-001: page.tsx fetches kanban students only
- **Priority**: Must
- **Description**: Remove pool=true fetch from fetchStudents. `students` state contains only kanban students.
- **Acceptance Criteria**: Network tab shows one /api/crm/students call (no ?pool=true) on page load.
- **Verification**: (BROWSER) Check Network tab on /admin/crm load.

### REQ-002: LeadPool fetches its own pool students
- **Priority**: Must
- **Description**: LeadPool has internal `poolStudents` state, fetches /api/crm/students?pool=true on mount (when adminKey is available).
- **Acceptance Criteria**: Pool tab shows loading state then student list. Students prop removed from LeadPoolProps.
- **Verification**: (BROWSER) Navigate to 리드풀 tab — students load independently.

### REQ-003: LeadPool shows loading and error states
- **Priority**: Must
- **Description**: While fetching, show spinner. On error, show retry button.
- **Acceptance Criteria**: Loading spinner visible on first pool tab visit. Error state shows retry button.
- **Verification**: (BROWSER) Verify loading state on tab switch.

### REQ-004: Bulk contact refreshes pool only
- **Priority**: Must
- **Description**: After BulkContactModal success, call fetchPoolStudents() instead of onRefetch() (kanban doesn't need refresh).
- **Acceptance Criteria**: Updated students appear in pool list after bulk contact log.
- **Verification**: (MANUAL) Log contact for student, verify list refreshes.

### REQ-005: Reactivation refreshes both pool and kanban
- **Priority**: Must
- **Description**: After ReactivationModal success, call fetchPoolStudents() + onRefetch() so reactivated students appear in kanban.
- **Acceptance Criteria**: Reactivated student disappears from pool, appears in kanban.
- **Verification**: (MANUAL) Reactivate student, verify kanban update.

## Technical Design

### Architecture
- `page.tsx`: fetchStudents → GET /api/crm/students (kanban only, no pool param)
- `LeadPool.tsx`: internal fetchPoolStudents → GET /api/crm/students?pool=true
- `onRefetch` prop retained: called only after reactivation to sync kanban

### Key state changes
- LeadPool internal: `poolStudents: Student[]`, `poolLoading: boolean`, `poolError: string | null`
- All `students` references inside LeadPool → `poolStudents`

## Implementation Order

1. REQ-001 — page.tsx simplification (no dependencies)
2. REQ-002 + REQ-003 — LeadPool internal fetch + loading/error UI
3. REQ-004 + REQ-005 — Fix onRefetch call sites in modals
