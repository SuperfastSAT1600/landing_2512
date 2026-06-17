'use client';

import { Copy, Eye, Check } from 'lucide-react';

interface Props {
  hasPortal: boolean;
  issuing: boolean;
  copied: boolean;
  theme: 'light' | 'dark';
  onToggle: () => void;
  onCopy: () => void;
  onPreview: () => void;
}

export function PortalAccessToggle({ hasPortal, issuing, copied, theme, onToggle, onCopy, onPreview }: Props) {
  const dark = theme === 'dark';

  return (
    <div className="flex items-center gap-1.5">
      {/* Toggle switch */}
      <button
        onClick={!hasPortal ? onToggle : undefined}
        disabled={issuing}
        aria-label={hasPortal ? '포털 발급됨' : '포털 발급하기'}
        className={`relative w-9 h-5 rounded-full transition-colors duration-200 shrink-0 disabled:opacity-50 ${
          hasPortal
            ? 'bg-blue-500'
            : dark
              ? 'bg-white/15 hover:bg-white/25 cursor-pointer'
              : 'bg-gray-200 hover:bg-gray-300 cursor-pointer'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
            hasPortal ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>

      {/* Preview */}
      <button
        onClick={hasPortal ? onPreview : undefined}
        disabled={!hasPortal}
        title={hasPortal ? '학부모 포털 미리보기' : '포털을 먼저 발급하세요'}
        className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] transition-colors ${
          hasPortal
            ? dark
              ? 'text-gray-300 hover:text-white cursor-pointer'
              : 'text-gray-500 hover:text-gray-800 cursor-pointer'
            : dark
              ? 'text-gray-600 cursor-default'
              : 'text-gray-300 cursor-default'
        }`}
      >
        <Eye size={11} />
        미리보기
      </button>

      {/* Copy link */}
      <button
        onClick={hasPortal ? onCopy : undefined}
        disabled={!hasPortal}
        title={hasPortal ? '학부모 포털 링크 복사' : '포털을 먼저 발급하세요'}
        className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] transition-colors ${
          hasPortal
            ? dark
              ? 'text-gray-300 hover:text-white cursor-pointer'
              : 'text-gray-500 hover:text-gray-800 cursor-pointer'
            : dark
              ? 'text-gray-600 cursor-default'
              : 'text-gray-300 cursor-default'
        }`}
      >
        {copied ? <Check size={11} className="text-green-500" /> : <Copy size={11} />}
        포털 링크
      </button>
    </div>
  );
}
