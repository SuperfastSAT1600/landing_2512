# Diagnosis Token Status Filter

## Overview

Admin 진단 토큰 목록에 상태별 필터 탭을 추가한다. 영업 담당자가 "대기중" / "만료" 학생을 빠르게 추려서 연락할 수 있도록 한다. 모든 데이터는 이미 클라이언트에 있으므로 API 변경 없음.

---

## Requirements

### REQ-001: 상태 필터 탭 UI
- **Priority**: Must
- **Description**: TokenListTable 상단에 필터 탭 버튼 그룹 표시
  - `전체` | `대기중` | `만료` | `완료`
  - 각 탭에 해당 상태의 토큰 개수 badge 표시 (예: `대기중 (3)`)
- **Acceptance Criteria**:
  - 활성 탭: 파란 배경 + 흰 텍스트
  - 비활성 탭: 어두운 배경 + 회색 텍스트
  - 탭 클릭 시 테이블 즉시 필터링 (API 재호출 없음)
- **Verification**: (BROWSER)

### REQ-002: 필터 적용
- **Priority**: Must
- **Description**: 선택된 탭에 해당하는 `status` 값의 토큰만 테이블에 표시
  - `전체` → 모든 토큰
  - `대기중` → `status === 'pending'`
  - `만료` → `status === 'expired'`
  - `완료` → `status === 'completed'`
- **Acceptance Criteria**:
  - 필터링 후 결과 없으면 "해당 상태의 토큰이 없습니다." 메시지 표시
  - 새 토큰 생성(fetchCodes 재호출) 후에도 현재 선택된 필터 유지
- **Verification**: (BROWSER)

### REQ-003: 기본 탭
- **Priority**: Should
- **Description**: 페이지 로드 시 기본 탭은 `전체`
- **Verification**: (MANUAL)

---

## Technical Design

**Modified file**: `src/app/admin/diagnosis/components/TokenListTable.tsx` (only file changed)

### New state (inside TokenListTable)
```ts
const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'expired' | 'completed'>('all');
```

### Filter logic
```ts
const filteredCodes = statusFilter === 'all'
  ? codes
  : codes.filter(c => c.status === statusFilter);
```

### Count badges
```ts
const counts = {
  all: codes.length,
  pending: codes.filter(c => c.status === 'pending').length,
  expired: codes.filter(c => c.status === 'expired').length,
  completed: codes.filter(c => c.status === 'completed').length,
};
```

### JSX — 필터 탭 (테이블 위에 삽입)
```tsx
const TABS = [
  { key: 'all', label: '전체' },
  { key: 'pending', label: '대기중' },
  { key: 'expired', label: '만료' },
  { key: 'completed', label: '완료' },
] as const;

<div className="flex gap-2 mb-4">
  {TABS.map(tab => (
    <button
      key={tab.key}
      onClick={() => setStatusFilter(tab.key)}
      className={statusFilter === tab.key
        ? 'px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-600 text-white'
        : 'px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-800 text-gray-400 hover:text-white'
      }
    >
      {tab.label} ({counts[tab.key]})
    </button>
  ))}
</div>
```

---

## Out of Scope
- API-side filtering
- 이름/코드 검색
- 날짜 범위 필터
- 페이지네이션
