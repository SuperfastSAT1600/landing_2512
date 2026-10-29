import { T } from './targets';

export type MissionId = 'schedule' | 'study-hall' | 'test-center';

export interface TutorialStep {
  id: string;
  target: string;
  title: string;
  body: string;
}

export interface Mission {
  id: MissionId;
  title: string;
  summary: string;
  available: boolean;
  liveUrl: string;
  liveLabel: string;
  steps: TutorialStep[];
}

const V2 = 'https://app.superfastsat.io';

function entrySteps(name: string, nav: string): TutorialStep[] {
  return [
    { id: 'open', target: nav, title: `${name} 메뉴 열기`, body: `왼쪽 메뉴에서 ${name} 을 눌러요.` },
    {
      id: 'camera',
      target: T.camera,
      title: '1. 카메라 연결',
      body: '"Connect your camera" 스위치를 켜고, 브라우저가 카메라 사용 권한을 물으면 허용해요.',
    },
    {
      id: 'screen',
      target: T.screen,
      title: '2. 화면 공유',
      body: '"Share this screen to enter" 스위치를 켜고, 공유할 화면(전체 화면)을 선택해요.',
    },
    {
      id: 'enter',
      target: T.enter,
      title: `${name} 입장`,
      body: `카메라와 화면 공유가 모두 켜지면 "Enter ${name}" 버튼을 눌러 입장해요.`,
    },
  ];
}

export const MISSIONS: Mission[] = [
  {
    id: 'schedule',
    title: '스케줄 입력하기',
    summary: '수업 가능한 시간을 대화로 알려줘요',
    available: true,
    liveUrl: `${V2}/study/schedules`,
    liveLabel: 'v2 스케줄 열기',
    steps: [
      { id: 'open', target: T.navSchedule, title: 'Schedule 메뉴 열기', body: '왼쪽 메뉴에서 Schedule 을 눌러요.' },
      {
        id: 'edit',
        target: T.availEdit,
        title: 'My availability 열기',
        body: '오른쪽 "My availability" 옆의 연필 아이콘을 눌러 가능한 시간 입력창을 열어요.',
      },
      {
        id: 'type',
        target: T.availInput,
        title: '가능한 시간 적기',
        body: '"Type your answer" 칸에 가능한 요일과 시간을 문장으로 적어요. 예: weekday evenings 7-9pm, weekends 2-6pm',
      },
      {
        id: 'save',
        target: T.availSave,
        title: '저장하기',
        body: '마지막으로 Save 를 눌러야 스케줄이 등록돼요. 수업, 숙제, 자습까지 포함해 가능한 시간을 넓게 적는 것이 좋아요.',
      },
    ],
  },
  {
    id: 'study-hall',
    title: 'Study Hall 입장하기',
    summary: '카메라와 화면 공유를 켜고 입장해요',
    available: true,
    liveUrl: `${V2}/study-hall`,
    liveLabel: 'v2 Study Hall 열기',
    steps: entrySteps('Study Hall', T.navStudyHall),
  },
  {
    id: 'test-center',
    title: 'Test Center 입장하기',
    summary: '카메라와 화면 공유를 켜고 입장해요',
    available: true,
    liveUrl: `${V2}/test-center`,
    liveLabel: 'v2 Test Center 열기',
    steps: entrySteps('Test Center', T.navTestCenter),
  },
];

export function getMission(id: MissionId): Mission {
  return MISSIONS.find((m) => m.id === id)!;
}
