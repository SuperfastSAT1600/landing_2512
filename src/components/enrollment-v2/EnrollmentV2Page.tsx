'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';
import { ManagedShowcase, UnmanagedShowcase } from '@/components/enrollment/enrollment/ManagedShowcase';
import { APSectionV2 } from './APSectionV2';
import { ManagementFitSection } from '@/components/enrollment/enrollment/ManagementFitSection';
import { EnrollmentVideoHero } from './EnrollmentVideoHero';
import {
  ONE_ON_ONE_PACKAGES_V2,
  GROUP_PACKAGES_V2,
  UNMANAGED_PACKAGES_V2,
  CONTENT_ITEMS_V2,
} from '@/lib/enrollment/data/pricing-v2';
import type { CategoryIdV2, OptionSelectionV2 } from '@/types/enrollment-v2';

/* ── 타입 ─────────────────────────────────────────────────────────── */
type ManagementType = 'managed' | 'unmanaged';

/* ── 유틸 ─────────────────────────────────────────────────────────── */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function formatWon(n: number) {
  if (n >= 10000) {
    const man = Math.floor(n / 10000);
    const rem = n % 10000;
    return rem > 0 ? `${man}만 ${rem.toLocaleString()}원` : `${man}만원`;
  }
  return `${n.toLocaleString()}원`;
}

function getTotalPrice(categoryId: CategoryIdV2, option: OptionSelectionV2): number {
  if (option.type === 'hour-package') {
    const pkgs = categoryId === 'unmanaged' ? UNMANAGED_PACKAGES_V2 : ONE_ON_ONE_PACKAGES_V2;
    return pkgs.find(p => p.id === option.packageId)?.totalPrice ?? 0;
  }
  if (option.type === 'group-package') {
    return 0; // 그룹 특강 가격은 문의로 안내
  }
  if (option.type === 'content') {
    return option.contentIds.reduce((s, id) => s + (CONTENT_ITEMS_V2.find(c => c.id === id)?.monthlyPrice ?? 0), 0);
  }
  return 0;
}


/* ════════════════════════════════════════════════════════════════════
   3-STEP ENROLLMENT NAV
   ════════════════════════════════════════════════════════════════════ */
const STEPS = [
  { id: 'exam',      label: '과목 선택', anchor: 'v2-exam' },
  { id: 'selection', label: '수업 선택', anchor: 'v2-selection' },
  { id: 'pricing',   label: '수업료',   anchor: 'v2-pricing' },
];

