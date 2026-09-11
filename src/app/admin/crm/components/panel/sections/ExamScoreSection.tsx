'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import type { ExamScore, Student } from '@/types/crm';
import { getAdminUserName } from '@/lib/admin-user';
import { examTotal, isValidExamMonth, isValidSectionScore } from '@/lib/exam-score';
import { SectionCard } from './SectionCard';
import { ExamScoreRow } from './ExamScoreRow';

interface Props {
  student: Student;
  adminKey: string;
}

function parseScore(raw: string): number | null {
  return raw.trim() === '' ? null : Number(raw);
}

function scoreFieldValid(value: number | null): boolean {
  return value === null || isValidSectionScore(value);
}

const FIELD = 'px-2 py-1 rounded-lg border border-gray-200 text-xs focus:outline-none focus:border-blue-400';

/**
 * 실제 응시 SAT 회차별 성적.
 * 목표(target_score)·직전 점수(previous_*)와 달리 회차가 쌓이므로 전용 테이블에서 읽는다.
 */
export function ExamScoreSection({ student, adminKey }: Props) {
  const [scores, setScores] = useState<ExamScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [month, setMonth] = useState('');
  const [rw, setRw] = useState('');
  const [math, setMath] = useState('');

  const fetchScores = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/crm/students/${student.id}/exam-scores`, {
        headers: { 'x-admin-key': adminKey },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? '시험 성적을 불러오지 못했습니다.');
      setScores(json.data ?? []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [student.id, adminKey]);

  useEffect(() => { fetchScores(); }, [fetchScores]);

  const rwValue = parseScore(rw);
  const mathValue = parseScore(math);
  const draftTotal = examTotal(rwValue, mathValue);
  const canSave =
    isValidExamMonth(month) &&
    scoreFieldValid(rwValue) &&
    scoreFieldValid(mathValue) &&
    !(rwValue === null && mathValue === null) &&
    !saving;

  function resetDraft() {
    setMonth('');
    setRw('');
    setMath('');
    setAdding(false);
  }

  async function handleAdd() {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/crm/students/${student.id}/exam-scores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({
          exam_month: month,
          rw_score: rwValue,
          math_score: mathValue,
          created_by: getAdminUserName(),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? '시험 성적 저장에 실패했습니다.');
      resetDraft();
      await fetchScores();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSave(id: string, patch: Record<string, unknown>): Promise<boolean> {
    setError(null);
    try {
      const res = await fetch(`/api/crm/exam-scores/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify(patch),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? '시험 성적 수정에 실패했습니다.');
      await fetchScores();
      return true;
    } catch (err) {
      setError((err as Error).message);
      return false;
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('이 회차 성적을 삭제할까요?')) return;
    setDeleting(id);
    setError(null);
    try {
      const res = await fetch(`/api/crm/exam-scores/${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-key': adminKey },
      });
      if (!res.ok) throw new Error('시험 성적 삭제에 실패했습니다.');
      await fetchScores();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDeleting(null);
    }
  }

  return (
    <SectionCard
      title="실제 시험 성적"
      count={scores.length}
      defaultOpen={false}
      actions={
        !adding && (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-700"
          >
            <Plus size={12} /> 성적 추가
          </button>
        )
      }
    >
      {adding && (
        <div className="mb-2 space-y-1.5 rounded-lg bg-blue-50/60 p-2.5">
          <div className="flex items-center gap-1.5">
            <input
              type="month"
              aria-label="시험월"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className={`w-32 ${FIELD}`}
            />
            <input
              type="number"
              aria-label="RW"
              value={rw}
              onChange={(e) => setRw(e.target.value)}
              step={10}
              min={200}
              max={800}
              placeholder="RW"
              className={`w-20 ${FIELD}`}
            />
            <input
              type="number"
              aria-label="Math"
              value={math}
              onChange={(e) => setMath(e.target.value)}
              step={10}
              min={200}
              max={800}
              placeholder="Math"
              className={`w-20 ${FIELD}`}
            />
            <span data-testid="draft-total" className="text-[11px] font-semibold text-gray-600">
              총점 {draftTotal ?? '—'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleAdd}
              disabled={!canSave}
              className="px-2.5 py-1 rounded-lg text-[11px] font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? '저장 중...' : '저장'}
            </button>
            <button onClick={resetDraft} className="px-2 py-1 text-[11px] text-gray-400 hover:text-gray-700">
              취소
            </button>
          </div>
        </div>
      )}

      {error && <p className="mb-1.5 text-[11px] text-red-500">{error}</p>}

      {loading ? (
        <p className="py-2 text-[11px] text-gray-400">불러오는 중...</p>
      ) : scores.length === 0 ? (
        <p className="py-2 text-[11px] text-gray-400">아직 기록된 시험 성적이 없습니다.</p>
      ) : (
        <div className="divide-y divide-gray-50">
          {scores.map((s, i) => (
            <ExamScoreRow
              key={s.id}
              score={s}
              // 목록은 최신순이라 바로 다음 항목이 직전 회차다.
              previousTotal={
                scores[i + 1] ? examTotal(scores[i + 1].rw_score, scores[i + 1].math_score) : null
              }
              onSave={handleSave}
              onDelete={handleDelete}
              deleting={deleting === s.id}
            />
          ))}
        </div>
      )}
    </SectionCard>
  );
}
