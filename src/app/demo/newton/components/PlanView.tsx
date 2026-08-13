'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { AdvisorPlan, AdvisorTask } from '@/lib/newton-advisor';
import { brand } from '../theme';
import { t } from '../i18n';

function NoteChips({ ids, onJump }: { ids: string[]; onJump: (id: string) => void }) {
  if (ids.length === 0) return null;
  // 근거는 3개까지만 노출한다 — 칩이 줄줄이 붙으면 카드가 다시 복잡해진다.
  const shown = ids.slice(0, 3);
  const rest = ids.length - shown.length;
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1">
      {shown.map(id => (
        <button
          key={id}
          onClick={() => onJump(id)}
          title={t.jumpToNote}
          className="rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 font-mono text-[11px] sm:text-[10px] text-gray-400 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600"
        >
          {id.replace('note-', '#')}
        </button>
      ))}
      {rest > 0 && <span className="text-[11px] sm:text-[10px] text-gray-300">+{rest}</span>}
    </div>
  );
}

/** 업무 카드 — 한 줄 지시 + 담당/기한. 판단 근거(why)는 눌러야 열린다. */
function TaskCard({
  task,
  index,
  onJump,
}: {
  task: AdvisorTask;
  index: number;
  onJump: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <li className="rounded-xl border border-gray-200 bg-white px-3.5 py-3">
      <div className="flex items-start gap-2.5">
        <span
          className="mt-[1px] flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full text-[11px] sm:text-[10px] font-bold text-white"
          style={{ background: brand.accent }}
        >
          {index + 1}
        </span>
        <p className="text-[13px] font-semibold leading-snug text-gray-900">{task.task}</p>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 pl-[28px] text-[12px] sm:text-[11px] text-gray-400">
        <span>{task.owner}</span>
        <span className="text-gray-200">·</span>
        <span>{task.due}</span>
      </div>

      <div className="pl-[28px]">
        {task.why && (
          <>
            <button
              onClick={() => setOpen(v => !v)}
              className="mt-2 inline-flex items-center gap-1 text-[12px] sm:text-[11px] font-semibold transition-colors"
              style={{ color: open ? brand.primary : brand.accent }}
            >
              {t.whyLabel}
              <ChevronDown size={11} className={open ? 'rotate-180' : ''} />
            </button>
            {open && (
              <p className="mt-1.5 rounded-lg bg-gray-50 px-2.5 py-2 text-[12px] leading-relaxed text-gray-600">
                {task.why}
              </p>
            )}
          </>
        )}
        <NoteChips ids={task.noteIds} onJump={onJump} />
      </div>
    </li>
  );
}

function Column({
  title,
  when,
  tasks,
  onJump,
}: {
  title: string;
  when: string;
  tasks: AdvisorTask[];
  onJump: (id: string) => void;
}) {
  return (
    <div className="min-w-0">
      <div className="mb-2.5 border-b pb-2" style={{ borderColor: '#e6e8ee' }}>
        <div className="flex items-baseline gap-2">
          <h4 className="text-[14px] font-bold" style={{ color: brand.primary }}>
            {title}
          </h4>
          <span className="text-[12px] sm:text-[11px] tabular-nums text-gray-300">{tasks.length}</span>
        </div>
        <p className="mt-0.5 text-[11.5px] sm:text-[10.5px] text-gray-400">{when}</p>
      </div>
      {tasks.length === 0 ? (
        <p className="py-4 text-center text-[12px] sm:text-[11px] text-gray-300">—</p>
      ) : (
        <ol className="space-y-2">
          {tasks.map((a, i) => (
            <TaskCard key={i} task={a} index={i} onJump={onJump} />
          ))}
        </ol>
      )}
    </div>
  );
}

/** 접혀 있는 한 줄 항목 — 제목만 보이고 눌러야 근거가 열린다. */
function FoldRow({
  title,
  detail,
  severity,
  ids,
  onJump,
}: {
  title: string;
  detail: string;
  severity: 'critical' | 'watch';
  ids: string[];
  onJump: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <li className="border-b border-gray-100 last:border-0">
      <button onClick={() => setOpen(v => !v)} className="flex w-full items-start gap-2.5 py-2.5 text-left">
        <span
          className={`mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full ${
            severity === 'critical' ? 'bg-rose-500' : 'bg-amber-400'
          }`}
        />
        <span className="flex-1 text-[12.5px] font-medium leading-snug text-gray-800">{title}</span>
        <ChevronDown size={13} className={`mt-0.5 shrink-0 text-gray-300 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="pb-3 pl-[18px]">
          <p className="text-[12px] leading-relaxed text-gray-600">{detail}</p>
          <NoteChips ids={ids} onJump={onJump} />
        </div>
      )}
    </li>
  );
}

export function PlanView({
  plan,
  onJumpToNote,
}: {
  plan: AdvisorPlan;
  onJumpToNote: (noteId: string) => void;
}) {
  return (
    <div className="space-y-7">
      {plan.summary && <p className="text-[14px] leading-relaxed text-gray-700">{plan.summary}</p>}

      {/* 업무 보드 — 이 화면의 본체 */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 sm:gap-4">
        <Column title={t.thisWeek} when={t.thisWeekWhen} tasks={plan.thisWeek} onJump={onJumpToNote} />
        <Column title={t.thisMonth} when={t.thisMonthWhen} tasks={plan.thisMonth} onJump={onJumpToNote} />
        <Column title={t.thisQuarter} when={t.thisQuarterWhen} tasks={plan.thisQuarter} onJump={onJumpToNote} />
      </div>

      {/* 부가 정보는 접어둔다 — 보드가 주인공이어야 한다. */}
      {plan.signals.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-2">
          <p className="pt-1.5 text-[12px] sm:text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            {t.signalsDetected}
          </p>
          <ul className="mt-1">
            {plan.signals.map((s, i) => (
              <FoldRow
                key={i}
                title={s.title}
                detail={s.detail}
                severity={s.severity}
                ids={s.noteIds}
                onJump={onJumpToNote}
              />
            ))}
          </ul>
        </div>
      )}

      {plan.risks.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-2">
          <p className="pt-1.5 text-[12px] sm:text-[11px] font-semibold uppercase tracking-wide text-gray-400">{t.risks}</p>
          <ul className="mt-1">
            {plan.risks.map((r, i) => (
              <FoldRow
                key={i}
                title={r.title}
                detail={r.firstMove ? `${r.detail} → ${r.firstMove}` : r.detail}
                severity="critical"
                ids={r.noteIds}
                onJump={onJumpToNote}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
