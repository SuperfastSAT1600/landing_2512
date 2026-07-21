import type { Metadata } from 'next';

export const metadata: Metadata = {
  robots: 'noindex,nofollow',
  title: '제출 완료 — SuperfastSAT',
};

export const dynamic = 'force-dynamic';

export default function CompletePage() {
  return (
    <div className="min-h-screen bg-[#0d0f10] flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="w-16 h-16 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-white mb-3">제출이 완료되었습니다</h1>
        <p className="text-gray-400 text-sm leading-relaxed mb-8">
          프로필 정보를 성공적으로 제출해 주셨습니다.<br />
          담당자가 검토 후 빠른 시일 내에 연락드리겠습니다.
        </p>
        <div className="bg-[#151719] rounded-2xl border border-white/5 p-5 text-left space-y-3">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">다음 단계 안내</p>
          <ul className="space-y-2.5">
            {[
              '담당자가 제출하신 정보를 검토합니다',
              '코치 프로필 초안을 작성합니다',
              '최종 확인 후 프로필이 등록됩니다',
            ].map((text, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-blue-600/30 text-blue-400 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <span className="text-sm text-gray-400">{text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
