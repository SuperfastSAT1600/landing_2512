'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { OnboardingStep1, OnboardingStep2, OnboardingStep3, PastAcademy } from '@/types/coach-onboarding';
import { SubjectEditorModal } from './SubjectEditorModal';

const SUBJECTS = [
  'SAT Reading & Writing',
  'SAT Math',
  'AP English Language',
  'AP English Literature',
  'AP Calculus AB',
  'AP Calculus BC',
  'AP Statistics',
  'AP Biology',
  'AP Chemistry',
  'AP Physics',
  'AP US History',
  'AP World History',
  'AP Psychology',
];

const CURRENT_YEAR = new Date().getFullYear();

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-sm font-medium text-gray-300 mb-1.5">
      {children}
      {required && <span className="text-red-400 ml-1">*</span>}
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full bg-[#1a1d20] border border-white/10 focus:border-blue-500 rounded-lg px-4 py-2.5 text-sm text-white outline-none transition-colors placeholder-gray-600 ${props.className ?? ''}`}
    />
  );
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full bg-[#1a1d20] border border-white/10 focus:border-blue-500 rounded-lg px-4 py-2.5 text-sm text-white outline-none transition-colors placeholder-gray-600 resize-none ${props.className ?? ''}`}
    />
  );
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1 text-xs text-red-400">{msg}</p>;
}

// ---------- Profile Image Upload ----------
function ProfileImageUpload({
  token,
  url,
  onUrlChange,
}: {
  token: string;
  url: string;
  onUrlChange: (url: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string>(url);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return;
    setPreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      const res = await fetch('/api/coach-onboarding/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, files: [{ filename: file.name, contentType: file.type }] }),
      });
      const { data: urls } = await res.json();
      if (urls?.[0]) {
        await fetch(urls[0].signedUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
        onUrlChange(urls[0].publicUrl);
      }
    } catch (e) {
      console.error('Profile image upload failed', e);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <Label>프로필 사진</Label>
      <p className="text-xs text-gray-500 mb-3">
        제출하신 사진을 기반으로 아래 예시와 같이 일러스트 스타일의 프로필 이미지가 제작됩니다. 얼굴이 잘 보이는 사진을 올려주세요.
      </p>
      <div className="flex flex-col items-center gap-2 bg-white/5 border border-white/10 rounded-xl p-4 mb-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/profile-example.png" alt="프로필 예시" className="w-40 h-40 object-contain rounded-lg bg-white" />
        <p className="text-xs text-gray-400 text-center">완성 예시 — 제출한 사진을 바탕으로 이런 형태의 일러스트 프로필이 만들어집니다.</p>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="relative w-20 h-20 rounded-xl border-2 border-dashed border-white/20 hover:border-blue-500 hover:bg-blue-500/5 transition-colors disabled:opacity-50 overflow-hidden shrink-0"
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="업로드된 사진" className="w-full h-full object-cover" />
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-1">
              <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-xs text-gray-500">사진 추가</span>
            </div>
          )}
          {uploading && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </button>
        <div className="text-xs text-gray-500 space-y-1">
          <p>jpg, png, webp · 최대 10MB</p>
          {preview && (
            <button type="button" onClick={() => { setPreview(''); onUrlChange(''); }} className="text-red-400 hover:text-red-300 transition-colors">
              사진 삭제
            </button>
          )}
        </div>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
    </div>
  );
}

