'use client';

import type { ContactTask, ContactTaskGroup } from '@/lib/contact-tasks';
import { kstDate } from '@/lib/kst-date';
import { formatHours, formatKstDateTime, formatKstMonthDay } from '../../briefing/format';
import { StudentRow } from '../../briefing/components/StudentRow';
import type { ContactLog, ContactsByStudent } from '../../briefing/types';
import type { WorkItem } from '@/lib/work-log';
import { useContactTasks } from '../useContactTasks';
import { WorkItemNotes } from './WorkItemNotes';

function taskDetail(t: ContactTask): string {
  if (t.studentNames) return `미예약 학생 ${t.studentNames.length}명: ${t.studentNames.join(', ')}`;
  return [
    t.coachNames && `코치 ${t.coachNames.join(', ')}`,
    t.lastDate && `마지막 일정 ${formatKstMonthDay(t.lastDate)}`,
    t.remainingHours !== undefined && `잔여 수업 ${formatHours(t.remainingHours)}`,
  ].filter(Boolean).join(' · ');
}

interface GroupProps {
  group: ContactTaskGroup;
  contacts: ContactsByStudent;
  workItems: Record<string, WorkItem[]>;
  staffId: string;
  now: Date;
  onContact: (task: ContactTask, note?: string) => Promise<void>;
  onRemove: (log: ContactLog) => Promise<void>;
}

function Group({ group, contacts, workItems, staffId, now, onContact, onRemove }: GroupProps) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white">
      <h2 className="border-b border-gray-200 px-3 py-2 text-sm font-bold">
        {group.title} <span className="text-gray-400">{group.tasks.length}{group.target === '코치' ? '명(코치)' : '명'}</span>
      </h2>
      {group.tasks.length === 0 ? <p className="px-3 py-3 text-xs text-gray-400">연락할 대상이 없습니다.</p> : (
        <ul>
          {group.tasks.map(t => (
            <StudentRow key={t.targetId} studentId={t.targetId} name={t.name} detail={taskDetail(t)} isNew={t.isNew}
              contacts={contacts[t.targetId] ?? []} briefingDate={kstDate(now)} now={now} staffId={staffId} noteRequired
              onContact={note => onContact(t, note)} onRemove={onRemove}>
              <WorkItemNotes items={workItems[t.targetId] ?? []} />
            </StudentRow>
          ))}
        </ul>
      )}
    </section>
  );
}

/** 알바생이 해야 할 연락 업무와 연락 결과 기록. refreshKey 가 바뀔 때마다 tutoring 데이터로 다시 계산한다 */
export function ContactTasks({ refreshKey, staffId }: { refreshKey: number; staffId: string }) {
  const { data, contacts, workItems, error, loading, addContact, removeContact } = useContactTasks(refreshKey);

  if (error && !loading) return <p role="alert" className="text-sm text-red-600">{error}</p>;
  if (!data) return <p className="text-xs text-gray-400">최신 스케줄을 계산하는 중…</p>;

  const now = new Date();
  const total = data.groups.reduce((n, g) => n + g.tasks.length, 0);
  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">
        {formatKstDateTime(data.generatedAt)} 기준 · 연락 대상 {total}건
        {loading && <span className="ml-2 text-gray-400">최신 정보로 다시 계산하는 중…</span>}
      </p>
      {data.groups.map(g => (
        <Group key={g.kind} group={g} contacts={contacts} workItems={workItems} staffId={staffId} now={now}
          onContact={(task, note) => addContact(task, g.kind, note)} onRemove={removeContact} />
      ))}
    </div>
  );
}
