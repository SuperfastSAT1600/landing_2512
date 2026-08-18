'use client';

import React, { useState, useRef, useMemo } from 'react';
import {
  GRADE_OPTIONS_BY_SCHOOL_TYPE,
} from '@/types/crm';
import {
  INQUIRY_CHANNEL_OPTIONS, TRAFFIC_SOURCE_OPTIONS, CONTENT_AUTHOR_OPTIONS, B2B_PARTNER_OPTIONS,
} from '@/types/crm';
import { TimezoneCombobox } from '../../TimezoneCombobox';
import { getSatTestDates, getSatPastMonths, formatSatDate } from '../constants';
import type { EditForm } from '../types';

const inputCls = 'w-full bg-gray-50 border border-gray-200 focus:border-blue-500 rounded-lg px-2.5 py-1.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition-all';
const selectCls = 'w-full bg-gray-50 border border-gray-200 focus:border-blue-500 rounded-lg px-2.5 py-1.5 text-sm text-gray-900 outline-none transition-all';

function EditField({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`space-y-1 ${className ?? ''}`}>
      <label className="text-[11px] font-medium text-gray-400">{label}</label>
      {children}
    </div>
  );
}

interface Props {
  form: EditForm;
  onChange: (f: EditForm) => void;
  adminKey?: string;
  studentId?: string;
}

