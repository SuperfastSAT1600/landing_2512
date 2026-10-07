'use client';

import { useState } from 'react';
import { coaches, pageConfig } from './data';
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
            {pageConfig.badge}
          </span>
          <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-3 py-1 rounded-full">
            {pageConfig.date}
          </span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight mb-4">
          {pageConfig.title}
        </h1>
        <p className="text-gray-600 leading-relaxed">
          {pageConfig.description}
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
