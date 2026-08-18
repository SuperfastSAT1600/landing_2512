'use client';

import Link from 'next/link';
import { useEffect } from 'react';

export default function DiagnosisError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[diagnosis] error boundary triggered:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#000000] flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <p className="text-white text-lg font-bold mb-2">테스트 오류가 발생했습니다</p>
        <p className="text-gray-400 text-sm mb-6">
          원장님께 문의하시면 코드를 재발급받을 수 있습니다.
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={reset}
            className="px-6 py-3 bg-[#071be9] hover:bg-[#1a31f0] text-white rounded-xl font-bold transition-all"
          >
            다시 시도하기
          </button>
          <Link
            href="/diagnosis"
            className="inline-block px-6 py-3 bg-transparent border border-gray-600 hover:border-gray-400 text-gray-400 hover:text-white rounded-xl font-bold transition-all"
          >
            코드 입력으로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  );
}
