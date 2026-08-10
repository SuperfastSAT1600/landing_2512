// CRM 표현 컴포넌트의 라벨 사전.
//
// 목적: 상담 타임라인·상담 메모 UI를 한글(내부 운영) / 영문(국제학교 대상) 양쪽에서 재사용한다.
// 규칙: 컴포넌트는 `labels?: Partial<CrmLabels>`를 옵셔널로 받고, 미지정 시 CRM_LABELS_KO를 쓴다.
//       → 기존 /admin/crm 화면은 prop을 넘기지 않으므로 문구·동작이 그대로 유지된다.

export interface CrmLabels {
  /** 상담 타임라인 섹션 제목 */
  timelineTitle: string;
  /** 타임라인이 비었을 때 문구 */
  timelineEmpty: string;

  /** 상담 메모 입력 섹션 제목 */
  memoTitle: string;
  memoPlaceholder: string;
  memoAttachFile: string;
  memoRecording: string;
  memoSave: string;
  memoSaving: string;
  memoUploading: string;
  memoRemoveAttachment: string;

  /** 타임라인 항목 내부 */
  entryAuthorTitle: string;
  entryEditMemo: string;
  entryDeleteMemo: string;
  entrySave: string;
  entrySaving: string;
  entryCancel: string;
  /** 항목 날짜 표기에 쓸 BCP 47 로케일 */
  entryDateLocale: string;
}

export const CRM_LABELS_KO: CrmLabels = {
  timelineTitle: '상담 타임라인',
  timelineEmpty: '상담 메모가 없습니다.',

  memoTitle: '상담 메모',
  memoPlaceholder: '상담 내용을 입력하세요... (캡처 이미지는 여기에 붙여넣기 Ctrl/⌘+V)',
  memoAttachFile: '파일 첨부',
  memoRecording: 'Plaud 녹음',
  memoSave: '메모 저장',
  memoSaving: '저장 중...',
  memoUploading: '업로드 중...',
  memoRemoveAttachment: '첨부 삭제',

  entryAuthorTitle: '상담·작성',
  entryEditMemo: '원본 수정',
  entryDeleteMemo: '메모 삭제',
  entrySave: '저장',
  entrySaving: '저장 중...',
  entryCancel: '취소',
  entryDateLocale: 'ko-KR',
};

export const CRM_LABELS_EN: CrmLabels = {
  timelineTitle: 'Advising Notes',
  timelineEmpty: 'No advising notes yet.',

  memoTitle: 'Add Advising Note',
  memoPlaceholder: 'Write what came up in the meeting... (paste screenshots with Ctrl/⌘+V)',
  memoAttachFile: 'Attach file',
  memoRecording: 'From recording',
  memoSave: 'Save note',
  memoSaving: 'Saving...',
  memoUploading: 'Uploading...',
  memoRemoveAttachment: 'Remove attachment',

  entryAuthorTitle: 'Advisor',
  entryEditMemo: 'Edit',
  entryDeleteMemo: 'Delete',
  entrySave: 'Save',
  entrySaving: 'Saving...',
  entryCancel: 'Cancel',
  entryDateLocale: 'en-US',
};

/** 부분 지정된 라벨을 한글 기본값 위에 덮어쓴다. */
export function resolveCrmLabels(labels?: Partial<CrmLabels>): CrmLabels {
  return labels ? { ...CRM_LABELS_KO, ...labels } : CRM_LABELS_KO;
}
