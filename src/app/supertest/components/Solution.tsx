'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { TEST_SCHEDULE } from '../data/plans';
import styles from './Solution.module.css';

function useIntersection(
    ref: React.RefObject<Element | null>,
    threshold = 0.15,
    onVisible?: () => void
) {
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    el.classList.add(styles.visible);
                    onVisible?.();
                    observer.disconnect();
                }
            },
            { threshold }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [ref, threshold, onVisible]);
}

/* Card 1 — Live Video Grid */
const VIDEO_PARTICIPANTS = [
    { flag: '🇰🇷', city: 'Seoul',    isMe: true  },
    { flag: '🇺🇸', city: 'New York', isMe: false },
    { flag: '🇻🇳', city: 'Hanoi',    isMe: false },
    { flag: '🇺🇸', city: 'LA',       isMe: false },
];

function StudentFigure() {
    return (
        <svg width="42" height="40" viewBox="0 0 54 52" fill="none" aria-hidden="true">
            {/* 머리 */}
            <ellipse cx="27" cy="10" rx="8.5" ry="9.5" fill="rgba(255,255,255,0.45)" />
            {/* 상체 — 앞으로 약간 숙인 자세 */}
            <path d="M9 25 C11 19 19 17 27 19 C35 17 43 19 45 25 L43 40 L11 40 Z"
                fill="rgba(255,255,255,0.28)" />
            {/* 책상 표면 */}
            <rect x="2" y="40" width="50" height="4" rx="2" fill="rgba(255,255,255,0.18)" />
            {/* 시험지 */}
            <rect x="10" y="37" width="34" height="13" rx="2" fill="rgba(255,255,255,0.07)" />
            {/* 시험지 줄 */}
            <rect x="13" y="40" width="18" height="1.5" rx="0.75" fill="rgba(255,255,255,0.32)" />
            <rect x="13" y="44" width="14" height="1.5" rx="0.75" fill="rgba(255,255,255,0.22)" />
            <rect x="13" y="48" width="16" height="1.5" rx="0.75" fill="rgba(255,255,255,0.22)" />
        </svg>
    );
}

