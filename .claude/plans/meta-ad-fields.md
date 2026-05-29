# META 광고 ad_name / adset_name 필드 추가

## Overview

META 인스턴트폼 리드에서 ad_name(광고명)과 adset_name(광고세트명)을 시트에서 수신하여
CRM 학생 레코드에 전용 컬럼으로 저장한다. 현재 ad_name은 campaign_tags 배열에 묻혀 있고,
adset_name은 아예 없음.

## Requirements

### REQ-001: DB 컬럼 추가 (Migration)
- **Priority**: Must
- **Description**: students 테이블에 `ad_name TEXT`, `adset_name TEXT` 컬럼 추가
- **Verification**: (MANUAL) Supabase에서 컬럼 확인

### REQ-002: TypeScript 타입 업데이트
- **Priority**: Must
- **Description**: `Student` 타입과 `CreateStudentInput`에 `ad_name: string | null`, `adset_name: string | null` 추가
- **Verification**: (TEST) tsc --noEmit 통과

### REQ-003: SheetsSyncPayload에 adset_name 추가
- **Priority**: Must
- **Description**: `SheetsSyncPayload`에 `adset_name?: string` 추가. `buildCrmPayload`에서 META 탭일 때 두 필드를 직접 매핑 (campaign_tags 분리).
- **Verification**: (TEST) buildCrmPayload 결과에 ad_name/adset_name 포함 확인

### REQ-004: 인입 정보 패널 표시
- **Priority**: Must
- **Description**: StudentDetailPanel "인입 정보" 섹션에 ad_name, adset_name 표시 (값 있을 때만)
- **Verification**: (BROWSER) META 리드 학생 패널 → 인입 정보 펼쳐서 확인

## Technical Design

### Migration
`supabase/migrations/036_add_meta_ad_fields.sql`
```sql
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS ad_name TEXT,
  ADD COLUMN IF NOT EXISTS adset_name TEXT;
```

### Types
`src/types/crm.ts` — Student 인터페이스에 추가:
```ts
ad_name: string | null;
adset_name: string | null;
```
CreateStudentInput Pick에도 추가.

### buildCrmPayload
META 탭에서 `ad_name: p.ad_name ?? null`, `adset_name: p.adset_name ?? null` 직접 설정.
campaign_tags에서는 ad_name 제거 (adset_name도 넣지 않음).

### Panel
인입 정보 섹션에 InquiryRow 추가:
```tsx
{localStudent.ad_name && <InquiryRow label="광고명" value={localStudent.ad_name} />}
{localStudent.adset_name && <InquiryRow label="광고세트" value={localStudent.adset_name} />}
```

## Out of Scope
- 기존 campaign_tags 데이터 마이그레이션 (과거 ad_name 태그 정리)
- CRM 필터에 ad_name/adset_name 추가
