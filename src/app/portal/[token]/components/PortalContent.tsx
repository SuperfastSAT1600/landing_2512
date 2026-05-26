'use client';

import { useState, useEffect } from 'react';
import PasscodeChange from './PasscodeChange';
import PortalHome from './PortalHome';
import StudentInfoOverlay from './StudentInfoOverlay';
import DiagnosticOverlay from './DiagnosticOverlay';
import ConsultationOverlay from './ConsultationOverlay';

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
  previous_rw_score: number | null;
  previous_math_score: number | null;
  preferred_language: 'korean' | 'english' | 'any' | null;
}

interface PortalData {
  student: StudentInfo;
  publishedMemos: PublishedMemo[];
  diagnosticResult: DiagnosticResult | null;
}

type View = 'home' | 'student' | 'diagnostic' | 'consultation';

export default function PortalContent({ token }: { token: string }) {
  const [data, setData] = useState<PortalData | null>(null);
  const [error, setError] = useState('');
  const [view, setView] = useState<View>('home');
  const [showChangePasscode, setShowChangePasscode] = useState(false);

  useEffect(() => {
    fetch(`/api/portal/${token}/data`)
      .then(r => { if (!r.ok) throw new Error('unauthorized'); return r.json(); })
      .then(setData)
      .catch(() => setError('데이터를 불러오는 중 오류가 발생했습니다.'));
  }, [token]);

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

  return (
    <>
      <PortalHome
        data={data}
        onNavigate={v => setView(v)}
        onSettings={() => setShowChangePasscode(true)}
      />

      {view === 'student' && (
        <StudentInfoOverlay student={data.student} onBack={() => setView('home')} />
      )}

      {view === 'diagnostic' && data.diagnosticResult && (
        <DiagnosticOverlay resultId={data.diagnosticResult.id} onBack={() => setView('home')} />
      )}

      {view === 'consultation' && (
        <ConsultationOverlay memos={data.publishedMemos} onBack={() => setView('home')} />
      )}

      {showChangePasscode && (
        <PasscodeChange token={token} onClose={() => setShowChangePasscode(false)} />
      )}
    </>
  );
}
