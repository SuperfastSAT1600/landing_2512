import { CustomerCall } from './CustomerCall';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '상담 통화 | SuperfastSAT',
  robots: { index: false, follow: false },
};

/**
 * 고객용 인터넷 전화 페이지 (공개).
 * 토큰 검증·고객 Daily 토큰 발급은 클라이언트가 GET /api/call/[token]로 처리한다.
 */
export default async function CallPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <CustomerCall token={token} />;
}