// ---------- Step 1 ----------
function Step1({
  data,
  onChange,
  errors,
  token,
  profileImageUrl,
  onProfileImageUrlChange,
}: {
  data: OnboardingStep1;
  onChange: (d: Partial<OnboardingStep1>) => void;
  errors: Partial<Record<keyof OnboardingStep1, string>>;
  token: string;
  profileImageUrl: string;
  onProfileImageUrlChange: (url: string) => void;
}) {
  return (
    <div className="space-y-5">
      <ProfileImageUpload token={token} url={profileImageUrl} onUrlChange={onProfileImageUrlChange} />
      <div>
        <Label required>이름</Label>
        <Input value={data.name} onChange={e => onChange({ name: e.target.value })} placeholder="홍길동" />
        <FieldError msg={errors.name} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label required>핸드폰 번호</Label>
          <Input
            type="tel"
            value={data.phone}
            onChange={e => onChange({ phone: e.target.value })}
            placeholder="010-0000-0000"
          />
          <FieldError msg={errors.phone} />
        </div>
        <div>
          <Label required>이메일</Label>
          <Input
            type="email"
            value={data.email}
            onChange={e => onChange({ email: e.target.value })}
            placeholder="coach@example.com"
          />
          <FieldError msg={errors.email} />
        </div>
      </div>
      <div>
        <Label required>고등학교</Label>
        <Input value={data.high_school} onChange={e => onChange({ high_school: e.target.value })} placeholder="예: 서울외국어고등학교" />
        <FieldError msg={errors.high_school} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label required>대학교</Label>
          <Input value={data.university} onChange={e => onChange({ university: e.target.value })} placeholder="예: Harvard University" />
          <FieldError msg={errors.university} />
        </div>
        <div>
          <Label required>학부 전공</Label>
          <Input value={data.undergrad_major} onChange={e => onChange({ undergrad_major: e.target.value })} placeholder="예: Economics" />
          <FieldError msg={errors.undergrad_major} />
        </div>
      </div>
      <div>
        <Label required>대학교 입학 년도</Label>
        <Input
          type="number"
          min={1990}
          max={CURRENT_YEAR}
          value={data.university_entry_year === '' ? '' : data.university_entry_year}
          onChange={e => onChange({ university_entry_year: e.target.value ? parseInt(e.target.value) : '' })}
          placeholder="예: 2018"
        />
        <FieldError msg={errors.university_entry_year} />
      </div>
      <div>
        <Label required>재학/졸업 상태</Label>
        <div className="flex gap-6 mt-1">
          {[
            { value: 'graduated', label: '졸업생' },
            { value: 'enrolled', label: '재학중' },
          ].map(opt => (
            <label key={opt.value} className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="radio"
                name="enrollment_status"
                value={opt.value}
                checked={data.enrollment_status === opt.value}
                onChange={() => onChange({ enrollment_status: opt.value as OnboardingStep1['enrollment_status'] })}
                className="w-4 h-4 accent-blue-500"
              />
              <span className="text-sm text-gray-300">{opt.label}</span>
            </label>
          ))}
        </div>
        <FieldError msg={errors.enrollment_status} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>대학원</Label>
          <Input value={data.grad_school} onChange={e => onChange({ grad_school: e.target.value })} placeholder="예: Columbia University" />
        </div>
        <div>
          <Label>대학원 전공</Label>
          <Input value={data.grad_major} onChange={e => onChange({ grad_major: e.target.value })} placeholder="예: Education" />
        </div>
      </div>
      <div>
        <Label>SAT 점수 (Digital SAT 기준)</Label>
        <p className="text-xs text-gray-500 mb-2">Digital SAT 기준 점수를 입력해 주세요. 두 점수 합산 1550점 이상이면 대표코치 기준 충족입니다.</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Input
              type="number"
              min={200}
              max={800}
              value={data.sat_rw_score === '' ? '' : data.sat_rw_score}
              onChange={e => onChange({ sat_rw_score: e.target.value ? parseInt(e.target.value) : '' })}
              placeholder="Reading & Writing (200–800)"
            />
            <FieldError msg={errors.sat_rw_score} />
          </div>
          <div>
            <Input
              type="number"
              min={200}
              max={800}
              value={data.sat_math_score === '' ? '' : data.sat_math_score}
              onChange={e => onChange({ sat_math_score: e.target.value ? parseInt(e.target.value) : '' })}
              placeholder="Math (200–800)"
            />
            <FieldError msg={errors.sat_math_score} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- Step 2 ----------
function Step2({
  data,
  onChange,
  errors,
}: {
  data: OnboardingStep2;
  onChange: (d: Partial<OnboardingStep2>) => void;
  errors: Partial<Record<keyof OnboardingStep2, string>>;
}) {
  const addAcademy = () => onChange({ past_academies: [...data.past_academies, { name: '', role: 'instructor' }] });
  const removeAcademy = (i: number) => onChange({ past_academies: data.past_academies.filter((_, idx) => idx !== i) });
  const updateAcademy = (i: number, patch: Partial<PastAcademy>) => {
    const updated = data.past_academies.map((a, idx) => idx === i ? { ...a, ...patch } : a);
    onChange({ past_academies: updated });
  };

  const toggleSubject = (s: string) => {
    const next = data.subjects.includes(s)
      ? data.subjects.filter(x => x !== s)
      : [...data.subjects, s];
    onChange({ subjects: next });
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label required>수업 경력 (년)</Label>
          <Input
            type="number"
            min={0}
            value={data.teaching_years === '' ? '' : data.teaching_years}
            onChange={e => onChange({ teaching_years: e.target.value ? parseInt(e.target.value) : '' })}
            placeholder="예: 5"
          />
          <FieldError msg={errors.teaching_years} />
        </div>
        <div>
          <Label required>누적 수업 시간</Label>
          <Input
            type="number"
            min={0}
            value={data.teaching_hours_total === '' ? '' : data.teaching_hours_total}
            onChange={e => onChange({ teaching_hours_total: e.target.value ? parseInt(e.target.value) : '' })}
            placeholder="예: 1200"
          />
          <FieldError msg={errors.teaching_hours_total} />
        </div>
        <div>
          <Label required>지도한 학생 수</Label>
          <Input
            type="number"
            min={0}
            value={data.students_taught === '' ? '' : data.students_taught}
            onChange={e => onChange({ students_taught: e.target.value ? parseInt(e.target.value) : '' })}
            placeholder="예: 50"
          />
          <FieldError msg={errors.students_taught} />
        </div>
      </div>

      <div>
        <Label>과거 근무 학원 (SAT/AP 관련)</Label>
        <p className="text-xs text-gray-500 mb-2">강사 이력이 있는 학원을 입력해 주세요. TA 경력은 대표코치 기준에 포함되지 않습니다.</p>
        <div className="space-y-2">
          {data.past_academies.map((academy, i) => (
            <div key={i} className="flex gap-2 items-center">
              <Input
                value={academy.name}
                onChange={e => updateAcademy(i, { name: e.target.value })}
                placeholder="학원 이름"
                className="flex-1"
              />
              <select
                value={academy.role}
                onChange={e => updateAcademy(i, { role: e.target.value as PastAcademy['role'] })}
                className="bg-[#1a1d20] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
              >
                <option value="instructor">강사</option>
                <option value="ta">TA</option>
                <option value="other">기타</option>
              </select>
              <button onClick={() => removeAcademy(i)} className="text-gray-500 hover:text-red-400 transition-colors p-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
        {data.past_academies.length < 5 && (
          <button onClick={addAcademy} className="mt-2 text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            학원 추가
          </button>
        )}
      </div>

      <div>
        <Label required>어필하고 싶은 부분</Label>
        <Textarea
          rows={3}
          value={data.appeal_points}
          onChange={e => onChange({ appeal_points: e.target.value })}
          placeholder="본인만의 강점이나 특별한 경험을 자유롭게 작성해 주세요."
        />
        <FieldError msg={errors.appeal_points} />
      </div>

      <div>
        <Label required>수업 가능 과목 (최소 1개)</Label>
        <div className="grid grid-cols-2 gap-2 mt-1">
          {SUBJECTS.map(s => (
            <label key={s} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={data.subjects.includes(s)}
                onChange={() => toggleSubject(s)}
                className="w-4 h-4 accent-blue-500"
              />
              <span className="text-sm text-gray-300">{s}</span>
            </label>
          ))}
          <label className="flex items-center gap-2 cursor-pointer col-span-2">
            <input
              type="checkbox"
              checked={!!data.subjects_other}
              onChange={e => {
                if (!e.target.checked) onChange({ subjects_other: '' });
              }}
              className="w-4 h-4 accent-blue-500"
            />
            <span className="text-sm text-gray-300">기타 AP</span>
            {data.subjects_other !== undefined && (
              <Input
                value={data.subjects_other}
                onChange={e => onChange({ subjects_other: e.target.value })}
                placeholder="직접 입력"
                className="flex-1 ml-1"
              />
            )}
          </label>
        </div>
        <FieldError msg={errors.subjects} />
      </div>

      <div>
        <Label required>수업 시 선호 언어</Label>
        <div className="flex gap-6 mt-1">
          {[
            { value: 'english', label: '영어 선호' },
            { value: 'korean', label: '우리말 선호' },
            { value: 'any', label: '상관없음' },
          ].map(opt => (
            <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="language_preference"
                value={opt.value}
                checked={data.language_preference === opt.value}
                onChange={() => onChange({ language_preference: opt.value as OnboardingStep2['language_preference'] })}
                className="w-4 h-4 accent-blue-500"
              />
              <span className="text-sm text-gray-300">{opt.label}</span>
            </label>
          ))}
        </div>
        <FieldError msg={errors.language_preference} />
      </div>
    </div>
  );
}

// ---------- Step 3 ----------
function Step3({
  data,
  subjects,
  onChange,
  errors,
  token,
  onScreenshotUrlsChange,
}: {
  data: OnboardingStep3;
  subjects: string[];
  onChange: (d: Partial<OnboardingStep3>) => void;
  errors: Partial<Record<keyof OnboardingStep3, string>>;
  token: string;
  onScreenshotUrlsChange: (urls: string[]) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<{ file: File; previewUrl: string; uploaded?: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [editingSubject, setEditingSubject] = useState<string | null>(null);

  const handleFiles = async (files: FileList) => {
    const validFiles = Array.from(files).filter(f =>
      ['image/jpeg', 'image/png', 'image/webp'].includes(f.type)
    );
    if (!validFiles.length) return;

    const newPreviews = validFiles.map(f => ({
      file: f,
      previewUrl: URL.createObjectURL(f),
    }));
    const allPreviews = [...previews, ...newPreviews].slice(0, 10);
    setPreviews(allPreviews);

    setUploading(true);
    try {
      const res = await fetch('/api/coach-onboarding/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          files: validFiles.map(f => ({ filename: f.name, contentType: f.type })),
        }),
      });
      const { data: urls } = await res.json();

      if (urls) {
        for (let i = 0; i < urls.length; i++) {
          await fetch(urls[i].signedUrl, {
            method: 'PUT',
            headers: { 'Content-Type': validFiles[i].type },
            body: validFiles[i],
          });
        }

        const uploadedUrls = urls.map((u: { publicUrl: string }) => u.publicUrl);
        const existingUrls = previews.filter(p => p.uploaded).map(p => p.uploaded!);
        const allUrls = [...existingUrls, ...uploadedUrls];
        onScreenshotUrlsChange(allUrls);

        setPreviews(prev => {
          const updated = [...prev];
          let urlIdx = 0;
          for (let i = 0; i < updated.length; i++) {
            if (!updated[i].uploaded) {
              updated[i] = { ...updated[i], uploaded: uploadedUrls[urlIdx++] };
            }
          }
          return updated;
        });
      }
    } catch (e) {
      console.error('Upload failed', e);
    } finally {
      setUploading(false);
    }
  };

  const removePreview = (i: number) => {
    const updated = previews.filter((_, idx) => idx !== i);
    setPreviews(updated);
    onScreenshotUrlsChange(updated.filter(p => p.uploaded).map(p => p.uploaded!));
  };

  return (
    <div className="space-y-6">
      {subjects.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-300">과목별 수업 방향성</p>
          <p className="text-xs text-gray-500">선택하신 각 과목을 어떻게 가르치시는지 작성해 주세요. 자세하게 작성할수록 학부모에게 더 잘 어필됩니다.</p>
          {subjects.map(subject => {
            const content = data.subject_directions[subject] ?? '';
            const hasContent = content.replace(/<[^>]*>/g, '').trim().length > 0;
            return (
              <button
                key={subject}
                type="button"
                onClick={() => setEditingSubject(subject)}
                className="w-full text-left bg-[#1a1d20] border border-white/10 hover:border-blue-500/50 rounded-lg px-4 py-3 transition-colors group"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-gray-300">{subject}</span>
                  <span className="text-xs text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    클릭하여 작성 →
                  </span>
                </div>
                {hasContent ? (
                  <p
                    className="text-xs text-gray-400 line-clamp-2 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: content }}
                  />
                ) : (
                  <p className="text-xs text-gray-600">{subject} 수업을 어떻게 진행하시나요?</p>
                )}
              </button>
            );
          })}
        </div>
      )}

      {editingSubject && (
        <SubjectEditorModal
          subject={editingSubject}
          value={data.subject_directions[editingSubject] ?? ''}
          onSave={html => onChange({ subject_directions: { ...data.subject_directions, [editingSubject]: html } })}
          onClose={() => setEditingSubject(null)}
        />
      )}

      <div>
        <Label>학부모에게 어필하고 싶은 이미지를 첨부해주세요.</Label>
        <p className="text-xs text-gray-500 mb-1">
          ex) 학생이 감사함을 표현한 카톡, 성적이 올랐다는 카톡, 학부모가 수업이 너무 좋다고 말한 카톡 등
        </p>
        <p className="text-xs text-yellow-400 mb-3">5장 이상을 업로드했을 때, 대표코치 조건을 충족하게 됩니다.</p>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {previews.map((p, i) => (
            <div key={i} className="relative aspect-square">
              <img src={p.previewUrl} alt="" className="w-full h-full object-cover rounded-lg" />
              {!p.uploaded && (
                <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              <button
                onClick={() => removePreview(i)}
                className="absolute top-1 right-1 w-5 h-5 bg-black/70 rounded-full flex items-center justify-center text-white hover:bg-red-500 transition-colors"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
          {previews.length < 10 && (
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="aspect-square border-2 border-dashed border-white/20 rounded-lg flex flex-col items-center justify-center gap-1 hover:border-blue-500 hover:bg-blue-500/5 transition-colors disabled:opacity-50"
            >
              <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-xs text-gray-500">사진 추가</span>
            </button>
          )}
        </div>
        <p className="text-xs text-gray-600">{previews.length}/10장 · jpg, png, webp · 장당 최대 10MB</p>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={e => e.target.files && handleFiles(e.target.files)}
        />
      </div>
    </div>
  );
}

// ---------- Main ----------
const STEPS = ['기본 정보', '경력 & 수업', '프로필 초안'];

const INIT_STEP1: OnboardingStep1 = {
  name: '', phone: '', email: '',
  high_school: '', university: '', undergrad_major: '',
  university_entry_year: '', enrollment_status: '',
  grad_school: '', grad_major: '', sat_rw_score: '', sat_math_score: '',
};
const INIT_STEP2: OnboardingStep2 = {
  teaching_years: '', teaching_hours_total: '', students_taught: '',
  past_academies: [], appeal_points: '', subjects: [], subjects_other: '', language_preference: '',
};
const INIT_STEP3: OnboardingStep3 = {
  teaching_philosophy: '', subject_directions: {}, score_improvement_screenshots: [],
};

interface Props {
  token: string;
  coachName: string;
  draftData: Record<string, unknown> | null;
  draftSavedAt: string | null;
}

export function OnboardingForm({ token, coachName, draftData, draftSavedAt }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(() => (draftData?.step as number) ?? 0);
  const [step1, setStep1] = useState<OnboardingStep1>(() =>
    draftData?.step1 ? { ...INIT_STEP1, ...(draftData.step1 as Partial<OnboardingStep1>) } : INIT_STEP1
  );
  const [step2, setStep2] = useState<OnboardingStep2>(() =>
    draftData?.step2 ? { ...INIT_STEP2, ...(draftData.step2 as Partial<OnboardingStep2>) } : INIT_STEP2
  );
  const [step3, setStep3] = useState<OnboardingStep3>(() =>
    draftData?.step3 ? { ...INIT_STEP3, ...(draftData.step3 as Partial<OnboardingStep3>) } : INIT_STEP3
  );
  const [screenshotUrls, setScreenshotUrls] = useState<string[]>(
    (draftData?.screenshotUrls as string[]) ?? []
  );
  const [profileImageUrl, setProfileImageUrl] = useState<string>(
    (draftData?.profileImageUrl as string) ?? ''
  );
  const [errors1, setErrors1] = useState<Partial<Record<keyof OnboardingStep1, string>>>({});
  const [errors2, setErrors2] = useState<Partial<Record<keyof OnboardingStep2, string>>>({});
  const [errors3, setErrors3] = useState<Partial<Record<keyof OnboardingStep3, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(draftSavedAt);

  function validateStep1(): boolean {
    const e: typeof errors1 = {};
    if (!step1.name.trim()) e.name = '이름을 입력해 주세요.';
    if (!step1.phone.trim()) e.phone = '핸드폰 번호를 입력해 주세요.';
    if (!step1.email.trim()) e.email = '이메일을 입력해 주세요.';
    if (!step1.high_school.trim()) e.high_school = '고등학교를 입력해 주세요.';
    if (!step1.university.trim()) e.university = '대학교를 입력해 주세요.';
    if (!step1.undergrad_major.trim()) e.undergrad_major = '학부 전공을 입력해 주세요.';
    if (!step1.university_entry_year) e.university_entry_year = '입학 년도를 입력해 주세요.';
    if (!step1.enrollment_status) e.enrollment_status = '재학/졸업 상태를 선택해 주세요.';
    if (step1.sat_rw_score !== '' && (step1.sat_rw_score < 200 || step1.sat_rw_score > 800)) e.sat_rw_score = '200–800 사이로 입력해 주세요.';
    if (step1.sat_math_score !== '' && (step1.sat_math_score < 200 || step1.sat_math_score > 800)) e.sat_math_score = '200–800 사이로 입력해 주세요.';
    setErrors1(e);
    return Object.keys(e).length === 0;
  }

  function validateStep2(): boolean {
    const e: typeof errors2 = {};
    if (step2.teaching_years === '') e.teaching_years = '수업 경력을 입력해 주세요.';
    if (step2.teaching_hours_total === '') e.teaching_hours_total = '누적 수업 시간을 입력해 주세요.';
    if (step2.students_taught === '') e.students_taught = '지도한 학생 수를 입력해 주세요.';
    if (!step2.appeal_points.trim()) e.appeal_points = '어필하고 싶은 부분을 작성해 주세요.';
    if (step2.subjects.length === 0) e.subjects = '수업 가능 과목을 최소 1개 선택해 주세요.';
    if (!step2.language_preference) e.language_preference = '선호 언어를 선택해 주세요.';
    setErrors2(e);
    return Object.keys(e).length === 0;
  }

  function validateStep3(): boolean {
    setErrors3({});
    return true;
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/coach-onboarding/draft', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, data: { step, step1, step2, step3, screenshotUrls, profileImageUrl } }),
      });
      if (res.ok) {
        const { data } = await res.json();
        setSavedAt(data.saved_at);
      }
    } finally {
      setSaving(false);
    }
  };

  const goNext = () => {
    if (step === 0 && !validateStep1()) return;
    if (step === 1 && !validateStep2()) return;
    setStep(s => s + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goPrev = () => {
    setStep(s => s - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async () => {
    if (!validateStep3()) return;
    setSubmitting(true);
    try {
      const allSubjects = [...step2.subjects, ...(step2.subjects_other.trim() ? [step2.subjects_other.trim()] : [])];
      const payload = {
        token,
        data: {
          name: step1.name.trim(),
          phone: step1.phone.trim() || null,
          email: step1.email.trim() || null,
          high_school: step1.high_school.trim(),
          university: step1.university.trim(),
          undergrad_major: step1.undergrad_major.trim(),
          university_entry_year: step1.university_entry_year as number,
          enrollment_status: step1.enrollment_status,
          grad_school: step1.grad_school.trim() || null,
          grad_major: step1.grad_major.trim() || null,
          sat_rw_score: step1.sat_rw_score !== '' ? step1.sat_rw_score : null,
          sat_math_score: step1.sat_math_score !== '' ? step1.sat_math_score : null,
          teaching_years: step2.teaching_years as number,
          teaching_hours_total: step2.teaching_hours_total as number,
          students_taught: step2.students_taught as number,
          past_academies: step2.past_academies.filter(a => a.name.trim()),
          appeal_points: step2.appeal_points.trim(),
          subjects: allSubjects,
          subjects_other: step2.subjects_other.trim() || null,
          language_preference: step2.language_preference,
          teaching_philosophy: step2.appeal_points.trim(),
          subject_directions: Object.fromEntries(
            Object.entries(step3.subject_directions).filter(([, v]) => v?.trim())
          ),
          score_improvement_screenshot_urls: screenshotUrls,
          profile_image_url: profileImageUrl || null,
        },
      };

      const res = await fetch('/api/coach-onboarding/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error ?? '제출에 실패했습니다. 다시 시도해 주세요.');
        return;
      }

      router.push(`/coach-onboarding/${token}/complete`);
    } catch {
      alert('오류가 발생했습니다. 다시 시도해 주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d0f10] text-white">
      <div className="max-w-lg mx-auto px-4 py-10">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-center mb-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo_header.png" alt="SuperfastSAT" className="h-7 w-auto" />
          </div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">코치 프로필 작성</h1>
              <p className="text-sm text-gray-500">안녕하세요, <span className="text-gray-300">{coachName}</span> 코치님. 아래 정보를 입력해 주세요.</p>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-50 border border-white/10 rounded-lg text-xs font-medium text-gray-300 transition-colors flex items-center gap-1.5"
              >
                {saving ? (
                  <><div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin" /> 저장 중...</>
                ) : '저장하기'}
              </button>
              {savedAt && (
                <p className="text-xs text-gray-600">
                  마지막 저장 {new Date(savedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((label, i) => (
            <div key={i} className="flex items-center gap-2 flex-1">
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  i < step ? 'bg-blue-600 text-white' :
                  i === step ? 'bg-blue-500 text-white' :
                  'bg-white/10 text-gray-500'
                }`}>
                  {i < step ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : i + 1}
                </div>
                <span className={`text-xs font-medium hidden sm:block ${i === step ? 'text-white' : 'text-gray-600'}`}>{label}</span>
              </div>
              {i < STEPS.length - 1 && <div className={`flex-1 h-px ${i < step ? 'bg-blue-600' : 'bg-white/10'}`} />}
            </div>
          ))}
        </div>

        {/* Form */}
        <div className="bg-[#151719] rounded-2xl border border-white/5 p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-white">{STEPS[step]}</h2>
            {step === 0 && (
              <a
                href="/coaches/ben"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                완성된 프로필 예시 보기
              </a>
            )}
          </div>
          {step === 0 && <Step1 data={step1} onChange={d => setStep1(s => ({ ...s, ...d }))} errors={errors1} token={token} profileImageUrl={profileImageUrl} onProfileImageUrlChange={setProfileImageUrl} />}
          {step === 1 && <Step2 data={step2} onChange={d => setStep2(s => ({ ...s, ...d }))} errors={errors2} />}
          {step === 2 && (
            <Step3
              data={step3}
              subjects={[...step2.subjects, ...(step2.subjects_other.trim() ? [step2.subjects_other.trim()] : [])]}
              onChange={d => setStep3(s => ({ ...s, ...d }))}
              errors={errors3}
              token={token}
              onScreenshotUrlsChange={setScreenshotUrls}
            />
          )}
        </div>

        {/* Navigation */}
        <div className="flex gap-3">
          {step > 0 && (
            <button onClick={goPrev} className="flex-1 py-3 rounded-xl border border-white/10 text-sm font-medium text-gray-400 hover:bg-white/5 transition-colors">
              이전
            </button>
          )}
          {step < 2 ? (
            <button onClick={goNext} className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-bold text-white transition-colors">
              다음
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-sm font-bold text-white transition-colors flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  제출 중...
                </>
              ) : '제출하기'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
