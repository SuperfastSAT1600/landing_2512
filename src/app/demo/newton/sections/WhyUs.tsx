'use client';

import { Section } from '../components/Section';
import { brand } from '../theme';

// 창업자 이력 — 첨부 장표(Leadership & Team)의 도표를 그대로 옮긴 것.
// 왼쪽 조직 체인 → 가운데 역량(Data/Human/AI) → 오른쪽 역할, 그리고 이전 경험이
// 마지막 줄로 수렴하는 연결선까지 재현한다.
type Kind = 'Data' | 'Human' | 'AI' | 'All';

const TRACK: { org: string; kind: Kind; role: string; now?: boolean }[] = [
  { org: '창업', kind: 'Data', role: '빅데이터 기반 맞춤형 과외 서비스, 대표이사' },
  { org: '설탭', kind: 'Human', role: '국내 입시 온라인 과외 서비스, 초기 멤버' },
  { org: '개념원리', kind: 'AI', role: 'AI기반 맞춤형 콘텐츠 제공 과외 서비스, 팀장' },
  { org: '밀당PT', kind: 'AI', role: 'AI기반 학습 관리 제공 과외 서비스, 이사' },
  { org: 'Tublet', kind: 'Human', role: '해외 입시 온라인 과외 서비스, 이사' },
  { org: 'Argonaut AI', kind: 'All', role: '3세대 학습의 표준', now: true },
];

const ROW_H = 56;
const GAP = 12;
const STEP = ROW_H + GAP;
const TOTAL = TRACK.length * ROW_H + (TRACK.length - 1) * GAP;
const centerY = (i: number) => i * STEP + ROW_H / 2;

const LAVENDER = '#b8bbf2';
const GRAY = '#b4b4b4';

// 역할 바 색으로 역량 계열(Data/Human/AI/All)을 구분한다 — 별도 라벨 컬럼 없이도 읽힌다.
const roleBar: Record<Kind, React.CSSProperties> = {
  Data: { background: '#fff', border: `1px solid ${brand.primary}`, color: brand.primary },
  Human: { background: LAVENDER, color: '#1b2060' },
  AI: { background: GRAY, color: '#2b2b2b' },
  All: { background: brand.primary, color: '#fff' },
};

/** 세로 체인 — 첫 행 중앙에서 마지막 행 바로 위까지 내려가며 화살표로 꽂힌다. */
function VerticalArrow({ color, width = 1 }: { color: string; width?: number }) {
  const top = centerY(0);
  // 마지막 행의 윗변에서 멈춘다. 행 중앙까지 그리면 화살표 머리가 박스에 가려진다.
  const bottom = (TRACK.length - 1) * STEP;
  return (
    <div className="pointer-events-none absolute inset-0 hidden sm:block" aria-hidden>
      <div
        className="absolute left-1/2 -translate-x-1/2"
        style={{ top, height: bottom - top - 7, width, background: color }}
      />
      <div
        className="absolute left-1/2 -translate-x-1/2"
        style={{
          top: bottom - 7,
          borderLeft: '4px solid transparent',
          borderRight: '4px solid transparent',
          borderTop: `7px solid ${color}`,
        }}
      />
    </div>
  );
}

/** 이전 경험(Human·AI 4개 행)이 마지막 줄로 모이는 우측 연결선. */
function ConvergenceLines() {
  const [, r2, r3, r4, r5, r6] = TRACK.map((_, i) => centerY(i));
  const midY = (r3 + r4) / 2;
  return (
    <svg
      width="92"
      height={TOTAL}
      viewBox={`0 0 92 ${TOTAL}`}
      className="hidden shrink-0 lg:block"
      aria-hidden
    >
      {/* AI 계열(개념원리·밀당PT) → 안쪽 세로줄로 합류 */}
      <path d={`M0 ${r3} H30 V${midY}`} fill="none" stroke={GRAY} strokeWidth="1.5" />
      <path d={`M0 ${r4} H30 V${midY}`} fill="none" stroke={GRAY} strokeWidth="1.5" />
      {/* Human 계열(설탭·Tublet) → 바깥쪽 세로줄로 합류 */}
      <path d={`M0 ${r2} H54 V${midY}`} fill="none" stroke={LAVENDER} strokeWidth="1.5" />
      <path d={`M0 ${r5} H54 V${midY}`} fill="none" stroke={LAVENDER} strokeWidth="1.5" />
      <circle cx="30" cy={midY} r="3.5" fill={brand.primary} />
      <circle cx="54" cy={midY} r="3.5" fill={brand.primary} />
      {/* 두 계열이 만나 마지막 줄로 내려가 왼쪽으로 꽂힌다 */}
      <path
        d={`M30 ${midY} H78 V${r6} H9`}
        fill="none"
        stroke={brand.primary}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path d={`M0 ${r6} l9 -5.5 v11 z`} fill={brand.primary} />
    </svg>
  );
}

export function WhyUs() {
  return (
    <Section
      id="intro"
      eyebrow="Leadership"
      title="14년 에듀테크 경험, AI로 교육 양극화 문제를 해결할 창업자"
      lead={[
        "'설탭', '개념원리', '밀당PT', 'Tublet' 등 국내외 맞춤형 학습 서비스를 직접 운영하며",
        "교육 양극화 문제 해결을 위해 AI 기술을 적용하는 '아르고노트에이아이'를 창업했습니다.",
      ]}
    >
      <div className="flex items-start gap-2 sm:gap-3">
        {/* 조직 체인 */}
        <div className="relative w-[104px] shrink-0 sm:w-[132px]" style={{ height: TOTAL }}>
          <VerticalArrow color="#c7cad3" />
          <div className="relative flex flex-col" style={{ gap: GAP }}>
            {TRACK.map(t => (
              <div
                key={t.org}
                className="flex items-center justify-center rounded-lg bg-white px-2 text-center"
                style={{
                  height: ROW_H,
                  border: `1px solid ${t.now ? brand.primary : '#dcdfe6'}`,
                }}
              >
                <span
                  className="text-[13px] font-bold leading-tight sm:text-[14px]"
                  style={{ color: t.now ? brand.primary : '#1f2430' }}
                >
                  {t.org}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 역할 */}
        <div className="min-w-0 flex-1" style={{ height: TOTAL }}>
          <div className="flex flex-col" style={{ gap: GAP }}>
            {TRACK.map(t => (
              <div
                key={t.org}
                className="flex items-center rounded-lg px-3 sm:px-4"
                style={{ height: ROW_H, ...roleBar[t.kind] }}
              >
                <span className="text-[12.5px] font-medium leading-snug sm:text-[14px]">{t.role}</span>
              </div>
            ))}
          </div>
        </div>

        <ConvergenceLines />
      </div>

      <p className="mt-8 max-w-3xl text-[14px] leading-relaxed sm:text-[15px]" style={{ color: brand.muted }}>
        과외·콘텐츠·학습관리를 거치며 배운 것을 하나의 소프트웨어로 묶고 있습니다.
        <br />
        국내에서 검증한 기준을 교육 시장의 글로벌 스탠다드로 만드는 것이 다음 목표입니다.
      </p>
    </Section>
  );
}
