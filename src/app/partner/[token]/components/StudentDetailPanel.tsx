'use client';

import { useState, useEffect } from 'react';
import { X, ChevronDown, ChevronUp, User, BookOpen, FlaskConical, Library, BarChart2 } from 'lucide-react';
import { DayCard } from '@/app/portal/[token]/components/LearningReportCards';
import type { LearningReport } from '@/types/srm-portal';

interface StudentInfo {
  name: string;
  grade: string | null;
  school_type: string | null;
  desired_subjects: string | null;
  target_score: number | null;
  target_test_date: string | null;
  target_score_2: number | null;
  target_test_date_2: string | null;
  previous_rw_score: number | null;
  previous_math_score: number | null;
  preferred_language: string | null;
  created_at: string | null;
}

interface PublishedMemo {
  id: string;
  created_at: string;
  content: string;
}

interface DiagnosticResult {
  id: string;
  submitted_at: string;
  total_time_seconds: number;
  question_count: number;
}

interface StudentData {
  student: StudentInfo;
  publishedMemos: PublishedMemo[];
  diagnosticResult: DiagnosticResult | null;
  hasSrmData: boolean;
  portalToken: string;
}

interface Props {
  partnerToken: string;
  studentToken: string;
  studentName: string;
  adminKey?: string;
  onClose: () => void;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-3 py-2 border-b border-gray-100 last:border-0">
      <span className="text-xs text-gray-400 w-24 shrink-0">{label}</span>
      <span className="text-sm text-gray-800">{value}</span>
    </div>
  );
}

function MemoItem({ memo }: { memo: PublishedMemo }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
          <span className="text-sm text-gray-700">{formatDate(memo.created_at)}</span>
        </div>
        {open ? <ChevronUp size={13} className="text-gray-400" /> : <ChevronDown size={13} className="text-gray-400" />}
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-gray-100">
          <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{memo.content}</p>
        </div>
      )}
    </div>
  );
}

type Tab = 'consultation' | 'info' | 'report';

