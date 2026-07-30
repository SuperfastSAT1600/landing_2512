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

/* ════════════════════════════════════════════════════════════════════
   AP 과목 검색 섹션
   ════════════════════════════════════════════════════════════════════ */
function APSubjectSection() {
  const [query, setQuery] = useState('');

  const filtered = query.trim()
    ? AP_SUBJECTS.filter(s => s.name.toLowerCase().includes(query.toLowerCase()))
    : AP_SUBJECTS;

  return (
    <section className="px-4 py-10 border-t border-white/[0.06]">
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-8">
          <h2 style={SECTION_HEADING_STYLE} className="text-white">
            수업이 필요한<br />과목을 검색하세요.
          </h2>
        </div>

        {/* 검색 입력 */}
        <div className="relative mb-4">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-base pointer-events-none">
            🔍
          </span>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="과목명을 입력하세요 (예: Biology)"
            className="w-full rounded-2xl border border-white/[0.10] bg-white/[0.04] pl-10 pr-4 py-3.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-white/25 transition-colors"
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

        {/* 과목 리스트 */}
        <div className="flex flex-col gap-2 max-h-[420px] overflow-y-auto pr-1">
          <AnimatePresence initial={false}>
            {filtered.length > 0 ? filtered.map((subject, i) => {
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
            }) : (
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

        {/* 상태 범례 */}
        <div className="flex flex-wrap gap-3 justify-center mt-5">
          {(Object.entries(STATUS_CONFIG) as [SubjectStatus, typeof STATUS_CONFIG[SubjectStatus]][]).map(([, cfg]) => (
            <span key={cfg.label} className={`flex items-center gap-1.5 text-[10px] font-medium ${cfg.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
              {cfg.label}
            </span>
          ))}
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
            필요한 시간만큼<br />수업을 신청하세요
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
      <APHourPicker />
      <APPricingSection />
    </>
  );
}
