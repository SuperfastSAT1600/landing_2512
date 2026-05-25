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
  const [modules, setModules] = useState<Module[]>([]);
  const [curriculumId, setCurriculumId] = useState('');
  const [loading, setLoading] = useState(false);
  const prefetchRef = useRef<Promise<{ modules: Module[]; curriculum_id: string }> | null>(null);
  const [activeModule, setActiveModule] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // 페이지 로드 시 백그라운드에서 미리 fetch
  useEffect(() => {
    prefetchRef.current = fetch('/api/test/questions').then((r) => r.json());
  }, []);

  async function startTest() {
    if (!studentName.trim()) return;
    setLoading(true);
    const data = await (prefetchRef.current ?? fetch('/api/test/questions').then((r) => r.json()));
    setModules(data.modules);
    setCurriculumId(data.curriculum_id);
    setLoading(false);
    setPhase('test');
  }

  async function handleSubmit() {
    setSubmitting(true);
    await fetch('/api/test/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentName, curriculumId, answers }),
    });
    setSubmitting(false);
    setConfirmOpen(false);
    setPhase('submitted');
  }

  const currentModule = modules[activeModule];
  const totalUnits = modules.reduce((s, m) => s + m.units.length, 0);
  const answeredCount = Object.keys(answers).length;

  if (phase === 'name') {
    return (
      <div style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: '#09090b', border: '1px solid #27272a', borderRadius: 12, padding: '48px 40px', width: 360, textAlign: 'center' }}>
          <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 700, marginBottom: 8 }}>SuperfastSAT Full Test</h1>
          <p style={{ color: '#71717a', fontSize: 14, marginBottom: 32 }}>2026 June Full-Length Test #1</p>
          <input
            type="text"
            placeholder="이름 입력"
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && startTest()}
            style={{ width: '100%', padding: '12px 16px', borderRadius: 8, border: '1px solid #3f3f46', background: '#18181b', color: '#fff', fontSize: 15, marginBottom: 16, boxSizing: 'border-box' }}
          />
          <button
            onClick={startTest}
            disabled={!studentName.trim() || loading}
            style={{ width: '100%', padding: '12px 0', background: '#071be9', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'pointer', opacity: !studentName.trim() || loading ? 0.5 : 1 }}
          >
            {loading ? '문제 불러오는 중...' : '시험 시작'}
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'submitted') {
    return (
      <div style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: '#fff' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>제출 완료</h2>
          <p style={{ color: '#71717a' }}>{studentName}님의 답안이 제출되었습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#000', color: '#fff' }}>
      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: '#09090b', borderBottom: '1px solid #27272a', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontWeight: 700, fontSize: 15 }}>SuperfastSAT Full-Length Test #1</span>
        <span style={{ color: '#71717a', fontSize: 13 }}>{studentName} · {answeredCount}/{totalUnits} 답변</span>
      </div>

      {/* Module tabs */}
      <div style={{ borderBottom: '1px solid #27272a', padding: '0 24px', display: 'flex', gap: 4 }}>
        {modules.map((m, i) => (
          <button
            key={m.id}
            onClick={() => setActiveModule(i)}
            style={{ padding: '12px 16px', background: 'none', border: 'none', borderBottom: i === activeModule ? '2px solid #071be9' : '2px solid transparent', color: i === activeModule ? '#fff' : '#71717a', fontSize: 13, fontWeight: i === activeModule ? 600 : 400, cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            {m.title} ({m.section === 'Reading and Writing' ? 'RW' : 'Math'})
          </button>
        ))}
      </div>

      {/* Questions */}
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 24px' }}>
        {currentModule?.units.map((unit, idx) => (
          <QuestionCard
            key={unit.id}
            unit={unit}
            index={idx + 1}
            answer={answers[unit.id]}
            onAnswer={(val) => setAnswers((prev) => ({ ...prev, [unit.id]: val }))}
          />
        ))}

        {/* Submit button - last module only */}
        {activeModule === modules.length - 1 && (
          <div style={{ marginTop: 40, textAlign: 'center' }}>
            <button
              onClick={() => setConfirmOpen(true)}
              style={{ padding: '14px 48px', background: '#071be9', color: '#fff', border: 'none', borderRadius: 8, fontSize: 16, fontWeight: 700, cursor: 'pointer' }}
            >
              최종 제출
            </button>
            <p style={{ color: '#52525b', fontSize: 13, marginTop: 8 }}>
              {answeredCount < totalUnits && `${totalUnits - answeredCount}문제 미응답`}
            </p>
          </div>
        )}

        {/* Next module button */}
        {activeModule < modules.length - 1 && (
          <div style={{ marginTop: 40, textAlign: 'right' }}>
            <button
              onClick={() => { setActiveModule(activeModule + 1); window.scrollTo(0, 0); }}
              style={{ padding: '12px 32px', background: '#1c1c1e', border: '1px solid #3f3f46', borderRadius: 8, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
            >
              다음 모듈 →
            </button>
          </div>
        )}
      </div>

      {/* Confirm modal */}
      {confirmOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#09090b', border: '1px solid #27272a', borderRadius: 12, padding: 32, width: 320, textAlign: 'center' }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>제출하시겠습니까?</h3>
            <p style={{ color: '#71717a', fontSize: 13, marginBottom: 24 }}>
              {answeredCount}/{totalUnits}문제 답변 완료
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setConfirmOpen(false)} style={{ flex: 1, padding: '10px 0', background: '#27272a', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', fontSize: 14 }}>취소</button>
              <button onClick={handleSubmit} disabled={submitting} style={{ flex: 1, padding: '10px 0', background: '#071be9', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
                {submitting ? '제출 중...' : '제출'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function QuestionCard({ unit, index, answer, onAnswer }: { unit: Unit; index: number; answer?: string; onAnswer: (v: string) => void }) {
  return (
    <div style={{ marginBottom: 40, paddingBottom: 40, borderBottom: '1px solid #27272a' }}>
      <div style={{ color: '#52525b', fontSize: 12, marginBottom: 12 }}>
        Q{index} · {unit.difficulty ?? '—'} · {unit.section}
      </div>

      {unit.passage && (
        <div
          style={{ background: '#0f0f11', border: '1px solid #27272a', borderRadius: 8, padding: '16px 20px', marginBottom: 20, fontSize: 14, lineHeight: 1.8, color: '#d4d4d8' }}
          dangerouslySetInnerHTML={{ __html: unit.passage }}
        />
      )}

      <div
        style={{ fontSize: 15, lineHeight: 1.7, marginBottom: 20, color: '#e4e4e7' }}
        dangerouslySetInnerHTML={{ __html: unit.question }}
      />

      {unit.type === 'multiple_choice' && unit.options && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {unit.options.map((opt) => {
            const selected = answer === opt.label;
            return (
              <button
                key={opt.label}
                onClick={() => onAnswer(opt.label)}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px',
                  background: selected ? 'rgba(7,27,233,0.15)' : '#0f0f11',
                  border: selected ? '1.5px solid #071be9' : '1px solid #27272a',
                  borderRadius: 8, cursor: 'pointer', textAlign: 'left', color: '#e4e4e7',
                }}
              >
                <span style={{ fontWeight: 700, color: selected ? '#6085FF' : '#71717a', minWidth: 20, paddingTop: 1 }}>{opt.label}</span>
                <span style={{ fontSize: 14, lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: opt.text }} />
              </button>
            );
          })}
        </div>
      )}

      {unit.type === 'short_answer' && (
        <input
          type="text"
          placeholder="답 입력"
          value={answer ?? ''}
          onChange={(e) => onAnswer(e.target.value)}
          style={{ padding: '10px 14px', borderRadius: 8, border: answer ? '1.5px solid #071be9' : '1px solid #3f3f46', background: '#0f0f11', color: '#fff', fontSize: 15, width: 180 }}
        />
      )}
    </div>
  );
}
