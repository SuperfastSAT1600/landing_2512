'use client';

import { useLayoutEffect, useState } from 'react';

interface Props {
  container: HTMLElement | null;
  targetId: string;
  title: string;
  body: string;
  stepLabel: string;
  missed: boolean;
}

interface Box { top: number; left: number; width: number; height: number; cw: number; ch: number }

const PAD = 6;
const BUBBLE_W = 240;

function measure(container: HTMLElement, targetId: string): Box | null {
  const el = container.querySelector<HTMLElement>(`[data-tutorial-id="${targetId}"]`);
  if (!el) return null;
  const c = container.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  return { top: r.top - c.top, left: r.left - c.left, width: r.width, height: r.height, cw: c.width, ch: c.height };
}

export default function Spotlight({ container, targetId, title, body, stepLabel, missed }: Props) {
  const [box, setBox] = useState<Box | null>(null);

  useLayoutEffect(() => {
    if (!container) return;
    const update = () => setBox(measure(container, targetId));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(container);
    window.addEventListener('resize', update);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [container, targetId]);

  if (!box) return null;

  const below = box.top + box.height / 2 < box.ch / 2;
  const left = Math.min(Math.max(8, box.left + box.width / 2 - BUBBLE_W / 2), box.cw - BUBBLE_W - 8);
  const bubbleStyle = below
    ? { top: box.top + box.height + PAD + 10, left }
    : { bottom: box.ch - box.top + PAD + 10, left };

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      <div
        className="absolute rounded-lg ring-2 ring-white animate-pulse"
        style={{
          top: box.top - PAD,
          left: box.left - PAD,
          width: box.width + PAD * 2,
          height: box.height + PAD * 2,
          boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.65)',
        }}
      />
      <div
        role="status"
        className="absolute rounded-xl bg-white p-3 text-gray-900 shadow-xl"
        style={{ width: BUBBLE_W, ...bubbleStyle }}
      >
        <p className="text-[11px] font-semibold text-[#071be9]">{stepLabel}</p>
        <p className="mt-0.5 text-sm font-bold">{title}</p>
        <p className="mt-1 text-xs leading-relaxed text-gray-600">{body}</p>
        {missed && <p className="mt-2 text-xs font-semibold text-red-600">반짝이는 곳을 눌러 주세요!</p>}
      </div>
    </div>
  );
}
