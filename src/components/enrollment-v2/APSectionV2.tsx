'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ManagedShowcase } from '@/components/enrollment/enrollment/ManagedShowcase';

/* ── 유틸 ─────────────────────────────────────────────────────────── */
function formatWon(n: number): string {
  if (n >= 10000) {
    const man = Math.floor(n / 10000);
    const rem = n % 10000;
    return rem > 0 ? `${man}만 ${rem.toLocaleString()}원` : `${man}만원`;
  }
  return `${n.toLocaleString()}원`;
}

const SECTION_HEADING_STYLE: React.CSSProperties = {
  fontSize: 'clamp(1.75rem, 5vw, 2.5rem)',
  fontWeight: 800,
  lineHeight: 1.2,
  letterSpacing: '-0.02em',
  wordBreak: 'keep-all',
};

/* ── 구간별 단가 ────────────────────────────────────────────────── */
const AP_BASE = 90000;

const TIERS = [
  { min: 1,  max: 16, rate: 90000, discount: 0,  label: '1–16시간' },
  { min: 17, max: 32, rate: 84600, discount: 6,  label: '17–32시간' },
  { min: 33, max: 48, rate: 79200, discount: 12, label: '33–48시간' },
  { min: 49, max: 60, rate: 74700, discount: 17, label: '49–60시간' },
];

function getTier(h: number) {
  return TIERS.find(t => h >= t.min && h <= t.max) ?? TIERS[0];
}

/* ── AP 과목 + 상태 데이터 ──────────────────────────────────────── */
type SubjectStatus = 'available' | 'waiting' | 'closed';

const STATUS_CONFIG: Record<SubjectStatus, { label: string; dot: string; text: string; border: string; bg: string }> = {
  available: {
    label: '수업이 가능합니다',
    dot:    'bg-emerald-400',
    text:   'text-emerald-400',
    border: 'border-emerald-500/30',
    bg:     'bg-emerald-500/[0.07]',
  },
  waiting: {
    label: '대기가 필요합니다',
    dot:    'bg-amber-400',
    text:   'text-amber-400',
    border: 'border-amber-500/30',
    bg:     'bg-amber-500/[0.07]',
  },
  closed: {
    label: '선생님의 요청으로 마감되었습니다',
    dot:    'bg-white/30',
    text:   'text-white/35',
    border: 'border-white/[0.08]',
    bg:     'bg-white/[0.02]',
  },
};

const AP_SUBJECTS: { name: string; status: SubjectStatus }[] = [
  /* ── 수업 가능 ── */
  { name: 'Biology',                              status: 'available' },
  { name: 'Calculus AB / BC',                     status: 'available' },
  { name: 'Chemistry',                            status: 'available' },
  { name: 'Computer Science A',                   status: 'available' },
  { name: 'English Language',                     status: 'available' },
  { name: 'Macro / Micro Economics',              status: 'available' },
  { name: 'Physics 1',                            status: 'available' },
  { name: 'Precalculus',                          status: 'available' },
  { name: 'Psychology',                           status: 'available' },
  { name: 'Statistics',                           status: 'available' },
  { name: 'Comparative Government and Politics',  status: 'available' },
  { name: 'US Government and Politics',           status: 'available' },
  { name: 'US History',                           status: 'available' },
  { name: 'World History',                        status: 'available' },
  /* ── 대기 ── */
  { name: 'English Literature',                   status: 'waiting' },
  { name: 'Environmental Science',                status: 'waiting' },
  { name: 'Computer Science Principles',          status: 'waiting' },
  { name: 'Human Geography',                      status: 'waiting' },
  { name: 'European History',                     status: 'waiting' },
  { name: 'Physics 2',                            status: 'waiting' },
  /* ── 요청 마감 ── */
  { name: 'Art History',                          status: 'closed' },
  { name: 'Chinese Language and Culture',         status: 'closed' },
  { name: 'French Language and Culture',          status: 'closed' },
  { name: 'Music Theory',                         status: 'closed' },
  { name: 'Physics C: Mechanics',                 status: 'closed' },
  { name: 'Physics C: Electricity & Magnetism',   status: 'closed' },
  { name: 'Spanish Language and Culture',         status: 'closed' },
  { name: 'Latin',                                status: 'closed' },
];

