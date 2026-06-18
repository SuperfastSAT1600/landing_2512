'use client';
import { srmFetch } from '../lib/srm-fetch';

import { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { CommLog } from './CommLog';
import type { CommEntry } from '@/app/api/admin/srm/communications/route';
import { getAdminName } from '@/lib/admin-user';

interface RelatedStudent {
  name: string;
  events: string[];
}

interface Props {
  coachId: string;
  coachName: string;
  relatedStudents: RelatedStudent[];
  onClose: () => void;
}

export function CoachPanel({ coachId, coachName, relatedStudents, onClose }: Props) {
  const [comms, setComms] = useState<CommEntry[]>([]);
  const [loadingComms, setLoadingComms] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchComms = useCallback(async () => {
    setLoadingComms(true);
    const res = await srmFetch(`/api/admin/srm/communications?coachId=${coachId}`);
    if (res.ok) setComms(await res.json());
    setLoadingComms(false);
  }, [coachId]);

  useEffect(() => {
    fetchComms();
  }, [fetchComms]);

  const handleAdd = async (data: { parties: string[]; channel: string; content: string; reason?: string; resolution?: string }) => {
    setSaving(true);
    await srmFetch('/api/admin/srm/communications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId: null,
        studentName: null,
        coachId,
        coachName,
        author: getAdminName(),
        triggerType: 'manual',
        autoCount: 0,
        ...data,
      }),
    });
    await fetchComms();
    setSaving(false);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-30" onClick={onClose} />

      <div className="fixed right-0 top-0 h-full w-[420px] bg-white border-l border-gray-200 z-40 flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div className="flex-1 min-w-0 mr-3">
            <h2 className="text-base font-bold text-gray-900">{coachName}</h2>
            <p className="text-xs text-gray-500 mt-0.5">코치</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors p-1 shrink-0">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {relatedStudents.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-gray-500 mb-2">수업 학생</p>
              <div className="flex flex-wrap gap-1.5">
                {relatedStudents.map((s, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 bg-gray-100 border border-gray-200 rounded-full text-xs text-gray-600"
                  >
                    {s.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          <CommLog
            entries={comms}
            loading={loadingComms}
            saving={saving}
            onAdd={handleAdd}
          />
        </div>
      </div>
    </>
  );
}