function LiveCard() {
    const ref = useRef<HTMLDivElement>(null);
    const [seconds, setSeconds] = useState(9000); // 2:30:00

    useEffect(() => {
        const interval = setInterval(() => {
            setSeconds((s) => (s > 0 ? s - 1 : 0));
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

    useIntersection(ref);

    return (
        <article
            className={styles.card}
            ref={ref}
            data-delay="0"
            aria-label="화상 카메라로 함께 보는 실전"
        >
            <div className={`${styles.visual} ${styles.visual1}`} aria-hidden="true">
                <div className={styles.liveBar}>
                    <div className={styles.liveBadge}>
                        <span className={styles.liveDot} />
                        LIVE
                    </div>
                    <span className={styles.liveTimer}>{timeStr}</span>
                </div>
                <div className={styles.videoGrid}>
                    {VIDEO_PARTICIPANTS.map((p) => (
                        <div
                            key={p.city}
                            className={`${styles.videoTile} ${p.isMe ? styles.videoTileMe : ''}`}
                        >
                            <StudentFigure />
                            <div className={styles.videoFooter}>
                                <span className={styles.videoActiveDot} />
                                <span className={styles.videoCity}>{p.flag} {p.city}</span>
                                {p.isMe && <span className={styles.videoMeTag}>나</span>}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <div className={styles.text}>
                <p className={styles.solutionNumber}>01</p>
                <h3 className={styles.cardTitle}>다른 학생들과 함께 실전처럼</h3>
                <p className={styles.cardDesc}>
                    화상 카메라를 켜고 여러 학생들과 함께 시험을 봅니다.<br />
                    집에서도 시험장과 같은 긴장감을 느껴보세요.<br />
                </p>
            </div>
        </article>
    );
}

/* Card 2 — Skill Branch */
const SKILL_NODES = [
    { label: 'Central Ideas',    target: 85, color: '#22c55e' },
    { label: 'Wds in Context',   target: 42, color: '#f87171' },
    { label: 'Cmd of Evidence',  target: 68, color: '#eab308' },
    { label: 'Transitions',      target: 31, color: '#f87171' },
    { label: 'Rheto. Synthesis', target: 79, color: '#22c55e' },
] as const;

// SVG coordinate constants (16:9 → 480×270)
const SVG_W = 480, SVG_H = 270;
const CX = 72, CY = 135;
const NX = 330;
const NYS = [28, 82, 135, 188, 242] as const;

// total time before loop restart (ms)
const LOOP_INTERVAL = 5000;

function SkillCard() {
    const ref = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [phase, setPhase]   = useState<number[]>(SKILL_NODES.map(() => 0));
    const [counts, setCounts] = useState<number[]>(SKILL_NODES.map(() => 0));

    useIntersection(ref, 0.25, () => setIsVisible(true));

    useEffect(() => {
        if (!isVisible) return;

        const timeouts: ReturnType<typeof setTimeout>[] = [];
        const intervals: ReturnType<typeof setInterval>[] = [];

        function run() {
            // reset instantly
            setPhase(SKILL_NODES.map(() => 0));
            setCounts(SKILL_NODES.map(() => 0));

            SKILL_NODES.forEach((skill, i) => {
                // phase 1: draw line
                timeouts.push(setTimeout(() => {
                    setPhase(prev => prev.map((v, j) => j === i ? 1 : v));
                }, 200 + i * 320));

                // phase 2: show dot + count up
                timeouts.push(setTimeout(() => {
                    setPhase(prev => prev.map((v, j) => j === i ? 2 : v));
                    let c = 0;
                    const iv = setInterval(() => {
                        c = Math.min(c + 3, skill.target);
                        setCounts(prev => prev.map((v, j) => j === i ? c : v));
                        if (c >= skill.target) clearInterval(iv);
                    }, 18);
                    intervals.push(iv);
                }, 200 + i * 320 + 560));
            });

            // restart loop
            timeouts.push(setTimeout(run, LOOP_INTERVAL));
        }

        run();

        return () => {
            timeouts.forEach(clearTimeout);
            intervals.forEach(clearInterval);
        };
    }, [isVisible]);

    return (
        <article
            className={styles.card}
            ref={ref}
            data-delay="100"
            aria-label="Micro-skill 단위 약점 분석"
        >
            <div className={`${styles.visual} ${styles.visual2}`} aria-hidden="true">
                <svg
                    viewBox={`0 0 ${SVG_W} ${SVG_H}`}
                    width="100%"
                    height="100%"
                    style={{ display: 'block' }}
                >
                    {/* center ring */}
                    <circle cx={CX} cy={CY} r={18} fill="none"
                        stroke="rgba(96,133,255,0.3)" strokeWidth={1.5} />
                    {/* center dot */}
                    <circle cx={CX} cy={CY} r={8} fill="#071be9" />
                    {/* center label */}
                    <text x={CX} y={CY - 26} textAnchor="middle"
                        fontSize={11} fontWeight="700"
                        fill="rgba(255,255,255,0.75)" letterSpacing="0.5">
                        Inference
                    </text>

                    {SKILL_NODES.map((skill, i) => {
                        const ny = NYS[i];
                        const dx = NX - CX, dy = ny - CY;
                        const len = Math.sqrt(dx * dx + dy * dy);
                        const drawn  = phase[i] >= 1;
                        const scored = phase[i] >= 2;
                        return (
                            <g key={i}>
                                {/* white branch line */}
                                <line
                                    x1={CX} y1={CY} x2={NX} y2={ny}
                                    stroke="rgba(255,255,255,0.55)"
                                    strokeWidth={1.5}
                                    strokeDasharray={len}
                                    strokeDashoffset={drawn ? 0 : len}
                                    style={{ transition: drawn ? 'stroke-dashoffset 0.55s ease' : 'none' }}
                                />
                                {/* end dot */}
                                {scored && (
                                    <circle cx={NX} cy={ny} r={5} fill="rgba(255,255,255,0.9)" />
                                )}
                                {/* score number */}
                                {scored && (
                                    <text
                                        x={NX + 16} y={ny + 7}
                                        fontSize={15}
                                        fontWeight="800"
                                        fill="rgba(255,255,255,0.9)"
                                    >
                                        {counts[i]}
                                    </text>
                                )}
                            </g>
                        );
                    })}
                </svg>
            </div>
            <div className={styles.text}>
                <p className={styles.solutionNumber}>02</p>
                <h3 className={styles.cardTitle}>Micro-skill 단위 약점 분석</h3>
                <p className={styles.cardDesc}>
                    College Board보다 세밀하게.<br />
                    유형 속 유형 레벨에서 약점을 정확히 짚어냅니다.<br />
                </p>
            </div>
        </article>
    );
}

/* Card 3 — Calendar */
const CHECK_PATH_LEN = 28; // approximate SVG path length for the checkmark

function CheckMark({ drawn }: { drawn: boolean }) {
    return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <polyline
                points="2,7 5.5,11 12,3"
                stroke="#071be9"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={CHECK_PATH_LEN}
                strokeDashoffset={drawn ? 0 : CHECK_PATH_LEN}
                style={{
                    transition: drawn ? 'stroke-dashoffset 0.45s ease' : 'none',
                }}
            />
        </svg>
    );
}

function calendarCells(year: number, month: number): (number | null)[] {
    const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (number | null)[] = Array(firstDay).fill(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
}

const PAST_TEST_DATES = new Set(['2026-05-02', '2026-05-16']);

function TimelineCard() {
    const ref = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [drawnCount, setDrawnCount] = useState(0);

    // Derive the two calendar months that contain upcoming test dates
    const { months, testDates } = useMemo(() => {
        const today = new Date('2026-05-19');
        const upcoming = TEST_SCHEDULE
            .filter(t => new Date(t.date) >= today)
            .slice(0, 6);

        const monthSet = new Set<string>();
        // include past dates to ensure May is shown
        [...PAST_TEST_DATES, ...upcoming.map(t => t.date)].forEach(dateStr => {
            const d = new Date(dateStr);
            monthSet.add(`${d.getFullYear()}-${d.getMonth()}`);
        });

        const monthList = Array.from(monthSet)
            .slice(0, 2)
            .map(key => {
                const [y, m] = key.split('-').map(Number);
                return { year: y, month: m };
            });

        if (monthList.length === 1) {
            const { year, month } = monthList[0];
            const next = month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 };
            monthList.push(next);
        }

        const testDateSet = new Set(upcoming.map(t => t.date));
        return { months: monthList, testDates: testDateSet };
    }, []);

    // Ordered list of (year, month, day) for test dates within shown months
    const orderedChecks = useMemo(() => {
        const checks: string[] = [];
        months.forEach(({ year, month }) => {
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            for (let d = 1; d <= daysInMonth; d++) {
                const mm = String(month + 1).padStart(2, '0');
                const dd = String(d).padStart(2, '0');
                const key = `${year}-${mm}-${dd}`;
                if (testDates.has(key)) checks.push(key);
            }
        });
        return checks;
    }, [months, testDates]);

    const LOOP_DELAY = 4000;

    useIntersection(ref, 0.15, () => setIsVisible(true));

    useEffect(() => {
        if (!isVisible) return;

        let cancelled = false;
        const timeouts: ReturnType<typeof setTimeout>[] = [];

        function run() {
            if (cancelled) return;
            setDrawnCount(0);
            orderedChecks.forEach((_, i) => {
                const t = setTimeout(() => {
                    if (!cancelled) setDrawnCount(i + 1);
                }, 400 + i * 600);
                timeouts.push(t);
            });
            const loopT = setTimeout(run, LOOP_DELAY + orderedChecks.length * 600 + 400);
            timeouts.push(loopT);
        }

        run();
        return () => {
            cancelled = true;
            timeouts.forEach(clearTimeout);
        };
    }, [isVisible, orderedChecks]);

    const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    return (
        <article
            className={styles.card}
            ref={ref}
            data-delay="200"
            aria-label="2주마다 열리는 정기 실전 일정"
        >
            <div className={`${styles.visual} ${styles.visual3}`} aria-hidden="true">
                <div className={styles.calendarWrap}>
                    {months.map(({ year, month }) => {
                        const cells = calendarCells(year, month);
                        return (
                            <div key={`${year}-${month}`} className={styles.calMonth}>
                                <div className={styles.calHeader}>
                                    {MONTH_NAMES[month]} {year}
                                </div>
                                <div className={styles.calGrid}>
                                    {WEEKDAYS.map(w => (
                                        <div key={w} className={styles.calWeekday}>{w}</div>
                                    ))}
                                    {cells.map((day, idx) => {
                                        if (day === null) {
                                            return <div key={`empty-${idx}`} className={styles.calCell} />;
                                        }
                                        const mm = String(month + 1).padStart(2, '0');
                                        const dd = String(day).padStart(2, '0');
                                        const key = `${year}-${mm}-${dd}`;
                                        const isPast = PAST_TEST_DATES.has(key);
                                        const isUpcoming = testDates.has(key);
                                        const isTestDay = isPast || isUpcoming;
                                        const checkIndex = orderedChecks.indexOf(key);
                                        const isDrawn = isPast || (checkIndex !== -1 && drawnCount > checkIndex);
                                        return (
                                            <div
                                                key={key}
                                                className={`${styles.calCell} ${isTestDay ? styles.calTestDay : ''} ${isPast ? styles.calPastDay : ''}`}
                                            >
                                                <span className={styles.calDayNum}>{day}</span>
                                                {isTestDay && (
                                                    <span className={styles.calCheck}>
                                                        <CheckMark drawn={isDrawn} />
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
            <div className={styles.text}>
                <p className={styles.solutionNumber}>03</p>
                <h3 className={styles.cardTitle}>2주마다 실전 연습</h3>
                <p className={styles.cardDesc}>
                    꾸준한 실전 훈련이 점수를 만듭니다.<br />
                    충분히 연습하고 시험장에 들어가세요.<br />
                </p>
            </div>
        </article>
    );
}

/* Card 4 — Vocab Cards */
const WORDS = [
    { word: 'ephemeral', known: false },
    { word: 'reticent', known: false },
    { word: 'pragmatic', known: true },
    { word: 'ambivalent', known: false },
    { word: 'cogent', known: true },
] as const;

const VOCAB_CHECK_LEN = 22;

function VocabCheckBox({ checked }: { checked: boolean }) {
    return (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <rect
                x="1.5" y="1.5" width="15" height="15" rx="3"
                stroke={checked ? 'rgba(34,197,94,0.7)' : 'rgba(255,255,255,0.2)'}
                strokeWidth="1.5"
                fill={checked ? 'rgba(34,197,94,0.15)' : 'transparent'}
                style={{ transition: 'stroke 0.25s ease, fill 0.25s ease' }}
            />
            <polyline
                points="4.5,9 7.5,12.5 13.5,5.5"
                stroke="#22c55e"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={VOCAB_CHECK_LEN}
                strokeDashoffset={checked ? 0 : VOCAB_CHECK_LEN}
                style={{ transition: checked ? 'stroke-dashoffset 0.4s ease' : 'none' }}
            />
        </svg>
    );
}

function VocabCard() {
    const ref = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [visibleCount, setVisibleCount] = useState(0);
    const [checkedSet, setCheckedSet] = useState<Set<number>>(new Set());

    useIntersection(ref, 0.15, () => setIsVisible(true));

    useEffect(() => {
        if (!isVisible) return;

        let cancelled = false;
        const timeouts: ReturnType<typeof setTimeout>[] = [];

        function run() {
            if (cancelled) return;
            setVisibleCount(0);
            setCheckedSet(new Set());

            WORDS.forEach((word, i) => {
                const t1 = setTimeout(() => {
                    if (!cancelled) setVisibleCount(i + 1);
                    if (!word.known) {
                        const t2 = setTimeout(() => {
                            if (!cancelled) setCheckedSet(prev => new Set([...prev, i]));
                        }, 380);
                        timeouts.push(t2);
                    }
                }, 300 + i * 260);
                timeouts.push(t1);
            });

            const loopT = setTimeout(run, 300 + WORDS.length * 260 + 2400);
            timeouts.push(loopT);
        }

        run();
        return () => {
            cancelled = true;
            timeouts.forEach(clearTimeout);
        };
    }, [isVisible]);

    return (
        <article
            className={styles.card}
            ref={ref}
            data-delay="300"
            aria-label="시험 후 모르는 단어 바로 정리"
        >
            <div className={`${styles.visual} ${styles.visual4}`} aria-hidden="true">
                <div className={styles.vocabList}>
                    {WORDS.map((item, i) => {
                        const isChecked = !item.known && checkedSet.has(i);
                        return (
                            <div
                                key={item.word}
                                className={`${styles.vocabItem} ${item.known ? styles.vocabKnown : styles.vocabUnknown}`}
                                style={{
                                    opacity: i < visibleCount ? (item.known ? 0.35 : 1) : 0,
                                    transform: i < visibleCount ? 'translateX(0)' : 'translateX(-20px)',
                                    transition: 'opacity 0.4s ease, transform 0.4s ease, background 0.4s ease, border-color 0.4s ease',
                                    ...(isChecked ? {
                                        background: 'rgba(34,197,94,0.08)',
                                        borderColor: 'rgba(34,197,94,0.3)',
                                    } : {}),
                                }}
                            >
                                <span className={styles.vocabWord}>{item.word}</span>
                                <VocabCheckBox checked={isChecked} />
                            </div>
                        );
                    })}
                </div>
            </div>
            <div className={styles.text}>
                <p className={styles.solutionNumber}>04</p>
                <h3 className={styles.cardTitle}>시험에서 몰랐던 단어 공부</h3>
                <p className={styles.cardDesc}>
                    시험이 끝나면 몰랐던 단어를 골라 학습합니다.<br />
                    (SuperTest Live, Flex 한정 기능)<br />
                </p>
            </div>
        </article>
    );
}

export default function Solution() {
    return (
        <section id="solution" className={styles.section} aria-labelledby="solution-heading">
            <div className={styles.header}>
                <p className={styles.sectionLabel}>SuperTest만의 차별점</p>
                <h2 id="solution-heading" className={styles.title}>
                    다른 모의고사와
                    <br />
                    무엇이 다른가요?
                </h2>
            </div>
            <div className={styles.cards}>
                <LiveCard />
                <SkillCard />
                <TimelineCard />
                <VocabCard />
            </div>
        </section>
    );
}
