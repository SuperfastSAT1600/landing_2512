'use client';

import { useEffect, useId, useRef, useState, useCallback } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import styles from './ManagedShowcase.module.css';

/* ── Shared animation hook ──────────────────────────────────────── */
function useAnimationVisible(forceVisible = false) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(forceVisible);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (forceVisible) { setIsVisible(true); return; }
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setIsVisible(true); observer.disconnect(); } },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [forceVisible]);

  return { ref, isVisible };
}

/* ── Studying student figure ────────────────────────────────────── */
function StudyFigure({ highlight = false }: { highlight?: boolean }) {
  return (
    <svg width="44" height="46" viewBox="0 0 44 46" fill="none" aria-hidden="true">
      <ellipse cx="22" cy="9" rx="7" ry="7.5" fill={highlight ? 'rgba(96,133,255,0.45)' : 'rgba(255,255,255,0.28)'} />
      <path d="M10 24 C12 18 17 16 22 17 C27 16 32 18 34 24 L32 34 L12 34 Z" fill={highlight ? 'rgba(96,133,255,0.25)' : 'rgba(255,255,255,0.16)'} />
      <rect x="7" y="33" width="30" height="3" rx="1.5" fill="rgba(255,255,255,0.1)" />
      <rect x="11" y="26" width="22" height="8" rx="2"
        fill={highlight ? 'rgba(96,133,255,0.45)' : 'rgba(96,133,255,0.3)'}
        stroke="rgba(96,133,255,0.5)" strokeWidth="0.6"
      />
      <rect x="13" y="29" width="8" height="1.5" rx="0.75" fill="rgba(255,255,255,0.45)" />
      <rect x="13" y="31.5" width="5" height="1.5" rx="0.75" fill="rgba(255,255,255,0.25)" />
    </svg>
  );
}

/* ── AI keyword highlight ───────────────────────────────────────── */
const AI_KEYWORDS = ['ephemeral', '덧없는', 'epi'];

function renderHighlighted(text: string) {
  const parts = text.split(/(ephemeral|덧없는|epi)/g);
  return parts.map((p, i) =>
    AI_KEYWORDS.includes(p)
      ? <mark key={i} className={styles.aiHighlight}>{p}</mark>
      : <span key={i}>{p}</span>
  );
}

/* ================================================================
   CARD 01 — Custom Lessons / 맞춤형 수업 (퍼즐)
   ================================================================ */
const PUZZLE_PIECES_KO = ['스케줄', '시험 목표', '약점', '수업 스타일'] as const;
const PUZZLE_PIECES_EN = ['Schedule', 'Exam Goal', 'Weakness', 'Class Style'] as const;
const PUZZLE_POS_CLS = ['puzzleTL', 'puzzleTR', 'puzzleBL', 'puzzleBR'] as const;

