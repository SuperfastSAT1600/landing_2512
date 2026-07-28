'use client';

import { useState, useEffect, useCallback } from 'react';
import { Sparkles, Loader2, RefreshCw, TrendingUp, AlertTriangle, Target } from 'lucide-react';
import type { SrmBriefData } from '@/app/api/crm/students/[id]/srm-brief/route';

interface Props {
  studentId: string;
  adminKey: string;
}

// SRM 학습 데이터를 종합한 스캔용 현황 브리핑. 마운트 시 자동 생성(캐시로 반복 열람 즉시).
export function SrmBrief({ studentId, adminKey }: Props) {
  const [brief, setBrief] = useState<SrmBriefData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cached, setCached] = useState(false);

  const generate = useCallback(async (refresh = false) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/crm/students/${studentId}/srm-brief${refresh ? '?refresh=1' : ''}`, {
        method: 'POST',
        headers: { 'x-admin-key': adminKey },
      });
      const json = await res.json();
      if (res.ok && json.data?.brief) {
        setBrief(json.data.brief as SrmBriefData);
        setCached(!!json.data.cached);
      } else {
        setError(json.error?.message ?? '브리핑 생성에 실패했습니다.');
      }
    } catch {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [studentId, adminKey]);

  useEffect(() => { generate(false); }, [generate]);

  return (
    <div className="rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50 to-blue-50 p-3.5">
      <div className="flex items-center gap-1.5 mb-2.5">
        <Sparkles size={14} className="text-violet-500" />
        <span className="text-xs font-semibold text-violet-700">AI 현황 브리핑</span>
        {!loading && (
          <button
            onClick={() => generate(true)}
            title="캐시 무시하고 다시 생성"
            className="ml-auto flex items-center gap-1 text-[11px] text-violet-400 hover:text-violet-600 transition-colors"
          >
            <RefreshCw size={11} /> {cached ? '최신화' : '다시 생성'}
          </button>
        )}
      </div>

      {loading && (
        <div className="space-y-2 animate-pulse">
          <div className="h-4 bg-violet-100 rounded w-3/4" />
          <div className="h-3 bg-violet-100/70 rounded w-full" />
          <div className="h-3 bg-violet-100/70 rounded w-5/6" />
          <div className="flex items-center gap-1.5 pt-1 text-[11px] text-violet-400">
            <Loader2 size={12} className="animate-spin" /> 학습 데이터 종합 중…
          </div>
        </div>
      )}

      {error && !loading && (
        <div className="space-y-1.5">
          <p className="text-xs text-red-500">{error}</p>
          <button onClick={() => generate(false)} className="text-[11px] text-violet-500 hover:text-violet-700">다시 시도</button>
        </div>
      )}

      {brief && !loading && (
        <div className="space-y-2.5">
          <p className="text-sm font-semibold text-gray-900 leading-snug">{brief.headline}</p>

          {brief.strengths.length > 0 && (
            <BriefList icon={<TrendingUp size={12} className="text-emerald-500" />} label="강점" items={brief.strengths} color="text-emerald-700" />
          )}
          {brief.weaknesses.length > 0 && (
            <BriefList icon={<Target size={12} className="text-amber-500" />} label="취약" items={brief.weaknesses} color="text-amber-700" />
          )}
          {brief.risks.length > 0 && (
            <BriefList icon={<AlertTriangle size={12} className="text-red-500" />} label="리스크" items={brief.risks} color="text-red-600" />
          )}

          {brief.recommendation && (
            <div className="flex items-start gap-1.5 rounded-lg bg-white/70 border border-violet-100 px-2.5 py-2">
              <Sparkles size={12} className="text-violet-500 mt-0.5 shrink-0" />
              <p className="text-xs text-gray-700 leading-relaxed"><span className="font-semibold text-violet-700">추천 </span>{brief.recommendation}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function BriefList({ icon, label, items, color }: { icon: React.ReactNode; label: string; items: string[]; color: string }) {
  return (
    <div>
      <div className="flex items-center gap-1 mb-1">
        {icon}
        <span className={`text-[11px] font-semibold ${color}`}>{label}</span>
      </div>
      <ul className="space-y-0.5 pl-0.5">
        {items.map((t, i) => (
          <li key={i} className="text-xs text-gray-700 leading-relaxed flex gap-1.5">
            <span className="text-gray-300">·</span>
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
