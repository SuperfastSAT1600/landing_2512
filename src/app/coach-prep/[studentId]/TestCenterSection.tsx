'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { ChevronDown } from 'lucide-react';
import { DOMAIN_LABELS, type TcSession, type TcDomainStat } from '@/lib/coach-prep-test-center';
import type { ScorePoint } from './TestCenterScoreChart';

const TestCenterScoreChart = dynamic(() => import('./TestCenterScoreChart'), {
  ssr: false,
  loading: () => <div className="h-[200px] flex items-center justify-center text-[11px] text-gray-300">그래프 로딩…</div>,
});

const mmdd = (d: string) => d.slice(5).replace('-', '.');
const show = (n: number | null) => (n != null ? n : '—');

// 정식 합계(두 과목 모듈을 모두 푼 회차)만 Total 선과 증감에 쓴다
const isFull = (s: TcSession) => s.headline != null && s.headline.label == null;

function Delta({ cur, prev }: { cur: number | null; prev: number | null | undefined }) {
  if (cur == null || prev == null) return null;
  const d = cur - prev;
  const color = d > 0 ? 'text-emerald-600' : d < 0 ? 'text-red-500' : 'text-gray-400';
  return <span className={`text-xs font-semibold tabular-nums ${color}`}>{d > 0 ? `+${d}` : d}</span>;
}

function AccuracyBar({ accuracy, weak }: { accuracy: number; weak: boolean }) {
  return (
    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${weak ? 'bg-red-400' : 'bg-emerald-500'}`} style={{ width: `${accuracy}%` }} />
    </div>
  );
}

function DomainBlock({ d }: { d: TcDomainStat }) {
  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-gray-800">{DOMAIN_LABELS[d.domain] ?? d.domain}</span>
          <span className="tabular-nums text-gray-500">{d.correct}/{d.total} · <span className="font-bold text-gray-900">{d.accuracy}%</span></span>
        </div>
        <AccuracyBar accuracy={d.accuracy} weak={d.accuracy < 60} />
      </div>
      <ul className="space-y-1.5 pl-3 border-l-2 border-gray-100">
        {d.skills.map((sk) => (
          <li key={sk.skill} className="space-y-0.5">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="flex items-center gap-1.5 min-w-0">
                <span className="text-gray-600 truncate">{sk.skill}</span>
                {sk.weak && <span className="shrink-0 rounded bg-red-50 px-1 text-[10px] font-semibold text-red-600">약점</span>}
                {sk.lowSample && <span className="shrink-0 text-[10px] text-gray-400">표본 적음</span>}
              </span>
              <span className="shrink-0 tabular-nums text-gray-500">{sk.correct}/{sk.total} · {sk.accuracy}%</span>
            </div>
            <AccuracyBar accuracy={sk.accuracy} weak={sk.weak} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function SectionGroup({ label, color, domains }: { label: string; color: string; domains: TcDomainStat[] }) {
  if (domains.length === 0) return null;
  return (
    <div className="space-y-3">
      <p className={`text-[11px] font-semibold uppercase tracking-wider ${color}`}>{label}</p>
      {domains.map((d) => <DomainBlock key={d.domain} d={d} />)}
    </div>
  );
}

function SessionDetail({ session }: { session: TcSession }) {
  const rw = session.domains.filter((d) => d.section === 'rw');
  const math = session.domains.filter((d) => d.section === 'math');
  const other = session.domains.filter((d) => d.section === null);
  if (session.domains.length === 0) {
    return <p className="text-xs text-gray-400">이 회차는 스킬별 상세 기록이 없습니다.</p>;
  }
  return (
    <div className="space-y-4">
      <SectionGroup label="Reading & Writing" color="text-blue-600" domains={rw} />
      <SectionGroup label="Math" color="text-emerald-600" domains={math} />
      <SectionGroup label="기타" color="text-gray-500" domains={other} />
    </div>
  );
}

function SessionCard({ session, prev, open, onToggle }: { session: TcSession; prev: TcSession | undefined; open: boolean; onToggle: () => void }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full items-center gap-3 px-3 py-2.5 text-left">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tabular-nums text-gray-900">{show(session.headline?.value ?? null)}</span>
            {session.headline?.label
              ? <span className="text-[11px] font-medium text-amber-600">{session.headline.label}</span>
              : <Delta cur={session.totalScore} prev={prev?.totalScore} />}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs tabular-nums">
            <span className="font-semibold text-blue-700">RW {show(session.rwScore)}{session.rwPartial && <sup className="text-[9px] text-amber-600"> 일부</sup>}</span>
            <span className="font-semibold text-emerald-700">Math {show(session.mathScore)}{session.mathPartial && <sup className="text-[9px] text-amber-600"> 일부</sup>}</span>
            <span className="text-gray-400">{session.score}/{session.total} · {session.accuracy}%</span>
          </div>
          <div className="mt-0.5 flex gap-2 text-[11px] text-gray-400">
            <span className="tabular-nums whitespace-nowrap">{session.date}</span>
            <span className="truncate">{session.title}</span>
          </div>
        </div>
        <ChevronDown size={16} className={`shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="border-t border-gray-100 px-3 py-3">
          <SessionDetail session={session} />
        </div>
      )}
    </div>
  );
}

// 테스트센터(SRM 모의고사) 회차별 RW/Math/Total 예상 점수 + 도메인·스킬별 약점 아코디언
export function TestCenterSection({ sessions }: { sessions: TcSession[] }) {
  const latest = sessions.length - 1;
  const [openIdx, setOpenIdx] = useState<Set<number>>(() => new Set([latest]));

  const toggle = (i: number) =>
    setOpenIdx((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  const points: ScorePoint[] = sessions.map((s) => ({ date: mmdd(s.date), Total: isFull(s) ? s.totalScore : null, RW: s.rwScore, Math: s.mathScore }));
  const hasScores = points.some((p) => p.Total != null || p.RW != null || p.Math != null);

  return (
    <div className="space-y-4">
      {hasScores && <TestCenterScoreChart data={points} />}
      <div className="space-y-2">
        {[...sessions].reverse().map((s, k) => {
          const i = latest - k;
          return <SessionCard key={`${s.date}-${i}`} session={s} prev={sessions.slice(0, i).reverse().find(isFull)} open={openIdx.has(i)} onToggle={() => toggle(i)} />;
        })}
      </div>
      <p className="text-[11px] leading-relaxed text-gray-400">
        SAT 점수는 SRM 리포트와 같은 환산표로 계산한 예상치(공식 커브 아님)입니다. 모듈을 다 풀지 않은 과목은 푼 문항의 정답률로 낸 참고 점수이며 “일부”로 표시됩니다(Total 선에는 넣지 않습니다). 정답률 60% 미만 스킬(3문항 이상)은 약점으로 표시됩니다.
      </p>
    </div>
  );
}