export function CustomLessonCard({ forceVisible = false, lang = 'ko' }: { forceVisible?: boolean; lang?: 'ko' | 'en' }) {
  const { ref, isVisible } = useAnimationVisible(forceVisible);
  const [step, setStep] = useState(0);
  const puzzlePieces = lang === 'en' ? PUZZLE_PIECES_EN : PUZZLE_PIECES_KO;

  useEffect(() => {
    if (!isVisible) return;
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    function run() {
      setStep(0);
      puzzlePieces.forEach((_, i) => {
        timeouts.push(setTimeout(() => setStep(i + 1), 400 + i * 550));
      });
      timeouts.push(setTimeout(() => setStep(5), 400 + puzzlePieces.length * 550 + 200));
      timeouts.push(setTimeout(run, 400 + puzzlePieces.length * 550 + 200 + 1800));
    }

    run();
    return () => timeouts.forEach(clearTimeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible]);

  return (
    <article className={`${styles.card} ${isVisible ? styles.visible : ''}`} ref={ref} aria-label={lang === 'en' ? 'Custom Lessons' : '맞춤형 수업'}>
      <div className={`${styles.visual} ${styles.visual1}`} aria-hidden="true">
        <div className={styles.puzzleWrap}>
          <div className={styles.puzzleGrid}>
            {puzzlePieces.map((label, i) => (
              <div
                key={label}
                className={[
                  styles.puzzlePiece,
                  styles[PUZZLE_POS_CLS[i]],
                  step > i ? styles.puzzlePieceIn : '',
                ].join(' ')}
              >
                {label}
              </div>
            ))}
          </div>
          <div className={`${styles.puzzleCenter} ${step >= 5 ? styles.puzzleGlow : ''}`}>
            <span className={styles.puzzleCenterLabel}>{lang === 'en' ? 'Student' : '학생'}</span>
          </div>
        </div>
      </div>
      <div className={styles.text}>
        <p className={styles.cardNum}>01</p>
        <h3 className={styles.cardTitle}>{lang === 'en' ? 'Custom Lessons' : '맞춤형 수업'}</h3>
        <p className={styles.cardDesc}>
          {lang === 'en' ? (
            <>Your coach analyzes your child&apos;s current level and weak spots<br />to design a personalized 1-on-1 lesson plan.</>
          ) : (
            <>우리 아이의 현재 수준과 약점을<br />분석해 코치가 1:1로 수업을 설계합니다.</>
          )}
        </p>
      </div>
    </article>
  );
}

/* ================================================================
   CARD 02 — Progress Reports / 학습 리포트 (리포트 스크롤 리딩)
   ================================================================ */
const REPORT_DATES_KO = ['5월 22일', '5월 23일', '5월 24일', '5월 25일', '5월 26일'] as const;
const REPORT_DATES_EN = ['May 22', 'May 23', 'May 24', 'May 25', 'May 26'] as const;
const REPORT_CONTENT = [
  { score: 55, rw: 54, math: 56 },
  { score: 61, rw: 60, math: 63 },
  { score: 67, rw: 66, math: 68 },
  { score: 74, rw: 73, math: 76 },
  { score: 81, rw: 80, math: 82 },
] as const;

const COACH_MEMOS_KO = [
  `오늘은 첫 진단 수업이었습니다. R&W 54점, Math 56점으로 기준점을 확인했습니다. Words in Context 영역에서 오답률이 높아 어휘 실력 보강이 가장 우선 과제입니다. 다음 수업부터 고빈도 SAT 단어와 문맥 추론 전략을 집중적으로 다룰 예정입니다.`,
  `Words in Context 파트에서 +6점 향상이 확인되었습니다. 문맥 단서를 활용한 어휘 추론 능력이 빠르게 성장하고 있습니다. 다음 단계로 Expression of Ideas 영역을 추가하겠습니다. 오늘 학습한 어휘 30개를 주말까지 복습해주시기 바랍니다.`,
  `R&W +6점으로 꾸준한 상승세가 이어지고 있습니다. Math 68점은 기초 개념이 안정적으로 자리잡은 수준입니다. 이번 수업부터 Standard English Conventions 파트를 본격 시작합니다. 문법 규칙 시트를 출력해 매일 1회 확인하는 루틴을 권장합니다.`,
  `이번 수업으로 75점대에 진입했습니다. 시험 시간 배분 전략이 정착되면서 실수가 크게 줄었습니다. 다음 단계로 실전 모의고사 풀이를 시작합니다. 오답 노트를 작성하고 틀린 문제의 유형과 원인을 반드시 기록해주세요.`,
  `R&W 80점, Math 82점으로 5주 만에 총 +26점을 달성했습니다. Words in Context 파트 정확도는 현재 94% 수준입니다. 이제 풀 모의고사 단계로 전환합니다. 실전과 동일한 환경에서 시험을 보고, 매회 오답 분석 사이클을 유지해주세요.`,
] as const;

const COACH_MEMOS_EN = [
  `This was our first diagnostic session. R&W: 54, Math: 56 established our baseline. Words in Context showed the highest error rate — vocabulary building is the top priority. Starting next session, we'll focus intensively on high-frequency SAT words and context inference strategies.`,
  `Words in Context showed +6 points improvement. Vocabulary inference using context clues is growing rapidly. We'll add Expression of Ideas as the next area. Please review today's 30 vocabulary words by this weekend.`,
  `R&W +6 points — steady upward trend continues. Math 68 shows solid foundational concepts. Starting this session, we begin Standard English Conventions in earnest. Recommend reviewing the grammar rules sheet once daily.`,
  `This session broke into the 75-point range. Time management is taking hold and errors have dropped significantly. Moving to full practice exam phase. Keep an error log recording each mistake's type and cause.`,
  `R&W 80, Math 82 — total +26 points in just 5 weeks. Words in Context accuracy is now at 94%. Transitioning to full mock exams. Replicate real test conditions each time and maintain the post-exam error analysis cycle.`,
] as const;

const GRAPH_DATE_LABELS_KO = ['22일', '23일', '24일', '25일', '26일'];
const GRAPH_DATE_LABELS_EN = ['22nd', '23rd', '24th', '25th', '26th'];

const XY_POINTS: [number, number][] = [[28, 44], [65, 37], [102, 30], [139, 21], [176, 12]];

export function ScoreReportCard({ forceVisible = false, lang = 'ko' }: { forceVisible?: boolean; lang?: 'ko' | 'en' }) {
  const { ref, isVisible } = useAnimationVisible(forceVisible);
  const [idx, setIdx] = useState(0);
  const [reading, setReading] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (!isVisible) return;
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    function run(i: number) {
      setIdx(i);
      setReading(false);
      setFading(false);
      timeouts.push(setTimeout(() => setReading(true), 600));
      timeouts.push(setTimeout(() => setFading(true), 6200));
      timeouts.push(setTimeout(() => run((i + 1) % REPORT_CONTENT.length), 6700));
    }

    run(0);
    return () => timeouts.forEach(clearTimeout);
  }, [isVisible]);

  const rawId = useId();
  const gradId = `rdg${rawId.replace(/:/g, '')}`;

  const content = REPORT_CONTENT[idx];
  const prev = idx > 0 ? REPORT_CONTENT[idx - 1] : null;
  const delta = prev ? content.score - prev.score : null;
  const date = lang === 'en' ? REPORT_DATES_EN[idx] : REPORT_DATES_KO[idx];
  const graphDateLabels = lang === 'en' ? GRAPH_DATE_LABELS_EN : GRAPH_DATE_LABELS_KO;
  const coachMemos = lang === 'en' ? COACH_MEMOS_EN : COACH_MEMOS_KO;

  return (
    <article className={`${styles.card} ${isVisible ? styles.visible : ''}`} ref={ref} aria-label={lang === 'en' ? 'Progress Reports' : '학습 리포트'}>
      <div className={`${styles.visual} ${styles.visual2}`} aria-hidden="true">
        <div className={styles.reportWindow}>
          <div
            className={[
              styles.reportDoc,
              reading ? styles.reportDocReading : '',
              fading ? styles.reportDocFading : '',
            ].join(' ')}
          >
            <div className={styles.rdMeta}>
              <span className={styles.rdBrand}>SuperfastSAT</span>
              <span className={styles.rdDate}>{date}</span>
            </div>
            <h3 className={styles.rdTitle}>
              {lang === 'en' ? 'PROGRESS REPORT' : '학  습  리  포  트'}
            </h3>
            <div className={styles.rdRule} />

            <p className={styles.rdSectionLabel}>{lang === 'en' ? 'Session Score' : '수업 점수'}</p>
            <div className={styles.rdScoreBlock}>
              <span className={styles.rdScoreBig}>{content.score}</span>
              <span className={styles.rdScoreUnit}>{lang === 'en' ? ' pts' : '점'}</span>
              {delta !== null && delta > 0 && (
                <span className={styles.rdScoreDelta}>↑ +{delta}</span>
              )}
            </div>
            <div className={styles.rdSkillRows}>
              <div className={styles.rdSkillRow}>
                <span className={styles.rdSkillName}>Reading &amp; Writing</span>
                <span className={styles.rdLeader} />
                <span className={styles.rdSkillScore}>{content.rw}{lang === 'en' ? ' pts' : '점'}</span>
              </div>
              <div className={styles.rdSkillRow}>
                <span className={styles.rdSkillName}>Mathematics</span>
                <span className={styles.rdLeader} />
                <span className={styles.rdSkillScore}>{content.math}{lang === 'en' ? ' pts' : '점'}</span>
              </div>
            </div>

            <div className={styles.rdGraph}>
              <span className={styles.rdGraphLabel}>{lang === 'en' ? 'Score Trend' : '점수 추이'}</span>
              <svg
                viewBox="0 0 220 60"
                width="100%"
                className={styles.rdGraphSvg}
              >
                <defs>
                  <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6085ff" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="#6085ff" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <polygon
                  points="28,44 65,37 102,30 139,21 176,12 176,56 28,56"
                  fill={`url(#${gradId})`}
                />
                <polyline
                  points="28,44 65,37 102,30 139,21 176,12"
                  fill="none"
                  stroke="#6085ff"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeOpacity="0.75"
                />
                {XY_POINTS.map(([x, y], i) => (
                  <circle
                    key={i}
                    cx={x} cy={y}
                    r={i === idx ? 4.5 : 2.5}
                    fill={i === idx ? '#fff' : 'rgba(96,133,255,0.55)'}
                    stroke={i === idx ? '#6085ff' : 'none'}
                    strokeWidth="1.5"
                  />
                ))}
                <text
                  x={XY_POINTS[idx][0]}
                  y={XY_POINTS[idx][1] - 7}
                  textAnchor="middle"
                  fontSize="8"
                  fontWeight="700"
                  fill="#6085ff"
                >
                  {content.score}
                </text>
                {graphDateLabels.map((d, i) => (
                  <text key={i} x={XY_POINTS[i][0]} y={58} textAnchor="middle" fontSize="6.5" fill="rgba(0,0,0,0.28)">{d}</text>
                ))}
              </svg>
            </div>

            <div className={styles.rdRule} />

            <p className={styles.rdSectionLabel}>{lang === 'en' ? 'Coach Notes' : '코치 메모'}</p>
            <p className={styles.rdNote}>{coachMemos[idx]}</p>
            <div className={styles.rdSignature}>
              <span className={styles.rdCoach}>Coach Jason</span>
              <span className={styles.rdStamp}>{lang === 'en' ? 'Sent' : '발송됨'}</span>
            </div>
          </div>
        </div>
      </div>
      <div className={styles.text}>
        <p className={styles.cardNum}>02</p>
        <h3 className={styles.cardTitle}>{lang === 'en' ? 'Progress Reports' : '학습 리포트'}</h3>
        <p className={styles.cardDesc}>
          {lang === 'en' ? (
            <>After each session, check skill scores and growth trends<br />in your progress report.</>
          ) : (
            <>매 수업 후 스킬별 점수와 성장 추이를<br />리포트로 확인합니다.</>
          )}
        </p>
      </div>
    </article>
  );
}

