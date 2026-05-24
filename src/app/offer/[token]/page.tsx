import { Metadata } from 'next';
import { CoachOfferPageClient } from './CoachOfferPageClient';
import type { CoachOfferPayload } from '@/types/crm';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  robots: 'noindex,nofollow',
};

interface Props {
  params: Promise<{ token: string }>;
}

async function fetchOfferPayload(token: string): Promise<CoachOfferPayload | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/offer/${token}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data as CoachOfferPayload;
  } catch {
    return null;
  }
}

export default async function OfferPage({ params }: Props) {
  const { token } = await params;
  const payload = await fetchOfferPayload(token);

  if (!payload || payload.status === 'closed' || payload.status === 'rejected') {
    return (
      <div className="min-h-screen bg-[#0d0f10] flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="w-14 h-14 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-6">
            <svg
              className="w-7 h-7 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
              />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-200 mb-3">
            이미 매칭이 완료되었거나 만료된 링크입니다
          </h1>
          <p className="text-gray-500 text-sm leading-relaxed">
            해당 링크는 더 이상 유효하지 않습니다.
            <br />
            문의 사항은 담당자에게 연락해주세요.
          </p>
        </div>
      </div>
    );
  }

  const isExpired = new Date(payload.response_deadline) < new Date();

  if (isExpired && payload.status === 'pending') {
    return (
      <div className="min-h-screen bg-[#0d0f10] flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="w-14 h-14 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-6">
            <svg
              className="w-7 h-7 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-200 mb-3">응답 기간이 지났습니다</h1>
          <p className="text-gray-500 text-sm leading-relaxed">
            이 오퍼의 응답 기간이 만료되었습니다.
            <br />
            다음 기회에 다시 연락드리겠습니다.
          </p>
        </div>
      </div>
    );
  }

  return <CoachOfferPageClient payload={payload} token={token} />;
}
