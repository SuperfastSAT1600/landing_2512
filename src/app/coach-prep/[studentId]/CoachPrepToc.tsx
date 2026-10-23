'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Lock } from 'lucide-react';
import type { TocItem } from './coach-prep-toc';

// 화면 위쪽에 붙는 목차. 스크롤 위치에 맞는 항목을 강조하고, 잠긴 항목은 필수 확인 영역으로 안내한다.
export function CoachPrepToc({ items }: { items: TocItem[] }) {
  const [active, setActive] = useState(items[0]?.id ?? '');

  useEffect(() => {
    const targets = items.filter((i) => !i.locked).flatMap((i) => document.getElementById(i.id) ?? []);
    if (targets.length === 0) return;
    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) visible.add(e.target.id);
          else visible.delete(e.target.id);
        }
        const first = items.find((i) => visible.has(i.id));
        if (first) setActive(first.id);
      },
      { rootMargin: '-96px 0px -60% 0px' },
    );
    targets.forEach((t) => observer.observe(t));
    return () => observer.disconnect();
  }, [items]);

  const go = (item: TocItem) => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.getElementById(item.locked ? 'confirm' : item.id)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  };

  return (
    <>
    {/* 고정 바가 차지하는 높이만큼 본문을 밀어 내린다 */}
    <div aria-hidden className="h-[84px]" />
    <nav aria-label="목차" className="fixed inset-x-0 top-0 z-30 border-b border-gray-200 bg-gray-50/95 backdrop-blur">
      <div className="mx-auto max-w-2xl px-4 pt-2 pb-2">
      <Image src="/logo-black.png" alt="SuperfastSAT" width={110} height={13} priority style={{ height: 'auto' }} className="mb-1.5" />
      <ul className="flex gap-1.5 overflow-x-auto [scrollbar-width:none]">
        {items.map((item) => (
          <li key={item.id} className="shrink-0">
            <button
              type="button"
              onClick={() => go(item)}
              aria-current={active === item.id ? 'location' : undefined}
              title={item.locked ? '필수 확인을 마치면 열립니다' : undefined}
              className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                item.locked
                  ? 'border-gray-200 bg-white text-gray-500'
                  : active === item.id
                    ? 'border-violet-600 bg-violet-600 text-white'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-violet-300'
              }`}
            >
              {item.locked && <Lock size={10} aria-hidden />}
              {item.label}
            </button>
          </li>
        ))}
      </ul>
      </div>
    </nav>
    </>
  );
}
