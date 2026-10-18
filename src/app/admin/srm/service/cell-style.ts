export type CellState = 'done' | 'missed' | 'none';

export function getCellState(hasSchedule: boolean, hasActivity: boolean): CellState {
  if (!hasSchedule) return 'none';
  return hasActivity ? 'done' : 'missed';
}

/** 스케줄 없는 날은 활동이 있어도 배경 없이 숫자만 보여준다. */
export function cellBg(hasSchedule: boolean, hasActivity: boolean): string {
  if (!hasSchedule) return hasActivity ? '' : 'bg-gray-100 rounded';
  return hasActivity ? 'bg-emerald-50 rounded' : 'bg-red-50 rounded';
}

/** 활동이 없을 때 셀에 보여줄 텍스트: 스케줄 없음은 "없음", 미접속은 "-". */
export function emptyLabel(hasSchedule: boolean): { text: string; className: string } {
  return hasSchedule
    ? { text: '-', className: 'text-red-400 font-medium' }
    : { text: '없음', className: 'text-gray-500' };
}
