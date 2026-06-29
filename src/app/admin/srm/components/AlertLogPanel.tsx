'use client';

import { srmFetch } from '../lib/srm-fetch';
import { useState, useEffect, useCallback } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { AddForm } from './CommLog';
import { SrmCommCard } from './SrmCommCard';
import { EventIssueCard, type BaseIssue } from './EventIssueCard';
import type { CommEntry } from './CommLog';
import type { StudentIssue } from '@/app/api/admin/srm/student-issues/route';
import type { FlatAlert } from './AlertFeedRows';
import { useAdminAuth } from '@/lib/useAdminAuth';
import { getAdminName } from '@/lib/admin-user';

const ISSUE_TYPES = [
  { value: 'schedule_pending', label: '스케줄 조율 중' },
  { value: 'coach_pending', label: '코치 배정 중' },
  { value: 'custom', label: '기타' },
] as const;

interface Props {
  alert: FlatAlert;
  onClose: () => void;
}

export function AlertLogPanel({ alert, onClose }: Props) {
  const [comms, setComms] = useState<CommEntry[]>([]);
  const [issues, setIssues] = useState<StudentIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [issueType, setIssueType] = useState<string>('schedule_pending');
  const [customIssueType, setCustomIssueType] = useState('');
  const [issueTitle, setIssueTitle] = useState('');
  const [issueDesc, setIssueDesc] = useState('');
  const [issueSaving, setIssueSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'issue' | 'comm'>('comm');

  const { userName } = useAdminAuth();

  const handleCommUpdated = (updated: CommEntry) => {
    setComms((prev) => prev.map((c) => c.id === updated.id ? updated : c));
  };

  const handleIssueUpdated = (updated: BaseIssue) => {
    setIssues((prev) => prev.map((i) => i.id === updated.id ? updated as StudentIssue : i));
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [commsRes, issuesRes] = await Promise.all([
      srmFetch(`/api/admin/srm/communications?studentId=${alert.studentId}`),
      srmFetch(`/api/admin/srm/student-issues?studentId=${alert.studentId}`),
    ]);
    const [commsData, issuesData] = await Promise.all([
      commsRes.json(),
      issuesRes.json(),
    ]);
    setComms(Array.isArray(commsData) ? commsData : []);
    setIssues(Array.isArray(issuesData) ? issuesData : []);
    setLoading(false);
  }, [alert.studentId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async (data: { parties: string[]; channel: string; content: string; reason?: string; resolution?: string }) => {
    setSaving(true);
    await srmFetch('/api/admin/srm/communications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId: alert.studentId,
        studentName: alert.studentName,
        coachId: alert.coachIds[0] ?? null,
        author: userName || getAdminName() || '관리자',
        triggerType: 'no_class',
        autoCount: 0,
        ...data,
      }),
    });
    await fetchData();
    setSaving(false);
  };

  const handleIssueSubmit = async () => {
    if (!issueTitle.trim()) return;
    if (issueType === 'custom' && !customIssueType.trim()) return;
    setIssueSaving(true);
    const resolvedIssueType = issueType === 'custom' && customIssueType.trim()
      ? customIssueType.trim()
      : issueType;
    const res = await srmFetch('/api/admin/srm/student-issues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId: alert.studentId,
        studentName: alert.studentName,
        issueType: resolvedIssueType,
        title: issueTitle.trim(),
        description: issueDesc.trim() || undefined,
        createdBy: userName || getAdminName() || '관리자',
      }),
    });
    if (res.ok) {
      const newIssue = await res.json() as StudentIssue;
      setIssues((prev) => [newIssue, ...prev]);
      setIssueTitle('');
      setIssueDesc('');
      setCustomIssueType('');
      setIssueType('schedule_pending');
    }
    setIssueSaving(false);
  };

  const coachName = alert.coaches[0] ?? '';
  const openIssues = issues.filter((i) => i.status === 'open');

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-30" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-[520px] bg-white border-l border-gray-200 z-40 flex flex-col shadow-2xl">

        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-orange-100 text-orange-700">
              수업 미정
            </span>
            {openIssues.length > 0 && (
              <span className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                <AlertTriangle size={10} />
                미해결 {openIssues.length}건
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors p-1">
            <X size={18} />
          </button>
        </div>

        {/* 참여자 정보 */}
        <div className="px-5 py-3 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-gray-800 font-medium">{alert.studentName}</span>
            {coachName && (
              <>
                <span className="text-gray-400">↔</span>
                <span className="text-sm text-gray-500">{coachName}</span>
              </>
            )}
          </div>
        </div>

        {/* 탭 헤더 */}
        <div className="flex border-b border-gray-200 shrink-0">
          <button
            onClick={() => setActiveTab('issue')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-colors border-b-2 -mb-px ${
              activeTab === 'issue'
                ? 'border-orange-500 text-orange-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            이슈
            {openIssues.length > 0 && (
              <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded-full text-[10px] border border-orange-200">
                {openIssues.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('comm')}
            className={`px-4 py-2.5 text-xs font-medium transition-colors border-b-2 -mb-px ${
              activeTab === 'comm'
                ? 'border-blue-500 text-blue-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
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
                <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
              ) : issues.length === 0 ? (
                <p className="text-xs text-gray-400">등록된 이슈가 없습니다.</p>
              ) : (
                issues.map((issue) => (
                  <EventIssueCard
                    key={issue.id}
                    issue={issue}
                    apiBase="/api/admin/srm/student-issues"
                    onUpdated={handleIssueUpdated}
                    onDeleted={(id) => setIssues((prev) => prev.filter((i) => i.id !== id))}
                  />
                ))
              )}
            </div>
            <div className="border-t border-gray-100 px-5 py-3 shrink-0 space-y-2">
              <div>
                <p className="text-[11px] text-gray-600 mb-1.5">카테고리</p>
                <select
                  value={issueType}
                  onChange={(e) => { setIssueType(e.target.value); setCustomIssueType(''); }}
                  className="w-full bg-gray-50 border border-gray-200 rounded px-2 py-1.5 text-xs text-gray-700 focus:outline-none focus:border-blue-500/50"
                >
                  {ISSUE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                {issueType === 'custom' && (
                  <input
                    type="text"
                    value={customIssueType}
                    onChange={(e) => setCustomIssueType(e.target.value)}
                    placeholder="유형 직접 입력 (예: 퇴원, 환불 요청)"
                    className="w-full mt-1.5 bg-gray-50 border border-gray-200 rounded px-2 py-1.5 text-xs text-gray-700 placeholder-gray-400 focus:outline-none focus:border-blue-500/50"
                  />
                )}
              </div>
              <div>
                <p className="text-[11px] text-gray-600 mb-1.5">이슈 제목</p>
                <input
                  type="text"
                  value={issueTitle}
                  onChange={(e) => setIssueTitle(e.target.value)}
                  placeholder="제목을 입력하세요"
                  className="w-full bg-gray-50 border border-gray-200 rounded px-2 py-1.5 text-xs text-gray-700 placeholder-gray-400 focus:outline-none focus:border-blue-500/50"
                />
              </div>
              <div>
                <p className="text-[11px] text-gray-600 mb-1.5">이슈 내용</p>
                <textarea
                  value={issueDesc}
                  onChange={(e) => setIssueDesc(e.target.value)}
                  placeholder="이슈 내용을 입력하세요"
                  rows={3}
                  className="w-full bg-gray-50 border border-gray-200 rounded px-2 py-1.5 text-xs text-gray-700 placeholder-gray-400 focus:outline-none focus:border-blue-500/50 resize-none"
                />
              </div>
              <button
                onClick={handleIssueSubmit}
                disabled={issueSaving || !issueTitle.trim() || (issueType === 'custom' && !customIssueType.trim())}
                className="w-full text-xs bg-orange-100 hover:bg-orange-200 text-orange-700 rounded px-3 py-1.5 disabled:opacity-40"
              >
                {issueSaving ? '저장중...' : '이슈 등록'}
              </button>
            </div>
          </>
        )}

        {/* 커뮤니케이션 탭 */}
        {activeTab === 'comm' && (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
              {loading ? (
                <div className="space-y-2">
                  {[1, 2].map((i) => <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />)}
                </div>
              ) : comms.length === 0 ? (
                <p className="text-xs text-gray-400">이 항목에 대한 기록이 없습니다.</p>
              ) : (
                comms.map((e) => (
                  <SrmCommCard key={e.id} entry={e} onUpdated={handleCommUpdated} />
                ))
              )}
            </div>
            <div className="border-t border-gray-200 px-5 py-4 shrink-0">
              <AddForm
                onSave={handleSave}
                saving={saving}
                noBorder
              />
            </div>
          </>
        )}
      </div>
    </>
  );
}