export function StudentDetailPanel({ partnerToken, studentToken, studentName, adminKey, onClose }: Props) {
  const [data, setData] = useState<StudentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('report');
  const [report, setReport] = useState<LearningReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  useEffect(() => {
    const headers: HeadersInit = adminKey ? { 'x-admin-key': adminKey } : {};
    fetch(`/api/partner/${partnerToken}/student/${studentToken}`, { headers })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(setData)
      .catch(() => setError('데이터를 불러오지 못했습니다'))
      .finally(() => setLoading(false));
  }, [partnerToken, studentToken, adminKey]);

  useEffect(() => {
    if (tab !== 'report' || report || reportLoading) return;
    setReportLoading(true);
    setReportError(null);
    const headers: HeadersInit = adminKey ? { 'x-admin-key': adminKey } : {};
    fetch(`/api/partner/${partnerToken}/student/${studentToken}/srm-report`, { headers })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(setReport)
      .catch(status => setReportError(status === 404 ? 'V2 학습 데이터가 없습니다' : '리포트를 불러오지 못했습니다'))
      .finally(() => setReportLoading(false));
  }, [tab, report, reportLoading, partnerToken, studentToken, adminKey]);

  const s = data?.student;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* 배경 딤 */}
      <div className="flex-1 bg-black/40" onClick={onClose} />

      {/* 패널 */}
      <div className="w-full max-w-lg bg-white h-full flex flex-col shadow-2xl overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-gray-50 shrink-0">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">학생 상세</p>
            <h2 className="text-base font-bold text-gray-900">{s?.name ?? studentName}</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
            <X size={16} className="text-gray-500" />
          </button>
        </div>

        {/* 탭 */}
        <div className="flex border-b border-gray-200 px-5 shrink-0">
          {([
            { key: 'report' as Tab, label: '학습 리포트' },
            { key: 'consultation' as Tab, label: '상담 기록' },
            { key: 'info' as Tab, label: '학생 정보' },
          ]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-3 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === key
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* 콘텐츠 */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading && (
            <div className="flex items-center justify-center py-16">
              <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {error && <p className="text-sm text-red-500 text-center py-8">{error}</p>}

          {data && tab === 'consultation' && (
            <div className="space-y-2">
              {data.publishedMemos.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-sm text-gray-400">공개된 상담 기록이 없습니다</p>
                </div>
              ) : (
                data.publishedMemos.map(m => <MemoItem key={m.id} memo={m} />)
              )}
            </div>
          )}

          {data && tab === 'info' && s && (
            <div className="space-y-5">
              {/* 기본 정보 */}
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <User size={13} className="text-gray-400" />
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">기본 정보</span>
                </div>
                {s.grade && <InfoRow label="학년" value={s.grade} />}
                {s.school_type && <InfoRow label="학교 유형" value={s.school_type} />}
                {s.desired_subjects && <InfoRow label="희망 전공" value={s.desired_subjects} />}
                {s.preferred_language && (
                  <InfoRow label="수업 언어" value={
                    s.preferred_language === 'korean' ? '한국어' :
                    s.preferred_language === 'english' ? '영어' : '무관'
                  } />
                )}
                {s.created_at && <InfoRow label="수업 시작" value={formatDate(s.created_at)} />}
              </div>

              {/* 점수 */}
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <FlaskConical size={13} className="text-blue-400" />
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">점수 현황</span>
                </div>
                {(s.previous_rw_score || s.previous_math_score) && (
                  <InfoRow
                    label="현재 점수"
                    value={`RW ${s.previous_rw_score ?? '?'} / Math ${s.previous_math_score ?? '?'}`}
                  />
                )}
                {s.target_score && (
                  <InfoRow
                    label="1차 목표"
                    value={`${s.target_score}점${s.target_test_date ? ` (${formatDate(s.target_test_date)})` : ''}`}
                  />
                )}
                {s.target_score_2 && (
                  <InfoRow
                    label="2차 목표"
                    value={`${s.target_score_2}점${s.target_test_date_2 ? ` (${formatDate(s.target_test_date_2)})` : ''}`}
                  />
                )}
              </div>

              {/* 진단 테스트 */}
              {data.diagnosticResult && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <BookOpen size={13} className="text-amber-400" />
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">진단 테스트</span>
                  </div>
                  <InfoRow label="응시일" value={formatDate(data.diagnosticResult.submitted_at)} />
                  <InfoRow label="문항 수" value={`${data.diagnosticResult.question_count}문항`} />
                  <InfoRow
                    label="소요 시간"
                    value={`${Math.round(data.diagnosticResult.total_time_seconds / 60)}분`}
                  />
                </div>
              )}

              {data.hasSrmData && (
                <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <Library size={13} className="text-emerald-500" />
                  <span className="text-xs text-emerald-700">학습 데이터 연동됨</span>
                </div>
              )}
            </div>
          )}

          {tab === 'report' && (
            <div>
              {reportLoading && (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-gray-400">학습 데이터 분석 중...</p>
                </div>
              )}
              {reportError && (
                <div className="flex flex-col items-center justify-center py-12 gap-2">
                  <BarChart2 size={24} className="text-gray-300" />
                  <p className="text-sm text-gray-400">{reportError}</p>
                </div>
              )}
              {!reportLoading && !reportError && report && (
                <div>
                  <div className="flex gap-4 mb-5">
                    <div className="flex-1 bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-center">
                      <p className="text-2xl font-bold text-indigo-600">
                        {report.days.flatMap(d => d.items).reduce((s, i) => i.type === 'study_hall' || i.type === 'test_center' ? s + i.totalProblems : s, 0)}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-wide">푼 문제 수</p>
                    </div>
                    <div className="flex-1 bg-gray-50 border border-gray-100 rounded-xl p-4 text-center">
                      <p className="text-2xl font-bold text-gray-700">{report.vocabExposedCount}</p>
                      <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-wide">학습 단어</p>
                    </div>
                  </div>
                  {report.days.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-8">학습 기록이 없습니다</p>
                  ) : (
                    <div className="space-y-3">
                      {report.days.map(day => <DayCard key={day.date} day={day} />)}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
