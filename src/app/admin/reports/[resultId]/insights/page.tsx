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

async function saveCoupon(resultId: string, discountPercent: number, expiresAt: string) {
  const res = await fetch(`/api/admin/diagnosis/results/${resultId}/coupon`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-key': getAdminKey(),
    },
    body: JSON.stringify({ discountPercent, expiresAt }),
  });
  return res.ok;
}

async function deleteCoupon(resultId: string) {
  const res = await fetch(`/api/admin/diagnosis/results/${resultId}/coupon`, {
    method: 'DELETE',
    headers: { 'x-admin-key': getAdminKey() },
  });
  return res.ok;
}

function getDefaultCouponExpiry(): string {
  const d = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 16);
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
  // Key recommendations as editable list
  const [recs, setRecs] = useState<string[]>([]);
  const [recsEdited, setRecsEdited] = useState(false);
  // Track which fields have been touched
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [studentName, setStudentName] = useState('');

  // Coupon state
  const [existingCoupon, setExistingCoupon] = useState<{ discountPercent: number; expiresAt: string } | null>(null);
  const [couponPercent, setCouponPercent] = useState(20);
  const [couponExpiry, setCouponExpiry] = useState(getDefaultCouponExpiry());
  const [couponSaving, setCouponSaving] = useState(false);
  const [couponSaved, setCouponSaved] = useState(false);
  const [couponError, setCouponError] = useState('');

  useEffect(() => {
    fetchReport(resultId).then((data) => {
      if (!data) { setError('리포트를 불러올 수 없습니다.'); setLoading(false); return; }
      setStudentName(data.studentName);
      const ai = generateAllInsights(data.sections, data.questionDetails, data.savedWords ?? [], data.timeLimitMinutes);
      setAiInsights(ai);

      const edited: Partial<ReportInsights> = data.editedInsights ?? {};
      setForm({
        executiveSummary: edited.executiveSummary ?? ai.executiveSummary,
        behavioral: edited.behavioral ?? ai.behavioral,
        vocabulary: edited.vocabulary ?? ai.vocabulary ?? '',
      });

      // Key recommendations
      const editedRecs = edited.keyRecommendations;
      setRecs(Array.isArray(editedRecs) ? editedRecs : [...ai.keyRecommendations]);
      setRecsEdited(Array.isArray(editedRecs));

      if (data.editedInsights) {
        setTouched(new Set(Object.keys(data.editedInsights)));
      }

      // Coupon
      if (data.coupon) {
        setExistingCoupon(data.coupon);
        setCouponPercent(data.coupon.discountPercent);
        setCouponExpiry(new Date(data.coupon.expiresAt).toISOString().slice(0, 16));
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

  function handleRecChange(idx: number, value: string) {
    setRecs((prev) => prev.map((r, i) => (i === idx ? value : r)));
    setRecsEdited(true);
    setSaved(false);
  }

  function addRec() {
    setRecs((prev) => [...prev, '']);
    setRecsEdited(true);
    setSaved(false);
  }

  function removeRec(idx: number) {
    setRecs((prev) => prev.filter((_, i) => i !== idx));
    setRecsEdited(true);
    setSaved(false);
  }

  function resetRecsToAI() {
    if (!aiInsights) return;
    setRecs([...aiInsights.keyRecommendations]);
    setRecsEdited(false);
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    const partial: Partial<ReportInsights> = {};
    if (aiInsights) {
      if (touched.has('executiveSummary') && form.executiveSummary !== aiInsights.executiveSummary) {
        partial.executiveSummary = form.executiveSummary;
      } else if (!touched.has('executiveSummary')) {
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
      if (recsEdited) {
        partial.keyRecommendations = recs.filter((r) => r.trim().length > 0);
      } else {
        (partial as Record<string, unknown>).keyRecommendations = null;
      }
    }

    const ok = await patchInsights(resultId, partial);
    setSaving(false);
    if (ok) setSaved(true);
    else setError('저장에 실패했습니다. 다시 시도해주세요.');
  }

  async function handleCouponSave() {
    setCouponSaving(true);
    setCouponError('');
    const expiresAtISO = new Date(couponExpiry).toISOString();
    const ok = await saveCoupon(resultId, couponPercent, expiresAtISO);
    setCouponSaving(false);
    if (ok) {
      setCouponSaved(true);
      setExistingCoupon({ discountPercent: couponPercent, expiresAt: expiresAtISO });
    } else {
      setCouponError('쿠폰 저장에 실패했습니다.');
    }
  }

  async function handleCouponDelete() {
    setCouponSaving(true);
    setCouponError('');
    const ok = await deleteCoupon(resultId);
    setCouponSaving(false);
    if (ok) {
      setExistingCoupon(null);
      setCouponSaved(false);
    } else {
      setCouponError('쿠폰 삭제에 실패했습니다.');
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

        {/* Text Fields */}
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

        {/* Key Recommendations */}
        <div className="rounded-xl bg-gray-800 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <label className="text-sm font-semibold">Key Recommendations</label>
              {recsEdited && (
                <span className="rounded-full px-2 py-0.5 text-[10px] font-medium bg-green-900/40 text-green-400">
                  수정됨
                </span>
              )}
            </div>
            <button
              onClick={resetRecsToAI}
              className="text-xs text-slate-400 hover:text-white transition-colors"
            >
              AI 초안으로 되돌리기
            </button>
          </div>
          <div className="space-y-2">
            {recs.map((rec, idx) => (
              <div key={idx} className="flex gap-2 items-start">
                <span
                  className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white mt-2"
                  style={{ background: '#071be9' }}
                >
                  {idx + 1}
                </span>
                <textarea
                  value={rec}
                  onChange={(e) => handleRecChange(idx, e.target.value)}
                  rows={2}
                  className="flex-1 bg-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-400 resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed"
                  placeholder={`추천사항 ${idx + 1}`}
                />
                <button
                  onClick={() => removeRec(idx)}
                  className="flex-shrink-0 mt-2 text-slate-400 hover:text-red-400 transition-colors text-lg leading-none"
                  title="삭제"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={addRec}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors mt-1"
          >
            + 추천사항 추가
          </button>
        </div>

        {/* Coupon Section */}
        <div className="rounded-xl bg-gray-800 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <label className="text-sm font-semibold">할인 쿠폰 발행</label>
              {existingCoupon && (
                <span className="rounded-full px-2 py-0.5 text-[10px] font-medium bg-yellow-900/40 text-yellow-400">
                  활성 쿠폰 있음
                </span>
              )}
            </div>
          </div>

          {existingCoupon && (
            <div className="rounded-lg bg-blue-900/20 border border-blue-700/30 px-4 py-3 text-sm">
              <p className="text-blue-300 font-medium">현재 발행된 쿠폰</p>
              <p className="text-slate-300 mt-1">
                할인율: <strong>{existingCoupon.discountPercent}%</strong> ·
                만료: {new Date(existingCoupon.expiresAt).toLocaleString('ko-KR')}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5 text-slate-300">할인율 (%)</label>
              <input
                type="number"
                value={couponPercent}
                onChange={(e) => { setCouponPercent(Math.max(1, Math.min(100, Number(e.target.value)))); setCouponSaved(false); }}
                min={1}
                max={100}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5 text-slate-300">쿠폰 만료 일시</label>
              <input
                type="datetime-local"
                value={couponExpiry}
                onChange={(e) => { setCouponExpiry(e.target.value); setCouponSaved(false); }}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {couponError && <p className="text-red-400 text-xs">{couponError}</p>}

          <div className="flex gap-3">
            <button
              onClick={handleCouponSave}
              disabled={couponSaving}
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-blue-600 hover:bg-blue-500 disabled:opacity-50 transition-colors"
            >
              {couponSaving ? '저장 중...' : couponSaved ? '✓ 쿠폰 발행됨' : existingCoupon ? '쿠폰 업데이트' : '쿠폰 발행'}
            </button>
            {existingCoupon && (
              <button
                onClick={handleCouponDelete}
                disabled={couponSaving}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-red-700 hover:bg-red-600 disabled:opacity-50 transition-colors"
              >
                쿠폰 삭제
              </button>
            )}
          </div>
          <p className="text-xs text-slate-500">
            쿠폰을 발행하면 리포트 하단에 카운트다운 배너가 표시됩니다. 만료되면 자동으로 사라집니다.
          </p>
        </div>

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
