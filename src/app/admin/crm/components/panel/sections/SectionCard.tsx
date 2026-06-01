'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface Props {
  title: string;
  count?: number;
  defaultOpen?: boolean;
  actions?: React.ReactNode;
  bodyClassName?: string;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export function SectionCard({
  title, count, defaultOpen = true, actions, bodyClassName = 'px-4 py-3', onOpenChange, children,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
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
        <div className={`border-t border-gray-100 ${bodyClassName}`}>
          {children}
        </div>
      )}
    </div>
  );
}
