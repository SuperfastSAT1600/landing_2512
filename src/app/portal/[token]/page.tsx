'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import PasscodeSetup from './components/PasscodeSetup';
import PasscodeEntry from './components/PasscodeEntry';
import PortalContent from './components/PortalContent';

type PortalState = 'loading' | 'not-found' | 'setup' | 'locked' | 'login' | 'authenticated';

interface PortalMeta {
  studentName: string;
  hasPasscode: boolean;
  isLocked: boolean;
  lockedUntil: string | null;
}

export default function PortalPage() {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<PortalState>('loading');
  const [meta, setMeta] = useState<PortalMeta | null>(null);

  const checkPortal = useCallback(async () => {
    setState('loading');
    const res = await fetch(`/api/portal/${token}`);
    if (!res.ok) {
      setState('not-found');
      return;
    }
    const data: PortalMeta & { exists: boolean } = await res.json();
    setMeta(data);
    if (data.isLocked) {
      setState('locked');
    } else if (!data.hasPasscode) {
      setState('setup');
    } else {
      setState('login');
    }
  }, [token]);

  useEffect(() => { checkPortal(); }, [checkPortal]);

  if (state === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (state === 'not-found') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <p className="text-4xl mb-4">🔍</p>
          <h1 className="text-xl font-bold text-gray-800 mb-2">페이지를 찾을 수 없습니다</h1>
          <p className="text-sm text-gray-500">링크가 올바른지 확인해 주세요.</p>
        </div>
      </div>
    );
  }

  if (state === 'locked') {
    const lockedUntil = meta?.lockedUntil ? new Date(meta.lockedUntil) : null;
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center max-w-sm">
          <p className="text-4xl mb-4">🔒</p>
          <h1 className="text-xl font-bold text-gray-800 mb-2">일시적으로 잠겨 있습니다</h1>
          <p className="text-sm text-gray-500">
            비밀번호 오류 횟수 초과로 잠겼습니다.
            {lockedUntil && (
              <> {lockedUntil.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} 이후 다시 시도해 주세요.</>
            )}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-lg mx-auto">
          <h1 className="text-base font-bold text-gray-900">SuperfastSAT 상담 포털</h1>
          {meta?.studentName && (
            <p className="text-sm text-gray-500 mt-0.5">{meta.studentName} 학생 · 학부모 전용</p>
          )}
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8">
        {state === 'setup' && (
          <PasscodeSetup
            token={token}
            onSuccess={() => setState('authenticated')}
          />
        )}
        {state === 'login' && (
          <PasscodeEntry
            token={token}
            onSuccess={() => setState('authenticated')}
            onLocked={() => { setMeta(prev => prev ? { ...prev, isLocked: true } : prev); setState('locked'); }}
          />
        )}
        {state === 'authenticated' && (
          <PortalContent token={token} />
        )}
      </main>
    </div>
  );
}
