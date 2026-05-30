# Spec: CRM StudentDetailPanel Refactoring

## Goal
Split `src/app/admin/crm/components/StudentDetailPanel.tsx` (1,396 lines) into focused files.
Each file ≤ 200 lines. Zero functional change.

## Target Structure
```
src/app/admin/crm/components/panel/
├── StudentDetailPanel.tsx     (≤80 lines — composition only)
├── constants.ts               (≤90 lines — SAT dates, SALES_STAGES_ONLY)
├── types.ts                   (≤50 lines — EditForm, studentToEditForm, Props)
├── hooks/
│   ├── usePanelData.ts        (≤100 lines — fetchFresh, localStudent, timeline, editForm sync)
│   ├── useEditForm.ts         (≤100 lines — handleSaveEdit, handleSaveInquiry, handleCancelEdit/Inquiry)
│   ├── useMemo.ts             (≤80 lines — memoText, handleAddMemo, triggerAiCare, pendingEdits)
│   ├── useTimeline.ts         (≤70 lines — handlePublish, handleUnpublish, handleDeleteAi)
│   ├── useFunnel.ts           (≤80 lines — handleFunnelChange, handleLeadStatusChange, reactivation)
│   ├── useDiagnostic.ts       (≤80 lines — diagLinked, searchDiagCandidates, handleDiagLink)
│   └── usePortalActions.ts    (≤60 lines — handleCopyPortalLink, handleDelete)
└── sections/
    ├── PanelHeader.tsx        (≤120 lines — name, status badges, funnel dropdown, reactivation form)
    ├── InquirySection.tsx     (≤130 lines — 인입 정보 view + edit)
    ├── StudentInfoSection.tsx (≤120 lines — 학생 정보 view + DiagnosticPicker)
    ├── MemoSection.tsx        (≤60 lines — 상담 메모 textarea + save button)
    ├── TimelineSection.tsx    (≤60 lines — timeline list wrapper)
    ├── TimelineEntry.tsx      (≤160 lines — single timeline entry with AI section)
    └── StudentInfoEdit.tsx    (≤180 lines — edit form for student info)
```

## REQs

- REQ-1: `constants.ts` — extract SALES_STAGES_ONLY, SAT_TEST_DATES, SAT_PAST_MONTHS, formatSatDate (MANUAL)
- REQ-2: `types.ts` — extract EditForm interface, studentToEditForm, StudentDetailPanelProps (MANUAL)
- REQ-3: `hooks/usePanelData.ts` — fetchFresh, localStudent state, timeline state, editForm sync on mount (MANUAL)
- REQ-4: `hooks/useEditForm.ts` — handleSaveEdit, handleSaveInquiry, handleCancel* (MANUAL)
- REQ-5: `hooks/useMemo.ts` — handleAddMemo, triggerAiCare, pendingEdits state (MANUAL)
- REQ-6: `hooks/useTimeline.ts` — handlePublish, handleUnpublish, handleDeleteAi (MANUAL)
- REQ-7: `hooks/useFunnel.ts` — handleFunnelChange, handleLeadStatusChange, reactivation (MANUAL)
- REQ-8: `hooks/useDiagnostic.ts` — diagLinked, searchDiagCandidates, handleDiagLink (MANUAL)
- REQ-9: `hooks/usePortalActions.ts` — handleCopyPortalLink, handleDelete (MANUAL)
- REQ-10: section components split (MANUAL)
- REQ-11: `panel/StudentDetailPanel.tsx` — composition root, ≤80 lines (MANUAL)
- REQ-12: old `components/StudentDetailPanel.tsx` re-exports from panel/ for zero import breakage (MANUAL)

## Notes
- Keep `DiagCandidate` interface in `useDiagnostic.ts`
- scoreDisplay helper → stays in panel/StudentDetailPanel.tsx or StudentInfoSection.tsx
- InquiryRow, StudentInfoCell, EditField, inputCls, selectCls sub-components → extract to sections/
- TimelineEntry is the largest sub-component — keep it in its own file
- All hooks receive `adminKey` and `studentId` as params; avoid prop drilling headers
