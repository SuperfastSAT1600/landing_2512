export interface TocItem { id: string; label: string; locked: boolean }

interface TocFlags {
  /** 수업 전 필수 확인을 끝내 상세 자료가 열렸는가 */
  unlocked: boolean;
  hasProfile: boolean;
  hasSkills: boolean;
  hasDiagnostic: boolean;
  hasRequest: boolean;
}

// 페이지에 실제로 나오는 섹션만, 화면 순서대로 (조건은 CoachPrepView와 같다)
export function buildTocItems(f: TocFlags): TocItem[] {
  const detail: [boolean, string, string][] = [
    [true, 'test-center', '테스트센터'],
    [f.hasProfile, 'ai-brief', 'AI 브리핑'],
    [f.hasProfile && f.hasSkills, 'skills', '스킬 분석'],
    [f.hasDiagnostic, 'diagnostic', '진단테스트'],
    [true, 'scores', '점수 현황'],
    [true, 'schedule', '수업 스케줄'],
    [true, 'history', '학습 이력'],
    [f.hasRequest, 'coach-response', '응답하기'],
  ];
  return [
    { id: 'confirm', label: '필수 확인', locked: false },
    ...detail.filter(([show]) => show).map(([, id, label]) => ({ id, label, locked: !f.unlocked })),
  ];
}
