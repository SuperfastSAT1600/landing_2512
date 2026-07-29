import type { Metadata } from 'next';
import { OnboardingForm } from './OnboardingForm';

export const metadata: Metadata = {
  robots: 'noindex,nofollow',
  title: 'SuperfastSAT 코치 프로필 작성',
};

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ token: string }>;
}

interface TokenResult {
  valid: boolean;
  coachName?: string;
  draftData?: Record<string, unknown> | null;
  draftSavedAt?: string | null;
  error?: string;
}

async function validateToken(token: string): Promise<TokenResult> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/coach-onboarding/token?t=${token}`, { cache: 'no-store' });
    if (!res.ok) {
      const body = await res.json();
      return { valid: false, error: body.error ?? 'invalid' };
    }
    const body = await res.json();
    return {
      valid: true,
      coachName: body.data.coach_name,
      draftData: body.data.draft_data ?? null,
      draftSavedAt: body.data.draft_saved_at ?? null,
    };
  } catch {
    return { valid: false, error: 'network_error' };
  }
}

const ERROR_MESSAGES: Record<string, { title: string; desc: string }> = {
  not_found: { title: '유효하지 않은 링크입니다', desc: '링크를 다시 확인하거나 담당자에게 문의해주세요.' },
  expired: { title: '링크가 만료되었습니다', desc: '담당자에게 연락하여 새 링크를 요청해주세요.' },
  already_used: { title: '이미 제출이 완료된 링크입니다', desc: '프로필 정보를 이미 제출하셨습니다. 수정이 필요하면 담당자에게 연락해주세요.' },
  network_error: { title: '연결 오류가 발생했습니다', desc: '잠시 후 다시 시도해주세요.' },
};

export default async function CoachOnboardingPage({ params }: Props) {
  const { token } = await params;
  const result = await validateToken(token);

  if (!result.valid) {
    const msg = ERROR_MESSAGES[result.error ?? 'not_found'] ?? ERROR_MESSAGES['not_found'];
    return (
      <div className="min-h-screen bg-[#0d0f10] flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="w-14 h-14 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-6">
            <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-200 mb-3">{msg.title}</h1>
          <p className="text-gray-500 text-sm leading-relaxed">{msg.desc}</p>
        </div>
      </div>
    );
  }

  return (
    <OnboardingForm
      token={token}
      coachName={result.coachName ?? ''}
      draftData={result.draftData ?? null}
      draftSavedAt={result.draftSavedAt ?? null}
    />
  );
}
