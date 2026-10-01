'use client';

import { useState } from 'react';
import { coaches } from './data';
import { CoachSection } from './CoachSection';
import { ScoreBoard } from './ScoreBoard';

export function ClientPage() {
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const handleAnswer = (id: string, val: string) => {
    setAnswers((prev) => ({ ...prev, [id]: val }));
  };

  return (
    <div className="max-w-[780px] mx-auto px-4 sm:px-6">
      {/* Page header */}
      <div className="mb-12">
        <div className="flex flex-wrap gap-2 mb-4">
          <span className="text-xs font-semibold bg-red-100 text-red-700 px-3 py-1 rounded-full uppercase tracking-wide">
            10월 SAT 예상
          </span>
          <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-3 py-1 rounded-full">
            2026-10-01
          </span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight mb-4">
          SuperfastSAT 코치 6인이 고른 10월 SAT 예상 36문항
        </h1>
        <p className="text-gray-600 leading-relaxed">
          Brandon, Ben, 박시원, Laura, Julie, Dana Jung — 코치 여섯 명이 각자 6문항씩 골랐습니다.
          읽기·쓰기 3문항, 수학 3문항. 10월 시험에서 다시 만날 가능성이 높은 유형, 한 번만 이해하면
          다시 틀리지 않는 함정 포인트를 담았습니다. 먼저 직접 풀어 보고 이유를 읽어 보세요.
        </p>
      </div>

      {/* Coach sections */}
      {coaches.map((coach) => (
        <CoachSection
          key={coach.id}
          coach={coach}
          answers={answers}
          onAnswer={handleAnswer}
        />
      ))}

      {/* Scoreboard */}
      <ScoreBoard coaches={coaches} answers={answers} />
    </div>
  );
}
