'use client';

import { useState, useCallback } from 'react';
import type { Coach, Problem, PassageTable, PassageText, PassageTwoTexts } from './data';
import { MathText } from './MathText';

interface Props {
  coach: Coach;
  answers: Record<string, string>;
  onAnswer: (id: string, val: string) => void;
}

function TablePassage({ passage }: { passage: PassageTable }) {
  return (
    <div className="overflow-x-auto mb-4">
      <table className="w-full text-sm border-collapse border border-gray-300">
        <thead>
          <tr className="bg-gray-100">
            {passage.headers.map((h, i) => (
              <th key={i} className="border border-gray-300 p-2 text-left font-semibold text-gray-700 whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {passage.rows.map((row, ri) => (
            <tr key={ri} className={ri % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              {row.map((cell, ci) => (
                <td key={ci} className="border border-gray-300 p-2 text-gray-700 italic text-sm">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TextPassage({ passage }: { passage: PassageText }) {
  return (
    <div className="mb-4 p-4 bg-gray-50 rounded-lg border-l-4 border-gray-300 text-sm text-gray-700 leading-relaxed space-y-2">
      {passage.paragraphs.map((p, i) => (
        <MathText key={i} text={p} block />
      ))}
    </div>
  );
}

function TwoTextsPassage({ passage }: { passage: PassageTwoTexts }) {
  return (
    <div className="mb-4 space-y-3">
      <div className="p-4 bg-gray-50 rounded-lg border-l-4 border-blue-300 text-sm text-gray-700 leading-relaxed">
        <p className="font-semibold text-blue-700 mb-1 text-xs uppercase tracking-wide">Text 1</p>
        <MathText text={passage.text1} block />
      </div>
      <div className="p-4 bg-gray-50 rounded-lg border-l-4 border-purple-300 text-sm text-gray-700 leading-relaxed">
        <p className="font-semibold text-purple-700 mb-1 text-xs uppercase tracking-wide">Text 2</p>
        <MathText text={passage.text2} block />
      </div>
    </div>
  );
}

function ProblemCard({
  problem,
  answer,
  onAnswer,
}: {
  problem: Problem;
  answer: string;
  onAnswer: (val: string) => void;
}) {
  const choiceKeys = ['A', 'B', 'C', 'D'] as const;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
      {/* Header badges */}
      <div className="flex flex-wrap items-center gap-2 px-5 pt-5 pb-3 border-b border-gray-100">
        <span className="text-xs font-bold bg-gray-900 text-white px-2.5 py-1 rounded-full">
          {problem.index} / 6
        </span>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
          problem.section === 'Math' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
        }`}>
          {problem.section}
        </span>
        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-orange-100 text-orange-700">
          {problem.skill}
        </span>
        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
          {problem.difficulty}
        </span>
        {problem.isGridIn && (
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-red-100 text-red-700">
            Grid-in
          </span>
        )}
      </div>

      {/* Problem content */}
      <div className="px-5 py-4">
        <h3 className="text-sm font-semibold text-gray-600 mb-4 leading-snug">{problem.title}</h3>

        {/* Passage */}
        {problem.passage && (
          <div className="mb-4">
            {problem.passage.type === 'table' && <TablePassage passage={problem.passage} />}
            {problem.passage.type === 'text' && <TextPassage passage={problem.passage} />}
            {problem.passage.type === 'two-texts' && <TwoTextsPassage passage={problem.passage} />}
          </div>
        )}

        {/* Question */}
        <div className="text-[0.9375rem] text-gray-900 mb-4 leading-relaxed">
          <MathText text={problem.question} block />
        </div>

        {/* Roman numeral statements */}
        {problem.statements && (
          <div className="mb-4 space-y-2 pl-3 border-l-2 border-gray-200">
            {problem.statements.map((s, i) => (
              <div key={i} className="text-sm text-gray-700 flex gap-2">
                <span className="font-semibold shrink-0">{i === 0 ? 'I.' : 'II.'}</span>
                <MathText text={s} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Answer section */}
      <div className="px-5 pb-5 border-t border-gray-100 pt-4">
        {problem.isGridIn ? (
          <div className="flex flex-col items-center gap-3">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              답 입력 (Grid-in)
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={answer}
              onChange={(e) => onAnswer(e.target.value)}
              placeholder="숫자 입력"
              className="border-2 border-gray-300 rounded-lg p-3 text-center text-xl w-44 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {choiceKeys.map((key) => {
              const text = problem.choices?.[key];
              if (!text) return null;
              const isSelected = answer === key;
              return (
                <button
                  key={key}
                  onClick={() => onAnswer(key)}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-all text-sm leading-snug ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-600 font-medium'
                      : 'bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-800'
                  }`}
                >
                  <span className={`font-bold mr-2 ${isSelected ? 'text-blue-200' : 'text-gray-400'}`}>
                    {key}.
                  </span>
                  <MathText text={text} />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export function CoachSection({ coach, answers, onAnswer }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const goTo = useCallback((idx: number) => {
    setCurrentIndex(Math.max(0, Math.min(idx, coach.problems.length - 1)));
  }, [coach.problems.length]);

  const borderColor = 'border-blue-600';
  const currentProblem = coach.problems[currentIndex];

  return (
    <section className="mb-20">
      {/* Coach header */}
      <div className={`border-l-4 ${borderColor} pl-5 mb-6`}>
        <h2 className="text-3xl font-bold text-gray-900">
          {coach.profileUrl ? (
            <a href={coach.profileUrl} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 transition-colors">
              {coach.name}
            </a>
          ) : (
            coach.name
          )}
        </h2>
        <p className="text-gray-500 mt-1 text-sm leading-relaxed">{coach.tagline}</p>
      </div>

      {/* Problem card — single card, index-switched */}
      <ProblemCard
        key={currentProblem.id}
        problem={currentProblem}
        answer={answers[currentProblem.id] || ''}
        onAnswer={(val) => onAnswer(currentProblem.id, val)}
      />

      {/* Navigation */}
      <div className="flex items-center justify-between mt-4">
        <button
          onClick={() => goTo(currentIndex - 1)}
          disabled={currentIndex === 0}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          ← 이전
        </button>

        {/* Dot indicators */}
        <div className="flex items-center gap-2">
          {coach.problems.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`rounded-full transition-all ${
                i === currentIndex ? 'bg-gray-800 w-5 h-2' : 'bg-gray-300 w-2 h-2'
              }`}
              aria-label={`문항 ${i + 1}`}
            />
          ))}
        </div>

        <button
          onClick={() => goTo(currentIndex + 1)}
          disabled={currentIndex === coach.problems.length - 1}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          다음 →
        </button>
      </div>
      <p className="text-center text-xs text-gray-400 mt-2">
        {currentIndex + 1} / {coach.problems.length}
      </p>

      {/* 선정 이유 section */}
      <div className="mt-8">
        <h3 className="text-lg font-bold text-gray-800 mb-4">선정 이유</h3>
        <div className="space-y-4">
          {coach.problems.map((problem) => (
            <div key={problem.id} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                [문항 {problem.index}] {problem.title}
              </p>
              <div className="text-sm text-gray-700 leading-relaxed">
                <MathText text={problem.reason} block />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
