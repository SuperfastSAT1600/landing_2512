import type { SessionStatus } from '@/app/api/admin/srm/session-status/route';

const TYPE_LABEL = { study_hall: '스터디홀', vocab: '단어학습' };
const TYPE_LABEL_EN = { study_hall: 'Study Hall', vocab: 'Vocab session' };

export const STATUS_LABEL: Record<SessionStatus, string> = {
  on_time: '제때출석',
  late: '지각',
  late_present: '지각→출석',
  late_absent: '지각→결석',
  absent: '결석',
  disconnected: '이탈',
  disconnected_end: '이탈종료',
  returned: '복귀',
  completed: '정상종료',
};

export const STATUS_COLOR: Record<SessionStatus, string> = {
  on_time: 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200',
  late: 'bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-200',
  late_present: 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200',
  late_absent: 'bg-red-100 text-red-600 border-red-200 hover:bg-red-200',
  absent: 'bg-red-100 text-red-700 border-red-300 hover:bg-red-200',
  disconnected: 'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200',
  disconnected_end: 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200',
  returned: 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200',
  completed: 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200',
};

// late_present, late_absent는 버튼 없음 — 지각 후 제때출석/결석 클릭 시 자동 파생
export const STATUS_GROUPS: { label: string; statuses: SessionStatus[] }[] = [
  { label: '출석', statuses: ['on_time', 'late', 'absent'] },
  { label: '학습', statuses: ['disconnected', 'disconnected_end', 'returned', 'completed'] },
];

export function buildStatusMessageKo(
  studentName: string,
  status: SessionStatus,
  eventType: 'study_hall' | 'vocab',
): string {
  const type = TYPE_LABEL[eventType];
  switch (status) {
    case 'on_time':
      return `<확인> ${studentName} 제시간에 ${type}에 잘 출석했어요! 오늘도 열심히 해보자구요!`;
    case 'late':
      return `<알림> ${studentName} 아직 ${type}에 접속하지 않았어요. 빨리 들어와주세요!`;
    case 'late_present':
      return `<확인> ${studentName} 지각했지만 ${type}에 들어와줬어요. 이제 집중해서 해보자구요!`;
    case 'late_absent':
      return `<확인> ${studentName} 오늘 ${type} 결석 처리됩니다. 다음엔 꼭 제시간에 출석해주세요.`;
    case 'absent':
      return `<확인> ${studentName} 오늘 ${type} 결석이에요. 무슨 일이 있나요?`;
    case 'disconnected':
      return `<알림> ${studentName} ${type}에서 이탈이 감지됐어요. 다시 접속해주세요!`;
    case 'disconnected_end':
      return `<확인> ${studentName} 오늘 ${type} 이탈 후 복귀 없이 종료됐어요.`;
    case 'returned':
      return `<확인> ${studentName} 이탈 후 다시 ${type}에 돌아왔어요! 이제 집중해보자구요!`;
    case 'completed':
      return `<확인> ${studentName} 오늘 ${type} 잘 마쳤어요! 수고했어요!`;
  }
}

export function buildStatusMessageEn(
  studentName: string,
  status: SessionStatus,
  eventType: 'study_hall' | 'vocab',
): string {
  const type = TYPE_LABEL_EN[eventType];
  switch (status) {
    case 'on_time':
      return `<Confirmed> ${studentName} joined ${type} on time! Great job, let's have a productive session!`;
    case 'late':
      return `<Alert> ${studentName} hasn't joined the ${type} yet. Please join now!`;
    case 'late_present':
      return `<Confirmed> ${studentName} joined ${type} late but glad you made it! Let's focus now!`;
    case 'late_absent':
      return `<Confirmed> ${studentName} will be marked absent from ${type} today. Hope to see you next time!`;
    case 'absent':
      return `<Confirmed> ${studentName} is absent from ${type} today. Is everything okay?`;
    case 'disconnected':
      return `<Alert> ${studentName} got disconnected from ${type}. Please rejoin!`;
    case 'disconnected_end':
      return `<Confirmed> ${studentName}'s ${type} session ended after disconnection.`;
    case 'returned':
      return `<Confirmed> ${studentName} rejoined ${type} after disconnecting! Great, let's keep going!`;
    case 'completed':
      return `<Confirmed> ${studentName} completed today's ${type}! Great work!`;
  }
}
