'use client';
import { srmFetch } from '../lib/srm-fetch';
import { useEffect, useState } from 'react';
import type { YesterdayCheckItem, YesterdayCheckResponse } from '@/app/api/admin/srm/yesterday-check/route';

const CATEGORY_LABEL: Record<string, string> = {
  coach_room: '레슨',
  study_hall: '스터디홀',
  vocab: '보카',
};

const CATEGORY_COLOR: Record<string, string> = {
  coach_room: 'bg-blue-100 text-blue-700',
  study_hall: 'bg-purple-100 text-purple-700',
  vocab: 'bg-green-100 text-green-700',
};

function toKstTime(iso: string) {
  return new Date(iso).toLocaleTimeString('ko-KR', {
    timeZone: 'Asia/Seoul',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function StatusBadges({ item }: { item: YesterdayCheckItem }) {
  const badges: { label: string; color: string }[] = [];

  if (item.category === 'coach_room') {
    if (!item.studentAttended) badges.push({ label: '결석', color: 'bg-red-100 text-red-700' });
    if (!item.hasFeedback) badges.push({ label: '피드백 없음', color: 'bg-orange-100 text-orange-700' });
    if (item.studentAttended && item.hasFeedback) badges.push({ label: '완료', color: 'bg-gray-100 text-gray-500' });
  } else if (item.category === 'study_hall') {
    if (!item.attended) {
      badges.push({ label: '미입장', color: 'bg-red-100 text-red-700' });
    } else {
      const label = item.totalProblems
        ? `${item.totalProblems}문제 / ${item.accuracy}%`
        : '입장';
      badges.push({ label, color: 'bg-gray-100 text-gray-600' });
    }
  } else if (item.category === 'vocab') {
    if (!item.vocabStudied) {
      badges.push({ label: '미학습', color: 'bg-red-100 text-red-700' });
    } else {
      const label = `${item.wordCount}단어` + (item.masteredCount ? ` / 마스터 ${item.masteredCount}개` : '');
      badges.push({ label, color: 'bg-gray-100 text-gray-600' });
    }
  }

  return (
    <div className="flex gap-1 flex-wrap">
      {badges.map((b, i) => (
        <span key={i} className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${b.color}`}>
          {b.label}
        </span>
      ))}
    </div>
  );
}

interface Props {
  date: string;
  onStudentClick: (id: string, name: string) => void;
}

export function YesterdayCheck({ date, onStudentClick }: Props) {
  const [data, setData] = useState<YesterdayCheckResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setData(null);
    srmFetch(`/api/admin/srm/yesterday-check?date=${date}`)
      .then((r) => r.json())
      .then((res) => setData(res))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [date]);

  if (loading) {
    return (
      <div className="space-y-2 mt-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <div className="mt-8 text-center text-sm text-gray-400">
        {date} 기준 스케줄이 없습니다.
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-1.5">
      {data.items.map((item, idx) => {
        const clickable = item.hasIssue;
        return (
          <div
            key={`${item.eventId}-${item.student.id}-${idx}`}
            onClick={() => clickable && onStudentClick(item.student.id, item.student.name)}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border text-sm transition-colors ${
              clickable
                ? 'bg-white hover:bg-gray-50 border-gray-200 cursor-pointer'
                : 'bg-gray-50 border-gray-100 cursor-default'
            }`}
          >
            {/* 시간 */}
            <span className="text-gray-500 font-mono text-xs shrink-0 w-10">
              {toKstTime(item.startsAt)}
            </span>

            {/* 카테고리 뱃지 */}
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${CATEGORY_COLOR[item.category]}`}>
              {CATEGORY_LABEL[item.category]}
            </span>

            {/* 학생명 */}
            <span className="font-medium text-gray-900 shrink-0">{item.student.name}</span>

            {/* 코치명 (레슨만) */}
            {item.coach && (
              <span className="text-gray-400 text-xs shrink-0">{item.coach.name}</span>
            )}

            {/* 상태 뱃지 */}
            <div className="flex-1">
              <StatusBadges item={item} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
