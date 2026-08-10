import type { Metadata } from 'next';
import { NewtonDemoClient } from './NewtonDemoClient';

// 비공개 제안 자료 — 검색 노출을 막는다. 링크를 아는 사람만 본다.
//
// openGraph를 반드시 덮어쓴다: 지정하지 않으면 루트 레이아웃의 SuperfastSAT OG를 상속해,
// 대표님이 링크를 카톡·슬랙에 붙였을 때 SAT 학원 미리보기 카드가 뜬다.
const TITLE = 'Edumo — 뉴튼아카데미 제안';
const DESCRIPTION = '학습관리의 모든것, Edumo와 쉽고 확실하게';

// 히어로와 같은 모습으로 만든 카드 이미지(1200×630 기준, 2x). public/og-edumo.png
const OG_IMAGE = {
  url: '/og-edumo.png',
  width: 2400,
  height: 1260,
  alt: 'Edumo — 학습관리의 모든것',
};

// metadataBase가 없으면 Next가 og:image를 localhost로 절대화한다(빌드 경고 확인).
// 그 상태로 배포하면 링크를 공유했을 때 카드 이미지가 뜨지 않으므로 이 페이지에서만 지정한다.
// 공유 주소가 바뀌면 EDUMO_ORIGIN으로 덮어쓴다.
const ORIGIN = process.env.EDUMO_ORIGIN?.trim() || 'https://argonautai-edumo.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(ORIGIN),
  title: TITLE,
  description: DESCRIPTION,
  robots: { index: false, follow: false, nocache: true },
  alternates: {},
  openGraph: {
    type: 'website',
    siteName: 'Edumo',
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_IMAGE],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_IMAGE.url],
  },
};

export default function NewtonDemoPage() {
  return <NewtonDemoClient />;
}
