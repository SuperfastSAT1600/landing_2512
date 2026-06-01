'use client';

import { ChevronRight, ChevronDown, Pencil } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { Student, RetryStrategy } from '@/types/crm';
import { CONTACT_TYPE_LABELS, TIMEZONE_LABEL_MAP } from '@/types/crm';
import {
  INQUIRY_CHANNEL_OPTIONS, TRAFFIC_SOURCE_OPTIONS, CONTENT_AUTHOR_OPTIONS, B2B_PARTNER_OPTIONS,
} from '@/types/crm';
import type { EditForm } from '../types';
import { inputCls, selectCls, EditField } from './StudentInfoEdit';

function InquiryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-[13px] text-gray-400 w-[28%] shrink-0">{label}</span>
      <span className="text-[13px] text-gray-700 font-medium">{value}</span>
    </div>
  );
}

interface Props {
  localStudent: Student;
  adminKey: string;
  editForm: EditForm;
  setEditForm: (f: EditForm) => void;
  showInquiry: boolean;
  setShowInquiry: (v: boolean | ((prev: boolean) => boolean)) => void;
  isEditingInquiry: boolean;
  setIsEditingInquiry: (v: boolean) => void;
  savingInquiry: boolean;
  onSaveInquiry: () => void;
  onCancelInquiry: () => void;
  onStrategyChange: (id: string | null) => void;
}

export function InquirySection({
  localStudent, adminKey, editForm, setEditForm, showInquiry, setShowInquiry,
  isEditingInquiry, setIsEditingInquiry, savingInquiry, onSaveInquiry, onCancelInquiry,
  onStrategyChange,
}: Props) {
  const [initialStrategies, setInitialStrategies] = useState<RetryStrategy[]>([]);

  useEffect(() => {
    fetch('/api/crm/retry-strategies?type=initial', {
      headers: { 'x-admin-key': adminKey },
    })
      .then(r => r.json())
      .then(j => setInitialStrategies(j.data ?? []))
      .catch(() => {});
  }, [adminKey]);

  const currentStrategy = initialStrategies.find(s => s.id === localStudent.initial_strategy_id);

  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => { setShowInquiry(v => !v); if (isEditingInquiry) setIsEditingInquiry(false); }}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          {showInquiry ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          인입 정보
        </button>
        {isEditingInquiry ? (
          <div className="flex items-center gap-2">
            <button onClick={onCancelInquiry} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">취소</button>
            <button
              onClick={onSaveInquiry}
              disabled={savingInquiry}
              className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-2.5 py-1 rounded-lg transition-colors"
            >
              {savingInquiry ? '저장 중...' : '저장'}
            </button>
          </div>
        ) : (
          <button
            onClick={() => { setShowInquiry(true); setIsEditingInquiry(true); }}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-500 transition-colors"
          >
            <Pencil size={11} />편집
          </button>
        )}
      </div>
      {showInquiry && (
        isEditingInquiry ? (
          <div className="space-y-3 bg-white rounded-xl border border-blue-200 p-4">
            <p className="text-[11px] text-blue-500 font-medium">편집 모드 — 저장 버튼을 눌러야 반영됩니다</p>
            <div className="grid grid-cols-2 gap-2">
              <EditField label="문의 날짜">
                <input type="date" value={editForm.inquiry_date} onChange={e => setEditForm({ ...editForm, inquiry_date: e.target.value })} className={inputCls} />
              </EditField>
              <EditField label="인입 채널">
                <select value={editForm.inquiry_channel} onChange={e => setEditForm({ ...editForm, inquiry_channel: e.target.value })} className={selectCls}>
                  <option value="">(미상)</option>
                  {INQUIRY_CHANNEL_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </EditField>
              <EditField label="유입 소스">
                <select value={editForm.traffic_source} onChange={e => setEditForm({ ...editForm, traffic_source: e.target.value })} className={selectCls}>
                  <option value="">(미상)</option>
                  {TRAFFIC_SOURCE_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </EditField>
              <EditField label="콘텐츠 작성자">
                <select value={editForm.content_author} onChange={e => setEditForm({ ...editForm, content_author: e.target.value })} className={selectCls}>
                  <option value="">(미상)</option>
                  {CONTENT_AUTHOR_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </EditField>
              <EditField label="구분">
                <select value={editForm.lead_type} onChange={e => setEditForm({ ...editForm, lead_type: e.target.value })} className={selectCls}>
                  <option value="B2C">B2C</option>
                  <option value="B2B">B2B</option>
                </select>
              </EditField>
              {editForm.lead_type === 'B2B' && (
                <EditField label="B2B 파트너사">
                  <select value={editForm.b2b_partner} onChange={e => setEditForm({ ...editForm, b2b_partner: e.target.value })} className={selectCls}>
                    <option value="">선택</option>
                    {B2B_PARTNER_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </EditField>
              )}
              <EditField label="광고명 (자동)">
                <input readOnly value={localStudent.ad_name ?? ''} placeholder="자동 입력" className={`${inputCls} bg-gray-50 text-gray-400 cursor-default`} />
              </EditField>
              <EditField label="광고세트 (자동)">
                <input readOnly value={localStudent.adset_name ?? ''} placeholder="자동 입력" className={`${inputCls} bg-gray-50 text-gray-400 cursor-default`} />
              </EditField>
            </div>
          </div>
        ) : (
          <div className="bg-gray-100 rounded-xl px-4 py-3 space-y-1.5">
            <InquiryRow label="문의일" value={localStudent.inquiry_date ?? '—'} />
            <InquiryRow label="채널" value={localStudent.inquiry_channel ?? '(미상)'} />
            <InquiryRow label="소스" value={localStudent.traffic_source ?? '(미상)'} />
            {localStudent.content_author && (
              <InquiryRow label="작성자" value={localStudent.content_author} />
            )}
            <InquiryRow label="구분" value={localStudent.lead_type ?? '—'} />
            {localStudent.b2b_partner && (
              <InquiryRow label="파트너" value={localStudent.b2b_partner} />
            )}
            <InquiryRow
              label={localStudent.contact_type ? CONTACT_TYPE_LABELS[localStudent.contact_type] : '연락처'}
              value={localStudent.parent_phone || '—'}
            />
            {localStudent.parent_timezone && (
              <InquiryRow label="시간대" value={TIMEZONE_LABEL_MAP[localStudent.parent_timezone] ?? localStudent.parent_timezone} />
            )}
            <InquiryRow label="광고명" value={localStudent.ad_name ?? '—'} />
            <InquiryRow label="광고세트" value={localStudent.adset_name ?? '—'} />
            {localStudent.campaign_tags && localStudent.campaign_tags.length > 0 && (
              <div className="flex items-start gap-2 pt-0.5">
                <span className="text-[13px] text-gray-400 w-[28%] shrink-0">태그</span>
                <div className="flex flex-wrap gap-1">
                  {localStudent.campaign_tags.map(tag => (
                    <span key={tag} className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[11px] font-medium">{tag}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      )}

      {/* 최초 세일즈 전략 — 편집 모드와 무관하게 항상 표시 */}
      {showInquiry && (
        <div className="flex items-center gap-2 mt-2">
          <span className="text-[13px] text-gray-400 w-[28%] shrink-0">최초 전략</span>
          <select
            value={localStudent.initial_strategy_id ?? ''}
            onChange={e => onStrategyChange(e.target.value || null)}
            className="flex-1 text-[13px] border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white text-gray-700"
          >
            <option value="">전략 없음</option>
            {initialStrategies.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      )}
    </section>
  );
}
