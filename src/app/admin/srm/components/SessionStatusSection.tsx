'use client';
import { srmFetch } from '../lib/srm-fetch';
import { useState, useEffect } from 'react';
import { Copy, Check, X, RefreshCw } from 'lucide-react';
import type { SessionStatus, SessionStatusLog } from '@/app/api/admin/srm/session-status/route';
import type { V2SessionSuggestion } from '@/app/api/admin/srm/v2-session-status/route';
import type { ScheduleEvent } from '@/app/api/admin/srm/schedule/route';
import {
  STATUS_LABEL, STATUS_COLOR, STATUS_GROUPS,
  buildStatusMessageKo, buildStatusMessageEn,
} from '../lib/session-status-messages';

interface Props {
  ev: ScheduleEvent & { eventType: 'studyHall' | 'vocab' };
  eventDate: string;
  userName: string;
  // eventId → studentId → suggestion (pre-loaded by parent)
  v2Suggestions: Record<string, Record<string, V2SessionSuggestion>>;
  onRefreshV2: (eventId: string) => void;
  v2Loading: boolean;
  // pre-loaded logs from parent batch fetch (eventId → logs[])
  initialLogs?: SessionStatusLog[];
}

function toKstTime(iso: string) {
  return new Date(iso).toLocaleTimeString('ko-KR', {
    timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hour12: false,
  });
}