function EnrollmentStepNav({ navVisible, scrollOffsetRef }: {
  navVisible: boolean;
  scrollOffsetRef: React.RefObject<number>;
}) {
  const [active, setActive] = useState('exam');

  useEffect(() => {
    const observers = STEPS.map(step => {
      const el = document.getElementById(step.anchor);
      if (!el) return null;
      const obs = new IntersectionObserver(
        ([e]) => { if (e.isIntersecting) setActive(step.id); },
        { rootMargin: '-20% 0px -65% 0px' }
      );
      obs.observe(el);
      return obs;
    });
    return () => observers.forEach(o => o?.disconnect());
  }, []);

  function scrollToAnchor(anchor: string) {
    const el = document.getElementById(anchor);
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - scrollOffsetRef.current;
    window.scrollTo({ top: y, behavior: 'smooth' });
  }

  return (
    <div className="fixed left-0 right-0 z-40 border-b border-white/10"
      style={{
        top: 0,
        background: 'rgba(0,0,0,0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        opacity: navVisible ? 1 : 0,
        transform: navVisible ? 'translateY(0)' : 'translateY(-100%)',
        pointerEvents: navVisible ? 'auto' : 'none',
        transition: 'opacity 0.3s ease, transform 0.3s ease',
      }}>
      <div className="flex">
        {STEPS.map((step, i) => (
          <button
            key={step.id}
            onClick={() => scrollToAnchor(step.anchor)}
            className="relative flex flex-col items-center justify-center flex-1 py-4 gap-1.5 touch-manipulation transition-colors"
            style={{ color: active === step.id ? '#fff' : 'rgba(255,255,255,0.35)' }}
          >
            {/* 숫자 배지 */}
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-black flex-shrink-0 transition-all duration-200
              ${active === step.id
                ? 'bg-white text-black scale-110'
                : 'bg-white/10 text-white/35'}`}>
              {i + 1}
            </span>
            {/* 레이블 */}
            <span className={`text-[13px] font-bold tracking-wide transition-all duration-200
              ${active === step.id ? 'opacity-100' : 'opacity-40'}`}>
              {step.label}
            </span>
            {/* 활성 인디케이터 */}
            {active === step.id && (
              <span className="absolute bottom-0 left-6 right-6 h-[2.5px] rounded-full bg-white" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   STEP HEADER
   ════════════════════════════════════════════════════════════════════ */
function StepHeader({ step, title }: { step: number; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <span className="w-7 h-7 rounded-full bg-[#6085ff]/20 border border-[#6085ff]/40
        flex items-center justify-center text-xs font-bold text-[#6085ff] flex-shrink-0">
        {step}
      </span>
      <h2 className="text-base font-bold text-white">{title}</h2>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   SELECTION CARD (공용)
   ════════════════════════════════════════════════════════════════════ */
function SelectCard({
  selected, onClick, children,
}: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-2xl border p-4 transition-all touch-manipulation active:scale-[0.98]
        ${selected
          ? 'border-[#6085ff]/60 bg-[#071be9]/[0.07] shadow-[0_0_40px_rgba(96,133,255,0.12),0_0_0_1px_rgba(96,133,255,0.2)]'
          : 'border-white/[0.08] bg-white/[0.03] hover:border-white/15'
        }`}
    >
      {children}
    </button>
  );
}

/* ════════════════════════════════════════════════════════════════════
   STEP 2: 수업 형태
   ════════════════════════════════════════════════════════════════════ */
type FormatOption = { id: CategoryIdV2; emoji: string; name: string; desc: string };

const MANAGED_FORMAT_OPTIONS: FormatOption[] = [
  { id: 'one-on-one', emoji: '🧑‍💻', name: '1:1 정규수업', desc: '전담 코치와 1:1 맞춤 수업' },
  { id: 'group',      emoji: '👥', name: '1:4 특강수업', desc: '소그룹 집중 특강' },
];

const UNMANAGED_FORMAT_OPTIONS: FormatOption[] = [
  { id: 'unmanaged', emoji: '🧑‍💻', name: '1:1 정규수업', desc: '코치와 1:1 수업\n자기주도 방식' },
  { id: 'content',   emoji: '📱', name: '콘텐츠 학습',  desc: '단어·인강·문제풀이\n월간 구독 콘텐츠' },
];

function GroupIcon({ active }: { active: boolean }) {
  return (
    <div aria-hidden="true" className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors
      ${active ? 'bg-[#071be9]/10' : 'bg-white/[0.06]'}`}>
      <div className="grid grid-cols-2 gap-[3px]">
        {[...Array(4)].map((_, i) => (
          <span key={i} className="text-[11px] leading-none">👤</span>
        ))}
      </div>
    </div>
  );
}

function ClassFormatPicker({
  value, onChange, options,
}: { value: CategoryIdV2 | null; onChange: (v: CategoryIdV2) => void; options: FormatOption[] }) {
  return (
    <section className="px-4 py-10 border-t border-white/[0.06] min-h-svh flex flex-col justify-center md:min-h-0 md:block">
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-8">
          <h2 style={{ fontSize: 'clamp(1.75rem, 5vw, 2.5rem)', fontWeight: 800, lineHeight: 1.2, letterSpacing: '-0.02em', wordBreak: 'keep-all' }} className="text-white">
            필요한 SAT 수업을<br />선택하세요
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {options.map(opt => (
            <SelectCard key={opt.id} selected={value === opt.id} onClick={() => onChange(opt.id)}>
              <div className="flex flex-col items-center gap-3 py-2 text-center">
                {opt.id === 'group' ? (
                  <GroupIcon active={value === opt.id} />
                ) : (
                  <div aria-hidden="true" className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors text-2xl
                    ${value === opt.id ? 'bg-[#071be9]/10' : 'bg-white/[0.06]'}`}>
                    {opt.emoji}
                  </div>
                )}
                <div>
                  <p className="text-white mb-1" style={{ fontSize: '1.1rem', fontWeight: 800, letterSpacing: '-0.02em' }}>{opt.name}</p>
                  <p className="text-[13px] text-white/45 whitespace-pre-line leading-relaxed">{opt.desc}</p>
                </div>
              </div>
            </SelectCard>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════
   STEP 3: 관리형 1:1 패키지 선택 (전용 UI)
   ════════════════════════════════════════════════════════════════════ */
const BASE_PRICE_PER_HOUR = 165000;

const MANAGED_PKGS = [
  { id: '1on1-10h',  hours: 10, totalPrice: 1650000, pricePerHour: 165000, discountRate: null as null | number },
  { id: '1on1-20h',  hours: 20, totalPrice: 2990000, pricePerHour: 149500, discountRate: 9  },
  { id: '1on1-40h',  hours: 40, totalPrice: 5390000, pricePerHour: 134750, discountRate: 18 },
];

const SECTION_HEADING_STYLE: React.CSSProperties = {
  fontSize: 'clamp(1.75rem, 5vw, 2.5rem)',
  fontWeight: 800,
  lineHeight: 1.2,
  letterSpacing: '-0.02em',
  wordBreak: 'keep-all',
};

interface HeadCoach {
  slug: string;
  name: string;
  photo: string;
  bio: string;
  subjects: string[];
}


function ManagedPackagePicker({ selectedOption, onSelect }: {
  selectedOption: OptionSelectionV2 | null;
  onSelect: (o: OptionSelectionV2) => void;
}) {
  const [coaches, setCoaches] = useState<HeadCoach[]>([]);
  const [loadingCoaches, setLoadingCoaches] = useState(false);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());
  const coachesRef = useRef<HTMLDivElement>(null);
  const selectedId = selectedOption?.type === 'hour-package' ? selectedOption.packageId : null;
  const isDirector = selectedId === '1on1-director';

  function handlePkgClick(pkgId: string) {
    setRevealedIds(prev => new Set([...prev, pkgId]));
    onSelect({ type: 'hour-package', packageId: pkgId });
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!isDirector || coaches.length > 0) return;
    setLoadingCoaches(true);
    fetch('/api/coaches/head')
      .then(r => r.json())
      .then((data: HeadCoach[]) => {
        setCoaches(data);
        setLoadingCoaches(false);
      })
      .catch(() => setLoadingCoaches(false));
  }, [isDirector, coaches.length]);

  return (
    <section className="px-4 py-10 border-t border-white/[0.06] min-h-svh flex flex-col justify-start md:min-h-0 md:block">
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-8">
          <h2 style={SECTION_HEADING_STYLE} className="text-white">
            어떤 시간을 선택해도<br />확실하게 관리받습니다
          </h2>
        </div>

        <div className="flex flex-col gap-3">
          {/* 일반 3개 패키지 */}
          {MANAGED_PKGS.map(pkg => {
            const isSelected = selectedId === pkg.id;
            const isRevealed = revealedIds.has(pkg.id);
            const savings = pkg.discountRate
              ? BASE_PRICE_PER_HOUR * pkg.hours - pkg.totalPrice
              : 0;

            return (
              <button
                key={pkg.id}
                type="button"
                onClick={() => handlePkgClick(pkg.id)}
                className={`relative overflow-hidden w-full text-left rounded-2xl border p-5 transition-colors touch-manipulation active:scale-[0.98]
                  ${isSelected
                    ? 'border-[#6085ff]/60'
                    : isRevealed ? 'border-white/20 bg-white/[0.03]'
                    : 'border-white/[0.08] bg-white/[0.03] hover:border-white/15'
                  }`}
              >
                {/* 그라데이션 fill — 선택(최종 클릭) 시 왼쪽→오른쪽 reveal */}
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
                  {/* 왼쪽: 시간 + 레이블 */}
                  <div className="flex items-baseline gap-1.5 flex-shrink-0">
                    <span className="text-3xl font-black text-white leading-none">{pkg.hours}</span>
                    <span className="text-sm text-white/55 font-medium">시간</span>
                  </div>

                  {/* 오른쪽: 미클릭=환불 안내 / 클릭됨=가격 유지 */}
                  <div className="flex-1 text-right flex flex-col justify-center min-h-[5rem]">
                    {!isRevealed && (
                      <p className="text-[13px] text-white/40 leading-relaxed">
                        진행되지 않은 수업 시간은<br />전부 환불됩니다.
                      </p>
                    )}

                    {/* 클릭됨 + 할인: 단계별 reveal (최초 클릭 시 애니메이션) */}
                    {isRevealed && pkg.discountRate && (
                      <div key={pkg.id} className="space-y-1.5">
                        <motion.p
                          initial={{ opacity: 0, x: 12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.45, duration: 0.25, ease: 'easeOut' }}
                          className="text-[12px] font-light text-red-400 leading-snug"
                        >
                          ~10시간 수업보다 ({pkg.discountRate}% 할인)<br />{formatWon(savings)} 더 저렴합니다.
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

                    {/* 클릭됨 + 할인 없음(10h) */}
                    {isRevealed && !pkg.discountRate && (
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

          {/* 프리미엄 대표코치 패키지 */}
          <button
            type="button"
            onClick={() => handlePkgClick('1on1-director')}
            className={`relative overflow-hidden w-full text-left rounded-2xl border p-5 transition-colors touch-manipulation active:scale-[0.98]
              ${selectedId === '1on1-director'
                ? 'border-amber-400/70'
                : revealedIds.has('1on1-director') ? 'border-amber-500/50 bg-amber-500/[0.04]'
                : 'border-amber-500/30 bg-amber-500/[0.04] hover:border-amber-400/50'
              }`}
          >
            <AnimatePresence>
              {selectedId === '1on1-director' && (
                <motion.div
                  key="fill-director"
                  className="absolute inset-0"
                  style={{ background: 'linear-gradient(105deg, rgba(180,120,20,0.45) 0%, rgba(251,191,36,0.18) 100%)' }}
                  initial={{ clipPath: 'inset(0 100% 0 0 round 1rem)' }}
                  animate={{ clipPath: 'inset(0 0% 0 0 round 1rem)' }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] }}
                />
              )}
            </AnimatePresence>

            <div className="relative z-10 flex items-center justify-between gap-4" style={{ fontFamily: "'BookkMyungjo', serif" }}>
              {/* 왼쪽: 프리미엄 뱃지 + 타이틀 */}
              <div className="flex-shrink-0 flex flex-col gap-1.5">
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 tracking-wide self-start">
                  프리미엄
                </span>
                <p className="text-sm font-semibold text-amber-200 leading-snug">
                  SuperfastSAT 대표코치의 1:1 수업
                </p>
              </div>

              {/* 오른쪽: 클릭 시 시간 + 가격 reveal (유지) */}
              <div className="flex-1 text-right">
                {revealedIds.has('1on1-director') && (
                  <div className="space-y-1">
                    <motion.div
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.45, duration: 0.25, ease: 'easeOut' }}
                      className="flex items-baseline gap-1 justify-end"
                    >
                      <span className="text-[11px] font-bold text-amber-100/70 leading-none tracking-tight">10시간</span>
                    </motion.div>
                    <motion.p
                      initial={{ opacity: 0, y: 6, scale: 0.94 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ delay: 0.82, duration: 0.28, ease: [0.34, 1.56, 0.64, 1] }}
                      className="text-sm font-semibold text-amber-200"
                      style={{ fontVariantNumeric: 'tabular-nums', letterSpacing: '0.04em' }}
                    >
                      {formatWon(1800000)}
                    </motion.p>
                  </div>
                )}
              </div>
            </div>
          </button>

          {/* 대표코치 라인업 */}
          <div ref={coachesRef}>
            {isDirector && (
              <div className="mt-3">
                <p
                  className="text-[15px] font-bold text-amber-300/60 tracking-widest uppercase pb-3 text-center"
                  style={{ fontFamily: "'BookkMyungjo', serif" }}
                >
                  대표코치 라인업
                </p>
                {loadingCoaches && (
                  <div className="flex justify-center py-8">
                    <div className="w-5 h-5 rounded-full border-2 border-amber-400/30 border-t-amber-300 animate-spin" />
                  </div>
                )}
                {!loadingCoaches && (
                  <div className="grid grid-cols-2 gap-3">
                    {coaches.map(coach => (
                      <Link
                        key={coach.slug}
                        href={`/coaches/${coach.slug}`}
                        target="_blank"
                        className="group bg-[#1e2023] rounded-xl overflow-hidden border border-amber-500/15 hover:border-amber-400/40 transition-all duration-200 flex flex-col"
                      >
                        <div className="relative aspect-[4/3] overflow-hidden bg-[#111]">
                          {coach.photo ? (
                            <img
                              src={coach.photo}
                              alt={coach.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-amber-300/30 text-3xl font-bold">
                              {coach.name[0]}
                            </div>
                          )}
                          {coach.subjects.length > 0 && (
                            <div className="absolute top-2 left-2 flex gap-1">
                              {coach.subjects.map(s => (
                                <span key={s} className="px-1.5 py-0.5 bg-black/60 backdrop-blur-md text-white text-[11px] font-bold rounded-full border border-white/10 uppercase tracking-wide">
                                  {s}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="p-3 flex-1 flex flex-col">
                          <p className="text-sm font-bold text-amber-100 mb-1 group-hover:text-amber-300 transition-colors">
                            {coach.name}
                          </p>
                          <p className="text-[13px] text-white/40 leading-relaxed line-clamp-2 flex-1">
                            {stripHtml(coach.bio)}
                          </p>
                          <p className="text-[12px] text-amber-400/60 font-semibold mt-2 group-hover:text-amber-300 transition-colors">
                            프로필 보기 →
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════
   STEP 3: 1:4 특강 선택 (전용 UI — ManagedPackagePicker 스타일)
   ════════════════════════════════════════════════════════════════════ */
function GroupPackagePicker({ selectedOption, onSelect }: {
  selectedOption: OptionSelectionV2 | null;
  onSelect: (o: OptionSelectionV2) => void;
}) {
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());
  const selectedId = selectedOption?.type === 'group-package' ? selectedOption.packageId : null;

  function handlePkgClick(pkgId: string) {
    setRevealedIds(prev => new Set([...prev, pkgId]));
    onSelect({ type: 'group-package', packageId: pkgId });
  }

  return (
    <section className="px-4 py-10 border-t border-white/[0.06] min-h-svh flex flex-col justify-center md:min-h-0 md:block">
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-8">
          <h2 style={SECTION_HEADING_STYLE} className="text-white">
            커리큘럼은<br />상담을 통해 확인하세요
          </h2>
        </div>

        <div className="flex flex-col gap-3">
          {GROUP_PACKAGES_V2.map(pkg => {
            const isSelected = selectedId === pkg.id;
            const isRevealed = revealedIds.has(pkg.id);
            const isSoldOut = pkg.id === 'group-summer';

            return (
              <button
                key={pkg.id}
                type="button"
                onClick={() => handlePkgClick(pkg.id)}
                className={`relative overflow-hidden w-full text-left rounded-2xl border p-5 transition-colors touch-manipulation active:scale-[0.98]
                  ${isSelected
                    ? 'border-[#6085ff]/60'
                    : isRevealed ? 'border-white/20 bg-white/[0.03]'
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
                  <div className="flex-shrink-0">
                    <div className="mb-2">
                      {isSoldOut ? (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-white/55 border border-white/20 tracking-wide">
                          마감
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 tracking-wide">
                          NEW
                        </span>
                      )}
                    </div>
                    <span className="text-2xl font-black text-white leading-none">{pkg.name}</span>
                    <p className="text-xs text-white/40 mt-1">{pkg.durationLabel}</p>
                  </div>

                  <div className="flex-1 text-right">
                    {!isRevealed && (
                      <p className="text-[13px] text-white/40 leading-relaxed">
                        {pkg.subtitle}
                      </p>
                    )}
                    {isRevealed && (
                      <motion.p
                        initial={{ opacity: 0, y: 6, scale: 0.94 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ delay: 0.4, duration: 0.28, ease: [0.34, 1.56, 0.64, 1] }}
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
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════
   STEP 3: 패키지 선택 (콘텐츠 / 자기주도)
   ════════════════════════════════════════════════════════════════════ */
function PackagePicker({
  categoryId, selectedOption, onSelect, onContentToggle, totalPrice, stepNum,
}: {
  categoryId: CategoryIdV2;
  selectedOption: OptionSelectionV2 | null;
  onSelect: (o: OptionSelectionV2) => void;
  onContentToggle: (id: string) => void;
  totalPrice: number;
  stepNum: number;
}) {
  const titleMap: Record<CategoryIdV2, string> = {
    'one-on-one': '시간 패키지 선택',
    'group': '특강 선택',
    'content': '콘텐츠 선택',
    'unmanaged': '시간 패키지 선택',
  };

  return (
    <section className="px-4 py-8 border-t border-white/[0.06] min-h-svh flex flex-col justify-center md:min-h-0 md:block">
      <div className="max-w-xl mx-auto">
        <StepHeader step={stepNum} title={titleMap[categoryId]} />

        {/* 시간 패키지 (1:1 / 비관리형) */}
        {(categoryId === 'one-on-one' || categoryId === 'unmanaged') && (
          <div className="flex flex-col gap-3">
            {(categoryId === 'unmanaged' ? UNMANAGED_PACKAGES_V2 : ONE_ON_ONE_PACKAGES_V2).map(pkg => {
              const selected = selectedOption?.type === 'hour-package' && selectedOption.packageId === pkg.id;
              const savings = pkg.discountRate
                ? Math.round((ONE_ON_ONE_PACKAGES_V2[0].pricePerHour * pkg.hours) - pkg.totalPrice)
                : 0;
              return (
                <SelectCard key={pkg.id} selected={selected}
                  onClick={() => onSelect({ type: 'hour-package', packageId: pkg.id })}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-4xl font-black text-white leading-none">{pkg.hours}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-white/70">시간</span>
                          {(pkg.salesLabel === 'popular' || pkg.salesLabel === 'bestValue') && (
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full
                              bg-white text-[#071be9]">
                              {pkg.salesLabel === 'popular' ? '가장 인기' : '최대 할인'}
                            </span>
                          )}
                        </div>
                        {savings > 0 && pkg.discountRate && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full mt-1
                            bg-rose-500/15 text-rose-400 border border-rose-500/20">
                            -{pkg.discountRate}% · {formatWon(savings)} 절약
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-bold text-[#8fabff]">{formatWon(pkg.totalPrice)}</p>
                      <p className="text-[13px] text-white/35">{formatWon(pkg.pricePerHour)}/h</p>
                    </div>
                  </div>
                </SelectCard>
              );
            })}
          </div>
        )}

        {/* 그룹 특강 */}
        {categoryId === 'group' && (
          <div className="flex flex-col gap-3">
            {GROUP_PACKAGES_V2.map(pkg => {
              const selected = selectedOption?.type === 'group-package' && selectedOption.packageId === pkg.id;
              return (
                <SelectCard key={pkg.id} selected={selected}
                  onClick={() => onSelect({ type: 'group-package', packageId: pkg.id })}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-white">{pkg.name}</span>
                        {pkg.salesLabel === 'popular' && (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white text-[#071be9]">
                            인기
                          </span>
                        )}
                        {pkg.salesLabel === 'new' && (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full
                            bg-white/15 text-white/70">
                            NEW
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-white/45">{pkg.subtitle}</p>
                      <div className="flex items-center gap-1.5 mt-2">
                        <Check className="w-3 h-3 text-[#6085ff]" strokeWidth={3} />
                        <span className="text-xs text-white/50">{pkg.durationLabel}</span>
                      </div>
                    </div>
                    <span className="text-xs font-semibold px-3 py-1.5 rounded-full flex-shrink-0
                      bg-[#6085ff]/10 text-[#8fabff] border border-[#6085ff]/20">
                      문의
                    </span>
                  </div>
                </SelectCard>
              );
            })}
          </div>
        )}

        {/* 콘텐츠 */}
        {categoryId === 'content' && (
          <>
            <div className="flex flex-col gap-3">
              {CONTENT_ITEMS_V2.map(item => {
                const checked = selectedOption?.type === 'content' &&
                  selectedOption.contentIds.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onContentToggle(item.id)}
                    className={`w-full text-left rounded-2xl border p-4 transition-all touch-manipulation active:scale-[0.98]
                      ${checked
                        ? 'border-[#6085ff]/60 bg-[#6085ff]/8'
                        : 'border-white/[0.08] bg-white/[0.03] hover:border-white/15'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all
                        ${checked ? 'border-[#6085ff] bg-[#6085ff]' : 'border-white/25'}`}>
                        {checked && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                      </div>
                      <div className="flex-1">
                        <span className="font-semibold text-white text-sm">{item.name}</span>
                        <p className="text-xs text-white/40 mt-0.5">{item.description}</p>
                      </div>
                      <span className="text-sm font-bold text-[#8fabff] flex-shrink-0">
                        월 {formatWon(item.monthlyPrice)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
            {selectedOption?.type === 'content' && selectedOption.contentIds.length > 0 && (
              <div className="mt-4 rounded-2xl border border-[#6085ff]/20 bg-[#6085ff]/5 p-4 text-center">
                <p className="text-xs text-white/40 mb-1">합산 월 구독료</p>
                <p className="text-2xl font-black text-white">월 {formatWon(totalPrice)}</p>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════
   STEP 4: 가격 요약 + CTA
   ════════════════════════════════════════════════════════════════════ */

/* ════════════════════════════════════════════════════════════════════
   MAIN PAGE
   ════════════════════════════════════════════════════════════════════ */
export function EnrollmentV2Page() {
  const [exam, setExam] = useState<'SAT' | 'AP' | null>(null);
  const [managementType, setManagementType] = useState<ManagementType | null>(null);
  const [classFormat, setClassFormat] = useState<CategoryIdV2 | null>(null);
  const [selectedOption, setSelectedOption] = useState<OptionSelectionV2 | null>(null);
  const [showcaseOpen, setShowcaseOpen] = useState(false);
  const [heroInView, setHeroInView] = useState(true);

  const selectionRef = useRef<HTMLDivElement>(null);
  const showcaseRef = useRef<HTMLDivElement>(null);
  const formatRef = useRef<HTMLDivElement>(null);
  const packageRef = useRef<HTMLDivElement>(null);
  const scrollOffsetRef = useRef<number>(134);

  // Mount/unmount class on html for header fade CSS
  useEffect(() => {
    document.documentElement.classList.add('enrollment-v2');
    return () => {
      document.documentElement.classList.remove('enrollment-v2');
      document.documentElement.classList.remove('exam-selected');
    };
  }, []);

  // Track hero section visibility
  useEffect(() => {
    const el = document.getElementById('v2-exam');
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setHeroInView(entry.isIntersecting),
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // When exam selected AND hero not in view: hide header, show step nav
  useEffect(() => {
    const headerHidden = exam !== null && !heroInView;
    if (headerHidden) {
      document.documentElement.classList.add('exam-selected');
      scrollOffsetRef.current = 72;
    } else {
      document.documentElement.classList.remove('exam-selected');
      scrollOffsetRef.current = 134;
    }
  }, [exam, heroInView]);

  function scrollToRef(
    ref: React.RefObject<HTMLElement | null>,
    delay = 0,
    block: ScrollLogicalPosition = 'start',
  ) {
    setTimeout(() => {
      const el = ref.current;
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block });
    }, delay);
  }

  const handleExamSelect = useCallback((e: 'SAT' | 'AP') => {
    setExam(e);
    setTimeout(() => {
      if (e === 'AP') {
        const el = document.getElementById('v2-ap-subject');
        if (el) {
          const y = el.getBoundingClientRect().top + window.scrollY - scrollOffsetRef.current;
          window.scrollTo({ top: y, behavior: 'smooth' });
        }
      } else {
        selectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 350);
  }, []);

  const handleManagement = useCallback((type: ManagementType) => {
    const changed = type !== managementType;
    setManagementType(type);
    if (changed) { setClassFormat(null); setSelectedOption(null); }
    setShowcaseOpen(true);
    scrollToRef(showcaseRef, 200, 'center');
  }, [managementType]);

  const handleThumbnailClick = useCallback((type: ManagementType) => {
    const changed = type !== managementType;
    setManagementType(type);
    if (changed) { setClassFormat(null); setSelectedOption(null); }
    setShowcaseOpen(true);
    scrollToRef(showcaseRef, 200, 'center');
  }, [managementType]);

  const handleFormat = useCallback((format: CategoryIdV2) => {
    const changed = format !== classFormat;
    setClassFormat(format);
    if (changed) setSelectedOption(null);
    scrollToRef(packageRef, 300, 'start');
  }, [classFormat]);

  const handleOption = useCallback((option: OptionSelectionV2) => {
    setSelectedOption(option);
  }, []);

  const handleContentToggle = useCallback((id: string) => {
    setSelectedOption(prev => {
      const current = prev?.type === 'content' ? prev.contentIds : [];
      const next = current.includes(id) ? current.filter(x => x !== id) : [...current, id];
      return { type: 'content', contentIds: next };
    });
  }, []);

  // 카테고리 계산 — 관리형/자기주도 모두 classFormat 선택 후 결정
  const categoryId: CategoryIdV2 | null = classFormat ?? null;

  const totalPrice = categoryId && selectedOption
    ? getTotalPrice(categoryId, selectedOption)
    : 0;

  const packageStep = 3;

  return (
    <div style={{ background: '#000', minHeight: '100vh', color: '#fff', WebkitFontSmoothing: 'antialiased' }}>

      {/* 3-Step Nav — fixed, slides to top when exam selected */}
      <EnrollmentStepNav navVisible={exam !== null && !heroInView} scrollOffsetRef={scrollOffsetRef} />

      {/* ── Video Hero — fills full viewport (video extends behind fixed header) ── */}
      <EnrollmentVideoHero onExamSelect={handleExamSelect} />

      {/* ── Post-hero content — padded for step nav when visible ──── */}
      <div style={{
        paddingTop: (exam !== null && !heroInView) ? '72px' : '0px',
        transition: 'padding-top 0.35s ease',
      }}>

        {exam === 'AP' ? (
          /* ── AP 전용 플로우 ─────────────────────────────────────── */
          <div ref={selectionRef}>
            <APSectionV2 />
            <div className="h-20" />
          </div>
        ) : (
          /* ── SAT 플로우 ─────────────────────────────────────────── */
          <>
            {/* Step 1: 관리형 / 자기주도 수업 선택 */}
            <div id="v2-selection" ref={selectionRef} className="min-h-svh flex flex-col justify-center md:min-h-0 md:block">
              <ManagementFitSection
                managementType={managementType}
                showcaseOpen={showcaseOpen}
                onSelect={handleManagement}
                onThumbnailClick={handleThumbnailClick}
                sectionNumber={1}
                hideHeading
              />
            </div>

            {/* 서비스 쇼케이스 (관리형 6가지 / 자기주도 3가지) */}
            {managementType === 'managed' && (
              <div ref={showcaseRef} id="v2-showcase" className="border-t border-white/[0.06]">
                <ManagedShowcase />
              </div>
            )}
            {managementType === 'unmanaged' && (
              <div ref={showcaseRef} id="v2-showcase" className="border-t border-white/[0.06]">
                <UnmanagedShowcase />
              </div>
            )}

            {/* Step 2: 수업 형태 */}
            {managementType && (
              <div ref={formatRef}>
                <ClassFormatPicker
                  value={classFormat}
                  onChange={handleFormat}
                  options={managementType === 'managed' ? MANAGED_FORMAT_OPTIONS : UNMANAGED_FORMAT_OPTIONS}
                />
              </div>
            )}

            {/* Step 3: 패키지 선택 */}
            <div id="v2-pricing">
              {categoryId === 'one-on-one' && (
                <div ref={packageRef}>
                  <ManagedPackagePicker
                    selectedOption={selectedOption}
                    onSelect={handleOption}
                  />
                </div>
              )}
              {categoryId === 'group' && (
                <div ref={packageRef}>
                  <GroupPackagePicker
                    selectedOption={selectedOption}
                    onSelect={handleOption}
                  />
                </div>
              )}
              {categoryId && categoryId !== 'one-on-one' && categoryId !== 'group' && (
                <div ref={packageRef}>
                  <PackagePicker
                    categoryId={categoryId}
                    selectedOption={selectedOption}
                    onSelect={handleOption}
                    onContentToggle={handleContentToggle}
                    totalPrice={totalPrice}
                    stepNum={packageStep}
                  />
                </div>
              )}
            </div>

            <div className="h-20" />
          </>
        )}
      </div>
    </div>
  );
}
