'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import type { Company } from '@/types/crm';
import { Field, inputCls } from '../form-primitives';

interface Props {
  adminKey: string;
  company?: Company | null; // 있으면 수정, 없으면 신규
  onClose: () => void;
  onSaved: (company: Company) => void;
}

export function CompanyEditModal({ adminKey, company, onClose, onSaved }: Props) {
  const [name, setName] = useState(company?.name ?? '');
  const [contactPerson, setContactPerson] = useState(company?.contact_person ?? '');
  const [contactPhone, setContactPhone] = useState(company?.contact_phone ?? '');
  const [contactEmail, setContactEmail] = useState(company?.contact_email ?? '');
  const [contractTerms, setContractTerms] = useState(company?.contract_terms ?? '');
  const [notes, setNotes] = useState(company?.notes ?? '');
  const [isActive, setIsActive] = useState(company?.is_active ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isEdit = !!company;

  async function handleSave() {
    if (!name.trim()) { setError('업체명을 입력해주세요.'); return; }
    setSaving(true);
    setError('');
    const body = {
      name: name.trim(),
      contact_person: contactPerson.trim() || null,
      contact_phone: contactPhone.trim() || null,
      contact_email: contactEmail.trim() || null,
      contract_terms: contractTerms.trim() || null,
      notes: notes.trim() || null,
      is_active: isActive,
    };
    try {
      const res = await fetch(isEdit ? `/api/crm/companies/${company!.id}` : '/api/crm/companies', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? '저장에 실패했습니다.'); setSaving(false); return; }
      onSaved(json.data as Company);
    } catch {
      setError('네트워크 오류가 발생했습니다.');
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900">{isEdit ? '업체 수정' : '업체 추가'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100" aria-label="닫기">
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3 max-h-[70vh] overflow-y-auto">
          <Field label="업체명 *">
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls(!!error && !name.trim())} placeholder="예: 해연" />
          </Field>
          <Field label="담당자">
            <input value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} className={inputCls(false)} />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="연락처">
              <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className={inputCls(false)} />
            </Field>
            <Field label="이메일">
              <input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className={inputCls(false)} />
            </Field>
          </div>
          <Field label="계약조건">
            <textarea value={contractTerms} onChange={(e) => setContractTerms(e.target.value)} rows={2} className={`${inputCls(false)} resize-none`} placeholder="수수료율 / 정산주기 등" />
          </Field>
          <Field label="메모">
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={`${inputCls(false)} resize-none`} />
          </Field>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            활성 업체
          </label>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-100">취소</button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-40 rounded-lg">
            {saving ? '저장 중…' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}
