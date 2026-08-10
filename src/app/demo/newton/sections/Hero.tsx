'use client';

import { brand } from '../theme';

// 히어로의 목차 — theme.ts의 섹션 목록에서 내러티브 두 개(소개·팀)를 뺀 본문 흐름.
const CONTENTS = [
  { id: 'console', label: '통합 구조' },
  { id: 'record', label: '학생 기록' },
  { id: 'applications', label: '대학 원서' },
  { id: 'advisor', label: 'AI 업무 목록' },
  { id: 'roadmap', label: '개발 로드맵' },
];

export function Hero() {
  return (
    <header className="px-6 pb-20 pt-24 sm:px-10 sm:pb-28 sm:pt-32">
      <div className="mx-auto w-full max-w-6xl">
        <p className="font-serif text-[13px] tracking-[0.22em] text-gray-400">ARGONAUT AI</p>

        <div className="mt-12 flex flex-col gap-8 sm:flex-row sm:items-center sm:gap-12">
          <p className="font-serif text-[44px] leading-none tracking-tight sm:text-[64px]" style={{ color: '#0d1330' }}>
            EDUMO
          </p>
          <div className="hidden w-px self-stretch sm:block" style={{ background: brand.primary }} />
          <h1
            className="text-[26px] font-bold leading-tight tracking-tight sm:text-[40px]"
            style={{ color: brand.primary }}
          >
            학습관리의 모든것
            <br />
            Edumo와 쉽고 확실하게
          </h1>
        </div>

        <div className="mt-16 max-w-2xl border-l-2 pl-5" style={{ borderColor: brand.card }}>
          <p className="text-[15px] leading-relaxed text-gray-600 sm:text-base">
            뉴튼아카데미 아이린 대표님께 드리는 제안입니다.
            <br />
            지난 미팅에서 말씀해주신 내용을 그대로 반영해, 회사 소개와 개발 로드맵을
            <br className="hidden sm:block" />
            실제 동작하는 화면으로 정리했습니다.
          </p>
          <p className="mt-6 text-[13px] text-gray-400">
            아래로 스크롤하시면 순서대로 보실 수 있습니다 · 약 5분
          </p>
        </div>

        {/* 긴 문서라 앞에서 목차를 한 줄 준다 — 대표님이 원하는 곳으로 바로 갈 수 있게. */}
        <div className="mt-10 flex flex-wrap gap-x-2 gap-y-2">
          {CONTENTS.map(c => (
            <a
              key={c.id}
              href={`#${c.id}`}
              className="rounded-full border px-3.5 py-2.5 text-[13px] transition-colors hover:border-gray-400 sm:py-1.5 sm:text-[12.5px]"
              style={{ borderColor: '#dfe2ec', color: '#6b7180' }}
            >
              {c.label}
            </a>
          ))}
        </div>
      </div>
    </header>
  );
}
