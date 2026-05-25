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
    if (!res.ok) { setState('not-found'); return; }
    const data: PortalMeta & { exists: boolean } = await res.json();
    setMeta(data);
    if (data.isLocked) setState('locked');
    else if (!data.hasPasscode) setState('setup');
    else setState('login');
  }, [token]);

  useEffect(() => { checkPortal(); }, [checkPortal]);

  if (state === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #f5f0eb 0%, #eee8e0 100%)' }}>
        <div className="w-5 h-5 border-2 border-stone-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (state === 'not-found') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'linear-gradient(135deg, #f5f0eb 0%, #eee8e0 100%)' }}>
        <div className="text-center">
          <div className="w-16 h-16 bg-stone-200 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">🔍</div>
          <h1 className="text-lg font-semibold text-stone-700 mb-2">페이지를 찾을 수 없습니다</h1>
          <p className="text-sm text-stone-500">링크가 올바른지 확인해 주세요.</p>
        </div>
      </div>
    );
  }

  if (state === 'locked') {
    const lockedUntil = meta?.lockedUntil ? new Date(meta.lockedUntil) : null;
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'linear-gradient(135deg, #f5f0eb 0%, #eee8e0 100%)' }}>
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-stone-200 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">🔒</div>
          <h1 className="text-lg font-semibold text-stone-700 mb-2">일시적으로 잠겨 있습니다</h1>
          <p className="text-sm text-stone-500 leading-relaxed">
            비밀번호 오류 횟수 초과로 30분간 잠겼습니다.
            {lockedUntil && (
              <><br />{lockedUntil.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} 이후 다시 시도해 주세요.</>
            )}
          </p>
        </div>
      </div>
    );
  }

  const isAuth = state === 'authenticated';

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #f5f0eb 0%, #eee8e0 100%)' }}>

      {/* Personal header — only shown when authenticated */}
      {isAuth && meta && (
        <div className="px-4 pt-10 pb-6 text-center">
          <div className="w-14 h-14 rounded-full bg-stone-300 flex items-center justify-center mx-auto mb-3 text-stone-600 text-xl font-bold shadow-sm">
            {meta.studentName.charAt(0)}
          </div>
          <p className="text-xs text-stone-400 tracking-widest uppercase mb-1">My Space</p>
          <h1 className="text-xl font-bold text-stone-800">{meta.studentName} 학생</h1>
          <p className="text-sm text-stone-500 mt-0.5">SuperfastSAT 학습 기록</p>
        </div>
      )}

      {/* Auth screens — centered card */}
      {!isAuth && (
        <div className="min-h-screen flex flex-col items-center justify-center px-4">
          {meta?.studentName && (
            <div className="text-center mb-8">
              <div className="w-14 h-14 rounded-full bg-stone-300 flex items-center justify-center mx-auto mb-3 text-stone-600 text-xl font-bold">
                {meta.studentName.charAt(0)}
              </div>
              <p className="text-sm font-medium text-stone-700">{meta.studentName} 학생의 공간</p>
            </div>
          )}
          <div className="w-full max-w-sm">
            {state === 'setup' && (
              <PasscodeSetup token={token} onSuccess={() => setState('authenticated')} />
            )}
            {state === 'login' && (
              <PasscodeEntry
                token={token}
                onSuccess={() => setState('authenticated')}
                onLocked={() => { setMeta(prev => prev ? { ...prev, isLocked: true } : prev); setState('locked'); }}
              />
            )}
          </div>
        </div>
      )}

      {/* Content */}
      {isAuth && (
        <main className="max-w-lg mx-auto px-4 pb-12">
          <PortalContent token={token} />
        </main>
      )}
    </div>
  );
}
