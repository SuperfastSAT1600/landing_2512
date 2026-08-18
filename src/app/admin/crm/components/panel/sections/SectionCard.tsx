'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface Props {
  title: string;
  count?: number;
  defaultOpen?: boolean;
  /** 값이 증가하면 섹션을 강제로 펼친다(외부 이벤트로 열기용). */
  openSignal?: number;
  actions?: React.ReactNode;
  bodyClassName?: string;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export function SectionCard({
  title, count, defaultOpen = true, openSignal, actions, bodyClassName = 'px-4 py-3', onOpenChange, children,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);

  // openSignal이 바뀌면(0 초기값 제외) 강제로 펼친다.
  // React 권장 패턴: prop 변화를 렌더 중 감지해 상태 조정(effect 없이).
  const [prevSignal, setPrevSignal] = useState(openSignal);
  if (openSignal !== prevSignal) {
    setPrevSignal(openSignal);
    if (openSignal) setOpen(true);
  }

  return (
    <div className="border-b border-gray-100">
      <div className="flex items-center justify-between px-4 py-3">
        <button
          onClick={() => { setOpen(v => { const next = !v; onOpenChange?.(next); return next; }); }}
          className="flex items-center gap-2 flex-1 min-w-0 text-left"
        >
          {open
            ? <ChevronDown size={13} className="text-gray-400 shrink-0" />
            : <ChevronRight size={13} className="text-gray-400 shrink-0" />}
          <span className="text-sm font-semibold text-gray-700">{title}</span>
          {count !== undefined && count > 0 && (
            <span className="text-[11px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full shrink-0">
              {count}
            </span>
          )}
        </button>
        {open && actions && (
          <div className="flex items-center gap-2 ml-2 shrink-0" onClick={e => e.stopPropagation()}>
            {actions}
          </div>
        )}
      </div>

      {open && (
        <div className={bodyClassName}>
          {children}
        </div>
      )}
    </div>
  );
}
