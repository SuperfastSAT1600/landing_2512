'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface PublishedMemo {
  id: string;
  created_at: string;
  content: string;
}

interface Props {
  token: string;
  memos: PublishedMemo[];
  studentName: string;
  studentCreatedAt: string | null;
  blogLinkCount: number;
  isEnrolled: boolean;
}

const ACCENT = '#6085FF';
const BG = '#09090b';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
}

function MemoItem({ memo }: { memo: PublishedMemo }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: BG, border: '1px solid rgba(255,255,255,0.08)' }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left transition-colors"
        style={{ background: 'transparent' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: ACCENT }} />
          <span className="text-sm font-medium text-white">{formatDate(memo.created_at)}</span>
        </div>
        {open
          ? <ChevronUp size={14} className="flex-shrink-0" style={{ color: 'rgba(255,255,255,0.4)' }} />
          : <ChevronDown size={14} className="flex-shrink-0" style={{ color: 'rgba(255,255,255,0.4)' }} />
        }
      </button>

      {open && (
        <div className="px-5 pb-5 pt-1">
          <div className="h-px mb-4" style={{ background: 'rgba(255,255,255,0.08)' }} />
          <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'rgba(255,255,255,0.75)' }}>{memo.content}</p>
        </div>
      )}
    </div>
  );
}

interface AdminPortalPost {
  id: string;
  title: string;
  content: string;
}

function AdminPostCard({ post }: { post: AdminPortalPost }) {
  return (
    <div
      className="rounded-2xl px-5 py-5"
      style={{ background: '#F0F4FF', border: '1.5px solid rgba(96,133,255,0.25)' }}
    >
      <div className="flex items-start gap-4">
        <span className="text-2xl flex-shrink-0 mt-0.5">📌</span>
        <div className="min-w-0 w-full">
          <p className="font-bold text-sm mb-1.5" style={{ color: '#09090b' }}>{post.title}</p>
          <p className="text-xs leading-relaxed" style={{ color: '#64748b', whiteSpace: 'pre-wrap' }}>{post.content}</p>
        </div>
      </div>
    </div>
  );
}

interface SupertestInfo {
  testDatetime: string | null;
  maxFreeSlots: number;
  applicantCount: number;
  slotsAvailable: number;
}

function useCountdown(testDatetime: string | null) {
  const [remaining, setRemaining] = useState('');
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (!testDatetime) return;

    function update() {
      const diff = new Date(testDatetime!).getTime() - Date.now();
      if (diff <= 0) { setExpired(true); setRemaining(''); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setRemaining(h > 0 ? `${h}시간 ${m}분 후 시험` : `${m}분 후 시험`);
    }

    update();
    const id = setInterval(update, 60000);
    return () => clearInterval(id);
  }, [testDatetime]);

  return { remaining, expired };
}

