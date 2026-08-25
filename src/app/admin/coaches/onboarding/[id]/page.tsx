'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { use } from 'react';
import type { CoachOnboardingSubmission, HeadCoachCriteria } from '@/types/coach-onboarding';

function getAdminKey() {
  return typeof localStorage !== 'undefined' ? localStorage.getItem('admin_key') ?? '' : '';
}

const ENROLLMENT_LABELS: Record<string, string> = {
  graduated: '졸업생',
  enrolled: '재학중',
};
const LANGUAGE_LABELS = { english: '영어 선호', korean: '우리말 선호', any: '상관없음' };
const ROLE_LABELS = { instructor: '강사', ta: 'TA', other: '기타' };

function Field({ label, value }: { label: string; value?: string | number | null }) {
  if (!value && value !== 0) return null;
  return (
    <div>
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className="text-sm text-gray-200">{value}</p>
    </div>
  );
}

const CRITERIA_LABELS: Record<keyof HeadCoachCriteria, string> = {
  ivy_league: '아이비리거',
  senior_or_grad: '졸업생 또는 3학년+',
  five_years_experience: '경력 5년 이상',
  ten_years_experience: '경력 10년 이상',
  digital_sat_1550: 'Digital SAT 1550점+',
  academy_instructor: '국내 학원 강사 경력',
  thousand_hours: '누적 수업 1,000시간+',
  five_score_screenshots: '점수향상 스크린샷 5장+',
};

