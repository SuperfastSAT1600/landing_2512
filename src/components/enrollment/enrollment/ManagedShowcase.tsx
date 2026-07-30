'use client';

import { useEffect, useId, useRef, useState, useCallback } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import styles from './ManagedShowcase.module.css';

/* ── Shared animation hook ──────────────────────────────────────── */
function useAnimationVisible(forceVisible = false) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(forceVisible);

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
   CARD 01 — 맞춤형 수업 (퍼즐)
   ================================================================ */
const PUZZLE_PIECES = ['스케줄', '시험 목표', '약점', '수업 스타일'] as const;
const PUZZLE_POS_CLS = ['puzzleTL', 'puzzleTR', 'puzzleBL', 'puzzleBR'] as const;

export function CustomLessonCard({ forceVisible = false }: { forceVisible?: boolean }) {
  const { ref, isVisible } = useAnimationVisible(forceVisible);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!isVisible) return;
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    function run() {
      setStep(0);
      PUZZLE_PIECES.forEach((_, i) => {
        timeouts.push(setTimeout(() => setStep(i + 1), 400 + i * 550));
      });
      timeouts.push(setTimeout(() => setStep(5), 400 + PUZZLE_PIECES.length * 550 + 200));
      timeouts.push(setTimeout(run, 400 + PUZZLE_PIECES.length * 550 + 200 + 1800));
    }

    run();
    return () => timeouts.forEach(clearTimeout);
  }, [isVisible]);

  return (
    <article className={`${styles.card} ${isVisible ? styles.visible : ''}`} ref={ref} aria-label="맞춤형 수업">
      <div className={`${styles.visual} ${styles.visual1}`} aria-hidden="true">
        <div className={styles.puzzleWrap}>
          <div className={styles.puzzleGrid}>
            {PUZZLE_PIECES.map((label, i) => (
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
            <span className={styles.puzzleCenterLabel}>학생</span>
          </div>
        </div>
      </div>
      <div className={styles.text}>
        <p className={styles.cardNum}>01</p>
        <h3 className={styles.cardTitle}>맞춤형 수업</h3>
        <p className={styles.cardDesc}>
          우리 아이의 현재 수준과 약점을<br />
          분석해 코치가 1:1로 수업을 설계합니다.
        </p>
      </div>
    </article>
  );
}

/* ================================================================
   CARD 02 — 학습 리포트 (리포트 스크롤 리딩)
   ================================================================ */
const REPORT_DATES = ['5월 22일', '5월 23일', '5월 24일', '5월 25일', '5월 26일'] as const;
const REPORT_CONTENT = [
  { score: 55, rw: 54, math: 56 },
  { score: 61, rw: 60, math: 63 },
  { score: 67, rw: 66, math: 68 },
  { score: 74, rw: 73, math: 76 },
  { score: 81, rw: 80, math: 82 },
] as const;

const COACH_MEMOS = [
  `오늘은 첫 진단 수업이었습니다. R&W 54점, Math 56점으로 기준점을 확인했습니다. Words in Context 영역에서 오답률이 높아 어휘 실력 보강이 가장 우선 과제입니다. 다음 수업부터 고빈도 SAT 단어와 문맥 추론 전략을 집중적으로 다룰 예정입니다.`,
  `Words in Context 파트에서 +6점 향상이 확인되었습니다. 문맥 단서를 활용한 어휘 추론 능력이 빠르게 성장하고 있습니다. 다음 단계로 Expression of Ideas 영역을 추가하겠습니다. 오늘 학습한 어휘 30개를 주말까지 복습해주시기 바랍니다.`,
  `R&W +6점으로 꾸준한 상승세가 이어지고 있습니다. Math 68점은 기초 개념이 안정적으로 자리잡은 수준입니다. 이번 수업부터 Standard English Conventions 파트를 본격 시작합니다. 문법 규칙 시트를 출력해 매일 1회 확인하는 루틴을 권장합니다.`,
  `이번 수업으로 75점대에 진입했습니다. 시험 시간 배분 전략이 정착되면서 실수가 크게 줄었습니다. 다음 단계로 실전 모의고사 풀이를 시작합니다. 오답 노트를 작성하고 틀린 문제의 유형과 원인을 반드시 기록해주세요.`,
  `R&W 80점, Math 82점으로 5주 만에 총 +26점을 달성했습니다. Words in Context 파트 정확도는 현재 94% 수준입니다. 이제 풀 모의고사 단계로 전환합니다. 실전과 동일한 환경에서 시험을 보고, 매회 오답 분석 사이클을 유지해주세요.`,
] as const;

const XY_POINTS: [number, number][] = [[28, 44], [65, 37], [102, 30], [139, 21], [176, 12]];
const GRAPH_DATE_LABELS = ['22일', '23일', '24일', '25일', '26일'];

export function ScoreReportCard({ forceVisible = false }: { forceVisible?: boolean }) {
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
  const date = REPORT_DATES[idx];

  return (
    <article className={`${styles.card} ${isVisible ? styles.visible : ''}`} ref={ref} aria-label="학습 리포트">
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
            <h3 className={styles.rdTitle}>학&nbsp;&nbsp;습&nbsp;&nbsp;리&nbsp;&nbsp;포&nbsp;&nbsp;트</h3>
            <div className={styles.rdRule} />

            <p className={styles.rdSectionLabel}>수업 점수</p>
            <div className={styles.rdScoreBlock}>
              <span className={styles.rdScoreBig}>{content.score}</span>
              <span className={styles.rdScoreUnit}>점</span>
              {delta !== null && delta > 0 && (
                <span className={styles.rdScoreDelta}>↑ +{delta}</span>
              )}
            </div>
            <div className={styles.rdSkillRows}>
              <div className={styles.rdSkillRow}>
                <span className={styles.rdSkillName}>Reading &amp; Writing</span>
                <span className={styles.rdLeader} />
                <span className={styles.rdSkillScore}>{content.rw}점</span>
              </div>
              <div className={styles.rdSkillRow}>
                <span className={styles.rdSkillName}>Mathematics</span>
                <span className={styles.rdLeader} />
                <span className={styles.rdSkillScore}>{content.math}점</span>
              </div>
            </div>

            <div className={styles.rdGraph}>
              <span className={styles.rdGraphLabel}>점수 추이</span>
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
                {GRAPH_DATE_LABELS.map((d, i) => (
                  <text key={i} x={XY_POINTS[i][0]} y={58} textAnchor="middle" fontSize="6.5" fill="rgba(0,0,0,0.28)">{d}</text>
                ))}
              </svg>
            </div>

            <div className={styles.rdRule} />

            <p className={styles.rdSectionLabel}>코치 메모</p>
            <p className={styles.rdNote}>{COACH_MEMOS[idx]}</p>
            <div className={styles.rdSignature}>
              <span className={styles.rdCoach}>코치 Jason</span>
              <span className={styles.rdStamp}>발송됨</span>
            </div>
          </div>
        </div>
      </div>
      <div className={styles.text}>
        <p className={styles.cardNum}>02</p>
        <h3 className={styles.cardTitle}>학습 리포트</h3>
        <p className={styles.cardDesc}>
          매 수업 후 스킬별 점수와 성장 추이를<br />
          리포트로 확인합니다.
        </p>
      </div>
    </article>
  );
}

/* ================================================================
   CARD 03 — 온라인 독서실 (2×2 화상 타일)
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

export function OnlineLibraryCard({ forceVisible = false }: { forceVisible?: boolean }) {
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
    <article className={`${styles.card} ${isVisible ? styles.visible : ''}`} ref={ref} aria-label="온라인 독서실">
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
                {s.status}
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
        <h3 className={styles.cardTitle}>온라인 독서실</h3>
        <p className={styles.cardDesc}>
          약속한 시간에 화상 카메라를 켜고<br />
          독서실에 접속해 숙제를 합니다.
        </p>
      </div>
    </article>
  );
}

/* ================================================================
   CARD 04 — AI 코치 (학생↔AI 번갈아 대화)
   ================================================================ */
const AI_MSGS = [
  '지금 3번 문제 같이 좀 봐야겠는데요?',
  '논리 구조 파악했어요?',
  '그럼 거기부터 설명해줄게요',
] as const;

type CoachPhase = 'student1' | 'ai1' | 'ai2' | 'student2' | 'ai3' | 'done';

export function AICoachCard({ forceVisible = false }: { forceVisible?: boolean }) {
  const { ref, isVisible } = useAnimationVisible(forceVisible);
  const [phase, setPhase] = useState<CoachPhase>('student1');
  const [aiTyped, setAiTyped] = useState('');

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
        typeAi(AI_MSGS[0], () => {
          timeouts.push(setTimeout(() => {
            setPhase('ai2');
            typeAi(AI_MSGS[1], () => {
              timeouts.push(setTimeout(() => {
                setPhase('student2');
                timeouts.push(setTimeout(() => {
                  setPhase('ai3');
                  typeAi(AI_MSGS[2], () => {
                    timeouts.push(setTimeout(() => setPhase('done'), 400));
                  });
                }, 900));
              }, 600));
            });
          }, 600));
        });
      }, 1800));

      const cycle = 1800 + AI_MSGS[0].length * 44 + 600 + AI_MSGS[1].length * 44 + 600 + 900 + AI_MSGS[2].length * 44 + 400 + 2200;
      timeouts.push(setTimeout(run, cycle));
    }

    run();
    return () => { timeouts.forEach(clearTimeout); intervals.forEach(clearInterval); };
  }, [isVisible]);

  const isAiTurn = phase === 'ai1' || phase === 'ai2' || phase === 'ai3';
  const isStudentTurn = phase === 'student1' || phase === 'student2' || phase === 'done';
  const studentText = (phase === 'student2' || phase === 'done') ? '아뇨...' : '이 문제 어떻게 풀어야 할 지 헷갈리네..';

  return (
    <article className={`${styles.card} ${isVisible ? styles.visible : ''}`} ref={ref} aria-label="AI 코치">
      <div className={`${styles.visual} ${styles.visual4}`} aria-hidden="true">
        <div className={styles.coachScene}>

          {/* 왼쪽 — 학생 */}
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

          {/* 오른쪽 — AI 로봇 */}
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
        <h3 className={styles.cardTitle}>AI 코치</h3>
        <p className={styles.cardDesc}>
          부족한 부분을 발견해서 AI 코치가<br />
          실시간으로 수업을 진행합니다.
        </p>
      </div>
    </article>
  );
}

