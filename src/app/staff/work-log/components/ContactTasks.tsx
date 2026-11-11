'use client';

import { useState } from 'react';
import { REASON_KINDS, reasonLabel, type Reason, type ReasonKind, type StudentTask } from '@/lib/contact-tasks';
import { formatHours, formatKstDateTime, formatKstMonthDay } from '../../briefing/format';
import { useContactTasks } from '../useContactTasks';
import { ContactRow } from './ContactRow';
import { WorkItemNotes } from './WorkItemNotes';

const FILTER_LABELS: Record<ReasonKind, string> = {
  coachRoom: '코칭룸 미예약', endingSoon: '곧 끝남', noSchedule: '없음', neverScheduled: '한 번도 안 잡음',
};

function chipLabel(r: Reason): string {
  const extra = r.coachNames ? `코치 ${r.coachNames.join(', ')}` : r.lastDate ? `마지막 ${formatKstMonthDay(r.lastDate)}` : r.isNew ? '신규' : '';
  return extra ? `${reasonLabel(r.kind)} · ${extra}` : reasonLabel(r.kind);
}

const pill = (active: boolean) => active
  ? 'rounded bg-gray-900 px-2.5 py-1 text-xs font-medium text-white'
  : 'rounded bg-white px-2.5 py-1 text-xs text-gray-600 ring-1 ring-gray-200';

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white">
      <h2 className="border-b border-gray-200 px-3 py-2 text-sm font-bold">{title} <span className="text-gray-400">{count}명</span></h2>
      {count === 0 ? <p className="px-3 py-3 text-xs text-gray-400">연락할 대상이 없습니다.</p> : <ul>{children}</ul>}
    </section>
  );
}

/** 수업 관리 업무: 학생마다 한 줄에 용건을 모으고, 용건을 골라 연락 결과를 기록한다. refreshKey 가 바뀔 때마다 다시 계산한다 */
export function ContactTasks({ refreshKey, staffId }: { refreshKey: number; staffId: string }) {
  const { data, contacts, workItems, dismissed, error, loading, addContact, removeContact, dismiss, restore } = useContactTasks(refreshKey);
  const [filter, setFilter] = useState<ReasonKind | 'all'>('all');
  const [showDismissed, setShowDismissed] = useState(false);

  if (error && !loading) return <p role="alert" className="text-sm text-red-600">{error}</p>;
  if (!data) return <p className="text-xs text-gray-400">최신 스케줄을 계산하는 중…</p>;

  const now = new Date();
  const has = (s: StudentTask, kind: ReasonKind) => s.reasons.some(r => r.kind === kind);
  // 삭제한 대상은 복구 전까지 조건이 맞아도 목록에서 뺀다
  const students = data.students.filter(s => !dismissed[s.studentId]);
  const coaches = data.coaches.filter(c => !dismissed[c.targetId]);
  const dismissedList = Object.entries(dismissed).sort(([, a], [, b]) => b.at.localeCompare(a.at));
  const shown = filter === 'all' ? students : students.filter(s => has(s, filter));
  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">
        {formatKstDateTime(data.generatedAt)} 기준 · 학생 {students.length}명 · 코치 {coaches.length}명
        {loading && <span className="ml-2 text-gray-400">최신 정보로 다시 계산하는 중…</span>}
      </p>
      <nav className="flex flex-wrap gap-2" aria-label="용건">
        <button type="button" onClick={() => setFilter('all')} aria-pressed={filter === 'all'} className={pill(filter === 'all')}>전체 {students.length}</button>
        {REASON_KINDS.map(k => (
          <button key={k} type="button" onClick={() => setFilter(k)} aria-pressed={filter === k} className={pill(filter === k)}>
            {FILTER_LABELS[k]} {students.filter(s => has(s, k)).length}
          </button>
        ))}
      </nav>
      <p className="text-xs text-gray-500">
        신규인데 코칭룸·스터디홀·보캡을 모두 안 잡은 학생이 맨 위, 그 다음은 용건이 많은 학생 순입니다.
      </p>
      <Section title="학생" count={shown.length}>
        {shown.map(s => (
          <ContactRow key={s.studentId} id={s.studentId} name={s.name} detail={`잔여 수업 ${formatHours(s.remainingHours)}`}
            badge={s.topPriority ? '최우선 · 신규 미예약' : undefined}
            chips={s.reasons.map(r => ({ key: r.kind, label: chipLabel(r) }))} purposes={[...s.reasons.map(r => r.kind), 'other']}
            contacts={contacts[s.studentId] ?? []} staffId={staffId} now={now}
            onContact={(listKey, note) => addContact(s.studentId, s.name, listKey, note)} onRemove={removeContact}
            onDismiss={() => dismiss(s.studentId, s.name)}>
            <WorkItemNotes items={workItems[s.studentId] ?? []} />
          </ContactRow>
        ))}
      </Section>
      <Section title="코칭룸 미예약 학생이 있는 코치" count={coaches.length}>
        {coaches.map(c => (
          <ContactRow key={c.targetId} id={c.targetId} name={c.name} detail={`미예약 학생 ${c.studentNames.length}명: ${c.studentNames.join(', ')}`}
            chips={[]} purposes={['coach']} contacts={contacts[c.targetId] ?? []} staffId={staffId} now={now}
            onContact={(listKey, note) => addContact(c.targetId, c.name, listKey, note)} onRemove={removeContact}
            onDismiss={() => dismiss(c.targetId, c.name)} />
        ))}
      </Section>
      {dismissedList.length > 0 && (
        <section className="space-y-1">
          <button type="button" aria-expanded={showDismissed} onClick={() => setShowDismissed(v => !v)} className="text-xs text-gray-500 underline">
            삭제한 대상 {dismissedList.length}
          </button>
          {showDismissed && (
            <ul className="rounded-lg border border-gray-200 bg-white">
              {dismissedList.map(([key, d]) => (
                <li key={key} className="flex items-center gap-2 border-b border-gray-100 px-3 py-2 text-xs text-gray-600 last:border-b-0">
                  <span>{`${d.name} · ${formatKstDateTime(d.at)} ${d.by} 삭제`}</span>
                  <button type="button" onClick={() => void restore(key)} className="ml-auto underline">복구</button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
