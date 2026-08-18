'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Badge } from '@/components/enrollment/ui/Badge';
import type { ManagementType } from '@/types/enrollment';
import styles from './ManagementFitSection.module.css';

// ── Personas ──────────────────────────────────────────────────────────────
const MANAGED_PERSONAS = [
  '계획 세우기 어려운 학생',
  '뭘 틀리는지 모르겠는 학생',
  '체계적으로 SAT시험을 준비하고 싶은 학생',
];

const UNMANAGED_PERSONAS = [
  '스스로 계획을 세우는 학생',
  '공부 환경이 갖춰진 학생',
  '내 SAT공부의 약점을 알고 있는 학생',
];

// ── Thumbnail SVGs — 블러 상태에서도 색·형태가 인식되도록 채도·크기 강화 ──
function ThumbSkillBars() {
  const rows = [
    { lw: 16, bw: 54, color: '#f87171' },
    { lw: 22, bw: 70, color: '#6085ff' },
    { lw: 14, bw: 42, color: '#eab308' },
    { lw: 18, bw: 60, color: '#34d399' },
  ];
  return (
    <svg viewBox="0 0 80 62" fill="none" width="100%" height="100%">
      <rect x="4" y="4" width="30" height="5" rx="2.5" fill="rgba(255,255,255,0.14)" />
      {rows.map(({ lw, bw, color }, i) => (
        <g key={i}>
          <rect x="4" y={14 + i * 11} width={lw} height="5" rx="2.5" fill="rgba(255,255,255,0.18)" />
          <rect x={lw + 8} y={14 + i * 11} width={68 - lw} height="5" rx="2.5" fill="rgba(255,255,255,0.05)" />
          <rect x={lw + 8} y={14 + i * 11} width={bw - lw} height="5" rx="2.5" fill={color} fillOpacity="0.8" />
        </g>
      ))}
    </svg>
  );
}

function ThumbBarChart() {
  const bars = [
    { h: 26, color: 'rgba(96,133,255,0.3)' },
    { h: 40, color: 'rgba(96,133,255,0.4)' },
    { h: 56, color: 'rgba(96,133,255,0.55)' },
    { h: 72, color: '#6085ff' },
  ];
  return (
    <svg viewBox="0 0 80 66" fill="none" width="100%" height="100%">
      <text x="4" y="10" fontSize="9" fontWeight="800" fill="#6085ff" fillOpacity="0.9">91점</text>
      <text x="4" y="18" fontSize="5" fill="rgba(96,133,255,0.55)">+19점 향상</text>
      {bars.map(({ h, color }, i) => (
        <g key={i}>
          <rect x={6 + i * 18} y={58 - h} width="13" height={h} rx="3" fill={color} />
          <text x={12.5 + i * 18} y="64" textAnchor="middle" fontSize="5.5" fill="rgba(255,255,255,0.3)">{i + 1}주</text>
        </g>
      ))}
    </svg>
  );
}

function ThumbVideoGrid() {
  return (
    <svg viewBox="0 0 80 64" fill="none" width="100%" height="100%">
      <rect x="4" y="3" width="22" height="7" rx="3.5" fill="rgba(248,113,113,0.2)" stroke="rgba(248,113,113,0.55)" strokeWidth="0.6" />
      <circle cx="9" cy="6.5" r="2" fill="#f87171" />
      <text x="14" y="9" fontSize="5" fontWeight="700" fill="#f87171" letterSpacing="0.06em">LIVE</text>
      <rect x="4" y="14" width="34" height="28" rx="5" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.12)" strokeWidth="0.6" />
      <rect x="42" y="14" width="34" height="28" rx="5" fill="rgba(96,133,255,0.1)" stroke="rgba(96,133,255,0.35)" strokeWidth="0.6" />
      <ellipse cx="21" cy="23" rx="5" ry="5.5" fill="rgba(255,255,255,0.22)" />
      <path d="M12 38 Q21 33 30 38" fill="rgba(255,255,255,0.1)" />
      <rect x="52" y="17" width="14" height="14" rx="4" fill="rgba(96,133,255,0.45)" stroke="rgba(96,133,255,0.7)" strokeWidth="0.6" />
      <circle cx="57" cy="22" r="1.8" fill="rgba(255,255,255,0.8)" />
      <circle cx="63" cy="22" r="1.8" fill="rgba(255,255,255,0.8)" />
      <rect x="4" y="46" width="72" height="12" rx="4" fill="rgba(96,133,255,0.08)" stroke="rgba(96,133,255,0.22)" strokeWidth="0.6" />
      <rect x="9" y="50" width="40" height="3" rx="1.5" fill="rgba(255,255,255,0.22)" />
    </svg>
  );
}

