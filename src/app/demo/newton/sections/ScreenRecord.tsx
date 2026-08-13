'use client';

import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { TimelineSection } from '@/app/admin/crm/components/panel/sections/TimelineSection';
import { MemoSection } from '@/app/admin/crm/components/panel/sections/MemoSection';
import { SectionCard } from '@/app/admin/crm/components/panel/sections/SectionCard';
import { CRM_LABELS_EN, CRM_LABELS_KO } from '@/lib/crm-labels';
import { Section } from '../components/Section';
import { LearningPane } from '../components/LearningPane';
import { brand } from '../theme';
import { NOTES, DEMO_STUDENT_ID } from '../fixtures';
import { DEMO_LANG, t } from '../i18n';
import { ACTIVITY, ASSESSMENTS } from '../fixtures/learning';

const noop = () => {};

const PANEL_LABELS = DEMO_LANG === 'ko' ? CRM_LABELS_KO : CRM_LABELS_EN;

/**
 * 운영 중인 CRM 학생 패널과 같은 2단 구조를 그대로 띄운다.
 * 좌: 학습 데이터 + AI 현황 브리핑 / 우: 학생 헤더 + 접히는 섹션들.
 * 타임라인·메모는 실제 CRM 컴포넌트를 그대로 마운트하고 뉴튼 데이터만 주입한다.
 */
export function ScreenRecord({ highlightNoteId }: { highlightNoteId: string | null }) {
  const [openSignal, setOpenSignal] = useState(0);
  // 좁은 화면에서는 노트를 아코디언으로 접는다(30건을 전부 펼치면 7,000px가 넘는다).
  const [narrow, setNarrow] = useState(false);
  const [memoText, setMemoText] = useState('');

  // AI 분석의 근거 칩을 누르면 타임라인이 접혀 있어도 펼쳐지도록 신호를 받는다.
  useEffect(() => {
    const open = () => setOpenSignal(s => s + 1);
    window.addEventListener('newton-demo:open-timeline', open);
    return () => window.removeEventListener('newton-demo:open-timeline', open);
  }, []);

  // 데스크톱에서만 타임라인을 자동으로 펼친다(openSignal 증가 = 강제 펼침).
  // 모바일은 인라인 렌더라 30건을 풀면 페이지가 2만 px을 넘어가므로 접어둔다.
  // SSR에서는 화면 폭을 알 수 없어 마운트 후 판단하되, effect 본문에서 동기 setState를 하지 않도록
  // matchMedia를 구독하고 콜백에서만 상태를 바꾼다(초기 1회는 다음 프레임에).
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const sync = () => {
      setNarrow(!mq.matches);
      if (mq.matches) setOpenSignal(s => s + 1);
    };
    mq.addEventListener('change', sync);
    const raf = requestAnimationFrame(sync);
    return () => {
      mq.removeEventListener('change', sync);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <Section
      id="record"
      eyebrow="Screen 2 — Student record"
      title="학습과 상담기록을 한눈에"
      lead={[
        '왼쪽은 학습 데이터, 오른쪽은 상담 기록입니다. 14개월간 담임·교과·상담 담당이 남긴 노트 30건이 그대로 쌓여 있습니다.',
        '섹션을 열고 스크롤해 보시면 실제 운영에서 이 화면이 어떻게 쓰이는지 그대로 보실 수 있습니다.',
      ]}
    >
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-2">
          {/* 좌: 학습 데이터 */}
          <div className="border-b border-gray-100 lg:max-h-[680px] lg:border-b-0 lg:border-r">
            <LearningPane />
          </div>

          {/* 우: 학생 상세 */}
          <div className="flex flex-col lg:max-h-[680px]">
            <div className="border-b border-gray-100 px-4 py-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[19px] font-bold leading-tight text-gray-900">Seojun Park</p>
                  <p className="mt-0.5 text-[12px] text-gray-400">{t.studentSubtitle}</p>
                </div>
                <span className="font-serif text-[12px] sm:text-[11px] tracking-[0.18em] text-gray-300">EDUMO</span>
              </div>
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[12px] font-semibold text-blue-700">
                  {t.enrolledYear2}
                  <ChevronDown size={12} />
                </span>
                <span className="rounded-full border border-gray-200 px-2.5 py-1 text-[12px] sm:text-[11px] text-gray-500">
                  {t.parentPortalOn}
                </span>
                <span className="rounded-full border border-gray-200 px-2.5 py-1 text-[12px] sm:text-[11px] text-gray-500">
                  {t.precalcGrade11}
                </span>
              </div>
            </div>

            <div className="min-h-0 flex-1 lg:overflow-y-auto">
              <MemoSection
                memoText={memoText}
                setMemoText={setMemoText}
                savingMemo={false}
                memoError=""
                setMemoError={noop}
                onAddMemo={noop}
                staged={[]}
                onAddFiles={noop}
                onRemoveAttachment={noop}
                attachmentsUploading={false}
                onOpenPlaud={noop}
                labels={PANEL_LABELS}
              />

              <TimelineSection
                studentId={DEMO_STUDENT_ID}
                adminKey=""
                timeline={NOTES}
                loadingFresh={false}
                openSignal={openSignal}
                readOnly
                highlightId={highlightNoteId}
                collapsibleEntries={narrow}
                labels={PANEL_LABELS}
                publishError=""
                publishing={false}
                memoSaving={null}
                aiLoadingFor={null}
                pendingEdits={{}}
                setPendingEdits={noop}
                onAiCare={noop}
                onPublish={noop}
                onUnpublish={noop}
                onDeleteAi={noop}
                onEditMemo={async () => false}
                onDeleteMemo={noop}
              />

              <SectionCard title={t.assessments} count={ASSESSMENTS.length} defaultOpen={false}>
                <div className="space-y-1.5">
                  {[...ASSESSMENTS].reverse().map(a => (
                    <div key={a.date} className="flex items-center justify-between text-[12px]">
                      <span className="text-gray-700">{a.title}</span>
                      <span className="tabular-nums text-gray-400">
                        {a.date} · <span className="font-semibold text-gray-800">{a.score}%</span>
                      </span>
                    </div>
                  ))}
                </div>
              </SectionCard>

              <SectionCard title={t.activityTimeline} count={ACTIVITY.length} defaultOpen={false}>
                <ol className="space-y-2">
                  {ACTIVITY.map(a => (
                    <li key={a.date} className="flex gap-2.5 text-[12px]">
                      <span className="shrink-0 tabular-nums text-gray-400">{a.date}</span>
                      <span className="text-gray-700">{a.text}</span>
                    </li>
                  ))}
                </ol>
              </SectionCard>
            </div>
          </div>
        </div>
      </div>

      <p className="mt-4 text-[13px] leading-relaxed" style={{ color: brand.muted }}>
        위 화면은 저희가 지금 자체 운영에 쓰고 있는 시스템의 실제 컴포넌트를 뉴튼 용어로 바꿔 띄운 것입니다.
        데모용으로 새로 그린 화면이 아닙니다.
      </p>
    </Section>
  );
}
