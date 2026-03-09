'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { generateAllInsights } from '@/lib/report-insights';
import type { ReportInsights } from '@/lib/report-insights';

interface PageProps {
  params: Promise<{ resultId: string }>;
}

function getAdminKey() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('admin_key') ?? localStorage.getItem('adminKey') ?? '';
}

async function fetchReport(resultId: string) {
  const res = await fetch(`/api/reports/${resultId}`, { cache: 'no-store' });
  if (!res.ok) return null;
  return res.json();
}

async function patchInsights(resultId: string, partial: Partial<ReportInsights>) {
  const res = await fetch(`/api/admin/diagnosis/results/${resultId}/insights`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-key': getAdminKey(),
    },
    body: JSON.stringify(partial),
  });
  return res.ok;
}

export default function InsightsEditPage({ params }: PageProps) {
  const { resultId } = use(params);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // AI-generated baseline (read-only for diff)
  const [aiInsights, setAiInsights] = useState<ReportInsights | null>(null);
  // Current form values (start from edited_insights if present, else AI)
  const [form, setForm] = useState<Partial<ReportInsights>>({});
  // Track which fields have been touched
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [studentName, setStudentName] = useState('');

  useEffect(() => {
    fetchReport(resultId).then((data) => {
      if (!data) { setError('리포트를 불러올 수 없습니다.'); setLoading(false); return; }
      setStudentName(data.studentName);
      const ai = generateAllInsights(data.sections, data.questionDetails, data.savedWords ?? []);
      setAiInsights(ai);

      const edited: Partial<ReportInsights> = data.editedInsights ?? {};
      setForm({
        executiveSummary: edited.executiveSummary ?? ai.executiveSummary,
        behavioral: edited.behavioral ?? ai.behavioral,
        vocabulary: edited.vocabulary ?? ai.vocabulary ?? '',
      });
      if (data.editedInsights) {
        setTouched(new Set(Object.keys(data.editedInsights)));
      }
      setLoading(false);
    });
  }, [resultId]);

  function handleChange(field: keyof ReportInsights, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setTouched((prev) => new Set([...prev, field]));
    setSaved(false);
  }

  function resetToAI(field: keyof ReportInsights) {
    if (!aiInsights) return;
    setForm((prev) => ({ ...prev, [field]: aiInsights[field] as string ?? '' }));
    setTouched((prev) => {
      const next = new Set(prev);
      next.delete(field);
      return next;
    });
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    // Build partial — only send fields where value differs from AI
    const partial: Partial<ReportInsights> = {};
    if (aiInsights) {
      if (touched.has('executiveSummary') && form.executiveSummary !== aiInsights.executiveSummary) {
        partial.executiveSummary = form.executiveSummary;
      } else if (!touched.has('executiveSummary')) {
        // Reset: send null to clear
        (partial as Record<string, unknown>).executiveSummary = null;
      }
      if (touched.has('behavioral') && form.behavioral !== aiInsights.behavioral) {
        partial.behavioral = form.behavioral as string;
      } else if (!touched.has('behavioral')) {
        (partial as Record<string, unknown>).behavioral = null;
      }
      if (touched.has('vocabulary') && form.vocabulary !== aiInsights.vocabulary) {
        partial.vocabulary = form.vocabulary as string;
      } else if (!touched.has('vocabulary')) {
        (partial as Record<string, unknown>).vocabulary = null;
      }
    }

    const ok = await patchInsights(resultId, partial);
    setSaving(false);
    if (ok) {
      setSaved(true);
    } else {
      setError('저장에 실패했습니다. 다시 시도해주세요.');
    }
  }

  if (loading) {
    return <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">불러오는 중...</div>;
  }

  const fields: { key: keyof ReportInsights; label: string; rows: number }[] = [
    { key: 'executiveSummary', label: '전체 요약 (Analyst\'s Take)', rows: 5 },
    { key: 'behavioral', label: '풀이 패턴 인사이트 (Pacing & Confidence)', rows: 5 },
    { key: 'vocabulary', label: '어휘 전략 (Vocabulary Strategy)', rows: 4 },
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Link href="/admin/diagnosis" className="text-slate-400 text-sm hover:text-white">
              ← 어드민으로 돌아가기
            </Link>
            <h1 className="text-xl font-bold mt-1">인사이트 편집 — {studentName}</h1>
            <p className="text-slate-400 text-sm mt-0.5">Result ID: {resultId}</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={`/reports/${resultId}`}
              target="_blank"
              className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-700 hover:bg-slate-600 transition-colors"
            >
              리포트 미리보기
            </Link>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-blue-600 hover:bg-blue-500 disabled:opacity-50 transition-colors"
            >
              {saving ? '저장 중...' : saved ? '✓ 저장됨' : '저장하기'}
            </button>
          </div>
        </div>

        {error && <p className="text-red-400 text-sm bg-red-900/20 rounded-lg px-4 py-3">{error}</p>}

        {/* Fields */}
        {fields.map(({ key, label, rows }) => {
          const isEdited = touched.has(key);
          const value = (form[key] as string) ?? '';
          return (
            <div key={key} className="rounded-xl bg-gray-800 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-semibold">{label}</label>
                  {isEdited && (
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-medium bg-green-900/40 text-green-400">
                      수정됨
                    </span>
                  )}
                </div>
                <button
                  onClick={() => resetToAI(key)}
                  className="text-xs text-slate-400 hover:text-white transition-colors"
                >
                  AI 초안으로 되돌리기
                </button>
              </div>
              <textarea
                value={value}
                onChange={(e) => handleChange(key, e.target.value)}
                rows={rows}
                className="w-full bg-gray-700 rounded-lg px-4 py-3 text-sm text-white placeholder-gray-400 resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed"
              />
              {aiInsights && value !== (aiInsights[key] as string ?? '') && (
                <p className="text-xs text-slate-500">
                  AI 원문: {(aiInsights[key] as string ?? '').slice(0, 100)}...
                </p>
              )}
            </div>
          );
        })}

        {/* Footer save */}
        <div className="flex justify-end gap-3 pb-8">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 rounded-lg text-sm font-semibold bg-blue-600 hover:bg-blue-500 disabled:opacity-50 transition-colors"
          >
            {saving ? '저장 중...' : saved ? '✓ 저장됨' : '저장하기'}
          </button>
        </div>
      </div>
    </div>
  );
}