/* ================================================================
   CARD 05 — 단어 공부 (플래시카드 플립)
   ================================================================ */
const FLASH_CARDS = [
  { word: 'ephemeral',  meaning: '단기적인, 덧없는' },
  { word: 'reticent',   meaning: '과묵한, 말이 없는' },
  { word: 'cogent',     meaning: '설득력 있는' },
] as const;

export function VocabCard({ forceVisible = false }: { forceVisible?: boolean }) {
  const { ref, isVisible } = useAnimationVisible(forceVisible);
  const [cardIdx, setCardIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    if (!isVisible) return;
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    function cycle(idx: number) {
      setCardIdx(idx);
      setFlipped(false);
      timeouts.push(setTimeout(() => setFlipped(true), 1300));
      timeouts.push(setTimeout(() => cycle((idx + 1) % FLASH_CARDS.length), 1300 + 700 + 1400));
    }

    cycle(0);
    return () => timeouts.forEach(clearTimeout);
  }, [isVisible]);

  return (
    <article className={`${styles.card} ${isVisible ? styles.visible : ''}`} ref={ref} aria-label="단어 공부">
      <div className={`${styles.visual} ${styles.visual5}`} aria-hidden="true">
        <div className={styles.flashWrap}>
          <div className={styles.flashDots}>
            {FLASH_CARDS.map((_, i) => (
              <span key={i} className={`${styles.flashDot} ${cardIdx === i ? styles.flashDotActive : ''}`} />
            ))}
          </div>
          <div className={styles.flipWrap}>
            <div className={`${styles.flipCard} ${flipped ? styles.flipped : ''}`}>
              <div className={styles.flipFront}>
                <span className={styles.flipWord}>{FLASH_CARDS[cardIdx].word}</span>
                <span className={styles.flipHint}>탭해서 뜻 보기 →</span>
              </div>
              <div className={styles.flipBack}>
                <span className={styles.flipMeaning}>{FLASH_CARDS[cardIdx].meaning}</span>
                <span className={styles.flipWordSmall}>{FLASH_CARDS[cardIdx].word}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className={styles.text}>
        <p className={styles.cardNum}>05</p>
        <h3 className={styles.cardTitle}>단어 공부</h3>
        <p className={styles.cardDesc}>
          학생에게 가장 맞는 방식을 AI로 찾아<br />
          SAT 단어를 공부합니다.
        </p>
      </div>
    </article>
  );
}

