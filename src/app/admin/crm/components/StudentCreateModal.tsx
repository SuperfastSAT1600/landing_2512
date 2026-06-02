'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import {
  Student, DesiredSubjects, PreviousScoreStatus, SchoolType, ContactType,
  InquiryChannel, TrafficSource, ContentAuthor, LeadType, B2BPartner,
  TIMEZONE_OPTIONS,
  INQUIRY_CHANNEL_OPTIONS, TRAFFIC_SOURCE_OPTIONS, CONTENT_AUTHOR_OPTIONS, B2B_PARTNER_OPTIONS,
  GRADE_OPTIONS,
} from '@/types/crm';

interface StudentCreateModalProps {
  onClose: () => void;
  onCreate: (student: Student) => void;
  adminKey: string;
}

interface FormState {
  name: string;
  grade: string;
  school_type: SchoolType;
  inquiry_date: string;
  inquiry_channel: InquiryChannel | '';
  traffic_source: TrafficSource | '';
  content_author: ContentAuthor | '';
  lead_type: LeadType;
  b2b_partner: B2BPartner | '';
  campaign_tags: string;
  contact_type: ContactType;
  parent_phone: string;
  parent_timezone: string;
  previous_rw_score: string;
  previous_math_score: string;
  target_score: string;
  target_test_date: string;
  target_test_date_2: string;
  desired_subjects: DesiredSubjects;
  previous_score_status: PreviousScoreStatus;
  preferred_language: string;
}

const INITIAL_FORM: FormState = {
  name: '',
  grade: '',
  school_type: '한국 학제',
  inquiry_date: '',
  inquiry_channel: '',
  traffic_source: '',
  content_author: '',
  lead_type: 'B2C',
  b2b_partner: '',
  campaign_tags: '',
  contact_type: 'phone',
  parent_phone: '',
  parent_timezone: 'Asia/Seoul',
  previous_rw_score: '',
  previous_math_score: '',
  target_score: '',
  target_test_date: '',
  target_test_date_2: '',
  desired_subjects: 'Both',
  previous_score_status: 'scored',
  preferred_language: '',
};

