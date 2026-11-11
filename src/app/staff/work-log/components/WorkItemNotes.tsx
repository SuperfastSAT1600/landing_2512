import type { WorkItem } from '@/lib/work-log';
import { formatKstDateTime } from '../../briefing/format';

/** 알바 연락 업무의 학생 줄에 붙는 운영 업무(학생이 지정된 Slack 글) */
export function WorkItemNotes({ items }: { items: WorkItem[] }) {
  if (!items.length) return null;
  return (
    <ul className="mt-1 space-y-1">
      {items.map(i => (
        <li key={i.messageTs} className="rounded bg-amber-50/70 px-2 py-1 text-xs">
          <div className="flex flex-wrap items-center gap-x-2 text-gray-500">
            <span>{`운영 업무 ${formatKstDateTime(i.postedAt)} ${i.authorName} · ${i.done ? '완료' : '진행 중'}${i.replyCount ? ` · 답글 ${i.replyCount}` : ''}`}</span>
            <a href={i.permalink} target="_blank" rel="noreferrer" className="ml-auto underline">Slack</a>
          </div>
          <p className="line-clamp-2 whitespace-pre-wrap break-words text-gray-700">{i.text}</p>
        </li>
      ))}
    </ul>
  );
}