/* ================================================================
   CARD 03 — Online Study Hall / 온라인 독서실 (2×2 화상 타일)
   ================================================================ */
const LIBRARY_STUDENTS = [
  { name: '김민서',  status: '출석' },
  { name: '이준혁',  status: '지각' },
  { name: '박지은',  status: '출석' },
  { name: '우리 아이', status: '휴식' },
] as const;

const STATUS_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  출석: { bg: 'rgba(34,197,94,0.15)',  border: 'rgba(34,197,94,0.4)',   text: '#4ade80' },
  지각: { bg: 'rgba(251,146,60,0.15)', border: 'rgba(251,146,60,0.4)',  text: '#fb923c' },
  휴식: { bg: 'rgba(148,163,184,0.15)',border: 'rgba(148,163,184,0.35)',text: '#94a3b8' },
};

function getStatusLabel(status: string, lang: 'ko' | 'en'): string {
  if (lang !== 'en') return status;
  if (status === '출석') return 'Present';
  if (status === '지각') return 'Late';
  if (status === '휴식') return 'Break';
  return status;
}

export function OnlineLibraryCard({ forceVisible = false, lang = 'ko' }: { forceVisible?: boolean; lang?: 'ko' | 'en' }) {
  const { ref, isVisible } = useAnimationVisible(forceVisible);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!isVisible) return;
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    function run() {
      setStep(0);
      LIBRARY_STUDENTS.forEach((_, i) => {
        timeouts.push(setTimeout(() => setStep(i + 1), 250 + i * 420));
      });
      timeouts.push(setTimeout(run, 250 + LIBRARY_STUDENTS.length * 420 + 2800));
    }

    run();
    return () => timeouts.forEach(clearTimeout);
  }, [isVisible]);

  return (
    <article className={`${styles.card} ${isVisible ? styles.visible : ''}`} ref={ref} aria-label={lang === 'en' ? 'Online Study Hall' : '온라인 독서실'}>
      <div className={`${styles.visual} ${styles.visual3}`} aria-hidden="true">
        <div className={styles.videoGrid4}>
          {LIBRARY_STUDENTS.map((s, i) => (
            <div
              key={s.name}
              className={`${styles.videoTile4} ${i === LIBRARY_STUDENTS.length - 1 ? styles.videoTileMe : ''} ${step > i ? styles.videoTileVisible : ''}`}
            >
              <span
                className={styles.tileStatusBadge}
                style={{
                  background: STATUS_COLORS[s.status].bg,
                  border: `1px solid ${STATUS_COLORS[s.status].border}`,
                  color: STATUS_COLORS[s.status].text,
                }}
              >
                {getStatusLabel(s.status, lang)}
              </span>
              <StudyFigure highlight={i === LIBRARY_STUDENTS.length - 1} />
              <div className={styles.videoFooter}>
                <span className={styles.videoActiveDot} />
                <span className={styles.videoName}>{s.name}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className={styles.text}>
        <p className={styles.cardNum}>03</p>
        <h3 className={styles.cardTitle}>{lang === 'en' ? 'Online Study Hall' : '온라인 독서실'}</h3>
        <p className={styles.cardDesc}>
          {lang === 'en' ? (
            <>Turn on your camera at the scheduled time<br />and join the study hall to complete homework.</>
          ) : (
            <>약속한 시간에 화상 카메라를 켜고<br />독서실에 접속해 숙제를 합니다.</>
          )}
        </p>
      </div>
    </article>
  );
}

/* ================================================================
   CARD 04 — AI Coach / AI 코치 (학생↔AI 번갈아 대화)
   ================================================================ */
const AI_MSGS_KO = [
  '지금 3번 문제 같이 좀 봐야겠는데요?',
  '논리 구조 파악했어요?',
  '그럼 거기부터 설명해줄게요',
] as const;

const AI_MSGS_EN = [
  "Let's look at question 3 together.",
  'Did you understand the logic?',
  "I'll explain it from there.",
] as const;

type CoachPhase = 'student1' | 'ai1' | 'ai2' | 'student2' | 'ai3' | 'done';

export function AICoachCard({ forceVisible = false, lang = 'ko' }: { forceVisible?: boolean; lang?: 'ko' | 'en' }) {
  const { ref, isVisible } = useAnimationVisible(forceVisible);
  const [phase, setPhase] = useState<CoachPhase>('student1');
  const [aiTyped, setAiTyped] = useState('');

  const aiMsgs = lang === 'en' ? AI_MSGS_EN : AI_MSGS_KO;

  useEffect(() => {
    if (!isVisible) return;
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    const intervals: ReturnType<typeof setInterval>[] = [];

    function typeAi(msg: string, onDone: () => void) {
      setAiTyped('');
      let i = 0;
      const iv = setInterval(() => {
        i++;
        setAiTyped(msg.slice(0, i));
        if (i >= msg.length) { clearInterval(iv); onDone(); }
      }, 44);
      intervals.push(iv);
    }

    function run() {
      setPhase('student1'); setAiTyped('');

      timeouts.push(setTimeout(() => {
        setPhase('ai1');
        typeAi(aiMsgs[0], () => {
          timeouts.push(setTimeout(() => {
            setPhase('ai2');
            typeAi(aiMsgs[1], () => {
              timeouts.push(setTimeout(() => {
                setPhase('student2');
                timeouts.push(setTimeout(() => {
                  setPhase('ai3');
                  typeAi(aiMsgs[2], () => {
                    timeouts.push(setTimeout(() => setPhase('done'), 400));
                  });
                }, 900));
              }, 600));
            });
          }, 600));
        });
      }, 1800));

      const cycle = 1800 + aiMsgs[0].length * 44 + 600 + aiMsgs[1].length * 44 + 600 + 900 + aiMsgs[2].length * 44 + 400 + 2200;
      timeouts.push(setTimeout(run, cycle));
    }

    run();
    return () => { timeouts.forEach(clearTimeout); intervals.forEach(clearInterval); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible]);

  const isAiTurn = phase === 'ai1' || phase === 'ai2' || phase === 'ai3';
  const isStudentTurn = phase === 'student1' || phase === 'student2' || phase === 'done';
  const studentText = lang === 'en'
    ? ((phase === 'student2' || phase === 'done') ? 'No...' : "I'm confused about how to solve this..")
    : ((phase === 'student2' || phase === 'done') ? '아뇨...' : '이 문제 어떻게 풀어야 할 지 헷갈리네..');

  return (
    <article className={`${styles.card} ${isVisible ? styles.visible : ''}`} ref={ref} aria-label={lang === 'en' ? 'AI Coach' : 'AI 코치'}>
      <div className={`${styles.visual} ${styles.visual4}`} aria-hidden="true">
        <div className={styles.coachScene}>

          {/* Left — student */}
          <div className={styles.coachStudent}>
            <div className={styles.confusionCloud} />
            <svg width="66" height="66" viewBox="0 0 52 52" fill="none" aria-hidden="true">
              <circle cx="26" cy="12" r="10" fill="rgba(255,255,255,0.25)" />
              <path d="M10 30 C12 24 18 22 26 23 C34 22 40 24 42 30 L40 46 L12 46 Z" fill="rgba(255,255,255,0.16)" />
              <rect x="6" y="45" width="40" height="4" rx="2" fill="rgba(255,255,255,0.09)" />
            </svg>
            <div className={`${styles.studentSpeech} ${isStudentTurn ? styles.studentSpeechVisible : ''}`}>
              {studentText}
            </div>
          </div>

          <div className={styles.coachDivider} />

          {/* Right — AI robot */}
          <div className={styles.coachAI}>
            <div className={styles.aiTopSpacer} />
            <div className={`${styles.aiOrb} ${phase !== 'student1' ? styles.aiOrbVisible : ''}`}>
              <svg width="44" height="44" viewBox="0 0 34 34" fill="none" aria-hidden="true">
                <line x1="17" y1="7" x2="17" y2="2" stroke="rgba(140,170,255,0.65)" strokeWidth="1.2" strokeLinecap="round"/>
                <circle cx="17" cy="1.5" r="1.5" fill="rgba(140,170,255,0.85)"/>
                <rect x="5" y="7" width="24" height="19" rx="4" fill="rgba(96,133,255,0.18)" stroke="rgba(140,170,255,0.65)" strokeWidth="1"/>
                <circle cx="5" cy="16.5" r="2" fill="rgba(96,133,255,0.25)" stroke="rgba(140,170,255,0.5)" strokeWidth="0.8"/>
                <circle cx="29" cy="16.5" r="2" fill="rgba(96,133,255,0.25)" stroke="rgba(140,170,255,0.5)" strokeWidth="0.8"/>
                <rect x="8.5" y="12" width="6" height="5" rx="2" fill="rgba(160,190,255,0.9)"/>
                <rect x="19.5" y="12" width="6" height="5" rx="2" fill="rgba(160,190,255,0.9)"/>
                <circle cx="11.5" cy="14.5" r="1.5" fill="rgba(255,255,255,0.9)"/>
                <circle cx="22.5" cy="14.5" r="1.5" fill="rgba(255,255,255,0.9)"/>
                <circle cx="12.2" cy="13.8" r="0.6" fill="rgba(30,50,160,0.7)"/>
                <circle cx="23.2" cy="13.8" r="0.6" fill="rgba(30,50,160,0.7)"/>
                <rect x="10" y="20.5" width="14" height="2.5" rx="1.25" fill="rgba(96,133,255,0.35)" stroke="rgba(140,170,255,0.5)" strokeWidth="0.6"/>
                <line x1="13.5" y1="20.5" x2="13.5" y2="23" stroke="rgba(96,133,255,0.5)" strokeWidth="0.6"/>
                <line x1="17" y1="20.5" x2="17" y2="23" stroke="rgba(96,133,255,0.5)" strokeWidth="0.6"/>
                <line x1="20.5" y1="20.5" x2="20.5" y2="23" stroke="rgba(96,133,255,0.5)" strokeWidth="0.6"/>
                <rect x="14" y="26" width="6" height="4" rx="1.5" fill="rgba(96,133,255,0.2)" stroke="rgba(140,170,255,0.4)" strokeWidth="0.6"/>
              </svg>
            </div>
            <div className={`${styles.aiSpeech} ${isAiTurn ? styles.aiSpeechVisible : ''}`}>
              {aiTyped}
              {isAiTurn && <span className={styles.cursor}>|</span>}
            </div>
          </div>

        </div>
      </div>
      <div className={styles.text}>
        <p className={styles.cardNum}>04</p>
        <h3 className={styles.cardTitle}>{lang === 'en' ? 'AI Coach' : 'AI 코치'}</h3>
        <p className={styles.cardDesc}>
          {lang === 'en' ? (
            <>The AI Coach identifies weak spots and<br />delivers real-time personalized instruction.</>
          ) : (
            <>부족한 부분을 발견해서 AI 코치가<br />실시간으로 수업을 진행합니다.</>
          )}
        </p>
      </div>
    </article>
  );
}

/* ================================================================
   CARD 05 — Vocab Study / 단어 공부 (플래시카드 플립)
   ================================================================ */
const FLASH_CARDS_KO = [
  { word: 'ephemeral',  meaning: '단기적인, 덧없는' },
  { word: 'reticent',   meaning: '과묵한, 말이 없는' },
  { word: 'cogent',     meaning: '설득력 있는' },
] as const;

const FLASH_CARDS_EN = [
  { word: 'ephemeral',  meaning: 'lasting for a very short time' },
  { word: 'reticent',   meaning: "not revealing one's thoughts" },
  { word: 'cogent',     meaning: 'powerfully persuasive' },
] as const;

export function VocabCard({ forceVisible = false, lang = 'ko' }: { forceVisible?: boolean; lang?: 'ko' | 'en' }) {
  const { ref, isVisible } = useAnimationVisible(forceVisible);
  const [cardIdx, setCardIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const flashCards = lang === 'en' ? FLASH_CARDS_EN : FLASH_CARDS_KO;

  useEffect(() => {
    if (!isVisible) return;
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    function cycle(idx: number) {
      setCardIdx(idx);
      setFlipped(false);
      timeouts.push(setTimeout(() => setFlipped(true), 1300));
      timeouts.push(setTimeout(() => cycle((idx + 1) % flashCards.length), 1300 + 700 + 1400));
    }

    cycle(0);
    return () => timeouts.forEach(clearTimeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible]);

  return (
    <article className={`${styles.card} ${isVisible ? styles.visible : ''}`} ref={ref} aria-label={lang === 'en' ? 'Vocab Study' : '단어 공부'}>
      <div className={`${styles.visual} ${styles.visual5}`} aria-hidden="true">
        <div className={styles.flashWrap}>
          <div className={styles.flashDots}>
            {flashCards.map((_, i) => (
              <span key={i} className={`${styles.flashDot} ${cardIdx === i ? styles.flashDotActive : ''}`} />
            ))}
          </div>
          <div className={styles.flipWrap}>
            <div className={`${styles.flipCard} ${flipped ? styles.flipped : ''}`}>
              <div className={styles.flipFront}>
                <span className={styles.flipWord}>{flashCards[cardIdx].word}</span>
                <span className={styles.flipHint}>{lang === 'en' ? 'Tap to see definition →' : '탭해서 뜻 보기 →'}</span>
              </div>
              <div className={styles.flipBack}>
                <span className={styles.flipMeaning}>{flashCards[cardIdx].meaning}</span>
                <span className={styles.flipWordSmall}>{flashCards[cardIdx].word}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className={styles.text}>
        <p className={styles.cardNum}>05</p>
        <h3 className={styles.cardTitle}>{lang === 'en' ? 'Vocab Study' : '단어 공부'}</h3>
        <p className={styles.cardDesc}>
          {lang === 'en' ? (
            <>AI finds the best method for your child<br />to master SAT vocabulary.</>
          ) : (
            <>학생에게 가장 맞는 방식을 AI로 찾아<br />SAT 단어를 공부합니다.</>
          )}
        </p>
      </div>
    </article>
  );
}

/* ================================================================
   CARD 06 — Mock Exams / 실전 모의고사 (달력 별표)
   ================================================================ */
const CAL_DAYS_KO = ['일', '월', '화', '수', '목', '금', '토'] as const;
const CAL_DAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const CAL_CELLS: (number | null)[] = [
  null, null, null, null, null, null,  1,
     2,    3,    4,    5,    6,    7,  8,
     9,   10,   11,   12,   13,   14, 15,
    16,   17,   18,   19,   20,   21, 22,
    23,   24,   25,   26,   27,   28, 29,
    30,   31, null, null, null, null, null,
];
const CAL_SAT_DATES = [1, 8, 15, 22, 29];

export function MockExamCard({ forceVisible = false, lang = 'ko' }: { forceVisible?: boolean; lang?: 'ko' | 'en' }) {
  const { ref, isVisible } = useAnimationVisible(forceVisible);
  const [starStep, setStarStep] = useState(0);
  const calDays = lang === 'en' ? CAL_DAYS_EN : CAL_DAYS_KO;

  useEffect(() => {
    if (!isVisible) return;
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    function run() {
      setStarStep(0);
      CAL_SAT_DATES.forEach((_, i) => {
        timeouts.push(setTimeout(() => setStarStep(i + 1), 400 + i * 560));
      });
      timeouts.push(setTimeout(run, 400 + (CAL_SAT_DATES.length - 1) * 560 + 2200));
    }

    run();
    return () => timeouts.forEach(clearTimeout);
  }, [isVisible]);

  return (
    <article className={`${styles.card} ${isVisible ? styles.visible : ''}`} ref={ref} aria-label={lang === 'en' ? 'Mock Exams' : '실전 모의고사'}>
      <div className={`${styles.visual} ${styles.visual6}`} aria-hidden="true">
        <div className={styles.calendarWrap}>
          <div className={styles.calHeader}>
            {calDays.map((d, i) => (
              <span key={d} className={`${styles.calDayLabel} ${i === 6 ? styles.calSatLabel : ''}`}>{d}</span>
            ))}
          </div>
          {[0, 1, 2, 3, 4, 5].map(row => (
            <div key={row} className={styles.calRow}>
              {CAL_CELLS.slice(row * 7, row * 7 + 7).map((date, col) => {
                const isSat = col === 6;
                const satIdx = isSat && date !== null ? CAL_SAT_DATES.indexOf(date) : -1;
                const hasStar = satIdx !== -1 && starStep > satIdx;
                return (
                  <div key={col} className={`${styles.calCell} ${isSat && date !== null ? styles.calSatCell : ''}`}>
                    {date !== null && (
                      <>
                        <span className={`${styles.calDate} ${isSat ? styles.calSatDate : ''}`}>{date}</span>
                        {hasStar && <span key={`s${date}-${starStep}`} className={styles.calStar}>✓</span>}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className={styles.text}>
        <p className={styles.cardNum}>06</p>
        <h3 className={styles.cardTitle}>{lang === 'en' ? 'Mock Exams' : '실전 모의고사'}</h3>
        <p className={styles.cardDesc}>
          {lang === 'en' ? (
            <>Weekly SAT mock exams to keep<br />real test instincts sharp.</>
          ) : (
            <>매주 SAT 모의고사로<br />실전 감각을 유지합니다.</>
          )}
        </p>
      </div>
    </article>
  );
}

/* ================================================================
   TAB NAVIGATION helpers
   ================================================================ */
const PANEL_VARIANTS = {
  enter: (dir: number) => ({ x: dir * 48, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir * -48, opacity: 0 }),
};

const PANEL_TRANSITION = { duration: 0.3, ease: [0.4, 0, 0.2, 1] as const };

type TabEntry = {
  id: string;
  label: string;
  panel: (v: boolean) => React.ReactNode;
};

function getTabsForLang(lang: 'ko' | 'en'): TabEntry[] {
  const labels = lang === 'en'
    ? {
        customLesson: 'Custom Lessons',
        scoreReport: 'Progress Reports',
        studyHall: 'Online Study Hall',
        aiCoach: 'AI Coach',
        vocab: 'Vocab Study',
        mockExam: 'Mock Exams',
      }
    : {
        customLesson: '맞춤형 수업',
        scoreReport: '학습 리포트',
        studyHall: '온라인 독서실',
        aiCoach: 'AI 코치',
        vocab: '단어 공부',
        mockExam: '실전 모의고사',
      };

  return [
    { id: '맞춤형 수업',    label: labels.customLesson, panel: (v) => <CustomLessonCard forceVisible={v} lang={lang} /> },
    { id: '학습 리포트',    label: labels.scoreReport,  panel: (v) => <ScoreReportCard forceVisible={v} lang={lang} /> },
    { id: '온라인 독서실',  label: labels.studyHall,    panel: (v) => <OnlineLibraryCard forceVisible={v} lang={lang} /> },
    { id: 'AI 코치',       label: labels.aiCoach,      panel: (v) => <AICoachCard forceVisible={v} lang={lang} /> },
    { id: '단어 공부',      label: labels.vocab,        panel: (v) => <VocabCard forceVisible={v} lang={lang} /> },
    { id: '실전 모의고사',  label: labels.mockExam,     panel: (v) => <MockExamCard forceVisible={v} lang={lang} /> },
  ];
}

/* ================================================================
   UNMANAGED SHOWCASE — 3-tab animated showcase
   ================================================================ */
export function UnmanagedShowcase({ lang = 'ko' }: { lang?: 'ko' | 'en' } = {}) {
  const allTabs = getTabsForLang(lang);
  const tabs = [allTabs[0], allTabs[1], allTabs[4]]; // customLesson, scoreReport, vocab

  const [activeTab, setActiveTab] = useState(0);
  const [userInteracted, setUserInteracted] = useState(false);
  const [direction, setDirection] = useState(1);
  const reduce = useReducedMotion();

  const handleTabClick = useCallback((idx: number) => {
    setDirection(idx >= activeTab ? 1 : -1);
    setActiveTab(idx);
    setUserInteracted(true);
  }, [activeTab]);

  useEffect(() => {
    if (userInteracted) return;
    const iv = setInterval(() => {
      setDirection(1);
      setActiveTab(prev => (prev + 1) % tabs.length);
    }, 5000);
    return () => clearInterval(iv);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userInteracted]);

  const headingText = lang === 'en'
    ? <>Self-Directed Classes<br />Up Close</>
    : <>자기주도형 수업<br />자세히 살펴보기</>;

  const ariaLabel = lang === 'en' ? 'Self-directed services' : '자기주도 서비스';

  return (
    <section className={styles.section} aria-labelledby="unmanaged-showcase-heading">
      <div className={styles.header} style={{ textAlign: 'center' }}>
        <h2 id="unmanaged-showcase-heading" className={styles.sectionTitle}>
          {headingText}
        </h2>
      </div>

      <div className={styles.tabBar} role="tablist" aria-label={ariaLabel} style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        {tabs.map((tab, idx) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === idx}
            aria-controls={`un-tab-panel-${idx}`}
            className={`${styles.tabBtn} ${activeTab === idx ? styles.tabBtnActive : ''}`}
            onClick={() => handleTabClick(idx)}
          >
            <span className={styles.tabLabel}>{tab.label}</span>
            {activeTab === idx && !userInteracted && (
              <span key={`un-progress-${activeTab}`} className={styles.tabBtnProgress} />
            )}
          </button>
        ))}
      </div>

      <div className={styles.tabPanel}>
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div
            key={activeTab}
            id={`un-tab-panel-${activeTab}`}
            role="tabpanel"
            custom={direction}
            variants={reduce ? undefined : PANEL_VARIANTS}
            initial={reduce ? false : 'enter'}
            animate="center"
            exit={reduce ? undefined : 'exit'}
            transition={PANEL_TRANSITION}
          >
            {tabs[activeTab]?.panel(true)}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className={styles.dots} aria-hidden="true">
        {tabs.map((_, idx) => (
          <button
            key={idx}
            className={`${styles.dot} ${activeTab === idx ? styles.dotActive : ''}`}
            onClick={() => handleTabClick(idx)}
            tabIndex={-1}
          />
        ))}
      </div>
    </section>
  );
}

/* ================================================================
   MAIN EXPORT — ManagedShowcase
   ================================================================ */
export function ManagedShowcase({
  excludeTabs,
  mobileColumns = 3,
  lang = 'ko',
}: {
  excludeTabs?: readonly string[];
  mobileColumns?: 2 | 3;
  lang?: 'ko' | 'en';
} = {}) {
  const allTabs = getTabsForLang(lang);
  const tabs = excludeTabs
    ? allTabs.filter(t => !excludeTabs.includes(t.id))
    : allTabs;

  const [activeTab, setActiveTab] = useState(0);
  const [userInteracted, setUserInteracted] = useState(false);
  const [direction, setDirection] = useState(1);
  const reduce = useReducedMotion();

  const handleTabClick = useCallback((idx: number) => {
    setDirection(idx >= activeTab ? 1 : -1);
    setActiveTab(idx);
    setUserInteracted(true);
  }, [activeTab]);

  useEffect(() => {
    if (userInteracted) return;
    const iv = setInterval(() => {
      setDirection(1);
      setActiveTab(prev => (prev + 1) % tabs.length);
    }, 5000);
    return () => clearInterval(iv);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userInteracted, tabs.length]);

  const headingText = lang === 'en'
    ? <>Managed Classes<br />Up Close</>
    : <>관리형 수업<br />자세히 살펴보기</>;

  const ariaLabel = lang === 'en' ? 'Managed services' : '관리형 서비스';

  return (
    <section className={styles.section} aria-labelledby="managed-showcase-heading">
      <div className={styles.header}>
        <h2 id="managed-showcase-heading" className={styles.sectionTitle}>
          {headingText}
        </h2>
      </div>

      <div
        className={styles.tabBar}
        role="tablist"
        aria-label={ariaLabel}
        style={mobileColumns === 2 ? { gridTemplateColumns: 'repeat(2, 1fr)' } : undefined}
      >
        {tabs.map((tab, idx) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === idx}
            aria-controls={`tab-panel-${idx}`}
            className={`${styles.tabBtn} ${activeTab === idx ? styles.tabBtnActive : ''}`}
            onClick={() => handleTabClick(idx)}
          >
            <span className={styles.tabLabel}>{tab.label}</span>
            {activeTab === idx && !userInteracted && (
              <span key={`progress-${activeTab}`} className={styles.tabBtnProgress} />
            )}
          </button>
        ))}
      </div>

      <div className={styles.tabPanel}>
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div
            key={activeTab}
            id={`tab-panel-${activeTab}`}
            role="tabpanel"
            aria-labelledby={`tab-${activeTab}`}
            custom={direction}
            variants={reduce ? undefined : PANEL_VARIANTS}
            initial={reduce ? false : 'enter'}
            animate="center"
            exit={reduce ? undefined : 'exit'}
            transition={PANEL_TRANSITION}
          >
            {tabs[activeTab]?.panel(true)}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className={styles.dots} aria-hidden="true">
        {tabs.map((_, idx) => (
          <button
            key={idx}
            className={`${styles.dot} ${activeTab === idx ? styles.dotActive : ''}`}
            onClick={() => handleTabClick(idx)}
            tabIndex={-1}
          />
        ))}
      </div>
    </section>
  );
}
