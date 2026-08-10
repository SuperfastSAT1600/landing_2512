'use client';

import { useState } from 'react';
import { ArrowRight, Loader2, Sparkles } from 'lucide-react';
import type { AdvisorPlan } from '@/lib/newton-advisor';
import { Section } from '../components/Section';
import { brand } from '../theme';
import { NOTES, ADVISOR_PLAN } from '../fixtures';
import { t } from '../i18n';
import { PlanView } from '../components/PlanView';
import { WorkFlowDiagram } from '../components/WorkFlowDiagram';

type State = 'idle' | 'running' | 'done';

export function ScreenAdvisor({ onJumpToNote }: { onJumpToNote: (noteId: string) => void }) {
  const [state, setState] = useState<State>('idle');
  const [plan, setPlan] = useState<AdvisorPlan>(ADVISOR_PLAN);
  const [note, setNote] = useState('');
  const [live, setLive] = useState(false);

  function analyze() {
    setState('running');
    setPlan(ADVISOR_PLAN);
    setLive(false);
    // 이미 확보한 결과를 보여주는 구간 — 짧은 대기 후 한 번에 노출한다(가짜 진행 단계 표시 없음).
    window.setTimeout(() => setState('done'), 700);
  }

  async function analyzeWithNote() {
    if (!note.trim()) return;
    setState('running');
    try {
      const res = await fetch('/api/demo/newton-advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note }),
      });
      const data = await res.json();
      // 실패·폴백 어느 쪽이든 화면에는 플랜이 뜬다. 에러를 노출하지 않는다.
      setPlan(data?.data?.plan ?? ADVISOR_PLAN);
      setLive(Boolean(data?.data?.live));
    } catch {
      setPlan(ADVISOR_PLAN);
      setLive(false);
    } finally {
      setState('done');
    }
  }

  return (
    <Section
      id="advisor"
      eyebrow="Screen 4 — AI work list"
      title="경험이 적은 담당자도, 이번 주에 할 일을 압니다"
      lead={[
        '10년차 선생님은 상담 기록만 읽고도 다음 수를 압니다. 그 판단은 인수인계로 넘어가지 않습니다.',
        'AI가 기록 전체를 읽고 이번 주·이번 달·이번 분기 할 일을 뽑습니다.',
      ]}
    >
      {/* 카드 껍데기·헤더는 앞의 세 제품 화면과 같은 규격을 쓴다 — 같은 소프트웨어의 다른 화면으로 읽히게. */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[17px] font-bold leading-tight text-gray-900">Seojun Park</p>
              <p className="mt-1 text-[12px] text-gray-400">{t.studentSubtitle}</p>
            </div>
            <span className="font-serif text-[12px] sm:text-[11px] tracking-[0.18em] text-gray-300">EDUMO</span>
          </div>

          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold"
              style={{ background: '#eef0ff', color: brand.accent }}
            >
              <Sparkles size={12} />
              {t.advisingAnalysis}
            </span>
            <button
              onClick={analyze}
              disabled={state === 'running'}
              className="rounded-lg px-4 py-2 text-[13px] font-semibold text-white transition-opacity disabled:opacity-60"
              style={{ background: brand.primary }}
            >
              {state === 'running' ? t.analyzing : t.analyzeButton(NOTES.length)}
            </button>
          </div>
        </div>

        <div className="px-5 py-6">
          {/*
            대기 상태 — 안내문 한 줄이면 클릭할 이유가 생기지 않는다.
            무엇이 있고(기록 수) → 무엇으로 바뀌는지(3구간) → 누를 것(중앙 버튼) 순으로 세운다.
          */}
          {state === 'idle' && (
            <div className="flex flex-col items-center py-10 text-center">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-full"
                style={{ background: '#eef0ff' }}
              >
                <Sparkles size={20} style={{ color: brand.accent }} />
              </div>

              <p className="mt-4 text-[15.5px] font-bold text-gray-800">{t.idleTitle(NOTES.length)}</p>
              <p className="mt-1.5 max-w-md text-[13px] leading-relaxed text-gray-400">{t.idleSub}</p>

              <button
                onClick={analyze}
                className="mt-5 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-[13.5px] font-semibold text-white shadow-sm transition-transform hover:-translate-y-px"
                style={{ background: brand.primary }}
              >
                {t.analyzeButton(NOTES.length)}
                <ArrowRight size={15} />
              </button>

              {/* 결과가 들어올 자리를 미리 보여준다 — 무엇이 나올지 알면 누를 이유가 생긴다. */}
              <div className="mt-9 grid w-full max-w-xl grid-cols-3 gap-2">
                {[t.thisWeek, t.thisMonth, t.thisQuarter].map(label => (
                  <div
                    key={label}
                    className="rounded-lg border border-dashed py-3.5 text-[12px] sm:text-[11.5px]"
                    style={{ borderColor: '#dde1ec', color: '#b4bacb' }}
                  >
                    {label}
                  </div>
                ))}
              </div>
            </div>
          )}

          {state === 'running' && (
            <div className="flex items-center justify-center gap-2 py-10 text-[13px] text-gray-400">
              <Loader2 size={15} className="animate-spin" />
              {t.readingNotes(NOTES.length)}
            </div>
          )}

          {state === 'done' && (
            <div className="animate-[fadeIn_0.4s_ease-out]">
              <div className="mb-7">
                <WorkFlowDiagram
                  noteCount={NOTES.length}
                  counts={{
                    week: plan.thisWeek.length,
                    month: plan.thisMonth.length,
                    quarter: plan.thisQuarter.length,
                  }}
                  playing
                />
              </div>

              <PlanView plan={plan} onJumpToNote={onJumpToNote} />

              <div className="mt-8 rounded-xl border border-gray-200 bg-gray-50 px-4 py-4">
                <p className="text-[13px] font-semibold text-gray-700">{t.addYourNote}</p>
                <p className="mt-1 text-[12px] text-gray-500">
                  {t.addYourNoteHint}
                </p>
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  rows={3}
                  maxLength={2000}
                  placeholder={t.notePlaceholder}
                  className="mt-3 w-full resize-y rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-[13px] outline-none focus:border-blue-400"
                />
                <button
                  onClick={analyzeWithNote}
                  disabled={!note.trim()}
                  className="mt-2 rounded-lg px-4 py-2 text-[13px] font-semibold text-white transition-opacity disabled:opacity-40"
                  style={{ background: brand.accent }}
                >
                  {t.reanalyze}
                </button>
                {live && (
                  <span className="ml-3 text-[12px] font-medium" style={{ color: brand.accent }}>
                    {t.updatedFromNote}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: none;
          }
        }
      `}</style>
    </Section>
  );
}
