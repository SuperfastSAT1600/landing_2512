'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Plus, AlertTriangle } from 'lucide-react';
import { AddForm } from './CommLog';
import { SrmCommCard } from './SrmCommCard';
import { EventIssueCard, type BaseIssue } from './EventIssueCard';
import type { CommEntry, EventContext } from './CommLog';
import type { ScheduleEvent } from '@/app/api/admin/srm/schedule/route';
import type { EventIssue } from '@/app/api/admin/srm/issues/route';
import { useAdminAuth } from '@/lib/useAdminAuth';

type EventType = 'coachRoom' | 'studyHall';

interface TaggedEvent extends ScheduleEvent {
  eventType: EventType;
  day: 'today' | 'tomorrow';
  startsAtKst: string;
}

interface Props {
  event: TaggedEvent;
  onClose: () => void;
}

const ISSUE_TYPES = [
  { value: 'cancellation', label: '취소/재예약' },
  { value: 'coach_change', label: '코치 교체' },
  { value: 'no_show', label: '노쇼' },
  { value: 'custom', label: '기타' },
] as const;

function getAdminName() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('admin_user_name') ?? '';
}

export function EventLogPanel({ event, onClose }: Props) {
  const [comms, setComms] = useState<CommEntry[]>([]);
  const [issues, setIssues] = useState<EventIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [issueType, setIssueType] = useState<string>('cancellation');
  const [issueTitle, setIssueTitle] = useState('');
  const [issueDesc, setIssueDesc] = useState('');
  const [issueSaving, setIssueSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'issue' | 'comm'>('comm');

  const { userName } = useAdminAuth();

  const handleCommUpdated = (updated: CommEntry) => {
    setComms((prev) => prev.map((c) => c.id === updated.id ? updated : c));
  };

  const handleIssueUpdated = (updated: BaseIssue) => {
    setIssues((prev) => prev.map((i) => i.id === updated.id ? updated as EventIssue : i));
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [commsRes, issuesRes] = await Promise.all([
      fetch(`/api/admin/srm/communications?eventId=${event.id}`),
      fetch(`/api/admin/srm/issues?eventId=${event.id}`),
    ]);
    const [commsData, issuesData] = await Promise.all([
      commsRes.json(),
      issuesRes.json(),
    ]);
    setComms(Array.isArray(commsData) ? commsData : []);
    setIssues(Array.isArray(issuesData) ? issuesData : []);
    setLoading(false);
  }, [event.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

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
    await fetchData();
    setSaving(false);
  };

  const handleIssueSubmit = async () => {
    if (!issueTitle.trim()) return;
    setIssueSaving(true);
    const res = await fetch('/api/admin/srm/issues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventId: event.id,
        issueType,
        title: issueTitle.trim(),
        description: issueDesc.trim() || undefined,
        createdBy: userName || getAdminName() || '관리자',
        studentName: event.students.join(', ') || undefined,
        coachName: event.coaches.join(', ') || undefined,
      }),
    });
    if (res.ok) {
      const newIssue = await res.json() as EventIssue;
      setIssues((prev) => [newIssue, ...prev]);
      setIssueTitle('');
      setIssueDesc('');
      setIssueType('cancellation');
      setShowIssueForm(false);
    }
    setIssueSaving(false);
  };

  const isCoach = event.eventType === 'coachRoom';
  const dayLabel = event.day === 'today' ? '오늘' : '내일';
  const openIssues = issues.filter((i) => i.status === 'open');

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
            {openIssues.length > 0 && (
              <span className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400">
                <AlertTriangle size={10} />
                미해결 {openIssues.length}건
              </span>
            )}
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

        {/* 탭 헤더 */}
        <div className="flex border-b border-white/10 shrink-0">
          <button
            onClick={() => setActiveTab('issue')}
            className={`flex items-center gap-1.5 px-5 py-2.5 text-xs font-medium transition-colors border-b-2 -mb-px ${
              activeTab === 'issue'
                ? 'border-orange-400 text-orange-300'
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            이슈
            {openIssues.length > 0 && (
              <span className="px-1.5 py-0.5 bg-orange-500/20 text-orange-400 rounded-full text-[10px] border border-orange-500/30">
                {openIssues.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('comm')}
            className={`px-5 py-2.5 text-xs font-medium transition-colors border-b-2 -mb-px ${
              activeTab === 'comm'
                ? 'border-blue-400 text-blue-300'
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            커뮤니케이션
          </button>
        </div>

        {/* 이슈 탭 */}
        {activeTab === 'issue' && (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
              {loading ? (
                <div className="h-10 bg-white/5 rounded-lg animate-pulse" />
              ) : issues.length === 0 && !showIssueForm ? (
                <p className="text-xs text-gray-600">등록된 이슈가 없습니다.</p>
              ) : (
                issues.map((issue) => (
                  <EventIssueCard
                    key={issue.id}
                    issue={issue}
                    onUpdated={handleIssueUpdated}
                    onDeleted={(id) => setIssues((prev) => prev.filter((i) => i.id !== id))}
                  />
                ))
              )}
            </div>
            <div className="border-t border-white/10 px-5 py-3 shrink-0">
              {showIssueForm ? (
                <div className="space-y-2">
                  <select
                    value={issueType}
                    onChange={(e) => setIssueType(e.target.value)}
                    className="w-full bg-[#1a1c1f] border border-white/10 rounded px-2 py-1.5 text-xs text-gray-200 outline-none focus:border-blue-500/50 [color-scheme:dark]"
                  >
                    {ISSUE_TYPES.map((t) => (
                      <option key={t.value} value={t.value} className="bg-[#1a1c1f] text-gray-200">{t.label}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={issueTitle}
                    onChange={(e) => setIssueTitle(e.target.value)}
                    placeholder="이슈 제목 *"
                    className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-xs text-gray-200 placeholder-gray-600 outline-none focus:border-blue-500/50"
                  />
                  <textarea
                    value={issueDesc}
                    onChange={(e) => setIssueDesc(e.target.value)}
                    placeholder="상세 설명 (선택)"
                    rows={2}
                    className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-xs text-gray-200 placeholder-gray-600 outline-none focus:border-blue-500/50 resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowIssueForm(false)}
                      className="flex-1 text-xs bg-white/5 hover:bg-white/10 text-gray-400 rounded px-3 py-1.5"
                    >
                      취소
                    </button>
                    <button
                      onClick={handleIssueSubmit}
                      disabled={issueSaving || !issueTitle.trim()}
                      className="flex-1 text-xs bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 rounded px-3 py-1.5 disabled:opacity-40"
                    >
                      {issueSaving ? '저장중...' : '등록'}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowIssueForm(true)}
                  className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <Plus size={12} />
                  이슈 등록
                </button>
              )}
            </div>
          </>
        )}

        {/* 커뮤니케이션 탭 */}
        {activeTab === 'comm' && (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
              {loading ? (
                <div className="space-y-2">
                  {[1, 2].map((i) => <div key={i} className="h-14 bg-white/5 rounded-lg animate-pulse" />)}
                </div>
              ) : comms.length === 0 ? (
                <p className="text-xs text-gray-600">이 이벤트에 대한 기록이 없습니다.</p>
              ) : (
                comms.map((e) => (
                  <SrmCommCard key={e.id} entry={e} onUpdated={handleCommUpdated} />
                ))
              )}
            </div>
            <div className="border-t border-white/10 px-5 py-4 shrink-0">
              <AddForm
                onSave={handleSave}
                saving={saving}
                eventContext={eventContext}
                noBorder
              />
            </div>
          </>
        )}
      </div>
    </>
  );
}