export function StudentCreateModal({ onClose, onCreate, adminKey }: StudentCreateModalProps) {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [showSecondDate, setShowSecondDate] = useState(false);

  const set = (key: keyof FormState) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => setForm(prev => ({ ...prev, [key]: e.target.value }));

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormState, string>> = {};

    if (!form.name.trim()) newErrors.name = '이름을 입력해주세요';

    const rwScore = form.previous_rw_score ? parseInt(form.previous_rw_score) : null;
    const mathScore = form.previous_math_score ? parseInt(form.previous_math_score) : null;
    const targetScore = form.target_score ? parseInt(form.target_score) : null;
    if (rwScore !== null && (rwScore < 200 || rwScore > 800)) newErrors.previous_rw_score = '200~800 범위로 입력해주세요';
    if (mathScore !== null && (mathScore < 200 || mathScore > 800)) newErrors.previous_math_score = '200~800 범위로 입력해주세요';
    if (targetScore !== null && (targetScore < 800 || targetScore > 1600)) newErrors.target_score = '800~1600 범위로 입력해주세요';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      const tags = form.campaign_tags
        ? form.campaign_tags.split(',').map(t => t.trim()).filter(Boolean)
        : [];

      const body = {
        name: form.name.trim(),
        grade: form.grade.trim(),
        school_type: form.school_type,
        inquiry_date: form.inquiry_date || null,
        inquiry_channel: form.inquiry_channel || null,
        traffic_source: form.traffic_source || null,
        content_author: form.content_author || null,
        lead_type: form.lead_type,
        b2b_partner: form.lead_type === 'B2B' && form.b2b_partner ? form.b2b_partner : null,
        campaign_tags: tags,
        contact_type: form.contact_type,
        parent_phone: form.parent_phone.trim(),
        parent_timezone: form.parent_timezone || null,
        previous_rw_score: form.previous_rw_score ? parseInt(form.previous_rw_score) : null,
        previous_math_score: form.previous_math_score ? parseInt(form.previous_math_score) : null,
        target_score: form.target_score ? parseInt(form.target_score) : null,
        target_test_date: form.target_test_date || null,
        target_test_date_2: form.target_test_date_2 || null,
        desired_subjects: form.desired_subjects,
        previous_score_status: form.previous_score_status,
        preferred_language: form.preferred_language || null,
      };

      const res = await fetch('/api/crm/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (res.ok && data.data) {
        onCreate(data.data as Student);
        onClose();
      } else {
        alert(typeof data.error === 'string' ? data.error : (data.error?.message ?? '학생 추가에 실패했습니다.'));
      }
    } catch {
      alert('오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-gray-50 rounded-xl border border-gray-200 shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-bold text-gray-900">새 학생 추가</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-900 transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* 이름 */}
          <Field label="이름" error={errors.name}>
            <input value={form.name} onChange={set('name')} placeholder="홍길동" className={inputCls(!!errors.name)} />
          </Field>

          {/* 문의 날짜 */}
          <Field label="문의 날짜" error={errors.inquiry_date}>
            <input type="date" value={form.inquiry_date} onChange={set('inquiry_date')} className={inputCls(!!errors.inquiry_date)} />
          </Field>

          {/* 인입 분류 */}
          <div className="rounded-lg border border-gray-200 bg-white p-3 space-y-3">
            <p className="text-xs font-bold text-gray-500">인입 분류</p>

            <div className="grid grid-cols-2 gap-3">
              <Field label="인입 채널">
                <select value={form.inquiry_channel} onChange={set('inquiry_channel')} className={selectCls}>
                  <option value="">(미상)</option>
                  {INQUIRY_CHANNEL_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </Field>
              <Field label="유입 소스">
                <select value={form.traffic_source} onChange={set('traffic_source')} className={selectCls}>
                  <option value="">(미상)</option>
                  {TRAFFIC_SOURCE_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="콘텐츠 작성자">
                <select value={form.content_author} onChange={set('content_author')} className={selectCls}>
                  <option value="">(미상)</option>
                  {CONTENT_AUTHOR_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </Field>
              <Field label="구분">
                <select value={form.lead_type} onChange={set('lead_type')} className={selectCls}>
                  <option value="B2C">B2C</option>
                  <option value="B2B">B2B</option>
                </select>
              </Field>
            </div>

            {form.lead_type === 'B2B' && (
              <Field label="B2B 파트너사">
                <select value={form.b2b_partner} onChange={set('b2b_partner')} className={selectCls}>
                  <option value="">선택</option>
                  {B2B_PARTNER_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </Field>
            )}

            <Field label="캠페인/태그">
              <input
                value={form.campaign_tags}
                onChange={set('campaign_tags')}
                placeholder="여름특강, 기존DB 재활성화 (쉼표로 구분)"
                className={inputCls(false)}
              />
            </Field>
          </div>

          {/* 학년 + 재학유형 */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="학년" error={errors.grade}>
              <select value={form.grade} onChange={set('grade')} className={`${selectCls} ${errors.grade ? 'border-red-500/50' : ''}`}>
                <option value="">선택</option>
                {GRADE_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </Field>
            <Field label="학제">
              <select value={form.school_type} onChange={set('school_type')} className={selectCls}>
                <option value="한국 학제">한국 학제</option>
                <option value="AP">AP</option>
                <option value="IB">IB</option>
              </select>
            </Field>
          </div>

          {/* 거주 국가/시간대 */}
          <Field label="거주 국가 / 시간대">
            <select value={form.parent_timezone} onChange={set('parent_timezone')} className={selectCls}>
              {TIMEZONE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </Field>

          {/* 연락 수단 + 연락처 */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="연락 수단">
              <select value={form.contact_type} onChange={set('contact_type')} className={selectCls}>
                <option value="phone">핸드폰</option>
                <option value="kakao">카카오톡</option>
                <option value="email">이메일</option>
              </select>
            </Field>
            <Field label="연락처" error={errors.parent_phone}>
              <input
                value={form.parent_phone}
                onChange={set('parent_phone')}
                placeholder={form.contact_type === 'email' ? 'example@email.com' : form.contact_type === 'kakao' ? '카카오 ID' : '+1-555-0100'}
                className={inputCls(!!errors.parent_phone)}
              />
            </Field>
          </div>

          {/* 직전 점수 */}
          <Field label="직전 점수 상태">
            <select value={form.previous_score_status} onChange={set('previous_score_status')} className={selectCls}>
              <option value="scored">응시함</option>
              <option value="never_taken">미응시</option>
              <option value="dont_remember">기억안남</option>
            </select>
          </Field>

          {form.previous_score_status === 'scored' && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="직전 RW 점수" error={errors.previous_rw_score}>
                <input type="number" value={form.previous_rw_score} onChange={set('previous_rw_score')} placeholder="200-800" min={200} max={800} className={inputCls(!!errors.previous_rw_score)} />
              </Field>
              <Field label="직전 Math 점수" error={errors.previous_math_score}>
                <input type="number" value={form.previous_math_score} onChange={set('previous_math_score')} placeholder="200-800" min={200} max={800} className={inputCls(!!errors.previous_math_score)} />
              </Field>
            </div>
          )}

          {/* 목표 점수 */}
          <Field label="목표 점수" error={errors.target_score}>
            <input type="number" value={form.target_score} onChange={set('target_score')} placeholder="800-1600" min={800} max={1600} className={inputCls(!!errors.target_score)} />
          </Field>

          {/* 목표 시험일 */}
          <Field label="목표 시험 일자" error={errors.target_test_date}>
            <input type="date" value={form.target_test_date} onChange={set('target_test_date')} className={inputCls(!!errors.target_test_date)} />
          </Field>

          {showSecondDate ? (
            <Field label="2차 목표 시험 일자">
              <div className="flex gap-2">
                <input type="date" value={form.target_test_date_2} onChange={set('target_test_date_2')} className={`${inputCls(false)} flex-1`} />
                <button type="button" onClick={() => { setShowSecondDate(false); setForm(prev => ({ ...prev, target_test_date_2: '' })); }} className="px-2 text-gray-400 hover:text-gray-600 transition-colors text-sm">✕</button>
              </div>
            </Field>
          ) : (
            <button type="button" onClick={() => setShowSecondDate(true)} className="text-xs text-blue-500 hover:text-blue-400 transition-colors">
              + 2차 목표 시험일 추가
            </button>
          )}

          {/* 수업 희망 언어 */}
          <Field label="수업 희망 언어">
            <select value={form.preferred_language} onChange={set('preferred_language')} className={selectCls}>
              <option value="">(미설정)</option>
              <option value="korean">한국어</option>
              <option value="english">English</option>
              <option value="any">한/영 혼용</option>
            </select>
          </Field>

          {/* 희망 과목 */}
          <Field label="희망 과목">
            <select value={form.desired_subjects} onChange={set('desired_subjects')} className={selectCls}>
              <optgroup label="SAT">
                <option value="RW">RW</option>
                <option value="Math">Math</option>
                <option value="Both">Both</option>
              </optgroup>
              <optgroup label="SSAT">
                <option value="SSAT Math">SSAT Math</option>
              </optgroup>
              <optgroup label="AP">
                <option value="AP Calculus BC">AP Calculus BC</option>
                <option value="AP US History">AP US History</option>
                <option value="AP Physics 1">AP Physics 1</option>
                <option value="AP Biology">AP Biology</option>
                <option value="AP Psychology">AP Psychology</option>
                <option value="AP World History">AP World History</option>
                <option value="AP Computer Science A">AP Computer Science A</option>
                <option value="AP Computer Science Principles">AP Computer Science Principles</option>
                <option value="AP Macroeconomics">AP Macroeconomics</option>
                <option value="AP Microeconomics">AP Microeconomics</option>
                <option value="AP US Government and Politics">AP US Government and Politics</option>
                <option value="AP Comparative Government and Politics">AP Comparative Government and Politics</option>
              </optgroup>
            </select>
          </Field>
        </form>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-200">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
            취소
          </button>
          <button onClick={handleSubmit} disabled={saving} className="px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg transition-colors">
            {saving ? '추가 중...' : '학생 추가'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-gray-400">
        {label}
      </label>
      {children}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

const inputCls = (hasError: boolean) =>
  `w-full bg-white border ${hasError ? 'border-red-500/50' : 'border-gray-200'} focus:border-blue-500 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none transition-all`;

const selectCls =
  'w-full bg-white border border-gray-200 focus:border-blue-500 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none transition-all';
