'use client';

import { useState, useEffect, useCallback } from 'react';
import { use } from 'react';
import { PasscodeSetup, PasscodeVerify } from './components/PasscodeGate';
import { ParentDashboard } from './components/ParentDashboard';
import type { ParentStudentView } from '@/types/crm';

const SESSION_KEY_PREFIX = 'mypage_passcode_';

type PageState =
  | { phase: 'loading' }
  | { phase: 'setup'; studentId: string }
  | { phase: 'verify'; studentId: string }
  | { phase: 'dashboard'; data: ParentStudentView; studentId: string; passcode: string }
  | { phase: 'error'; message: string };

interface Props {
  params: Promise<{ studentId: string }>;
}

export default function MyPage({ params }: Props) {
  const { studentId } = use(params);
  const [state, setState] = useState<PageState>({ phase: 'loading' });

  const sessionKey = `${SESSION_KEY_PREFIX}${studentId}`;

  const fetchAndEnter = useCallback(
    async (passcode: string) => {
      try {
        const res = await fetch(`/api/mypage/${studentId}`, {
          headers: { 'X-Passcode': passcode },
        });
        if (!res.ok) {
          sessionStorage.removeItem(sessionKey);
          setState({ phase: 'verify', studentId });
          return;
        }
        const { data } = await res.json();
        sessionStorage.setItem(sessionKey, passcode);
        setState({ phase: 'dashboard', data, studentId, passcode });
      } catch {
        setState({ phase: 'error', message: '데이터를 불러오지 못했습니다.' });
      }
    },
    [studentId, sessionKey]
  );

  useEffect(() => {
    async function init() {
      try {
        const res = await fetch(`/api/mypage/${studentId}`);
        if (!res.ok) {
          setState({ phase: 'error', message: '잘못된 링크이거나 만료된 페이지입니다.' });
          return;
        }
        const json = await res.json();
        const data = json.data;
        if (data?.needs_setup) {
          setState({ phase: 'setup', studentId });
          return;
        }

        // Check session storage for cached passcode
        const cached = sessionStorage.getItem(sessionKey);
        if (cached) {
          await fetchAndEnter(cached);
          return;
        }

        setState({ phase: 'verify', studentId });
      } catch {
        setState({ phase: 'error', message: '연결 오류가 발생했습니다.' });
      }
    }
    init();
  }, [studentId, sessionKey, fetchAndEnter]);

  if (state.phase === 'loading') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-400 text-sm">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (state.phase === 'error') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h1 className="text-lg font-semibold text-gray-900 mb-1">페이지를 불러올 수 없습니다</h1>
          <p className="text-gray-500 text-sm">{state.message}</p>
        </div>
      </div>
    );
  }

  if (state.phase === 'setup') {
    return (
      <PasscodeSetup
        studentId={studentId}
        onSetupComplete={(passcode) => fetchAndEnter(passcode)}
      />
    );
  }

  if (state.phase === 'verify') {
    return (
      <PasscodeVerify
        studentId={studentId}
        onVerified={(passcode) => fetchAndEnter(passcode)}
      />
    );
  }

  // phase === 'dashboard'
  return (
    <ParentDashboard
      data={state.data}
      studentId={state.studentId}
      passcode={state.passcode}
    />
  );
}
