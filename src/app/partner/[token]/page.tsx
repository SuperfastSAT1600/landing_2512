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

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (adminLoading) return; // wait for localStorage check before deciding auth flow
    checkPortal();
  }, [adminLoading]);

  const canvas = '#f6f5f4';

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (state === 'loading') {
    return (
      <div style={{ minHeight: '100vh', background: canvas, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 20, height: 20, border: '2px solid #0075de', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      </div>
    );
  }

  // ── Not found ────────────────────────────────────────────────────────────────
  if (state === 'not-found') {
    return (
      <div style={{ minHeight: '100vh', background: canvas, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 36, marginBottom: 16 }}>🔍</p>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#000', marginBottom: 8, letterSpacing: '-0.125px' }}>페이지를 찾을 수 없습니다</h1>
          <p style={{ fontSize: 14, color: '#a39e98' }}>링크가 올바른지 확인해 주세요.</p>
        </div>
      </div>
    );
  }

  // ── Locked ───────────────────────────────────────────────────────────────────
  if (state === 'locked') {
    const lockedUntil = meta?.lockedUntil ? new Date(meta.lockedUntil) : null;
    return (
      <div style={{ minHeight: '100vh', background: canvas, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px' }}>
        <div style={{ textAlign: 'center', maxWidth: 360 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#fff', border: '1px solid #e6e6e6', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <span style={{ fontSize: 24 }}>🔒</span>
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#000', marginBottom: 8, letterSpacing: '-0.125px' }}>일시적으로 잠겨 있습니다</h1>
          <p style={{ fontSize: 15, color: '#615d59', lineHeight: 1.5 }}>
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
          <div style={{ background: '#0075de', color: '#fff', fontSize: 12, textAlign: 'center', padding: '6px 0', fontWeight: 500 }}>
            어드민 미리보기 모드 — 비밀번호 없이 접속됨
          </div>
        )}
        <LearningView token={token} adminKey={isAdmin ? adminKey : undefined} />
      </>
    );
  }

  // ── Auth screens (setup / login) ─────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: canvas, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 16px' }}>
      {/* Logo + heading */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo_black.png" alt="SuperfastSAT" style={{ height: 32, width: 'auto', marginBottom: 24 }} />
        <h1 style={{ fontSize: 40, fontWeight: 700, color: '#000', letterSpacing: '-1px', lineHeight: 1.1, marginBottom: 8 }}>
          {meta?.partnerName ?? '파트너 센터'}
        </h1>
        <p style={{ fontSize: 15, color: '#615d59', margin: 0, lineHeight: 1.33 }}>파트너 센터</p>
      </div>

      {/* Auth card */}
      <div style={{
        width: '100%',
        maxWidth: 360,
        background: '#fff',
        borderRadius: 16,
        padding: 24,
        border: '1px solid #e6e6e6',
        boxShadow: '0 0.175px 1.041px rgba(0,0,0,0.01), 0 0.8px 2.925px rgba(0,0,0,0.02), 0 2.025px 7.847px rgba(0,0,0,0.027), 0 4px 18px rgba(0,0,0,0.04)',
      }}>
        {state === 'setup' && (
          <>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#000', textAlign: 'center', marginBottom: 6, letterSpacing: '-0.125px' }}>비밀번호 설정</h2>
            <p style={{ fontSize: 14, color: '#615d59', textAlign: 'center', marginBottom: 24, lineHeight: 1.43 }}>처음 방문하셨습니다. 6자리 비밀번호를 설정해 주세요.</p>
            <PasscodeSetup token={token} onSuccess={() => setState('authenticated')} />
          </>
        )}
        {state === 'login' && (
          <>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#000', textAlign: 'center', marginBottom: 6, letterSpacing: '-0.125px' }}>비밀번호 입력</h2>
            <p style={{ fontSize: 14, color: '#615d59', textAlign: 'center', marginBottom: 24, lineHeight: 1.43 }}>6자리 비밀번호를 입력해 주세요.</p>
            <PasscodeEntry
              token={token}
              onSuccess={() => setState('authenticated')}
              onLocked={() => setState('locked')}
            />
          </>
        )}
      </div>

      <p style={{ marginTop: 24, fontSize: 12, color: '#a39e98' }}>SuperfastSAT 파트너 센터</p>
    </div>
  );
}
