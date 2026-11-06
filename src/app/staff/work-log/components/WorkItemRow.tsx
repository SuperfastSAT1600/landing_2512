'use client';

import { useState } from 'react';
import type { WorkItem } from '@/lib/work-log';
import { StudentPicker } from './StudentPicker';

const stamp = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});

export function WorkItemRow({ item, onSetStudent }: { item: WorkItem; onSetStudent: (messageTs: string, studentId: string | null) => Promise<void> }) {
  const [picking, setPicking] = useState(false);

  async function pick(id: string) {
    setPicking(false);
    await onSetStudent(item.messageTs, id);
  }

  return (
    <li className="rounded border border-gray-200 bg-white p-3 sm:p-4">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
        <span className={item.done ? 'rounded bg-emerald-50 px-1.5 py-0.5 font-medium text-emerald-700' : 'rounded bg-amber-50 px-1.5 py-0.5 font-medium text-amber-700'}>
          {item.done ? '✅ 완료' : '진행 중'}
        </span>
        <span>{stamp.format(new Date(item.postedAt))}</span>
        <span>작성 {item.authorName}</span>
        {item.assignees.length > 0 && <span>담당 {item.assignees.join(', ')}</span>}
        {item.doneBy && <span>완료 {item.doneBy}</span>}
        <a href={item.permalink} target="_blank" rel="noreferrer" className="ml-auto underline">Slack에서 보기</a>
      </div>
      <p className="mt-2 whitespace-pre-wrap break-words text-sm">{item.text || '(첨부만 있는 글)'}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
        {item.replyCount > 0 && <span>답글 {item.replyCount}</span>}
        {item.fileCount > 0 && <span>첨부 {item.fileCount}</span>}
        {picking ? (
          <StudentPicker onPick={id => void pick(id)} onCancel={() => setPicking(false)} />
        ) : item.student ? (
          <>
            <span className="rounded bg-blue-50 px-1.5 py-0.5 font-medium text-blue-700">학생 {item.student.name}</span>
            <button type="button" onClick={() => setPicking(true)} className="underline">변경</button>
            <button type="button" onClick={() => void onSetStudent(item.messageTs, null)} className="underline">해제</button>
          </>
        ) : (
          <button type="button" onClick={() => setPicking(true)} className="underline">학생 선택</button>
        )}
      </div>
    </li>
  );
}