/* ── AP 후기 데이터 (가로 스크롤용) ────────────────────────────── */
const AP_REVIEWS = [
  {
    id: 'r1',
    author: 'eunji***',
    grade: '11학년',
    title: 'FRQ 점수가 올라간 건 서술 구조를 배운 덕분이에요',
    subject: 'AP Biology',
    content: 'Joseph 선생님이 Scoring Guidelines 기준으로 어떤 키워드가 들어가야 점수가 나오는지를 직접 보여줬는데, 그게 진짜 달랐습니다. 채점관이 어디서 체크하는지를 알고 나니 FRQ 접근 방식이 완전히 바뀌었어요.',
  },
  {
    id: 'r2',
    author: 'sungmin***',
    grade: '12학년',
    title: 'AP Bio, AP Chem 둘 다 5점 — 개념을 이해로 잡아주는 수업이었어요',
    subject: 'AP Biology · Chemistry',
    content: 'Eden 선생님이 NYU Pre-med 전공이라 과학 개념 설명이 진짜 깊어요. 항상 "이 개념 왜 나오는지"부터 설명해주셔서 암기가 아니라 이해로 공부하게 됐습니다. AP 두 과목 모두 5점.',
  },
  {
    id: 'r3',
    author: 'taehyun***',
    grade: '11학년',
    title: '약점을 데이터처럼 보여줘서 집중도가 달라졌어요',
    subject: 'AP Calculus BC',
    content: '문제 유형별로 약한 파트를 정리해서 보여줬는데, 내가 어디서 점수를 잃고 있는지 시각적으로 보이니까 집중도가 완전히 달라졌습니다. Integration by parts랑 series 파트를 한 달 만에 잡았어요.',
  },
  {
    id: 'r4',
    author: 'blaze_s5***',
    grade: '12학년',
    title: 'AP Calc BC 5점, 코치님 수업 방식 아니었으면 못 받았을 거예요',
    subject: 'AP Calculus BC',
    content: '개념 → 유형 분류 → 실전 적용 순서로 단계별로 쌓아주셨어요. Free Response 답안을 AP Exam 채점 기준에 맞게 표현하는 법을 집중 훈련했는데, 아는 것과 점수로 연결되는 게 다르다는 걸 처음 알았어요.',
  },
  {
    id: 'r5',
    author: 'forest_c5***',
    grade: '11학년',
    title: 'AP CS A, 코드 왜 이렇게 짜는지를 처음으로 이해했어요',
    subject: 'AP Computer Science A',
    content: 'Tony 선생님은 객체지향 개념을 처음부터 "왜 이렇게 설계하는지"로 설명해주셔서 완전히 달랐어요. 서울대 컴공 재학 중이라 설명이 군더더기 없이 정확하고, 막히는 지점을 수업 중에 바로 짚어주셨어요. 모의고사 5점.',
  },
  {
    id: 'r6',
    author: 'atlas_w2***',
    grade: '11학년',
    title: 'FRQ에서 논리를 쌓는 법을 처음 배웠어요',
    subject: 'AP Government',
    content: '김 코치님이 "지금 네가 쓴 게 주장이야, 근거야?"를 계속 물어보셨어요. 주장과 근거를 구분해서 논리적으로 구성하는 연습을 반복하면서, FRQ가 지식 나열이 아니라 논리 구조라는 게 이해됐어요.',
  },
  {
    id: 'r7',
    author: 'vale_l8***',
    grade: '11학년',
    title: '역사 공부가 암기에서 논리로 바뀌었어요',
    subject: 'AP World History',
    content: '코치님이 "이 사건이 왜 일어났고, 그 결과가 왜 그렇게 됐는지 설명해봐"라고 계속 물어보시면서 흐름으로 이해하는 연습을 시키셨어요. 외운 게 아니라 이해한 내용은 FRQ에서 자연스럽게 연결해서 쓸 수 있었어요.',
  },
  {
    id: 'r8',
    author: 'gleams6***',
    grade: '11학년',
    title: 'AP Economics 5점, 개념이 연결되는 방식으로 가르쳐주셔서 달랐어요',
    subject: 'AP Macro / Micro Economics',
    content: 'AP Micro랑 Macro를 같이 준비했는데 두 과목을 연결해서 설명해주시는 방식이 정말 좋았어요. 헷갈리는 그래프 문제도 패턴별로 정리해주셔서 반복하다 보니 자연스럽게 익혀졌어요.',
  },
  {
    id: 'r9',
    author: 'drift_y2***',
    grade: '11학년',
    title: '물리 개념을 "말로 설명"하는 연습이 점수를 올렸어요',
    subject: 'AP Physics',
    content: '"왜 이 공식이 성립하는지 설명해봐"를 매번 물어보셨어요. 개념을 설명할 수 있을 정도로 이해하면 Free Response에서 reasoning 서술이 훨씬 자연스러워졌어요.',
  },
  {
    id: 'r10',
    author: 'keenh5***',
    grade: '11학년',
    title: 'SAT랑 AP를 동시에 준비했는데 효율이 너무 좋았어요',
    subject: 'AP Chemistry',
    content: '이준희 선생님이 두 과목을 연결해서 설명해주시는 방식이 진짜 효율적이었어요. AP Chemistry, Calculus BC, Statistics 전부 5점 받으신 분이라 AP 연계 설명의 깊이가 달랐어요.',
  },
];

