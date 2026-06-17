'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { PasscodeSetup, PasscodeEntry } from './components/PasscodeGate';
import { LearningView } from './components/LearningView';
import { useAdminAuth } from '@/lib/useAdminAuth';

type State = 'loading' | 'not-found' | 'setup' | 'locked' | 'login' | 'authenticated';

interface PortalMeta {
  partnerName: string;
  hasPasscode: boolean;
  isLocked: boolean;
  lockedUntil: string | null;
}

export default function PartnerPortalPage() {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<State>('loading');
  const [meta, setMeta] = useState<PortalMeta | null>(null);
  const { isAuthenticated: isAdmin, loading: adminLoading, adminKey } = useAdminAuth();

  const checkPortal = useCallback(async () => {
    setState('loading');
    const res = await fetch(`/api/partner/${token}`);
    if (!res.ok) { setState('not-found'); return; }
    const data: PortalMeta & { exists: boolean } = await res.json();
    setMeta(data);
    if (isAdmin) { setState('authenticated'); return; }
    if (data.isLocked) setState('locked');
    else if (!data.hasPasscode) setState('setup');
    else setState('login');
  }, [token, isAdmin]);

  useEffect(() => {
    if (adminLoading) return; // wait for localStorage check before deciding auth flow
    checkPortal();
  }, [checkPortal, adminLoading]);

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (state === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Not found ────────────────────────────────────────────────────────────────
  if (state === 'not-found') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-4xl mb-4">🔍</p>
          <h1 className="text-lg font-semibold text-gray-800 mb-2">페이지를 찾을 수 없습니다</h1>
          <p className="text-sm text-gray-400">링크가 올바른지 확인해 주세요.</p>
        </div>
      </div>
    );
  }

  // ── Locked ───────────────────────────────────────────────────────────────────
  if (state === 'locked') {
    const lockedUntil = meta?.lockedUntil ? new Date(meta.lockedUntil) : null;
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 rounded-full bg-red-50 border border-red-200 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🔒</span>
          </div>
          <h1 className="text-lg font-semibold text-gray-800 mb-2">일시적으로 잠겨 있습니다</h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            비밀번호 오류 횟수 초과로 30분간 잠겼습니다.
            {lockedUntil && <><br />{lockedUntil.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} 이후 다시 시도해 주세요.</>}
          </p>
        </div>
      </div>
    );
  }

  // ── Authenticated ────────────────────────────────────────────────────────────
  if (state === 'authenticated') {
    return (
      <>
        {isAdmin && (
          <div className="bg-indigo-600 text-white text-xs text-center py-1.5 font-medium">
            어드민 미리보기 모드 — 비밀번호 없이 접속됨
          </div>
        )}
        <LearningView token={token} adminKey={isAdmin ? adminKey : undefined} />
      </>
    );
  }

  // ── Auth screens (setup / login) ─────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-16">
      {/* Logo + title */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 mb-4">
          <span className="text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-full">SuperfastSAT</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">{meta?.partnerName ?? '파트너 포털'}</h1>
        <p className="text-sm text-gray-500">파트너 포털</p>
      </div>

      {/* Auth card */}
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        {state === 'setup' && (
          <>
            <h2 className="text-base font-bold text-gray-900 text-center mb-1">비밀번호 설정</h2>
            <p className="text-xs text-gray-500 text-center mb-6">처음 방문하셨습니다. 6자리 비밀번호를 설정해 주세요.</p>
            <PasscodeSetup token={token} onSuccess={() => setState('authenticated')} />
          </>
        )}
        {state === 'login' && (
          <>
            <h2 className="text-base font-bold text-gray-900 text-center mb-1">비밀번호 입력</h2>
            <p className="text-xs text-gray-500 text-center mb-6">6자리 비밀번호를 입력해 주세요.</p>
            <PasscodeEntry
              token={token}
              onSuccess={() => setState('authenticated')}
              onLocked={() => setState('locked')}
            />
          </>
        )}
      </div>
    </div>
  );
}
