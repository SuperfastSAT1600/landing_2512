'use client';

import { useEffect, useState } from 'react';

interface SubmissionDetail {
  id: string;
  test_id: string;
  instagram_id: string;
  student_name: string | null;
  answers: Record<string, string>;
  question_results: Record<string, boolean>;
  marked_for_review: string[];
  correct_count: number;
  total_count: number;
  submitted_at: string;
}

interface QuestionMeta {
  id: string;
  skill: string;
  difficulty: string;
  correct_answer: string;
  grammar_rule: string | null;
  passage: string | null;
  question: string | null;
  options: { label: string; text: string }[] | null;
}

interface SkillStat {
  label: string;
  correct: number;
  total: number;
}

interface DiffStat {
  label: string;
  color: string;
  correct: number;
  total: number;
}

const PRACTICE_API: Record<string, string> = {
  'sep26-grammar-100': '/api/practice/sep26-grammar',
};

const SKILL_SHORT: Record<string, string> = {
  'Form, Structure, and Sense': 'FSS',
  'Boundaries': 'Boundaries',
};

const DIFF_COLOR: Record<string, string> = {
  easy: '#22c55e',
  medium: '#f59e0b',
  hard: '#ef4444',
};

function AccBar({ correct, total, color }: { correct: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
        <span style={{ color: '#a1a1aa' }}>{correct}/{total}</span>
        <span style={{ fontWeight: 700, color }}>{pct}%</span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: '#27272a' }}>
        <div style={{ height: '100%', borderRadius: 3, background: color, width: `${pct}%`, transition: 'width 0.4s' }} />
      </div>
    </div>
  );
}

