export const PARTY_LABELS: Record<string, string> = {
  student: '학생',
  parent: '학부모',
  coach: '코치',
  us: '우리',
};

export const PARTY_COLORS: Record<string, string> = {
  student: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  parent: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  coach: 'bg-green-500/20 text-green-300 border-green-500/30',
  us: 'bg-red-500/20 text-red-300 border-red-500/30',
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
  kakao: 'bg-yellow-500/20 text-yellow-300',
  call: 'bg-blue-500/20 text-blue-300',
  sms: 'bg-green-500/20 text-green-300',
  email: 'bg-purple-500/20 text-purple-300',
  slack: 'bg-violet-500/20 text-violet-300',
  other: 'bg-gray-500/20 text-gray-300',
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