function ThumbChecklist() {
  const rows = [
    { lw: 14, bw: 38, done: true },
    { lw: 20, bw: 46, done: true },
    { lw: 12, bw: 32, done: false },
    { lw: 16, bw: 40, done: false },
  ];
  return (
    <svg viewBox="0 0 80 60" fill="none" width="100%" height="100%">
      <rect x="4" y="4" width="26" height="5" rx="2.5" fill="rgba(255,255,255,0.12)" />
      {rows.map(({ lw, bw, done }, i) => (
        <g key={i} transform={`translate(0,${i * 12 + 14})`}>
          <rect x="4" y="0" width={lw} height="4" rx="2" fill="rgba(255,255,255,0.2)" />
          <rect x={lw + 8} y="0" width={bw} height="4" rx="2" fill={done ? 'rgba(96,133,255,0.5)' : 'rgba(255,255,255,0.06)'} />
          <circle cx="73" cy="2" r="4" fill={done ? 'rgba(96,133,255,0.55)' : 'rgba(255,255,255,0.07)'} stroke={done ? '#6085ff' : 'rgba(255,255,255,0.14)'} strokeWidth="0.8" />
          {done && <path d="M70.5,2 L72.5,4.2 L76,0" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none" strokeOpacity="0.9" />}
        </g>
      ))}
    </svg>
  );
}

function ThumbFlipCard() {
  return (
    <svg viewBox="0 0 80 62" fill="none" width="100%" height="100%">
      <rect x="6" y="3" width="68" height="11" rx="5.5" fill="rgba(255,255,255,0.04)" />
      <rect x="8" y="4" width="30" height="9" rx="4.5" fill="rgba(96,133,255,0.2)" stroke="rgba(96,133,255,0.45)" strokeWidth="0.6" />
      <text x="23" y="10" textAnchor="middle" fontSize="5" fill="rgba(140,170,255,0.95)">Adventure</text>
      <text x="55" y="10" textAnchor="middle" fontSize="5" fill="rgba(255,255,255,0.28)">Study</text>
      <rect x="6" y="18" width="68" height="36" rx="7" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.1)" strokeWidth="0.8" />
      <text x="40" y="36" textAnchor="middle" fontSize="10" fontWeight="800" fontStyle="italic" fill="rgba(255,255,255,0.88)" letterSpacing="-0.03em">ephemeral</text>
      <rect x="14" y="42" width="52" height="5" rx="2.5" fill="rgba(255,255,255,0.06)" />
      <rect x="14" y="42" width="36" height="5" rx="2.5" fill="rgba(96,133,255,0.65)" />
      <text x="13" y="50" fontSize="5" fill="rgba(96,133,255,0.7)">XP</text>
      <text x="67" y="50" textAnchor="end" fontSize="5" fill="rgba(255,255,255,0.3)">72</text>
    </svg>
  );
}

function ThumbLineGraph() {
  const pts: [number, number][] = [[6, 52], [18, 42], [32, 33], [46, 23], [60, 13], [74, 5]];
  const polyline = pts.map(([x, y]) => `${x},${y}`).join(' ');
  const area = `${polyline} 74,58 6,58`;
  return (
    <svg viewBox="0 0 80 64" fill="none" width="100%" height="100%">
      <text x="5" y="10" fontSize="9" fontWeight="800" fill="#6085ff" fillOpacity="0.92">1480</text>
      <text x="5" y="18" fontSize="5" fill="rgba(96,133,255,0.6)">+190 향상</text>
      <polygon points={area} fill="rgba(96,133,255,0.1)" />
      <polyline points={polyline} stroke="#6085ff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.9" />
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y}
          r={i === pts.length - 1 ? 4.5 : 2.5}
          fill={i === pts.length - 1 ? '#fff' : '#6085ff'}
          stroke={i === pts.length - 1 ? '#6085ff' : 'none'}
          strokeWidth="1.5"
          fillOpacity={i === pts.length - 1 ? 1 : 0.65}
        />
      ))}
    </svg>
  );
}

// ── Service item catalogue ────────────────────────────────────────────────
const ALL_ITEMS = [
  { key: 'customLesson', label: '맞춤형 수업',     Thumb: ThumbSkillBars },
  { key: 'scoreReport',  label: '학습 리포트',     Thumb: ThumbBarChart },
  { key: 'studyHall',   label: '온라인 독서실',    Thumb: ThumbVideoGrid },
  { key: 'aiCoach',     label: 'AI 코치',         Thumb: ThumbChecklist },
  { key: 'vocab',       label: '단어 공부',        Thumb: ThumbFlipCard },
  { key: 'mockExam',    label: '매주 실전 모의고사', Thumb: ThumbLineGraph },
];