export function PracticeDetailPanel({
  submissionId,
  testId,
  adminKey,
  onClose,
}: {
  submissionId: string;
  testId: string;
  adminKey: string;
  onClose: () => void;
}) {
  const [sub, setSub] = useState<SubmissionDetail | null>(null);
  const [questions, setQuestions] = useState<QuestionMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError('');

    const practiceApi = PRACTICE_API[testId];

    Promise.all([
      fetch(`/api/admin/practice/submission/${submissionId}`, {
        headers: { 'x-admin-key': adminKey },
      }).then((r) => r.json()),
      practiceApi
        ? fetch(practiceApi).then((r) => r.json())
        : Promise.resolve(null),
    ])
      .then(([subRes, practiceRes]) => {
        if (subRes.error) { setError(subRes.error); return; }
        setSub(subRes.submission);

        if (practiceRes?.groups) {
          const flat: QuestionMeta[] = practiceRes.groups.flatMap(
            (g: { questions: QuestionMeta[] }) => g.questions,
          );
          setQuestions(flat);
        }
      })
      .catch(() => setError('데이터를 불러올 수 없습니다.'))
      .finally(() => setLoading(false));
  }, [submissionId, testId, adminKey]);

  // Compute breakdown
  const skillStats: Record<string, SkillStat> = {};
  const diffStats: Record<string, DiffStat> = {};

  if (sub && questions.length > 0) {
    questions.forEach((q) => {
      const isCorrect = sub.question_results[q.id] ?? false;
      const answeredAtAll = q.id in sub.question_results;
      if (!answeredAtAll) return;

      const skillKey = q.skill;
      if (!skillStats[skillKey]) skillStats[skillKey] = { label: SKILL_SHORT[skillKey] ?? skillKey, correct: 0, total: 0 };
      skillStats[skillKey].total++;
      if (isCorrect) skillStats[skillKey].correct++;

      const diffKey = q.difficulty.toLowerCase();
      if (!diffStats[diffKey]) diffStats[diffKey] = { label: diffKey.charAt(0).toUpperCase() + diffKey.slice(1), color: DIFF_COLOR[diffKey] ?? '#a1a1aa', correct: 0, total: 0 };
      diffStats[diffKey].total++;
      if (isCorrect) diffStats[diffKey].correct++;
    });
  }

  const hasResults = sub != null && Object.keys(sub.question_results).length > 0;
  const wrongQuestions = questions.filter((q) => {
    if (hasResults) {
      return q.id in sub!.question_results && sub!.question_results[q.id] === false;
    }
    const submitted = sub?.answers[q.id];
    if (!submitted) return false;
    return submitted.toUpperCase() !== q.correct_answer.toUpperCase();
  });

  const handle = sub?.instagram_id?.startsWith('@')
    ? sub.instagram_id.slice(1)
    : sub?.instagram_id ?? '';

  const score = sub && sub.total_count > 0
    ? Math.round((sub.correct_count / sub.total_count) * 100)
    : 0;
  const scoreColor = score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444';

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 40 }}
      />

      {/* Panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 420, background: '#09090b', borderLeft: '1px solid #27272a',
        zIndex: 50, overflowY: 'auto', display: 'flex', flexDirection: 'column',
      }}>
        {/* Panel header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #27272a', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <a
              href={`https://instagram.com/${handle}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 16, fontWeight: 700, color: '#6085FF', textDecoration: 'none' }}
            >
              @{handle}
            </a>
            <button
              onClick={onClose}
              style={{ background: 'transparent', border: 'none', color: '#71717a', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}
            >
              ×
            </button>
          </div>
          {sub && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 28, fontWeight: 800, color: scoreColor }}>{score}%</span>
              <div style={{ fontSize: 12, color: '#71717a' }}>
                <div>{sub.correct_count}/{sub.total_count} correct</div>
                <div>{new Date(sub.submitted_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div style={{ padding: '20px 24px', flex: 1 }}>
          {loading && (
            <div style={{ textAlign: 'center', color: '#52525b', paddingTop: 40 }}>분석 중...</div>
          )}
          {error && (
            <div style={{ color: '#ef4444', fontSize: 13 }}>{error}</div>
          )}

          {!loading && !error && sub && (
            <>
              {/* Skill breakdown */}
              {Object.keys(skillStats).length > 0 && (
                <section style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>스킬별 정확도</div>
                  {Object.entries(skillStats).map(([key, stat]) => (
                    <div key={key} style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#e4e4e7', marginBottom: 6 }}>{stat.label}</div>
                      <AccBar correct={stat.correct} total={stat.total} color="#6085FF" />
                    </div>
                  ))}
                </section>
              )}

              {/* Difficulty breakdown */}
              {Object.keys(diffStats).length > 0 && (
                <section style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>난이도별 정확도</div>
                  {['easy', 'medium', 'hard'].map((d) => {
                    const stat = diffStats[d];
                    if (!stat) return null;
                    return (
                      <div key={d} style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: stat.color, marginBottom: 4 }}>{stat.label}</div>
                        <AccBar correct={stat.correct} total={stat.total} color={stat.color} />
                      </div>
                    );
                  })}
                </section>
              )}

              {/* Wrong questions */}
              {wrongQuestions.length > 0 && (
                <section>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>
                    오답 ({wrongQuestions.length}개)
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {wrongQuestions.map((q) => {
                      const qIndex = questions.findIndex((x) => x.id === q.id);
                      const selectedLabel = sub.answers[q.id] ?? '?';
                      const isExpanded = expandedId === q.id;
                      return (
                        <div
                          key={q.id}
                          onClick={() => setExpandedId(isExpanded ? null : q.id)}
                          style={{
                            background: '#141416', border: '1px solid #27272a', borderRadius: 8,
                            padding: '10px 14px', cursor: 'pointer',
                            transition: 'border-color 0.15s',
                            borderColor: isExpanded ? 'rgba(96,133,255,0.35)' : '#27272a',
                          }}
                        >
                          {/* Row summary */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{
                              width: 26, height: 26, borderRadius: 6, background: '#1e293b',
                              color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              {qIndex + 1}
                            </span>
                            <div style={{ flex: 1, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                              <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 4, background: 'rgba(96,133,255,0.12)', color: '#6085FF', border: '1px solid rgba(96,133,255,0.25)' }}>
                                {SKILL_SHORT[q.skill] ?? q.skill}
                              </span>
                              <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 4, background: 'rgba(0,0,0,0.3)', color: DIFF_COLOR[q.difficulty] ?? '#a1a1aa', border: `1px solid ${DIFF_COLOR[q.difficulty] ?? '#27272a'}40` }}>
                                {q.difficulty}
                              </span>
                              {q.grammar_rule && (
                                <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 4, background: 'rgba(255,255,255,0.04)', color: '#71717a' }}>
                                  {q.grammar_rule}
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: 11, color: '#71717a', flexShrink: 0 }}>
                              선택 <span style={{ color: '#ef4444', fontWeight: 700 }}>{selectedLabel}</span>
                              {' · '}정답 <span style={{ color: '#22c55e', fontWeight: 700 }}>{q.correct_answer}</span>
                            </div>
                            <span style={{ fontSize: 12, color: '#52525b', flexShrink: 0 }}>{isExpanded ? '▲' : '▼'}</span>
                          </div>

                          {/* Collapsed: show question text preview */}
                          {!isExpanded && q.question && (
                            <div style={{
                              marginTop: 8, fontSize: 11, color: '#71717a',
                              overflow: 'hidden', display: '-webkit-box',
                              WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                              lineHeight: 1.5,
                            }}>
                              {q.question}
                            </div>
                          )}

                          {/* Expanded: full passage + question + options */}
                          {isExpanded && (
                            <div style={{ marginTop: 12 }} onClick={(e) => e.stopPropagation()}>
                              {q.passage && (
                                <div style={{
                                  background: '#0d0d0f', border: '1px solid #27272a', borderRadius: 6,
                                  padding: '10px 12px', marginBottom: 10, fontSize: 12, color: '#a1a1aa',
                                  lineHeight: 1.7, whiteSpace: 'pre-wrap',
                                }}>
                                  {q.passage}
                                </div>
                              )}
                              {q.question && (
                                <div style={{ fontSize: 13, color: '#e4e4e7', marginBottom: 10, lineHeight: 1.6 }}>
                                  {q.question}
                                </div>
                              )}
                              {q.options && q.options.length > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                  {q.options.map((opt) => {
                                    const isSelected = selectedLabel === opt.label;
                                    const isCorrect = q.correct_answer === opt.label;
                                    return (
                                      <div key={opt.label} style={{
                                        display: 'flex', gap: 8, alignItems: 'flex-start',
                                        padding: '6px 10px', borderRadius: 5, fontSize: 12,
                                        background: isCorrect ? 'rgba(34,197,94,0.08)' : isSelected ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.02)',
                                        border: `1px solid ${isCorrect ? 'rgba(34,197,94,0.3)' : isSelected ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.06)'}`,
                                      }}>
                                        <span style={{
                                          fontWeight: 700, flexShrink: 0,
                                          color: isCorrect ? '#22c55e' : isSelected ? '#ef4444' : '#52525b',
                                        }}>
                                          {opt.label}
                                        </span>
                                        <span style={{ color: isCorrect ? '#86efac' : isSelected ? '#fca5a5' : '#a1a1aa', lineHeight: 1.5 }}>
                                          {opt.text}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {wrongQuestions.length === 0 && !loading && (
                <div style={{ textAlign: 'center', color: '#52525b', paddingTop: 20, fontSize: 13 }}>
                  오답 없음 — 완벽합니다!
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
