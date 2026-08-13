// 언어별 픽스처 진입점.
//
// 화면 컴포넌트는 항상 여기서 가져간다. 언어 전환은 i18n.ts의 DEMO_LANG 한 줄로만 이뤄진다.
// (영문판·한국어판 파일은 둘 다 커밋돼 있고, 각각 실제 LLM 출력이다.)

import type { ConsultationEntry } from '@/types/crm';
import { DEMO_LANG } from '../i18n';
import { DEMO_NOTES } from './notes';
import { DEMO_NOTES_KO_TEXT } from './notes.ko';
import { DEMO_ADVISOR_PLAN } from './advisor-plan';
import { DEMO_ADVISOR_PLAN_KO } from './advisor-plan.ko';
import { DEMO_BRIEF } from './brief';
import { DEMO_BRIEF_KO } from './brief.ko';

const KO_TEXT = new Map(DEMO_NOTES_KO_TEXT.map(n => [n.id, n.memo]));

/**
 * 한국어판 노트 = 영문 노트의 메타데이터(id·날짜·작성자)에 번역된 본문만 갈아끼운 것.
 * 날짜·작성자·순서가 영문판과 완전히 동일해야 근거 칩 점프와 분석 인용이 어긋나지 않는다.
 */
const NOTES_KO: ConsultationEntry[] = DEMO_NOTES.map(n => ({
  ...n,
  raw_memo: KO_TEXT.get(n.id) ?? n.raw_memo,
}));

export const NOTES = DEMO_LANG === 'ko' ? NOTES_KO : DEMO_NOTES;
export const ADVISOR_PLAN = DEMO_LANG === 'ko' ? DEMO_ADVISOR_PLAN_KO : DEMO_ADVISOR_PLAN;
export const BRIEF = DEMO_LANG === 'ko' ? DEMO_BRIEF_KO : DEMO_BRIEF;

export { DEMO_STUDENT_ID } from './notes';