function SuperTestCard({ token }: { token: string }) {
  const [applied, setApplied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [full, setFull] = useState(false);
  const [info, setInfo] = useState<SupertestInfo | null>(null);
  const { remaining, expired } = useCountdown(info?.testDatetime ?? null);

  useEffect(() => {
    fetch('/api/portal/supertest-info')
      .then(r => r.json())
      .then((d: SupertestInfo) => {
        setInfo(d);
        if (d.slotsAvailable <= 0) setFull(true);
      })
      .catch(() => {});
  }, []);

  async function handleApply() {
    if (applied || submitting || full) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/portal/${token}/supertest-apply`, { method: 'POST' });
      if (res.status === 409) { setFull(true); return; }
      if (res.ok) {
        setApplied(true);
        setInfo(prev => prev ? { ...prev, applicantCount: prev.applicantCount + 1, slotsAvailable: prev.slotsAvailable - 1 } : prev);
      }
    } catch {
      console.error('신청 실패');
    } finally {
      setSubmitting(false);
    }
  }

  const btnLabel = applied ? '신청 완료 ✓' : submitting ? '처리 중...' : full ? '마감되었습니다' : '모의고사 신청하기';
  const btnDisabled = applied || submitting || full || expired;

  return (
    <div className="rounded-2xl px-5 py-5" style={{ background: '#F0F4FF', border: '1.5px solid rgba(96,133,255,0.25)' }}>
      <div className="flex items-start gap-4">
        <span className="text-2xl flex-shrink-0 mt-0.5">🎯</span>
        <div className="min-w-0 w-full">
          <p className="font-bold text-sm mb-1" style={{ color: '#09090b' }}>이번 주 SuperTest — 선착순 무료 응시</p>

          {/* 카운트다운 + 신청 현황 */}
          {info && (
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              {remaining && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(96,133,255,0.15)', color: ACCENT }}>
                  ⏱ {remaining}
                </span>
              )}
              {expired && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(239,68,68,0.1)', color: '#dc2626' }}>
                  시험 종료
                </span>
              )}
              <span className="text-xs" style={{ color: '#64748b' }}>
                {info.applicantCount}/{info.maxFreeSlots}명 신청
              </span>
            </div>
          )}

          <p className="text-xs leading-relaxed mb-4" style={{ color: '#64748b' }}>
            SuperfastSAT이 매주 진행하는 실전 모의고사입니다. 실제 SAT와 동일한 환경에서 시험을 경험하고
            현재 실력을 정확히 점검할 수 있습니다. 이번 주에는 선착순으로 무료 응시 기회를 드리고 있습니다.
            아래 버튼을 눌러 지금 바로 신청해 보세요.
          </p>
          <button
            onClick={handleApply}
            disabled={btnDisabled}
            className="w-full rounded-xl py-2.5 text-sm font-bold text-white transition-all"
            style={{
              background: (applied || full || expired) ? 'rgba(96,133,255,0.35)' : ACCENT,
              cursor: btnDisabled ? 'default' : 'pointer',
            }}
          >
            {btnLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function SecretPageCard({ title, description, icon, token, toolId }: {
  title: string;
  description: string;
  icon: string;
  token: string;
  toolId: string;
}) {
  const [applied, setApplied] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleApply() {
    if (applied || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/portal/${token}/tool-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toolId }),
      });
      if (res.ok) setApplied(true);
    } catch {
      console.error('신청 실패');
    } finally {
      setSubmitting(false);
    }
  }

  const btnLabel = applied ? '신청 완료 ✓' : submitting ? '처리 중...' : '사용 신청하기';

  return (
    <div
      className="rounded-2xl px-5 py-5"
      style={{ background: '#F0F4FF', border: '1.5px solid rgba(96,133,255,0.25)' }}
    >
      <div className="flex items-start gap-4">
        <span className="text-2xl flex-shrink-0 mt-0.5">{icon}</span>
        <div className="min-w-0 w-full">
          <p className="font-bold text-sm mb-1.5" style={{ color: '#09090b' }}>{title}</p>
          <p className="text-xs leading-relaxed mb-4" style={{ color: '#64748b' }}>{description}</p>
          <button
            onClick={handleApply}
            disabled={applied || submitting}
            className="w-full rounded-xl py-2.5 text-sm font-bold text-white transition-all"
            style={{
              background: applied ? 'rgba(96,133,255,0.35)' : ACCENT,
              cursor: (applied || submitting) ? 'default' : 'pointer',
            }}
          >
            {btnLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ConsultationOverlay({ token, memos, studentName, studentCreatedAt, blogLinkCount, isEnrolled }: Props) {
  const [adminPosts, setAdminPosts] = useState<AdminPortalPost[]>([]);

  useEffect(() => {
    if (isEnrolled) return;
    fetch('/api/portal/portal-posts')
      .then(r => r.json())
      .then((d: AdminPortalPost[]) => setAdminPosts(d))
      .catch(() => {});
  }, [isEnrolled]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto pt-12" style={{ background: '#F4F5F9' }}>

      {/* Dark cover */}
      <div className="relative overflow-hidden" style={{ background: BG }}>
        <div
          className="absolute inset-0 opacity-5 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle at 20% 50%, #6085FF 0%, transparent 50%), radial-gradient(circle at 80% 20%, #071be9 0%, transparent 40%)',
          }}
        />
        <div className="relative max-w-5xl mx-auto px-[6%] py-10 sm:py-16">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-px flex-1 max-w-[40px]" style={{ background: ACCENT }} />
            <p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: ACCENT }}>상담 기록</p>
          </div>
          <h1
            className="text-white mb-1 leading-tight"
            style={{ fontSize: 'clamp(2rem, 6vw, 4.5rem)', fontWeight: 800, letterSpacing: '-0.02em' }}
          >
            {studentName} 학생
          </h1>
          {studentCreatedAt && (
            <p className="text-slate-400 text-sm mb-8">
              {new Date(studentCreatedAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })} 시작
            </p>
          )}
          {/* 2 cards — horizontal on all screen sizes */}
          <div className="flex flex-row gap-3">
            <div
              className="flex-1 flex flex-col items-center justify-center rounded-2xl px-4 py-5"
              style={{ background: 'rgba(96,133,255,0.12)', border: '1px solid rgba(96,133,255,0.3)' }}
            >
              <span className="text-5xl font-bold leading-none" style={{ color: ACCENT }}>{memos.length}</span>
              <span className="text-slate-300 text-xs mt-1.5 uppercase tracking-widest">총 상담 횟수</span>
            </div>
            <div
              className="flex-1 flex flex-col items-center justify-center rounded-2xl px-4 py-5"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <span className="text-5xl font-bold leading-none text-white">{blogLinkCount}</span>
              <span className="text-slate-300 text-xs mt-1.5 uppercase tracking-widest">추천 학습 자료</span>
            </div>
          </div>
        </div>
      </div>

      {/* Light section */}
      <div style={{ background: '#F4F5F9' }}>
        <div className="max-w-5xl mx-auto px-[6%] py-8 pb-44">
          {(() => {
            const adminPostCards = adminPosts.map(post => (
              <AdminPostCard key={post.id} post={post} />
            ));

            const promoCards = (
              <>
                {adminPostCards}
                {!isEnrolled && <SuperTestCard token={token} />}
                <SecretPageCard
                  title="Vocab Counter를 소개합니다!"
                  description="SAT에서 자주 나오는 단어부터 전략적으로 공부할 수 있는 도구입니다. College Board가 공개한 실전 문제 전체를 분석해, 특정 단어가 시험에 몇 번 출제됐는지 즉시 확인할 수 있습니다. 예문과 문맥도 함께 제공되어 단순 암기가 아닌 실전 감각으로 어휘를 익힐 수 있습니다."
                  icon="📊"
                  token={token}
                  toolId="vocab-counter"
                />
                <SecretPageCard
                  title="Math Web을 소개합니다!"
                  description="개념별로 실전 문제를 바로 찾아볼 수 있는 수학 학습 도구입니다. QB Math 문제 전체에 개념이 태깅되어 있어, 자녀가 취약한 개념의 실전 문제만 골라 집중 연습하는 것이 가능합니다. 개념 이해에서 실전 적용까지 빈틈 없이 대비할 수 있습니다."
                  icon="🕸️"
                  token={token}
                  toolId="math-web"
                />
              </>
            );

            if (memos.length === 0) {
              return (
                <div className="space-y-3">
                  {promoCards}
                  <div className="rounded-2xl px-5 py-10 text-center bg-white" style={{ border: '1px solid #E2E8F0' }}>
                    <p className="text-slate-400 text-sm">아직 공유된 상담 내용이 없습니다.</p>
                  </div>
                </div>
              );
            }

            return (
              <div className="space-y-3">
                <MemoItem memo={memos[0]} />
                {promoCards}
                {memos.slice(1).map(memo => (
                  <MemoItem key={memo.id} memo={memo} />
                ))}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
