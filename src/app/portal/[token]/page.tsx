'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import PasscodeSetup from './components/PasscodeSetup';
import PasscodeEntry from './components/PasscodeEntry';
import PortalContent from './components/PortalContent';
import HeroBackground from '@/app/components/HeroBackground';

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
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#010204' }}>
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
    <div className="min-h-screen" style={{ background: isAuth ? BG : '#010204' }}>

      {/* Auth screens — Hero background + headline */}
      {!isAuth && (
        <div className="relative min-h-screen overflow-hidden">
          {/* HeroBackground canvas */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ opacity: 0.8, transform: 'rotate(180deg)' }}
          >
            <HeroBackground />
          </div>

          {/* Fixed top bar — logo */}
          <div
            className="fixed top-0 left-0 right-0 z-50"
            style={{
              background: 'rgba(1,2,4,0.65)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              borderBottom: '1px solid rgba(255,255,255,0.07)',
            }}
          >
            <div className="max-w-2xl mx-auto px-6 h-12 flex items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo_header.png" alt="SuperfastSAT" className="h-5 w-auto" style={{ filter: 'brightness(0) invert(1)' }} />
            </div>
          </div>

          {/* Content overlay — pt-12 clears the fixed bar */}
          <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 pt-12 py-16">
            {/* Headline */}
            <div className="text-center mb-10">
              <h1
                className="text-white"
                style={{
                  fontSize: 'clamp(2.5rem, 8vw, 5rem)',
                  fontWeight: 800,
                  lineHeight: 1.1,
                  wordBreak: 'keep-all',
                }}
              >
                목표 점수에<br />가장 빠르게
              </h1>
            </div>

            {/* Divider */}
            <div className="w-16 h-px mb-8" style={{ background: 'rgba(255,255,255,0.15)' }} />

            {/* Student name + label */}
            {meta?.studentName && (
              <div className="text-center mb-8">
                <p className="text-2xl font-bold text-white mb-1" style={{ letterSpacing: '-0.02em' }}>
                  {meta.studentName} 학생
                </p>
                <p className="text-sm font-medium" style={{ color: ACCENT }}>상담 관리 리포트</p>
              </div>
            )}

            {/* Passcode form */}
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
        </div>
      )}

      {/* Authenticated content */}
      {isAuth && (
        <div>
          {/* Dark header */}
          <div style={{ background: BG }}>
            <div className="relative px-[6%] pt-10 pb-8 max-w-2xl mx-auto">
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
                    {meta.studentName} 학생
                  </h1>
                  <p className="text-sm font-medium" style={{ color: ACCENT }}>상담 관리 리포트</p>
                </>
              )}
            </div>
          </div>

          {/* Light content */}
          <div style={{ background: '#F4F5F9', minHeight: '60vh' }}>
            <main className="max-w-2xl mx-auto px-[6%] py-8 pb-16">
              <PortalContent token={token} />
            </main>
          </div>
        </div>
      )}
    </div>
  );
}
