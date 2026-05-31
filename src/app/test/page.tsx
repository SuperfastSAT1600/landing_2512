'use client';

import { useEffect, useRef, useState } from 'react';

interface Option {
  label: string;
  text: string;
}

interface Unit {
  id: string;
  title: string;
  type: 'multiple_choice' | 'short_answer';
  section: string;
  difficulty: string;
  passage: string | null;
  question: string;
  options: Option[] | null;
  correct_answer: string | string[];
  scope_lesson_id: string;
}

interface Module {
  id: string;
  title: string;
  section: string;
  order: number;
  units: Unit[];
}

type Answers = Record<string, string>;
type Phase = 'name' | 'test' | 'submitted';

export default function TestPage() {
  const [phase, setPhase] = useState<Phase>('name');
  const [studentName, setStudentName] = useState('');
  const [instagramId, setInstagramId] = useState('');
  const [modules, setModules] = useState<Module[]>([]);
  const [curriculumId, setCurriculumId] = useState('');
  const [loading, setLoading] = useState(false);
  const prefetchRef = useRef<Promise<{ modules: Module[]; curriculum_id: string }> | null>(null);
  const [activeModule, setActiveModule] = useState(0);
  const [currentUnitIndex, setCurrentUnitIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    prefetchRef.current = fetch('/api/test/questions').then((r) => r.json());
  }, []);

  async function startTest() {
    const name = studentName.trim();
    const ig = instagramId.trim();
    if (!name || !ig) return;
    setLoading(true);
    const data = await (prefetchRef.current ?? fetch('/api/test/questions').then((r) => r.json()));
    setModules(data.modules);
    setCurriculumId(data.curriculum_id);
    setLoading(false);
    setPhase('test');
  }

  async function handleSubmit() {
    setSubmitting(true);
    const ig = instagramId.startsWith('@') ? instagramId : `@${instagramId}`;
    await fetch('/api/test/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentName, instagramId: ig, curriculumId, answers }),
    });
    setSubmitting(false);
    setConfirmOpen(false);
    setPhase('submitted');
  }

  const currentModule = modules[activeModule];
  const currentUnits = currentModule?.units ?? [];
  const currentUnit = currentUnits[currentUnitIndex];
  const hasPassage = !!currentUnit?.passage;
  const totalUnits = modules.reduce((s, m) => s + m.units.length, 0);
  const answeredCount = Object.keys(answers).length;
  const isLastUnit = currentUnitIndex === currentUnits.length - 1;
  const isLastModule = activeModule === modules.length - 1;
  const isAtStart = activeModule === 0 && currentUnitIndex === 0;
  const globalIndex = modules.slice(0, activeModule).reduce((s, m) => s + m.units.length, 0) + currentUnitIndex;

  function goNext() {
    if (!isLastUnit) {
      setCurrentUnitIndex((i) => i + 1);
    } else if (!isLastModule) {
      setActiveModule((m) => m + 1);
      setCurrentUnitIndex(0);
    } else {
      setConfirmOpen(true);
    }
  }

  function goPrev() {
    if (currentUnitIndex > 0) {
      setCurrentUnitIndex((i) => i - 1);
    } else if (activeModule > 0) {
      const prevMod = modules[activeModule - 1];
      setActiveModule((m) => m - 1);
      setCurrentUnitIndex(prevMod.units.length - 1);
    }
  }

  if (phase === 'name') {
    return (
      <div style={{ minHeight: 'calc(100vh - 56px)', marginTop: 56, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '48px 40px', width: 380, textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
          <h1 style={{ color: '#1e293b', fontSize: 22, fontWeight: 700, marginBottom: 8 }}>SuperfastSAT Full Test</h1>
          <p style={{ color: '#64748b', fontSize: 14, marginBottom: 32 }}>2026 June Full-Length Test #1</p>
          <input
            type="text"
            placeholder="이름 입력"
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            style={{ width: '100%', padding: '12px 16px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#f8fafc', color: '#1e293b', fontSize: 15, marginBottom: 12, boxSizing: 'border-box' }}
          />
          <input
            type="text"
            placeholder="@instagram_id"
            value={instagramId}
            onChange={(e) => setInstagramId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && startTest()}
            style={{ width: '100%', padding: '12px 16px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#f8fafc', color: '#1e293b', fontSize: 15, marginBottom: 16, boxSizing: 'border-box' }}
          />
          <button
            onClick={startTest}
            disabled={!studentName.trim() || !instagramId.trim() || loading}
            style={{ width: '100%', padding: '12px 0', background: '#1e293b', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'pointer', opacity: !studentName.trim() || !instagramId.trim() || loading ? 0.4 : 1 }}
          >
            {loading ? '문제 불러오는 중...' : '시험 시작'}
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'submitted') {
    return (
      <div style={{ minHeight: 'calc(100vh - 56px)', marginTop: 56, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: '#1e293b' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>제출 완료</h2>
          <p style={{ color: '#64748b' }}>{studentName}님의 답안이 제출되었습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: 'calc(100vh - 56px)', marginTop: 56, display: 'flex', flexDirection: 'column', background: '#fff', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ height: 56, background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', flexShrink: 0 }}>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>
          {currentModule?.section === 'Reading and Writing' ? 'Section 1: Reading and Writing' : 'Section 2: Math'}
        </span>
        <span style={{ color: '#94a3b8', fontSize: 13 }}>
          {answeredCount} / {totalUnits} answered
        </span>
      </div>

      {/* Bluebook split layout */}
      <div className="test-layout" style={{ flex: 1, overflow: 'hidden' }}>
        {hasPassage && (
          <>
            <div className="test-passage-panel">
              <div style={{ padding: '24px 28px 24px 24px' }}>
                <div
                  className="test-passage-content"
                  style={{ fontSize: 15, lineHeight: 1.8, color: '#374151' }}
                  dangerouslySetInnerHTML={{ __html: currentUnit.passage! }}
                />
              </div>
            </div>
            <div className="test-resizer" />
          </>
        )}

        <div className={`test-question-panel ${hasPassage ? 'has-passage' : ''}`}>
          <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 20px 120px' }}>
            {currentUnit && (
              <>
                {/* Question number badge */}
                <div style={{ marginBottom: 16 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, background: '#1e293b', color: '#fff', fontWeight: 700, fontSize: 14 }}>
                    {globalIndex + 1}
                  </span>
                </div>

                {/* Question text */}
                <div
                  style={{ fontSize: 15, fontWeight: 500, lineHeight: 1.7, marginBottom: 20, color: '#1e293b' }}
                  dangerouslySetInnerHTML={{ __html: currentUnit.question }}
                />

                {/* Multiple choice */}
                {currentUnit.type === 'multiple_choice' && currentUnit.options && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {currentUnit.options.map((opt) => {
                      const isSelected = answers[currentUnit.id] === opt.label;
                      return (
                        <button
                          key={opt.label}
                          type="button"
                          onClick={() => setAnswers((prev) => ({ ...prev, [currentUnit.id]: opt.label }))}
                          className={`bluebook-option btn-press${isSelected ? ' selected' : ''}`}
                        >
                          <span className="bluebook-option-label">{opt.label}</span>
                          <span
                            className="bluebook-option-text"
                            dangerouslySetInnerHTML={{ __html: opt.text }}
                          />
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Short answer */}
                {currentUnit.type === 'short_answer' && (
                  <input
                    type="text"
                    placeholder="답 입력"
                    value={answers[currentUnit.id] ?? ''}
                    onChange={(e) => setAnswers((prev) => ({ ...prev, [currentUnit.id]: e.target.value }))}
                    style={{ padding: '10px 14px', borderRadius: 8, border: answers[currentUnit.id] ? '1.5px solid #3b82f6' : '1px solid #e5e7eb', background: '#f8fafc', color: '#1e293b', fontSize: 15, width: 180 }}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bluebook-footer">
        <button
          onClick={goPrev}
          disabled={isAtStart}
          className="bluebook-next-btn"
          style={{ opacity: isAtStart ? 0 : 1, pointerEvents: isAtStart ? 'none' : 'auto' }}
        >
          Back
        </button>
        <span style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>
          {currentUnitIndex + 1} / {currentUnits.length}
        </span>
        <button onClick={goNext} className="bluebook-next-btn">
          {isLastUnit && isLastModule ? '최종 제출' : 'Next'}
        </button>
      </div>

      {/* Submit confirm modal */}
      {confirmOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 32, width: 320, textAlign: 'center' }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: '#1e293b' }}>제출하시겠습니까?</h3>
            <p style={{ color: '#64748b', fontSize: 13, marginBottom: 24 }}>
              {answeredCount}/{totalUnits}문제 답변 완료
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setConfirmOpen(false)} style={{ flex: 1, padding: '10px 0', background: '#f1f5f9', border: 'none', borderRadius: 8, color: '#1e293b', cursor: 'pointer', fontSize: 14 }}>
                취소
              </button>
              <button onClick={handleSubmit} disabled={submitting} style={{ flex: 1, padding: '10px 0', background: '#1e293b', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
                {submitting ? '제출 중...' : '제출'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
