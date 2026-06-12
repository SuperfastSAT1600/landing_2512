'use client';

import { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { CommLog, CommEntry } from './CommLog';
import { CrmLinkSection } from './CrmLinkSection';
import { LifecycleTab } from './LifecycleTab';

interface ConsultationEntry {
  id: string;
  created_at: string;
  raw_memo: string;
  author?: string;
}

interface StudentDetail {
  profile: { id: string; full_name: string; email: string | null; phone: string | null; grade: string | null } | null;
  crmStudent: { id: string; name: string; consultation_timeline: ConsultationEntry[]; sfv2_profile_id: string | null } | null;
}

type Tab = 'comm' | 'lifecycle' | 'crm';

function getAdminName() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('admin_user_name') ?? '';
}

interface Props {
  studentId: string;
  studentName: string;
  onClose: () => void;
}

export function StudentPanel({ studentId, studentName, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('comm');
  const [detail, setDetail] = useState<StudentDetail | null>(null);
  const [comms, setComms] = useState<CommEntry[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [loadingComms, setLoadingComms] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchDetail = useCallback(async () => {
    setLoadingDetail(true);
    const res = await fetch(`/api/admin/srm/student/${studentId}`);
    setDetail(await res.json());
    setLoadingDetail(false);
  }, [studentId]);

  const fetchComms = useCallback(async () => {
    setLoadingComms(true);
    const res = await fetch(`/api/admin/srm/communications?studentId=${studentId}`);
    setComms(await res.json());
    setLoadingComms(false);
  }, [studentId]);

  useEffect(() => {
    fetchDetail();
    fetchComms();
  }, [fetchDetail, fetchComms]);

  const handleAdd = async (data: { target: string; channel: string; content: string }) => {
    setSaving(true);
    await fetch('/api/admin/srm/communications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId,
        studentName,
        author: getAdminName(),
        ...data,
      }),
    });
    await fetchComms();
    setSaving(false);
  };

  const handleLinked = () => fetchDetail();

  const timeline: ConsultationEntry[] = detail?.crmStudent?.consultation_timeline ?? [];
  const isLinked = !!detail?.crmStudent;

  return (
    <>
      {/* 배경 오버레이 */}
      <div className="fixed inset-0 bg-black/40 z-30" onClick={onClose} />

      {/* 패널 */}
      <div className="fixed right-0 top-0 h-full w-[420px] bg-[#1a1c1f] border-l border-white/10 z-40 flex flex-col shadow-2xl">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div>
            <h2 className="text-base font-bold text-white">{studentName}</h2>
            {loadingDetail ? (
              <div className="h-3 w-24 bg-white/10 rounded animate-pulse mt-1" />
            ) : (
              <p className="text-xs text-gray-500 mt-0.5">
                {detail?.profile?.grade ?? ''}{isLinked ? ` · CRM 연결됨` : ''}
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-1">
            <X size={18} />
          </button>
        </div>

        {/* 탭 */}
        <div className="flex border-b border-white/10">
          {(['comm', 'lifecycle', 'crm'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
                tab === t ? 'text-white border-b-2 border-blue-500' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {t === 'comm' ? '커뮤니케이션' : t === 'lifecycle' ? '라이프사이클' : `CRM${isLinked ? ` (${timeline.length})` : ''}`}
            </button>
          ))}
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {tab === 'comm' && (
            <CommLog
              entries={comms}
              loading={loadingComms}
              saving={saving}
              onAdd={handleAdd}
            />
          )}

          {tab === 'lifecycle' && (
            <LifecycleTab
              profileId={studentId}
              studentId={detail?.crmStudent?.id}
            />
          )}

          {tab === 'crm' && (
            <div className="space-y-4">
              {!loadingDetail && !isLinked && (
                <CrmLinkSection sfv2ProfileId={studentId} onLinked={handleLinked} />
              )}

              {loadingDetail && (
                <div className="space-y-2">
                  {[1, 2].map((i) => <div key={i} className="h-16 bg-white/5 rounded-lg animate-pulse" />)}
                </div>
              )}

              {!loadingDetail && isLinked && timeline.length === 0 && (
                <p className="text-xs text-gray-600">CRM에 상담 기록이 없습니다.</p>
              )}

              {!loadingDetail && isLinked && timeline.length > 0 && (
                <div className="space-y-3">
                  {[...timeline]
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .map((entry) => (
                      <div key={entry.id} className="bg-white/5 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-[11px] text-gray-500">
                            {new Date(entry.created_at).toLocaleDateString('ko-KR', {
                              year: 'numeric', month: 'numeric', day: 'numeric',
                            })}
                          </span>
                          {entry.author && (
                            <span className="text-[11px] text-gray-600">· {entry.author}</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                          {entry.raw_memo}
                        </p>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
