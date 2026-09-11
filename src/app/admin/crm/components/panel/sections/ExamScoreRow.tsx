'use client';

import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import type { ExamScore } from '@/types/crm';
import { examTotal, isValidExamMonth, isValidSectionScore } from '@/lib/exam-score';

interface Props {
  score: ExamScore;
  /** 직전(더 오래된) 회차 총점 — 증감 표시용. 없으면 표시하지 않는다. */
  previousTotal: number | null;
  onSave: (id: string, patch: Record<string, unknown>) => Promise<boolean>;
  onDelete: (id: string) => void;
  deleting: boolean;
}

/** 빈 칸은 null(모르는 섹션), 그 외에는 숫자로. */
function parseScore(raw: string): number | null {
  return raw.trim() === '' ? null : Number(raw);
}

function scoreFieldValid(value: number | null): boolean {
  return value === null || isValidSectionScore(value);
}

export function ExamScoreRow({ score, previousTotal, onSave, onDelete, deleting }: Props) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [month, setMonth] = useState(score.exam_month);
  const [rw, setRw] = useState(score.rw_score == null ? '' : String(score.rw_score));
  const [math, setMath] = useState(score.math_score == null ? '' : String(score.math_score));

  const rwValue = parseScore(rw);
  const mathValue = parseScore(math);
  const total = examTotal(score.rw_score, score.math_score);
  const delta = total !== null && previousTotal !== null ? total - previousTotal : null;

  const canSave =
    isValidExamMonth(month) &&
    scoreFieldValid(rwValue) &&
    scoreFieldValid(mathValue) &&
    !(rwValue === null && mathValue === null) &&
    !saving;

  function startEditing() {
    setMonth(score.exam_month);
    setRw(score.rw_score == null ? '' : String(score.rw_score));
    setMath(score.math_score == null ? '' : String(score.math_score));
    setEditing(true);
  }

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    const ok = await onSave(score.id, {
      exam_month: month,
      rw_score: rwValue,
      math_score: mathValue,
    });
    setSaving(false);
    if (ok) setEditing(false);
  }

  if (editing) {
    return (
      <div className="space-y-1.5 py-2">
        <div className="flex items-center gap-1.5">
          <input
            type="month"
            aria-label="시험월 수정"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="w-32 px-2 py-1 rounded-lg border border-blue-200 text-xs focus:outline-none focus:border-blue-400"
          />
          <input
            type="number"
            aria-label="RW 수정"
            value={rw}
            onChange={(e) => setRw(e.target.value)}
            step={10}
            min={200}
            max={800}
            placeholder="RW"
            className={`w-20 px-2 py-1 rounded-lg border text-xs focus:outline-none ${
              scoreFieldValid(rwValue) ? 'border-blue-200 focus:border-blue-400' : 'border-red-300'
            }`}
          />
          <input
            type="number"
            aria-label="Math 수정"
            value={math}
            onChange={(e) => setMath(e.target.value)}
            step={10}
            min={200}
            max={800}
            placeholder="Math"
            className={`w-20 px-2 py-1 rounded-lg border text-xs focus:outline-none ${
              scoreFieldValid(mathValue) ? 'border-blue-200 focus:border-blue-400' : 'border-red-300'
            }`}
          />
          <span className="text-[11px] font-semibold text-gray-600">
            {examTotal(rwValue, mathValue) ?? '—'}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="px-2.5 py-1 rounded-lg text-[11px] font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? '저장 중...' : '저장'}
          </button>
          <button
            onClick={() => setEditing(false)}
            className="px-2 py-1 text-[11px] text-gray-400 hover:text-gray-700"
          >
            취소
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 py-2">
      <span data-testid="exam-month" className="w-[68px] shrink-0 text-xs font-medium text-gray-700">
        {score.exam_month}
      </span>
      <span className="text-[11px] text-gray-500">RW {score.rw_score ?? '—'}</span>
      <span className="text-[11px] text-gray-500">Math {score.math_score ?? '—'}</span>
      <span className="text-sm font-semibold text-gray-900">{total ?? '—'}</span>
      {delta !== null && delta !== 0 && (
        <span className={`text-[11px] font-medium ${delta > 0 ? 'text-blue-600' : 'text-red-500'}`}>
          {delta > 0 ? `+${delta}` : delta}
        </span>
      )}
      <div className="ml-auto flex items-center gap-1">
        <button onClick={startEditing} title="성적 수정" className="p-1 text-gray-300 hover:text-gray-600">
          <Pencil size={12} />
        </button>
        <button
          onClick={() => onDelete(score.id)}
          disabled={deleting}
          title="성적 삭제"
          className="p-1 text-gray-300 hover:text-red-500 disabled:opacity-40"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}