export function SessionStatusSection({ ev, eventDate, userName, v2Suggestions, onRefreshV2, v2Loading, initialLogs }: Props) {
  const [logs, setLogs] = useState<SessionStatusLog[]>(initialLogs ?? []);
  const [copying, setCopying] = useState<string | null>(null); // `${studentName}-${status}-${lang}`
  const [saving, setSaving] = useState<string | null>(null);   // `${studentName}-${status}`
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (initialLogs !== undefined) {
      setLogs(initialLogs);
      return;
    }
    srmFetch(`/api/admin/srm/session-status?eventIds=${ev.id}`)
      .then((r) => r.json())
      .then((d) => setLogs(d.data ?? []))
      .catch(() => {});
  }, [ev.id, initialLogs]);

  const eventType = ev.eventType === 'studyHall' ? 'study_hall' : 'vocab';
  const suggestions = v2Suggestions[ev.id] ?? {};

  const handleStatus = async (
    studentName: string,
    studentId: string | undefined,
    status: SessionStatus,
    lang: 'ko' | 'en',
  ) => {
    const studentCurrentLogs = logs.filter((l) => l.student_name === studentName);

    const key = `${studentName}-${status}-${lang}`;
    const msg = lang === 'ko'
      ? buildStatusMessageKo(studentName, status, eventType)
      : buildStatusMessageEn(studentName, status, eventType);

    // Copy message
    setCopying(key);
    try { await navigator.clipboard.writeText(msg); } catch { /* non-fatal */ }
    setTimeout(() => setCopying((c) => c === key ? null : c), 2000);

    // 같은 상태가 마지막 로그와 동일하면 중복 저장 방지
    const lastLog = studentCurrentLogs[studentCurrentLogs.length - 1];
    if (lastLog?.status === status) return;

    const saveKey = `${studentName}-${status}`;
    setSaving(saveKey);

    const postLog = async (s: SessionStatus) => {
      const res = await srmFetch('/api/admin/srm/session-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: ev.id,
          eventType,
          eventDate,
          studentId: studentId ?? undefined,
          studentName,
          status: s,
          loggedBy: userName || '관리자',
        }),
      });
      const { data } = await res.json();
      if (data) setLogs((prev) => [...prev, data]);
    };

    try {
      // 출석 클릭 시 이벤트 시작 5분 초과 → 지각 자동 선행 기록
      const LATE_MS = 5 * 60 * 1000;
      // eslint-disable-next-line react-hooks/purity
      const isLateNow = status === 'on_time' && Date.now() > new Date(ev.startsAt).getTime() + LATE_MS;
      const hasLateLog = studentCurrentLogs.some((l) => l.status === 'late');
      if (isLateNow && !hasLateLog) await postLog('late');

      await postLog(status);
    } catch { /* non-fatal */ }
    setSaving(null);
  };

  const handleDelete = async (logId: string) => {
    setDeleting(logId);
    try {
      await srmFetch(`/api/admin/srm/session-status/${logId}`, { method: 'DELETE' });
      setLogs((prev) => prev.filter((l) => l.id !== logId));
    } catch { /* non-fatal */ }
    setDeleting(null);
  };

  return (
    <div className="border-t border-gray-100 bg-gray-50/50 px-3 py-2 space-y-2">
      {/* v2 조회 버튼 */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">학생 상태</span>
        <button
          onClick={() => onRefreshV2(ev.id)}
          disabled={v2Loading}
          className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-gray-600 transition-colors"
        >
          <RefreshCw size={10} className={v2Loading ? 'animate-spin' : ''} />
          v2 조회
        </button>
      </div>

      {/* 학생별 상태 */}
      {ev.students.map((studentName, i) => {
        const studentId = ev.studentIds?.[i];
        const studentLogs = logs.filter((l) => l.student_name === studentName);
        const lastLog = studentLogs[studentLogs.length - 1];
        const suggestion = studentId ? suggestions[studentId] : undefined;

        return (
          <div key={`${ev.id}-${studentName}`} className="space-y-1">
            {/* 학생 이름 */}
            <span className="text-[11px] font-semibold text-gray-700">{studentName}</span>

            {/* 기록 — 상태 버튼 */}
            <div className="flex flex-wrap items-center gap-1 pl-2">
              <span className="text-[9px] font-medium text-gray-400 shrink-0 w-6">기록</span>
              {STATUS_GROUPS.map((group) => (
                <span key={group.label} className="flex items-center gap-0.5">
                  {group.statuses.map((status) => {
                    const saveKey = `${studentName}-${status}`;
                    const copyKeyKo = `${studentName}-${status}-ko`;
                    const copyKeyEn = `${studentName}-${status}-en`;
                    const isCopiedKo = copying === copyKeyKo;
                    const isCopiedEn = copying === copyKeyEn;
                    const isSaving = saving === saveKey;

                    return (
                      <span key={status} className="inline-flex items-center">
                        <button
                          disabled={isSaving}
                          onClick={() => handleStatus(studentName, studentId, status, 'ko')}
                          className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-l text-[10px] font-medium border transition-colors bg-white text-gray-500 border-gray-200 hover:${STATUS_COLOR[status]} ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                          title={`${STATUS_LABEL[status]} (KO)`}
                        >
                          {isCopiedKo ? <Check size={9} /> : <Copy size={9} />}
                          <span>{STATUS_LABEL[status]}</span>
                        </button>
                        <button
                          disabled={isSaving}
                          onClick={() => handleStatus(studentName, studentId, status, 'en')}
                          className={`px-1 py-0.5 rounded-r text-[9px] font-bold border-y border-r transition-colors bg-white text-blue-400 border-gray-200 hover:text-blue-600 hover:border-blue-300 ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                          title={`${STATUS_LABEL[status]} (EN)`}
                        >
                          {isCopiedEn ? <Check size={9} /> : 'EN'}
                        </button>
                      </span>
                    );
                  })}
                  <span className="text-gray-200 mx-0.5">│</span>
                </span>
              ))}
            </div>

            {/* 이력 — v2 제안 + 저장된 로그 */}
            {(suggestion?.suggestedStatus || studentLogs.length > 0) && (
              <div className="flex flex-wrap items-center gap-1 pl-2 py-1 bg-gray-100/70 rounded-md">
                <span className="text-[9px] font-medium text-gray-400 shrink-0 w-6">이력</span>
                {suggestion?.suggestedStatus && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium border bg-blue-50 text-blue-500 border-blue-200">
                    v2: {STATUS_LABEL[suggestion.suggestedStatus]}
                    {suggestion.joinedAt && <span className="opacity-70"> · 입장 {toKstTime(suggestion.joinedAt)}</span>}
                  </span>
                )}
                {studentLogs.map((log) => (
                  <span
                    key={log.id}
                    className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium border ${STATUS_COLOR[log.status]}`}
                  >
                    {STATUS_LABEL[log.status]}
                    <span className="opacity-70">{toKstTime(log.created_at)}</span>
                    <button
                      onClick={() => handleDelete(log.id)}
                      disabled={deleting === log.id}
                      className="ml-0.5 opacity-50 hover:opacity-100 transition-opacity"
                      title="로그 삭제"
                    >
                      <X size={9} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
