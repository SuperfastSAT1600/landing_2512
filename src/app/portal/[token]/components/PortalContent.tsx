'use client';

import { useState, useEffect, useRef } from 'react';
import PasscodeChange from './PasscodeChange';
import StudentInfoOverlay from './StudentInfoOverlay';
import DiagnosticOverlay from './DiagnosticOverlay';
import ConsultationOverlay from './ConsultationOverlay';
import LearningReport from './LearningReport';

interface PublishedMemo {
  id: string;
  created_at: string;
  content: string;
}

interface DiagnosticResult {
  id: string;
  submitted_at: string;
  test_id: string;
  total_time_seconds: number;
  question_count: number;
}

interface StudentInfo {
  name: string;
  grade: string;
  desired_subjects: string;
  target_score: number | null;
  target_test_date: string | null;
  target_score_2: number | null;
  target_test_date_2: string | null;
  previous_rw_score: number | null;
  previous_math_score: number | null;
  preferred_language: 'korean' | 'english' | 'any' | null;
  created_at: string | null;
}

interface PortalData {
  student: StudentInfo;
  publishedMemos: PublishedMemo[];
  diagnosticResult: DiagnosticResult | null;
  hasSrmData: boolean;
}

type View = 'consultation' | 'student' | 'diagnostic' | 'study_hall';

const CRM_NAV_ITEMS: { view: View; label: string }[] = [
  { view: 'consultation', label: '상담 기록' },
  { view: 'student', label: '학생 기본 정보' },
  { view: 'diagnostic', label: '진단 테스트' },
];

const SRM_NAV_ITEMS: { view: View; label: string }[] = [
  { view: 'study_hall', label: '학습 리포트' },
];

export default function PortalContent({ token }: { token: string }) {
  const [data, setData] = useState<PortalData | null>(null);
  const [error, setError] = useState('');
  const [view, setView] = useState<View>('consultation');
  const [showChangePasscode, setShowChangePasscode] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [navDropdownOpen, setNavDropdownOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  const navDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/portal/${token}/data`)
      .then(r => { if (!r.ok) throw new Error('unauthorized'); return r.json(); })
      .then(setData)
      .catch(() => setError('데이터를 불러오는 중 오류가 발생했습니다.'));
  }, [token]);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsOpen(false);
      }
      if (navDropdownRef.current && !navDropdownRef.current.contains(e.target as Node)) {
        setNavDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  if (error) return <p className="text-sm text-red-400 text-center py-8">{error}</p>;

  if (!data) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
        ))}
      </div>
    );
  }

  const hasDiagnostic = !!data.diagnosticResult;
  const { hasSrmData } = data;
  const allNavItems = [...CRM_NAV_ITEMS, ...(hasSrmData ? SRM_NAV_ITEMS : [])];
  const activeItem = allNavItems.find(item => item.view === view) ?? CRM_NAV_ITEMS[0];

  return (
    <>
      {/* Fixed portal nav — always on top of all overlays */}
      <div
        className="fixed top-0 left-0 right-0 z-[60] bg-white"
        style={{ borderBottom: '1px solid #E2E8F0' }}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-[6%]">
          <div className="flex items-center justify-between h-12">

            {/* ── Mobile: Logo + current tab dropdown ── */}
            <div className="flex sm:hidden items-center gap-2 min-w-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo_black.png" alt="SuperfastSAT" className="h-4 w-auto flex-shrink-0" />
              <div className="relative flex-shrink-0" ref={navDropdownRef}>
                <button
                  onClick={() => setNavDropdownOpen(o => !o)}
                  className="flex items-center gap-1 rounded-full px-3 py-1 transition-colors"
                  style={{ background: '#09090b', fontSize: 12, fontWeight: 600, color: '#fff', border: 'none' }}
                >
                  {activeItem.label}
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                    style={{ transform: navDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                {navDropdownOpen && (
                  <div
                    className="absolute left-0 top-9 rounded-xl py-1 z-10 bg-white"
                    style={{ border: '1px solid #E2E8F0', boxShadow: '0 8px 24px rgba(0,0,0,0.10)', minWidth: 140 }}
                  >
                    {allNavItems.map(item => {
                      const isDisabled = item.view === 'diagnostic' && !hasDiagnostic;
                      const isActive = view === item.view;
                      return (
                        <button
                          key={item.view}
                          disabled={isDisabled}
                          onClick={() => { if (!isDisabled) { setView(item.view); setNavDropdownOpen(false); } }}
                          className="w-full text-left px-4 py-2.5 text-sm transition-colors disabled:opacity-40"
                          style={{
                            fontWeight: isActive ? 600 : 400,
                            color: isActive ? '#09090b' : '#475569',
                            background: isActive ? '#F8FAFC' : 'transparent',
                          }}
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* ── Desktop: Logo + Nav pills ── */}
            <div className="hidden sm:flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo_black.png" alt="SuperfastSAT" className="h-4 w-auto flex-shrink-0" />
              <div className="flex items-center gap-1">
                {allNavItems.map(item => {
                  const isActive = view === item.view;
                  const isDisabled = item.view === 'diagnostic' && !hasDiagnostic;
                  return (
                    <button
                      key={item.view}
                      onClick={() => { if (!isDisabled) setView(item.view); }}
                      disabled={isDisabled}
                      className="flex-shrink-0 rounded-full transition-colors disabled:opacity-40"
                      style={{
                        padding: '4px 12px',
                        fontSize: 12,
                        fontWeight: isActive ? 600 : 500,
                        background: isActive ? '#09090b' : '#F1F5F9',
                        color: isActive ? '#ffffff' : '#475569',
                        border: 'none',
                        cursor: isDisabled ? 'default' : 'pointer',
                      }}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Settings */}
            <div className="relative flex-shrink-0" ref={settingsRef}>
              <button
                onClick={() => setSettingsOpen(o => !o)}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-700 transition-colors px-2 py-1"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" />
                </svg>
                설정
              </button>
              {settingsOpen && (
                <div
                  className="absolute right-0 top-9 rounded-xl py-1 min-w-[140px] z-10 bg-white"
                  style={{ border: '1px solid #E2E8F0', boxShadow: '0 8px 24px rgba(0,0,0,0.10)' }}
                >
                  <button
                    onClick={() => { setSettingsOpen(false); setShowChangePasscode(true); }}
                    className="w-full text-left px-4 py-2.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                  >
                    비밀번호 변경
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Overlays — each has pt-12 to clear the fixed nav */}
      <ConsultationOverlay
        memos={data.publishedMemos}
        studentName={data.student.name}
        studentCreatedAt={data.student.created_at}
        blogLinkCount={data.publishedMemos.filter(m => m.content.includes('http')).length}
      />

      {view === 'student' && (
        <StudentInfoOverlay student={data.student} />
      )}

      {view === 'diagnostic' && data.diagnosticResult && (
        <DiagnosticOverlay resultId={data.diagnosticResult.id} />
      )}

      {view === 'study_hall' && hasSrmData && (
        <div className="pt-12 max-w-5xl mx-auto px-4 sm:px-[6%] py-6">
          <LearningReport token={token} />
        </div>
      )}

      {showChangePasscode && (
        <PasscodeChange token={token} onClose={() => setShowChangePasscode(false)} />
      )}
    </>
  );
}