export function StudentInfoEdit({ form, onChange, adminKey, studentId }: Props) {
  const [nameSuggestions, setNameSuggestions] = useState<string[]>([]);
  const nameTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 현재 날짜 기준 과거 응시 월 / 미래 목표 시험일 (실시간)
  const satPastMonths = useMemo(() => getSatPastMonths(), []);
  const satTestDates = useMemo(() => getSatTestDates(), []);
  const satTestValues = useMemo(
    () => new Set(satTestDates.flatMap(g => g.dates.map(d => d.value))),
    [satTestDates],
  );
  // 이미 지나 목록에서 빠졌지만 저장돼 있는 목표일은 옵션으로 유지(값 손실 방지)
  const staleTargetOption = (value: string) =>
    value && !satTestValues.has(value)
      ? <option value={value}>{formatSatDate(value)} (지난 시험)</option>
      : null;

  const set = (key: keyof EditForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    onChange({ ...form, [key]: e.target.value });

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    onChange({ ...form, name: value });

    if (nameTimer.current) clearTimeout(nameTimer.current);
    if (!adminKey || value.trim().length < 2) {
      setNameSuggestions([]);
      return;
    }

    nameTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/crm/students?name_search=${encodeURIComponent(value.trim())}`,
          { headers: { 'x-admin-key': adminKey } }
        );
        const json = await res.json();
        const others = (json.data ?? [])
          .filter((s: { id: string }) => s.id !== studentId)
          .map((s: { name: string }) => s.name);
        setNameSuggestions(others);
      } catch {
        // ignore
      }
    }, 300);
  };

  return (
    <div className="space-y-3 bg-white rounded-xl border border-blue-200 p-4">
      <p className="text-[11px] text-blue-500 font-medium">편집 모드 — 저장 버튼을 눌러야 반영됩니다</p>
      <EditField label="이름 (내부)">
        <input
          value={form.name}
          onChange={handleNameChange}
          className={inputCls}
          placeholder="홍길동"
          autoComplete="off"
        />
        {nameSuggestions.length > 0 && (
          <div className="mt-1 bg-amber-50 border border-amber-300 rounded-lg overflow-hidden">
            <p className="text-[11px] text-amber-700 px-2.5 py-1 font-medium border-b border-amber-200">
              동명이인 주의 — 이미 등록된 유사 이름
            </p>
            {nameSuggestions.map((name, i) => (
              <button
                key={i}
                type="button"
                onClick={() => { onChange({ ...form, name }); setNameSuggestions([]); }}
                className="w-full text-left px-2.5 py-1.5 text-xs text-gray-700 hover:bg-amber-100 transition-colors border-b border-amber-100 last:border-0"
              >
                {name}
              </button>
            ))}
          </div>
        )}
      </EditField>
      <EditField label="학부모 포털 표시 이름">
        <input value={form.portal_name} onChange={set('portal_name')} className={inputCls} placeholder="비워두면 내부 이름 그대로 표시" />
      </EditField>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <EditField label="학제">
          <select
            value={form.school_type}
            onChange={e => onChange({ ...form, school_type: e.target.value, grade: '' })}
            className={selectCls}
          >
            <option value="한국 학제">한국 학제</option>
            <option value="AP">AP</option>
            <option value="IB">IB</option>
          </select>
        </EditField>
        <EditField label="학년">
          <select value={form.grade} onChange={set('grade')} className={selectCls}>
            <option value="">선택</option>
            {(GRADE_OPTIONS_BY_SCHOOL_TYPE[form.school_type] ?? GRADE_OPTIONS_BY_SCHOOL_TYPE['AP']).map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </EditField>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <EditField label="연락 수단">
          <select value={form.contact_type} onChange={set('contact_type')} className={selectCls}>
            <option value="phone">핸드폰</option>
            <option value="kakao">카카오톡</option>
            <option value="email">이메일</option>
          </select>
        </EditField>
        <EditField label="연락처">
          <input value={form.parent_phone} onChange={set('parent_phone')} className={inputCls} />
        </EditField>
      </div>
      <EditField label="학생 거주 시간대">
        <TimezoneCombobox
          value={form.parent_timezone}
          onChange={tz => onChange({ ...form, parent_timezone: tz })}
          className={selectCls}
        />
      </EditField>
      <EditField label="희망 과목">
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
      </EditField>
      <EditField label="직전 점수 상태">
        <select value={form.previous_score_status} onChange={set('previous_score_status')} className={selectCls}>
          <option value="scored">응시함</option>
          <option value="never_taken">미응시</option>
          <option value="dont_remember">기억안남</option>
        </select>
      </EditField>
      {form.previous_score_status === 'scored' && (
        <>
          <EditField label="응시 월">
            <select value={form.previous_test_date} onChange={set('previous_test_date')} className={selectCls}>
              <option value="">(미상)</option>
              {satPastMonths.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </EditField>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <EditField label="직전 RW">
              <input type="number" value={form.previous_rw_score} onChange={set('previous_rw_score')} className={inputCls} placeholder="200-800" min={200} max={800} />
            </EditField>
            <EditField label="직전 Math">
              <input type="number" value={form.previous_math_score} onChange={set('previous_math_score')} className={inputCls} placeholder="200-800" min={200} max={800} />
            </EditField>
          </div>
        </>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <EditField label="1차 목표 시험일">
          <select value={form.target_test_date} onChange={set('target_test_date')} className={selectCls}>
            <option value="">(미정)</option>
            {staleTargetOption(form.target_test_date)}
            {satTestDates.map(g => (
              <optgroup key={g.group} label={g.group}>
                {g.dates.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </optgroup>
            ))}
          </select>
        </EditField>
        <EditField label="이때 목표 점수">
          <input type="number" value={form.target_score} onChange={set('target_score')} className={inputCls} placeholder="800-1600" min={800} max={1600} />
        </EditField>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <EditField label="2차 목표 시험일">
          <select value={form.target_test_date_2} onChange={set('target_test_date_2')} className={selectCls}>
            <option value="">(없음)</option>
            {staleTargetOption(form.target_test_date_2)}
            {satTestDates.map(g => (
              <optgroup key={g.group} label={g.group}>
                {g.dates.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </optgroup>
            ))}
          </select>
        </EditField>
        <EditField label="이때 목표 점수">
          <input type="number" value={form.target_score_2} onChange={set('target_score_2')} className={inputCls} placeholder="800-1600" min={800} max={1600} />
        </EditField>
      </div>
      <EditField label="수업 희망 언어">
        <select value={form.preferred_language} onChange={set('preferred_language')} className={selectCls}>
          <option value="">(미설정)</option>
          <option value="korean">한국어</option>
          <option value="english">English</option>
          <option value="any">한/영 혼용</option>
        </select>
      </EditField>
    </div>
  );
}

export { INQUIRY_CHANNEL_OPTIONS, TRAFFIC_SOURCE_OPTIONS, CONTENT_AUTHOR_OPTIONS, B2B_PARTNER_OPTIONS };
export { inputCls, selectCls, EditField };
