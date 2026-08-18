export const PARTY_LABELS: Record<string, string> = {
  student: '학생',
  parent: '학부모',
  coach: '코치',
  us: '우리',
};

export const PARTY_COLORS: Record<string, string> = {
  student: 'bg-blue-100 text-blue-700 border-blue-200',
  parent: 'bg-purple-100 text-purple-700 border-purple-200',
  coach: 'bg-green-100 text-green-700 border-green-200',
  us: 'bg-red-100 text-red-700 border-red-200',
};

export const CHANNEL_LABELS: Record<string, string> = {
  kakao: '카카오',
  call: '전화',
  sms: 'SMS',
  email: '이메일',
  slack: '슬랙',
  other: '기타',
};

export const CHANNEL_COLORS: Record<string, string> = {
  kakao: 'bg-yellow-100 text-yellow-700',
  call: 'bg-blue-100 text-blue-700',
  sms: 'bg-green-100 text-green-700',
  email: 'bg-purple-100 text-purple-700',
  slack: 'bg-violet-100 text-violet-700',
  other: 'bg-gray-100 text-gray-600',
};

export const TRIGGER_BADGE_LABELS: Record<string, string> = {
  no_show: '미접속',
  late: '지각',
  no_class: '수업미잡힘',
  no_study_hall: '스터디홀미세팅',
};

export const RESOLUTION_LABELS: Record<string, string> = {
  scheduled: '일정잡음',
  will_contact: '다음연락',
  no_intent: '의향없음',
  unreachable: '연락불가',
  resolved: '해결됨',
  other: '기타',
};
