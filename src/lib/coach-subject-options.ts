import { deriveSubjectDetails } from './coach-subject-details';

/** 코치 프로필(온보딩) 폼의 추천 수업 과목. 어드민 상세 과목 편집기도 같은 목록을 쓴다. */
export const ONBOARDING_SUBJECTS = [
    'SAT Reading & Writing',
    'SAT Math',
    'AP English Language',
    'AP English Literature',
    'AP Calculus AB',
    'AP Calculus BC',
    'AP Statistics',
    'AP Biology',
    'AP Chemistry',
    'AP Physics',
    'AP US History',
    'AP World History',
    'AP Psychology',
] as const;

export const COACH_SUBJECT_OPTIONS: string[] = deriveSubjectDetails({ onboardingSubjects: ONBOARDING_SUBJECTS });

/** 상세 과목에서 대분류(SAT/AP)를 파생한다. 분류 가능한 값이 없으면 null(대분류를 바꾸지 않음). */
export function broadSubjectsFor(details: readonly string[]): ('SAT' | 'AP')[] | null {
    const out: ('SAT' | 'AP')[] = [];
    if (details.some(d => d.startsWith('SAT '))) out.push('SAT');
    if (details.some(d => d.startsWith('AP '))) out.push('AP');
    return out.length > 0 ? out : null;
}