/* ════════════════════════════════════════════════════════════════════
   AP 과목 검색 섹션
   ════════════════════════════════════════════════════════════════════ */
function APSubjectSection() {
  const [query, setQuery] = useState('');

  const filtered = query.trim()
    ? AP_SUBJECTS.filter(s => s.name.toLowerCase().includes(query.toLowerCase()))
    : [];

  return (
    <section id="v2-ap-subject" className="py-10 border-t border-white/[0.06]">
      <div className="max-w-xl mx-auto px-4">
        <div className="text-center mb-8">
          <h2 style={SECTION_HEADING_STYLE} className="text-white">
            수업이 필요한<br />과목을 검색하세요.
          </h2>
        </div>

        {/* 검색 입력 */}
        <div className="relative mb-6">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-base pointer-events-none">
            🔍
          </span>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="과목명을 입력하세요 (예: Biology)"
            className="w-full rounded-2xl border border-white/30 bg-white/[0.08] pl-10 pr-4 py-3.5 text-sm text-white placeholder:text-white/45 outline-none focus:border-white/50 transition-colors"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 text-lg leading-none"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* AP 수업 후기 자동 스크롤 */}
      <style>{`
        @keyframes ap-marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        .ap-marquee-track {
          display: flex;
          gap: 0.75rem;
          width: max-content;
          animation: ap-marquee 42s linear infinite;
          will-change: transform;
        }
        .ap-marquee-track:hover {
          animation-play-state: paused;
        }
      `}</style>
      <div className="overflow-hidden mb-6 py-2">
          <div className="ap-marquee-track">
            {[...AP_REVIEWS, ...AP_REVIEWS].map((review, i) => (
              <div
                key={`${review.id}-${i}`}
                className="flex-shrink-0 w-64 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 flex flex-col gap-2"
              >
                <span className="text-[10px] font-semibold text-[#6085ff]/80 tracking-wide">{review.subject}</span>
                <p className="text-[13px] font-bold text-white leading-snug line-clamp-2">{review.title}</p>
                <p className="text-[11px] text-white/45 leading-relaxed line-clamp-4 flex-1">{review.content}</p>
                <div className="flex items-center gap-1.5 pt-1 border-t border-white/[0.06]">
                  <span className="text-[10px] text-white/30">{review.author}</span>
                  <span className="text-white/15">·</span>
                  <span className="text-[10px] text-white/30">{review.grade}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      {/* 과목 리스트 — 검색 시 표시 */}
      <div className="max-w-xl mx-auto px-4">
        <div className="flex flex-col gap-2 max-h-[420px] overflow-y-auto pr-1">
          <AnimatePresence initial={false}>
            {filtered.map((subject, i) => {
              const cfg = STATUS_CONFIG[subject.status];
              return (
                <motion.div
                  key={subject.name}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.18, delay: i * 0.03 }}
                  className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 ${cfg.border} ${cfg.bg}`}
                >
                  <span className="text-sm font-medium text-white/85 leading-tight">{subject.name}</span>
                  <span className={`flex items-center gap-1.5 text-[11px] font-semibold flex-shrink-0 ${cfg.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
                    {cfg.label}
                  </span>
                </motion.div>
              );
            })}
            {query.trim() && filtered.length === 0 && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm text-white/30 text-center py-8"
              >
                검색 결과가 없습니다
              </motion.p>
            )}
          </AnimatePresence>
        </div>

      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════
   AP HOUR PICKER
   ════════════════════════════════════════════════════════════════════ */
function APHourPicker() {
  const [hours, setHours] = useState(16);

  const tier = getTier(hours);
  const total = hours * tier.rate;
  const savedVsBase = (AP_BASE - tier.rate) * hours;

  function clamp(v: number) {
    return Math.min(60, Math.max(1, v));
  }

  return (
    <section className="px-4 py-10 border-t border-white/[0.06]">
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-8">
          <h2 style={SECTION_HEADING_STYLE} className="text-white">
            필요한 시간만큼<br />수업 신청도 가능합니다
          </h2>
        </div>

        {/* 시간 스테퍼 */}
        <div className="flex items-center justify-center gap-5 mb-6">
          <button
            type="button"
            onClick={() => setHours(h => clamp(h - 1))}
            className="w-11 h-11 rounded-full border border-white/15 bg-white/[0.05] text-white text-xl font-light flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all touch-manipulation"
          >
            −
          </button>
          <div className="text-center min-w-[80px]">
            <span className="text-5xl font-black text-white leading-none">{hours}</span>
            <span className="text-base text-white/50 ml-1.5">시간</span>
          </div>
          <button
            type="button"
            onClick={() => setHours(h => clamp(h + 1))}
            className="w-11 h-11 rounded-full border border-white/15 bg-white/[0.05] text-white text-xl font-light flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all touch-manipulation"
          >
            +
          </button>
        </div>

        {/* 슬라이더 */}
        <input
          type="range"
          min={1}
          max={60}
          value={hours}
          onChange={e => setHours(Number(e.target.value))}
          className="w-full mb-8 accent-red-500"
          style={{ height: '4px' }}
        />

        {/* 가격 표시 */}
        <AnimatePresence mode="wait">
          <motion.div
            key={tier.min}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
            className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 text-center"
          >
            {tier.discount > 0 ? (
              <>
                {/* 할인율 — 좌→우 빨간 그라데이션 슬라이드 */}
                <div className="mb-4 relative overflow-hidden rounded-2xl">
                  {/* 좌→우 빨간 그라데이션 배경 */}
                  <motion.div
                    key={`sweep-${tier.discount}`}
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: 'linear-gradient(90deg, rgba(239,68,68,0.22) 0%, rgba(239,68,68,0.10) 55%, transparent 100%)',
                    }}
                    initial={{ clipPath: 'inset(0 100% 0 0)' }}
                    animate={{ clipPath: 'inset(0 0% 0 0)' }}
                    transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
                  />
                  {/* 텍스트 콘텐츠 */}
                  <motion.div
                    key={`content-${tier.discount}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.18, duration: 0.3 }}
                    className="relative z-10 py-3"
                  >
                    <span className="inline-flex items-baseline gap-1 drop-shadow-[0_0_16px_rgba(239,68,68,0.45)]">
                      <span className="text-6xl font-black text-red-500 leading-none">{tier.discount}</span>
                      <span className="text-3xl font-black text-red-500">%</span>
                      <span className="text-xl font-bold text-red-400/80 ml-1">할인</span>
                    </span>
                    <p className="text-[11px] text-red-400/60 mt-1.5">
                      기본가보다 {formatWon(savedVsBase)} 저렴합니다
                    </p>
                  </motion.div>
                </div>

                <div className="border-t border-white/[0.06] pt-4">
                  <p className="text-xs text-white/40 mb-1">총 수업료</p>
                  <motion.p
                    key={total}
                    initial={{ scale: 0.92, opacity: 0.5 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.22, ease: [0.34, 1.56, 0.64, 1] }}
                    className="text-2xl font-black text-white tracking-tight"
                  >
                    {formatWon(total)}
                  </motion.p>
                </div>
              </>
            ) : (
              <div>
                <p className="text-xs text-white/40 mb-1">총 수업료</p>
                <motion.p
                  key={total}
                  initial={{ scale: 0.94, opacity: 0.5 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.2, ease: [0.34, 1.56, 0.64, 1] }}
                  className="text-2xl font-black text-white tracking-tight"
                >
                  {formatWon(total)}
                </motion.p>
                <p className="text-[11px] text-white/25 mt-2">17시간부터 할인 적용</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}

/* ── 인기 패키지 데이터 ─────────────────────────────────────────── */
const AP_PKGS = [
  { id: 'ap-16h', hours: 16, totalPrice: 16 * 90000, discountRate: null as null | number },
  { id: 'ap-32h', hours: 32, totalPrice: 32 * 84600, discountRate: 6 },
  { id: 'ap-48h', hours: 48, totalPrice: 48 * 79200, discountRate: 12 },
];

/* ════════════════════════════════════════════════════════════════════
   AP PRICING SECTION (인기 패키지)
   ════════════════════════════════════════════════════════════════════ */
function APPricingSection() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <section id="v2-pricing" className="px-4 py-10 border-t border-white/[0.06]">
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-8">
          <h2 style={SECTION_HEADING_STYLE} className="text-white">
            아래 세 가지 시간을<br />가장 많이 선택합니다.
          </h2>
        </div>

        <div className="flex flex-col gap-3">
          {AP_PKGS.map((pkg) => {
            const isSelected = selectedId === pkg.id;
            const savings = pkg.discountRate
              ? AP_BASE * pkg.hours - pkg.totalPrice
              : 0;

            return (
              <button
                key={pkg.id}
                type="button"
                onClick={() => setSelectedId(pkg.id)}
                className={`relative overflow-hidden w-full text-left rounded-2xl border p-5 transition-colors touch-manipulation active:scale-[0.98]
                  ${isSelected
                    ? 'border-[#6085ff]/60'
                    : 'border-white/[0.08] bg-white/[0.03] hover:border-white/15'
                  }`}
              >
                <AnimatePresence>
                  {isSelected && (
                    <motion.div
                      key="fill"
                      className="absolute inset-0"
                      style={{ background: 'linear-gradient(105deg, rgba(7,27,233,0.5) 0%, rgba(96,133,255,0.22) 100%)' }}
                      initial={{ clipPath: 'inset(0 100% 0 0 round 1rem)' }}
                      animate={{ clipPath: 'inset(0 0% 0 0 round 1rem)' }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] }}
                    />
                  )}
                </AnimatePresence>

                <div className="relative z-10 flex items-center justify-between gap-4">
                  <div className="flex items-baseline gap-1.5 flex-shrink-0">
                    <span className="text-3xl font-black text-white leading-none">{pkg.hours}</span>
                    <span className="text-sm text-white/55 font-medium">시간</span>
                  </div>

                  <div className="flex-1 text-right">
                    {!isSelected && (
                      <p className="text-[11px] text-white/40 leading-relaxed">
                        진행되지 않은 수업 시간은<br />전부 환불됩니다.
                      </p>
                    )}

                    {isSelected && pkg.discountRate && (
                      <div className="space-y-1.5">
                        <motion.p
                          initial={{ opacity: 0, x: 12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.45, duration: 0.25, ease: 'easeOut' }}
                          className="text-[11px] font-light text-red-500 leading-relaxed"
                        >
                          ({pkg.discountRate}% 할인) 16시간보다 {formatWon(savings)} 더 저렴합니다.
                        </motion.p>
                        <motion.p
                          initial={{ opacity: 0, y: 6, scale: 0.94 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ delay: 0.82, duration: 0.28, ease: [0.34, 1.56, 0.64, 1] }}
                          className="text-base font-light text-white tracking-tight"
                        >
                          {formatWon(pkg.totalPrice)}
                        </motion.p>
                      </div>
                    )}

                    {isSelected && !pkg.discountRate && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4, duration: 0.25 }}
                        className="text-base font-light text-white tracking-tight"
                      >
                        {formatWon(pkg.totalPrice)}
                      </motion.p>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* CTA */}
        <div className="mt-8 text-center">
          <p className="text-xs text-white/35 mb-4 leading-relaxed">
            과목 선택과 맞춤 커리큘럼 상담을 받으실 수 있습니다
          </p>
          <a
            href="https://open.kakao.com/o/sxHGVZ4h"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center w-full rounded-2xl border border-white/[0.12] bg-white/[0.04] hover:bg-white/[0.07] active:scale-[0.98] transition-all touch-manipulation px-6 py-4 text-base font-bold text-white tracking-tight"
          >
            원장님과 직접 상담하고 로드맵 만드세요
          </a>
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════
   MAIN EXPORT
   ════════════════════════════════════════════════════════════════════ */
export function APSectionV2() {
  return (
    <>
      <APSubjectSection />
      <ManagedShowcase excludeTabs={['단어 공부', '실전 모의고사']} mobileColumns={2} />
      <APPricingSection />
      <APHourPicker />
    </>
  );
}