/* ================================================================
   CARD 06 — 실전 모의고사 (달력 별표)
   ================================================================ */
// Month starting on Saturday (토 = col 6), 31 days → 5 Saturdays
const CAL_DAYS = ['일', '월', '화', '수', '목', '금', '토'] as const;
const CAL_CELLS: (number | null)[] = [
  null, null, null, null, null, null,  1,
     2,    3,    4,    5,    6,    7,  8,
     9,   10,   11,   12,   13,   14, 15,
    16,   17,   18,   19,   20,   21, 22,
    23,   24,   25,   26,   27,   28, 29,
    30,   31, null, null, null, null, null,
];
const CAL_SAT_DATES = [1, 8, 15, 22, 29];

export function MockExamCard({ forceVisible = false }: { forceVisible?: boolean }) {
  const { ref, isVisible } = useAnimationVisible(forceVisible);
  const [starStep, setStarStep] = useState(0);

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
    <article className={`${styles.card} ${isVisible ? styles.visible : ''}`} ref={ref} aria-label="실전 모의고사">
      <div className={`${styles.visual} ${styles.visual6}`} aria-hidden="true">
        <div className={styles.calendarWrap}>
          <div className={styles.calHeader}>
            {CAL_DAYS.map((d, i) => (
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
        <h3 className={styles.cardTitle}>실전 모의고사</h3>
        <p className={styles.cardDesc}>
          매주 SAT 모의고사로<br />
          실전 감각을 유지합니다.
        </p>
      </div>
    </article>
  );
}

/* ================================================================
   UNMANAGED SHOWCASE — 3-tab animated showcase
   ================================================================ */
const UNMANAGED_TAB_LABELS = ['맞춤형 수업', '학습 리포트', '단어 공부'] as const;

export function UnmanagedShowcase() {
  const [activeTab, setActiveTab] = useState(0);
  const [userInteracted, setUserInteracted] = useState(false);
  const directionRef = useRef(1);
  const reduce = useReducedMotion();

  const handleTabClick = useCallback((idx: number) => {
    directionRef.current = idx >= activeTab ? 1 : -1;
    setActiveTab(idx);
    setUserInteracted(true);
  }, [activeTab]);

  useEffect(() => {
    if (userInteracted) return;
    const iv = setInterval(() => {
      directionRef.current = 1;
      setActiveTab(prev => (prev + 1) % UNMANAGED_TAB_LABELS.length);
    }, 5000);
    return () => clearInterval(iv);
  }, [userInteracted]);

  return (
    <section className={styles.section} aria-labelledby="unmanaged-showcase-heading">
      <div className={styles.header} style={{ textAlign: 'center' }}>
        <h2 id="unmanaged-showcase-heading" className={styles.sectionTitle}>
          자기주도 수업 시스템<br />
          3가지 살펴보기
        </h2>
      </div>

      <div className={styles.tabBar} role="tablist" aria-label="자기주도 서비스" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        {UNMANAGED_TAB_LABELS.map((label, idx) => (
          <button
            key={label}
            role="tab"
            aria-selected={activeTab === idx}
            aria-controls={`un-tab-panel-${idx}`}
            className={`${styles.tabBtn} ${activeTab === idx ? styles.tabBtnActive : ''}`}
            onClick={() => handleTabClick(idx)}
          >
            <span className={styles.tabLabel}>{label}</span>
            {activeTab === idx && !userInteracted && (
              <span key={`un-progress-${activeTab}`} className={styles.tabBtnProgress} />
            )}
          </button>
        ))}
      </div>

      <div className={styles.tabPanel}>
        <AnimatePresence mode="wait" initial={false} custom={directionRef.current}>
          <motion.div
            key={activeTab}
            id={`un-tab-panel-${activeTab}`}
            role="tabpanel"
            custom={directionRef.current}
            variants={reduce ? undefined : PANEL_VARIANTS}
            initial={reduce ? false : 'enter'}
            animate="center"
            exit={reduce ? undefined : 'exit'}
            transition={PANEL_TRANSITION}
          >
            {activeTab === 0 && <CustomLessonCard forceVisible />}
            {activeTab === 1 && <ScoreReportCard forceVisible />}
            {activeTab === 2 && <VocabCard forceVisible />}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className={styles.dots} aria-hidden="true">
        {UNMANAGED_TAB_LABELS.map((_, idx) => (
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
   TAB NAVIGATION
   ================================================================ */
const TAB_LABELS = [
  '맞춤형 수업',
  '학습 리포트',
  '온라인 독서실',
  'AI 코치',
  '단어 공부',
  '실전 모의고사',
] as const;

const PANEL_VARIANTS = {
  enter: (dir: number) => ({ x: dir * 48, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir * -48, opacity: 0 }),
};

const PANEL_TRANSITION = { duration: 0.3, ease: [0.4, 0, 0.2, 1] as const };

/* ================================================================
   MAIN EXPORT
   ================================================================ */
export function ManagedShowcase() {
  const [activeTab, setActiveTab] = useState(0);
  const [userInteracted, setUserInteracted] = useState(false);
  const directionRef = useRef(1);
  const reduce = useReducedMotion();

  const handleTabClick = useCallback((idx: number) => {
    directionRef.current = idx >= activeTab ? 1 : -1;
    setActiveTab(idx);
    setUserInteracted(true);
  }, [activeTab]);

  useEffect(() => {
    if (userInteracted) return;
    const iv = setInterval(() => {
      directionRef.current = 1;
      setActiveTab(prev => (prev + 1) % TAB_LABELS.length);
    }, 5000);
    return () => clearInterval(iv);
  }, [userInteracted]);

  return (
    <section className={styles.section} aria-labelledby="managed-showcase-heading">
      <div className={styles.header}>
        <h2 id="managed-showcase-heading" className={styles.sectionTitle}>
          관리형 수업 시스템<br />
          6가지 살펴보기
        </h2>
      </div>

      <div className={styles.tabBar} role="tablist" aria-label="관리형 서비스">
        {TAB_LABELS.map((label, idx) => (
          <button
            key={label}
            role="tab"
            aria-selected={activeTab === idx}
            aria-controls={`tab-panel-${idx}`}
            className={`${styles.tabBtn} ${activeTab === idx ? styles.tabBtnActive : ''}`}
            onClick={() => handleTabClick(idx)}
          >
            <span className={styles.tabLabel}>{label}</span>
            {activeTab === idx && !userInteracted && (
              <span key={`progress-${activeTab}`} className={styles.tabBtnProgress} />
            )}
          </button>
        ))}
      </div>

      <div className={styles.tabPanel}>
        <AnimatePresence mode="wait" initial={false} custom={directionRef.current}>
          <motion.div
            key={activeTab}
            id={`tab-panel-${activeTab}`}
            role="tabpanel"
            aria-labelledby={`tab-${activeTab}`}
            custom={directionRef.current}
            variants={reduce ? undefined : PANEL_VARIANTS}
            initial={reduce ? false : 'enter'}
            animate="center"
            exit={reduce ? undefined : 'exit'}
            transition={PANEL_TRANSITION}
          >
            {activeTab === 0 && <CustomLessonCard forceVisible />}
            {activeTab === 1 && <ScoreReportCard forceVisible />}
            {activeTab === 2 && <OnlineLibraryCard forceVisible />}
            {activeTab === 3 && <AICoachCard forceVisible />}
            {activeTab === 4 && <VocabCard forceVisible />}
            {activeTab === 5 && <MockExamCard forceVisible />}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className={styles.dots} aria-hidden="true">
        {TAB_LABELS.map((_, idx) => (
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
