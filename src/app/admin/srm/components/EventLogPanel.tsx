'use client';

import { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { AddForm } from './CommLog';
import { SrmCommCard } from './SrmCommCard';
import type { CommEntry, EventContext } from './CommLog';
import type { ScheduleEvent } from '@/app/api/admin/srm/schedule/route';
import { useAdminAuth } from '@/lib/useAdminAuth';

type EventType = 'coachRoom' | 'studyHall';

interface TaggedEvent extends ScheduleEvent {
  eventType: EventType;
  day: 'today' | 'tomorrow';
  startsAtKst: string; // HH:MM
}

interface Props {
  event: TaggedEvent;
  onClose: () => void;
}


function getAdminName() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('admin_user_name') ?? '';
}

export function EventLogPanel({ event, onClose }: Props) {
  const [comms, setComms] = useState<CommEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const handleUpdated = (updated: CommEntry) => {
    setComms((prev) => prev.map((c) => c.id === updated.id ? updated : c));
  };
  const { userName } = useAdminAuth();

  const fetchComms = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/srm/communications?eventId=${event.id}`);
    const data = await res.json();
    setComms(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [event.id]);

  useEffect(() => { fetchComms(); }, [fetchComms]);

  const handleSave = async (data: { parties: string[]; channel: string; content: string; reason?: string; resolution?: string }) => {
    setSaving(true);
    await fetch('/api/admin/srm/communications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId: event.studentIds?.[0] ?? null,
        studentName: event.students.join(', '),
        coachId: event.coachIds?.[0] ?? null,
        author: userName || getAdminName() || '관리자',
        triggerType: 'manual',
        autoCount: 0,
        eventId: event.id,
        ...data,
      }),
    });
    await fetchComms();
    setSaving(false);
  };

  const isCoach = event.eventType === 'coachRoom';
  const dayLabel = event.day === 'today' ? '오늘' : '내일';

  const eventContext: EventContext = {
    eventId: event.id,
    time: event.startsAtKst,
    type: event.eventType,
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-30" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-[520px] bg-[#1a1c1f] border-l border-white/10 z-40 flex flex-col shadow-2xl">

        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
              isCoach ? 'bg-blue-500/20 text-blue-400' : 'bg-white/10 text-gray-400'
            }`}>
              {isCoach ? '수업' : '스터디홀'}
            </span>
            <span className="text-white font-semibold">{event.startsAtKst}</span>
            <span className="text-gray-500 text-sm">{dayLabel}</span>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-1">
            <X size={18} />
          </button>
        </div>

        {/* 참여자 정보 */}
        <div className="px-5 py-3 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            {event.students.map((name, i) => (
              <span key={i} className="text-sm text-gray-200 font-medium">{name}</span>
            ))}
            {isCoach && event.coaches.length > 0 && (
              <>
                <span className="text-gray-600">↔</span>
                {event.coaches.map((name, i) => (
                  <span key={i} className="text-sm text-gray-400">{name}</span>
                ))}
              </>
            )}
          </div>
        </div>

        {/* 기존 커뮤니케이션 로그 */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
          {loading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => <div key={i} className="h-14 bg-white/5 rounded-lg animate-pulse" />)}
            </div>
          ) : comms.length === 0 ? (
            <p className="text-xs text-gray-600 py-2">이 이벤트에 대한 기록이 없습니다.</p>
          ) : (
            comms.map((e) => (
              <SrmCommCard key={e.id} entry={e} onUpdated={handleUpdated} />
            ))
          )}
        </div>

        {/* 입력폼 */}
        <div className="border-t border-white/10 px-5 py-4 shrink-0">
          <AddForm
            onSave={handleSave}
            saving={saving}
            eventContext={eventContext}
            noBorder
          />
        </div>
      </div>
    </>
  );
}