export default function OnboardingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<CoachOnboardingSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/coach-onboarding/${id}`, { headers: { 'x-admin-key': getAdminKey() } })
      .then(r => r.json())
      .then(d => { if (d.data) setData(d.data); })
      .finally(() => setLoading(false));
  }, [id]);

  const updateStatus = async (status: 'reviewed' | 'approved' | 'rejected') => {
    if (!confirm(`상태를 "${status}"로 변경하시겠습니까?`)) return;
    setSaving(true);
    try {
      await fetch(`/api/admin/coach-onboarding/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': getAdminKey() },
        body: JSON.stringify({ status }),
      });
      setData(d => d ? { ...d, status } : d);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-[#151719] flex items-center justify-center text-gray-500">불러오는 중...</div>;
  if (!data) return <div className="min-h-screen bg-[#151719] flex items-center justify-center text-gray-500">제출 정보를 찾을 수 없습니다.</div>;

  const criteria = data.head_coach_criteria;
  const satTotal = data.sat_rw_score && data.sat_math_score ? data.sat_rw_score + data.sat_math_score : null;

  return (
    <div className="min-h-screen bg-[#151719] text-gray-100">
      <main className="p-8 pb-20 max-w-3xl space-y-6">
        {/* Header */}
        <div>
          <Link href="/admin/coaches/onboarding" className="text-xs text-gray-500 hover:text-gray-400 mb-1 block">← 프로필 작성 현황</Link>
          <div className="flex items-center gap-3 mt-1">
            <h1 className="text-2xl font-bold text-white">{data.name}</h1>
            {data.is_head_coach_eligible && (
              <span className="text-xs px-2.5 py-1 bg-yellow-500/20 text-yellow-400 rounded-full font-bold">대표코치 후보</span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1">{new Date(data.created_at).toLocaleString('ko-KR')} 제출</p>
        </div>

        {/* Score summary */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[#1e2023] rounded-xl border border-white/5 p-5">
            <p className="text-xs text-gray-500 mb-2">완성도 점수</p>
            <div className="flex items-end gap-1 mb-3">
              <span className="text-3xl font-bold text-white">{data.completeness_score ?? '--'}</span>
              <span className="text-gray-500 mb-1">/100</span>
            </div>
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all"
                style={{ width: `${data.completeness_score ?? 0}%` }}
              />
            </div>
          </div>
          <div className="bg-[#1e2023] rounded-xl border border-white/5 p-5">
            <p className="text-xs text-gray-500 mb-2">대표코치 기준 충족</p>
            <div className="flex items-end gap-1 mb-3">
              <span className="text-3xl font-bold text-white">{data.head_coach_criteria_met}</span>
              <span className="text-gray-500 mb-1">/8</span>
            </div>
            <div className="flex gap-1">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className={`flex-1 h-2 rounded-full ${i < data.head_coach_criteria_met ? 'bg-yellow-400' : 'bg-white/10'}`} />
              ))}
            </div>
          </div>
        </div>

        {/* Head coach criteria */}
        {criteria && (
          <div className="bg-[#1e2023] rounded-xl border border-white/5 p-5">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">대표코치 7+1 기준</p>
            <div className="space-y-2">
              {(Object.keys(CRITERIA_LABELS) as (keyof HeadCoachCriteria)[]).map(key => {
                const met = criteria[key];
                let detail = '';
                if (key === 'ivy_league') detail = data.university;
                else if (key === 'senior_or_grad') detail = ENROLLMENT_LABELS[data.enrollment_status] ?? '';
                else if (key === 'five_years_experience') detail = `${data.teaching_years}년`;
                else if (key === 'ten_years_experience') detail = `${data.teaching_years}년`;
                else if (key === 'digital_sat_1550') detail = satTotal ? `RW ${data.sat_rw_score} + Math ${data.sat_math_score} = ${satTotal}점` : '미입력';
                else if (key === 'academy_instructor') detail = data.past_academies?.filter(a => a.role === 'instructor').map(a => a.name).join(', ') || '없음';
                else if (key === 'thousand_hours') detail = `${data.teaching_hours_total}시간`;
                else if (key === 'five_score_screenshots') detail = `${(data.score_improvement_screenshot_urls ?? []).length}장`;

                return (
                  <div key={key} className="flex items-center justify-between py-1.5">
                    <div className="flex items-center gap-3">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs ${met ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {met ? '✓' : '✗'}
                      </span>
                      <span className="text-sm text-gray-300">{CRITERIA_LABELS[key]}</span>
                    </div>
                    <span className="text-xs text-gray-500">{detail}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 1 */}
        <div className="bg-[#1e2023] rounded-xl border border-white/5 p-5">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">학력 & 기본 정보</p>
          <div className="grid grid-cols-2 gap-4">
            <Field label="이름" value={data.name} />
            <Field label="고등학교" value={data.high_school} />
            <Field label="대학교" value={data.university} />
            <Field label="학부 전공" value={data.undergrad_major} />
            <Field label="입학 년도" value={data.university_entry_year} />
            <Field label="재학/졸업" value={ENROLLMENT_LABELS[data.enrollment_status] ?? data.enrollment_status} />
            <Field label="대학원" value={data.grad_school} />
            <Field label="대학원 전공" value={data.grad_major} />
            <Field label="SAT RW" value={data.sat_rw_score ? `${data.sat_rw_score}점` : null} />
            <Field label="SAT Math" value={data.sat_math_score ? `${data.sat_math_score}점` : null} />
            {satTotal && <Field label="SAT 합계" value={`${satTotal}점`} />}
          </div>
        </div>

        {/* Step 2 */}
        <div className="bg-[#1e2023] rounded-xl border border-white/5 p-5 space-y-4">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">경력 & 수업 정보</p>
          <div className="grid grid-cols-3 gap-4">
            <Field label="수업 경력" value={`${data.teaching_years}년`} />
            <Field label="누적 수업 시간" value={`${data.teaching_hours_total}시간`} />
            <Field label="지도한 학생 수" value={`${data.students_taught}명`} />
          </div>
          {data.past_academies && data.past_academies.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-2">과거 근무 학원</p>
              <div className="space-y-1">
                {data.past_academies.map((a, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-gray-200">
                    <span>{a.name}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${a.role === 'instructor' ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-white'}`}>
                      {ROLE_LABELS[a.role] ?? a.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div>
            <p className="text-xs text-gray-500 mb-1">어필 포인트</p>
            <p className="text-sm text-gray-200 whitespace-pre-wrap">{data.appeal_points}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1.5">수업 가능 과목</p>
            <div className="flex flex-wrap gap-1.5">
              {data.subjects.map(s => (
                <span key={s} className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded-full">{s}</span>
              ))}
            </div>
          </div>
          <Field label="수업 언어" value={LANGUAGE_LABELS[data.language_preference] ?? data.language_preference} />
        </div>

        {/* Step 3 */}
        <div className="bg-[#1e2023] rounded-xl border border-white/5 p-5 space-y-4">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">수업 방향성</p>
          <div>
            <p className="text-xs text-gray-500 mb-1">공통 수업 방향성</p>
            <p className="text-sm text-gray-200 whitespace-pre-wrap">{data.teaching_philosophy}</p>
          </div>
          {data.subject_directions && Object.keys(data.subject_directions).length > 0 && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500">과목별 수업 방향성</p>
              {Object.entries(data.subject_directions).map(([subject, dir]) => (
                <div key={subject}>
                  <p className="text-xs text-blue-400 mb-1">{subject}</p>
                  <p className="text-sm text-gray-200 whitespace-pre-wrap">{dir}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Profile image */}
        {data.profile_image_url && (
          <div className="bg-[#1e2023] rounded-xl border border-white/5 p-5">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">프로필 이미지</p>
            <a href={data.profile_image_url} target="_blank" rel="noopener noreferrer" className="inline-block">
              <img src={data.profile_image_url} alt="프로필 이미지" className="w-40 h-40 object-cover rounded-xl hover:opacity-80 transition-opacity" />
            </a>
          </div>
        )}

        {/* Screenshots */}
        {data.score_improvement_screenshot_urls && data.score_improvement_screenshot_urls.length > 0 && (
          <div className="bg-[#1e2023] rounded-xl border border-white/5 p-5">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">
              점수 향상 스크린샷 ({data.score_improvement_screenshot_urls.length}장)
            </p>
            <div className="grid grid-cols-3 gap-2">
              {data.score_improvement_screenshot_urls.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                  <img src={url} alt={`스크린샷 ${i + 1}`} className="w-full aspect-square object-cover rounded-lg hover:opacity-80 transition-opacity" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Admin actions */}
        <div className="bg-[#1e2023] rounded-xl border border-white/5 p-5">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">상태 관리</p>
          <p className="text-sm text-gray-400 mb-4">
            현재 상태: <span className="text-white font-medium">{data.status}</span>
            {data.reviewed_at && ` · ${new Date(data.reviewed_at).toLocaleDateString('ko-KR')} 검토`}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => updateStatus('reviewed')}
              disabled={saving || data.status === 'reviewed'}
              className="px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 disabled:opacity-40 text-blue-400 rounded-lg text-sm font-medium transition-colors"
            >
              검토완료
            </button>
            <button
              onClick={() => updateStatus('rejected')}
              disabled={saving || data.status === 'rejected'}
              className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 disabled:opacity-40 text-red-400 rounded-lg text-sm font-medium transition-colors"
            >
              반려
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
