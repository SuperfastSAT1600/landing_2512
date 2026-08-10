import type { Metadata } from 'next';
import { NewtonDemoClient } from './NewtonDemoClient';

// 비공개 제안 자료 — 검색 노출을 막는다. 링크를 아는 사람만 본다.
//
// openGraph를 반드시 덮어쓴다: 지정하지 않으면 루트 레이아웃의 SuperfastSAT OG를 상속해,
// 대표님이 링크를 카톡·슬랙에 붙였을 때 SAT 학원 미리보기 카드가 뜬다.
const TITLE = 'Edumo — 뉴튼아카데미 제안';
const DESCRIPTION = '학적·수업·상담·진학을 하나로. 쌓인 상담 기록을 이번 주 할 일로 바꾸는 학교 운영 소프트웨어.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  robots: { index: false, follow: false, nocache: true },
  alternates: {},
  openGraph: {
    type: 'website',
    siteName: 'Edumo',
    title: TITLE,
    description: DESCRIPTION,
    images: [],
  },
  twitter: {
    card: 'summary',
    title: TITLE,
    description: DESCRIPTION,
    images: [],
  },
};

export default function NewtonDemoPage() {
  return <NewtonDemoClient />;
}
