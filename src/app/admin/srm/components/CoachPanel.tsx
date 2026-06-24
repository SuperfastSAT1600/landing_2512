'use client';
import { srmFetch } from '../lib/srm-fetch';

import { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { CommLog } from './CommLog';
import { EventIssueCard, type BaseIssue } from './EventIssueCard';
import type { CommEntry } from '@/app/api/admin/srm/communications/route';
import type { CoachIssue } from '@/app/api/admin/srm/coach-issues/route';
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

const ISSUE_TYPES = [
  { value: 'schedule', label: '스케줄 변경' },
  { value: 'payment_no_response', label: '지급 무응답' },
  { value: 'request_no_response', label: '요청 무응답' },
  { value: 'custom', label: '기타' },
] as const;

export function CoachPanel({ coachId, coachName, relatedStudents, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<'issue' | 'comm'>('comm');

  const [comms, setComms] = useState<CommEntry[]>([]);
  const [loadingComms, setLoadingComms] = useState(true);
  const [saving, setSaving] = useState(false);

  const [issues, setIssues] = useState<CoachIssue[]>([]);
  const [loadingIssues, setLoadingIssues] = useState(true);
  const [issueType, setIssueType] = useState<string>('schedule');
  const [customIssueType, setCustomIssueType] = useState('');
  const [issueTitle, setIssueTitle] = useState('');
  const [issueDesc, setIssueDesc] = useState('');
  const [issueSaving, setIssueSaving] = useState(false);

  const fetchComms = useCallback(async () => {
    setLoadingComms(true);
    const res = await srmFetch(`/api/admin/srm/communications?coachId=${coachId}`);
    if (res.ok) setComms(await res.json());
    setLoadingComms(false);
  }, [coachId]);

  const fetchIssues = useCallback(async () => {
    setLoadingIssues(true);
    const res = await srmFetch(`/api/admin/srm/coach-issues?coachId=${coachId}`);
    if (res.ok) setIssues(await res.json());
    setLoadingIssues(false);
  }, [coachId]);

  useEffect(() => {
    fetchComms();
    fetchIssues();
  }, [fetchComms, fetchIssues]);

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

  const handleIssueSubmit = async () => {
    if (!issueTitle.trim()) return;
    if (issueType === 'custom' && !customIssueType.trim()) return;
    setIssueSaving(true);
    const resolvedIssueType = issueType === 'custom' && customIssueType.trim()
      ? customIssueType.trim()
      : issueType;
    const res = await srmFetch('/api/admin/srm/coach-issues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        coachId,
        coachName,
        issueType: resolvedIssueType,
        title: issueTitle.trim(),
        description: issueDesc.trim() || null,
        createdBy: getAdminName() || '관리자',
      }),
    });
    if (res.ok) {
      const newIssue = await res.json() as CoachIssue;
      setIssues((prev) => [newIssue, ...prev]);
      setIssueTitle('');
      setIssueDesc('');
      setCustomIssueType('');
      setIssueType('schedule');
    }
    setIssueSaving(false);
  };

  const openIssues = issues.filter((i) => i.status === 'open');

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-30" onClick={onClose} />

      <div className="fixed right-0 top-0 h-full w-[520px] bg-white border-l border-gray-200 z-40 flex flex-col shadow-2xl">

        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-violet-100 text-violet-700 shrink-0">
              코치
            </span>
            <h2 className="text-base font-bold text-gray-900 truncate">{coachName}</h2>
            {openIssues.length > 0 && (
              <span className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 shrink-0">
                미해결 {openIssues.length}건
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors p-1 shrink-0 ml-2">
            <X size={18} />
          </button>
        </div>

        {/* 수업 학생 컨텍스트 */}
        {relatedStudents.length > 0 && (
          <div className="px-5 py-3 border-b border-gray-200 shrink-0">
            <p className="text-[11px] text-gray-400 mb-1.5">수업 학생</p>
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
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
              {loadingIssues ? (
                <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
              ) : issues.length === 0 ? (
                <p className="text-xs text-gray-400">등록된 이슈가 없습니다.</p>
              ) : (
                issues.map((issue) => (
                  <EventIssueCard
                    key={issue.id}
                    issue={issue as BaseIssue}
                    onUpdated={(updated) =>
                      setIssues((prev) => prev.map((i) => i.id === updated.id ? updated as CoachIssue : i))
                    }
                    onDeleted={(id) => setIssues((prev) => prev.filter((i) => i.id !== id))}
                    apiBase="/api/admin/srm/coach-issues"
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
                    placeholder="유형 직접 입력"
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
          </div>
        )}

        {/* 커뮤니케이션 탭 */}
        {activeTab === 'comm' && (
          <div className="flex-1 overflow-y-auto px-5 py-4">
            <CommLog
              entries={comms}
              loading={loadingComms}
              saving={saving}
              onAdd={handleAdd}
            />
          </div>
        )}
      </div>
    </>
  );
}
