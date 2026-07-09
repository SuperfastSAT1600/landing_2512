'use client';

import { Copy, Check, RefreshCw } from 'lucide-react';

interface Props {
  hasSignup: boolean;
  isConsumed: boolean;
  loading: boolean;
  copied: boolean;
  theme: 'light' | 'dark';
  onCopy: () => void;
  onRegenerate: () => void;
}

/**
 * 회원가입 링크 상태 표시 + 복사 + 재생성 (PortalAccessToggle 미러).
 * 사용완료(isConsumed) 상태를 노출해 "이미 사용한 링크" 원인을 코치가 바로 볼 수 있게 한다.
 */
export function SignupLinkToggle({ hasSignup, isConsumed, loading, copied, theme, onCopy, onRegenerate }: Props) {
  const dark = theme === 'dark';

  // 상태 라벨 색: 사용완료=주황, 발급됨=파랑, 미발급=회색
  const labelClass = isConsumed
    ? dark ? 'text-amber-300' : 'text-amber-600'
    : hasSignup
      ? dark ? 'text-blue-300' : 'text-blue-600'
      : dark ? 'text-gray-500' : 'text-gray-400';
  const statusText = isConsumed ? '가입 링크 · 사용완료' : hasSignup ? '가입 링크' : '가입 링크 · 미발급';

  const btnEnabled = dark ? 'text-gray-300 hover:text-white cursor-pointer' : 'text-gray-500 hover:text-gray-800 cursor-pointer';

  return (
    <div className="flex items-center gap-1.5">
      <span className={`text-[11px] font-medium ${labelClass}`}>{statusText}</span>

      {/* Copy link (없으면 클릭 시 발급 후 복사) */}
      <button
        onClick={onCopy}
        disabled={loading}
        title="회원가입 링크 복사"
        className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] transition-colors disabled:opacity-50 ${btnEnabled}`}
      >
        {copied ? <Check size={11} className="text-green-500" /> : <Copy size={11} />}
        복사
      </button>

      {/* Regenerate (새 토큰 + 사용완료 리셋) */}
      <button
        onClick={hasSignup ? onRegenerate : undefined}
        disabled={!hasSignup || loading}
        title={hasSignup ? '회원가입 링크 재생성 (기존 링크 무효화)' : '먼저 링크를 발급하세요'}
        className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] transition-colors disabled:opacity-40 ${
          hasSignup ? btnEnabled : dark ? 'text-gray-600 cursor-default' : 'text-gray-300 cursor-default'
        }`}
      >
        <RefreshCw size={11} />
        재생성
      </button>
    </div>
  );
}
