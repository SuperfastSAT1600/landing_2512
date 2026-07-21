'use client';

// CRM 폼 공용 프리미티브. StudentCreateModal 에서 추출 —
// 업체 등록/편집 모달 등 다른 CRM 폼이 동일 스타일을 재사용한다.

export function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-gray-400">
        {label}
      </label>
      {children}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

export const inputCls = (hasError: boolean) =>
  `w-full bg-white border ${hasError ? 'border-red-500/50' : 'border-gray-200'} focus:border-blue-500 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none transition-all`;

export const selectCls =
  'w-full bg-white border border-gray-200 focus:border-blue-500 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none transition-all';
