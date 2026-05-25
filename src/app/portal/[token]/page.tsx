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

const BG = '#09090b';
const ACCENT = '#6085FF';

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
      <div className="min-h-screen flex items-center justify-center" style={{ background: BG }}>
        <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: ACCENT, borderTopColor: 'transparent' }} />
      </div>
    );
  }

  if (state === 'not-found') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: BG }}>
        <div className="text-center">
          <p className="text-4xl mb-4">🔍</p>
          <h1 className="text-lg font-semibold text-white mb-2">페이지를 찾을 수 없습니다</h1>
          <p className="text-sm text-slate-500">링크가 올바른지 확인해 주세요.</p>
        </div>
      </div>
    );
  }

  if (state === 'locked') {
    const lockedUntil = meta?.lockedUntil ? new Date(meta.lockedUntil) : null;
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: BG }}>
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(96,133,255,0.1)', border: '1px solid rgba(96,133,255,0.3)' }}>
            <span className="text-2xl">🔒</span>
          </div>
          <h1 className="text-lg font-semibold text-white mb-2">일시적으로 잠겨 있습니다</h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            비밀번호 오류 횟수 초과로 30분간 잠겼습니다.
            {lockedUntil && <><br />{lockedUntil.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} 이후 다시 시도해 주세요.</>}
          </p>
        </div>
      </div>
    );
  }

  const isAuth = state === 'authenticated';

  return (
    <div className="min-h-screen" style={{ background: BG }}>

      {/* Ambient glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 20% 0%, rgba(96,133,255,0.06) 0%, transparent 60%), radial-gradient(ellipse at 80% 100%, rgba(7,27,233,0.05) 0%, transparent 60%)',
        }}
      />

      {/* Auth screens */}
      {!isAuth && (
        <div className="relative min-h-screen flex flex-col items-center justify-center px-4 py-12">
          {/* Logo */}
          <div className="mb-10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo_header.png" alt="SuperfastSAT" className="h-8 w-auto mx-auto" style={{ filter: 'brightness(0) invert(1)' }} />
          </div>

          {meta?.studentName && (
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-white mb-1" style={{ letterSpacing: '-0.02em' }}>
                {meta.studentName}
              </h1>
              <p className="text-sm text-slate-500">학부모 전용 상담 포털</p>
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

      {/* Authenticated content */}
      {isAuth && (
        <div className="relative">
          {/* Cover header */}
          <div className="px-[6%] pt-10 pb-8 max-w-2xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-px w-10" style={{ background: ACCENT }} />
              <p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: ACCENT }}>
                SuperfastSAT Portal
              </p>
            </div>
            {meta?.studentName && (
              <>
                <h1
                  className="text-white mb-1"
                  style={{ fontSize: 'clamp(1.8rem, 5vw, 3rem)', fontWeight: 800, letterSpacing: '-0.02em' }}
                >
                  {meta.studentName}
                </h1>
                <p className="text-slate-400 text-sm">학부모 전용 상담 기록 및 진단 결과</p>
              </>
            )}
          </div>

          {/* Content */}
          <main className="max-w-2xl mx-auto px-[6%] pb-16">
            <PortalContent token={token} />
          </main>
        </div>
      )}
    </div>
  );
}
