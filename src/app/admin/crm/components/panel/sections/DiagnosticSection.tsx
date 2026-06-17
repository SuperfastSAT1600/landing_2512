'use client';

import { useState } from 'react';
import { Link, ChevronDown, Check } from 'lucide-react';
import type { Student } from '@/types/crm';
import { DIAGNOSTIC_FUNNEL_LABELS, DIAGNOSTIC_FUNNEL_STAGES } from '@/types/crm';
import type { DiagCandidate } from '../hooks/useDiagnostic';
import { SectionCard } from './SectionCard';

interface Props {
  localStudent: Student;
  onDiagFunnelChange: (stage: number) => void;
  // 진단테스트 연결 (useDiagnostic)
  diagLinked: DiagCandidate | null;
  diagCandidates: DiagCandidate[];
  showDiagPicker: boolean;
  setShowDiagPicker: (v: boolean) => void;
  diagLoading: boolean;
  diagSearchQuery: string;
  setDiagSearchQuery: (v: string) => void;
  onDiagLink: (resultId: string | null) => void;
}

export function DiagnosticSection({
  localStudent, onDiagFunnelChange,
  diagLinked, diagCandidates, showDiagPicker, setShowDiagPicker,
  diagLoading, diagSearchQuery, setDiagSearchQuery, onDiagLink,
}: Props) {
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const stage = localStudent.diagnostic_funnel_stage;
  const currentLabel = stage != null ? DIAGNOSTIC_FUNNEL_LABELS[stage] : null;

  return (
    <SectionCard title="진단 테스트">
      <div className="space-y-4">
        {/* 진단 테스트 현황 (드롭다운) */}
        <div className="space-y-1.5">
          <p className="text-[11px] font-medium text-gray-400">진단 테스트 현황</p>
          <div className="relative">
            <button
              onClick={() => setShowStatusMenu(v => !v)}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border text-left text-[13px] transition-colors ${
                currentLabel
                  ? 'border-blue-200 bg-blue-50 text-blue-700'
                  : 'border-gray-200 text-gray-400 hover:border-gray-300'
              }`}
            >
              <span className="flex items-center gap-2 min-w-0">
                {stage != null && (
                  <span className="shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[11px] font-bold">
                    {stage}
                  </span>
                )}
                <span className="truncate font-medium">{currentLabel ?? '단계를 선택하세요'}</span>
              </span>
              <ChevronDown size={14} className="shrink-0 text-gray-400" />
            </button>

            {showStatusMenu && (
              <div className="mt-1 w-full rounded-xl border border-gray-200 bg-white overflow-hidden">
                {DIAGNOSTIC_FUNNEL_STAGES.map(s => {
                  const selected = s === stage;
                  return (
                    <button
                      key={s}
                      onClick={() => { onDiagFunnelChange(s); setShowStatusMenu(false); }}
                      className={`w-full text-left px-3 py-2.5 flex items-start gap-2 border-b border-gray-50 last:border-0 transition-colors ${
                        selected ? 'bg-blue-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <span className={`shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-bold ${
                        selected ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {s}
                      </span>
                      <span className={`text-[12px] leading-snug ${selected ? 'text-blue-700 font-medium' : 'text-gray-600'}`}>
                        {DIAGNOSTIC_FUNNEL_LABELS[s]}
                      </span>
                      {selected && <Check size={13} className="ml-auto shrink-0 text-blue-500 mt-0.5" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* 진단테스트 연결 */}
        <div className="space-y-2 pt-1">
          <button
            onClick={() => {
              setShowDiagPicker(!showDiagPicker);
              if (showDiagPicker) { setDiagSearchQuery(''); }
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-[12px] transition-colors ${
              diagLinked
                ? 'border-green-200 text-green-600 bg-green-50 hover:bg-green-100'
                : 'border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50'
            }`}
          >
            <Link size={12} />
            {diagLinked ? '진단 결과 연결됨' : '진단테스트 연결'}
          </button>

          {showDiagPicker && (
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
                <p className="text-xs font-medium text-gray-600">진단테스트 검색</p>
                <button onClick={() => { setShowDiagPicker(false); setDiagSearchQuery(''); }} className="text-[11px] text-gray-400 hover:text-gray-600">닫기</button>
              </div>
              <div className="px-3 py-2 border-b border-gray-100">
                <input
                  autoFocus
                  type="text"
                  value={diagSearchQuery}
                  onChange={e => setDiagSearchQuery(e.target.value)}
                  placeholder="이름 또는 이메일 검색…"
                  className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400"
                />
              </div>
              {diagLoading && (
                <div className="py-4 flex justify-center">
                  <div className="w-4 h-4 border border-blue-400 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {!diagLoading && diagSearchQuery.length < 2 && (
                <p className="text-xs text-gray-400 text-center py-4">이름 또는 이메일로 검색하세요</p>
              )}
              {!diagLoading && diagSearchQuery.length >= 2 && diagCandidates.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-4">결과 없음</p>
              )}
              {!diagLoading && diagCandidates.map(c => (
                <button
                  key={c.id}
                  onClick={() => onDiagLink(c.id)}
                  className={`w-full text-left px-3 py-2.5 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-0 ${diagLinked?.id === c.id ? 'bg-green-50' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-800">{c.student_name}</p>
                      <p className="text-[11px] text-gray-500">{c.student_email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-gray-500">
                        {new Date(c.submitted_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                      </p>
                      {diagLinked?.id === c.id && <p className="text-[10px] text-green-600 font-medium">현재 연결됨</p>}
                    </div>
                  </div>
                </button>
              ))}
              {diagLinked && !diagLoading && (
                <button
                  onClick={() => onDiagLink(null)}
                  className="w-full text-left px-3 py-2 text-[11px] text-red-400 hover:bg-red-50 transition-colors border-t border-gray-100"
                >
                  연결 해제
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </SectionCard>
  );
}
