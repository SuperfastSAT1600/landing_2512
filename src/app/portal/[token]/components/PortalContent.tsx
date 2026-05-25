'use client';

import { useState, useEffect } from 'react';

interface PublishedMemo {
  id: string;
  created_at: string;
  content: string;
}

interface DiagnosticResult {
  id: string;
  submitted_at: string;
  test_id: string;
  total_time_seconds: number;
  question_count: number;
}

interface StudentInfo {
  name: string;
  grade: string;
  school_type: string;
  desired_subjects: string;
  target_score: number | null;
  target_test_date: string | null;
  previous_rw_score: number | null;
  previous_math_score: number | null;
}

interface PortalData {
  student: StudentInfo;
  publishedMemos: PublishedMemo[];
  diagnosticResult: DiagnosticResult | null;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}분 ${s}초`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

export default function PortalContent({ token }: { token: string }) {
  const [data, setData] = useState<PortalData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/portal/${token}/data`)
      .then(r => {
        if (!r.ok) throw new Error('unauthorized');
        return r.json();
      })
      .then(setData)
      .catch(() => setError('데이터를 불러오는 중 오류가 발생했습니다.'));
  }, [token]);

  if (error) {
    return <p className="text-sm text-red-500 text-center py-8">{error}</p>;
  }

  if (!data) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const { student, publishedMemos, diagnosticResult } = data;
  const prevScore =
    student.previous_rw_score != null && student.previous_math_score != null
      ? student.previous_rw_score + student.previous_math_score
      : null;

  return (
    <div className="space-y-6">
      {/* Student summary */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">학생 정보</h2>
        <div className="grid grid-cols-2 gap-y-2 text-sm">
          <span className="text-gray-500">이름</span>
          <span className="font-medium text-gray-900">{student.name}</span>
          <span className="text-gray-500">학년</span>
          <span className="font-medium text-gray-900">{student.grade}</span>
          <span className="text-gray-500">수강 과목</span>
          <span className="font-medium text-gray-900">{student.desired_subjects}</span>
          {prevScore != null && (
            <>
              <span className="text-gray-500">현재 점수</span>
              <span className="font-medium text-gray-900">{prevScore}점</span>
            </>
          )}
          {student.target_score != null && (
            <>
              <span className="text-gray-500">목표 점수</span>
              <span className="font-medium text-blue-600">{student.target_score}점</span>
            </>
          )}
          {student.target_test_date && (
            <>
              <span className="text-gray-500">목표 시험일</span>
              <span className="font-medium text-gray-900">{formatDate(student.target_test_date)}</span>
            </>
          )}
        </div>
      </div>

      {/* Diagnostic result */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">진단테스트</h2>
        {diagnosticResult ? (
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">제출일</span>
              <span className="font-medium text-gray-900">{formatDate(diagnosticResult.submitted_at)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">소요 시간</span>
              <span className="font-medium text-gray-900">{formatDuration(diagnosticResult.total_time_seconds)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">문항 수</span>
              <span className="font-medium text-gray-900">{diagnosticResult.question_count}문제</span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-400">아직 진단테스트를 완료하지 않았습니다.</p>
        )}
      </div>

      {/* Consultation memos */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">상담 이력</h2>
        {publishedMemos.length === 0 ? (
          <p className="text-sm text-gray-400">아직 공유된 상담 내용이 없습니다.</p>
        ) : (
          <div className="space-y-4">
            {publishedMemos.map((memo) => (
              <div key={memo.id} className="border-l-2 border-blue-200 pl-3">
                <p className="text-xs text-gray-400 mb-1">{formatDate(memo.created_at)}</p>
                <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{memo.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