const UNMANAGED_ITEMS = ALL_ITEMS.slice(0, 2);

// ── FitCard ───────────────────────────────────────────────────────────────
interface FitCardProps {
  name: string;
  icon: string;
  recommended?: boolean;
  personas: string[];
  selected: boolean;
  onSelect: () => void;
  onThumbnailClick: () => void;
  lang?: 'ko' | 'en';
}

function FitCard({ name, icon, recommended, personas, selected, onSelect, onThumbnailClick, lang = 'ko' }: FitCardProps) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      className={`${styles.card} ${selected ? styles.selected : ''}`}
      onClick={onSelect}
      role="radio"
      aria-checked={selected}
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(); }}
      whileTap={reduce ? undefined : { scale: 0.97 }}
      transition={{ duration: 0.15 }}
    >
      {/* Header */}
      <div className={styles.cardHeader}>
        <span className={styles.cardIcon} aria-hidden="true">{icon}</span>
        <div className={styles.cardTitleRow}>
          <span className={styles.typeName}>{name}</span>
        </div>
      </div>

      {/* Personas */}
      <div className={styles.personas}>
        <ul className={styles.personaList}>
          {personas.map((p, i) => (
            <li key={i} className={styles.personaItem}>
              <span className={styles.personaDot} />
              {p}
            </li>
          ))}
        </ul>
      </div>

      {/* CTA */}
      <button
        type="button"
        className={styles.detailCta}
        onClick={(e) => { e.stopPropagation(); onThumbnailClick(); }}
        aria-label={lang === 'en' ? `See details for ${name}` : `${name} 자세히 살펴보기`}
      >
        {lang === 'en' ? 'See more' : '더 보기'}
        <span aria-hidden="true">→</span>
      </button>
    </motion.div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────
interface ManagementFitSectionProps {
  managementType: ManagementType | null;
  showcaseOpen: boolean;
  onSelect: (type: ManagementType) => void;
  onThumbnailClick: (type: ManagementType) => void;
  sectionNumber?: number;
  hideHeading?: boolean;
  lang?: 'ko' | 'en';
}

export const ManagementFitSection = React.forwardRef<HTMLDivElement, ManagementFitSectionProps>(
  function ManagementFitSection({ managementType, showcaseOpen, onSelect, onThumbnailClick, hideHeading, lang = 'ko' }, ref) {
    const reduce = useReducedMotion();

    const managed_personas = lang === 'en'
      ? ['Students who struggle to make a plan', "Students unsure of where they're going wrong", 'Students who want to prepare for the SAT systematically']
      : MANAGED_PERSONAS;

    const unmanaged_personas = lang === 'en'
      ? ['Students who plan independently', 'Students with a solid study environment', 'Students who know their SAT weak spots']
      : UNMANAGED_PERSONAS;

    const cards = [
      {
        name: lang === 'en' ? 'Managed Classes' : '관리형 수업' as const,
        icon: '🤝',
        recommended: true,
        personas: managed_personas,
        items: ALL_ITEMS,
        type: 'managed' as const,
      },
      {
        name: lang === 'en' ? 'Self-Directed Classes' : '자기주도 수업' as const,
        icon: '✍️',
        recommended: false,
        personas: unmanaged_personas,
        items: UNMANAGED_ITEMS,
        type: 'unmanaged' as const,
      },
    ];

    return (
      <section ref={ref} className={`max-w-3xl mx-auto px-4 sm:px-6 pb-10 sm:pb-16 scroll-mt-20 ${hideHeading ? 'pt-10 sm:pt-14' : ''}`}>
        {!hideHeading && (
          <div className={styles.sectionHeading}>
            <p className={styles.sectionLabel}>{lang === 'en' ? 'Choose your class type' : '수업 방식 선택'}</p>
            <h2 className={styles.sectionTitle}>
              {lang === 'en' ? <>Which class is right<br />for your child?</> : <>어떤 수업이<br />우리 아이에게 맞을까요?</>}
            </h2>
          </div>
        )}
        <div className={styles.grid}>
          {cards.map((card, i) => (
            <motion.div
              key={card.type}
              initial={reduce ? false : { opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.55, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
            >
              <FitCard
                name={card.name}
                icon={card.icon}
                recommended={card.recommended}
                personas={card.personas}
                selected={managementType === card.type}
                onSelect={() => onSelect(card.type)}
                onThumbnailClick={() => onThumbnailClick(card.type)}
                lang={lang}
              />
            </motion.div>
          ))}
        </div>
      </section>
    );
  }
);
