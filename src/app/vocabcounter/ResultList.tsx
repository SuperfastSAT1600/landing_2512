'use client';

import { useState } from 'react';
import type { VocabSearchExample, VocabSearchResult, VocabSearchVerdict } from './page';

function highlight(sentence: string, surfaces: string[]) {
  const escaped = surfaces.map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const parts = sentence.split(new RegExp(`(${escaped.join('|')})`, 'gi'));
  const surfaceSet = new Set(surfaces.map((s) => s.toLowerCase()));
  return parts.map((part, i) =>
    surfaceSet.has(part.toLowerCase()) ? (
      <mark key={i} className="bg-amber-100 text-amber-900 font-semibold rounded-sm px-0.5 not-italic">
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

const TIER_STYLE: Record<1 | 2 | 3 | 4, { label: string; color: string }> = {
  1: { label: '저빈도', color: 'text-gray-400' },
  2: { label: '중빈도', color: 'text-blue-500' },
  3: { label: '고빈도', color: 'text-emerald-600' },
  4: { label: '핵심',   color: 'text-amber-600' },
};

function ExampleCard({ example }: { example: VocabSearchExample }) {
  const diffStyle =
    example.difficulty === 'Easy'   ? 'text-emerald-600 bg-emerald-50' :
    example.difficulty === 'Medium' ? 'text-sky-600 bg-sky-50' :
                                      'text-rose-500 bg-rose-50';
  return (
    <div className="py-3 border-b border-gray-100 last:border-0">
      <p className="text-gray-700 text-sm leading-relaxed mb-2">
        {highlight(example.sentence, example.surfaces)}
      </p>
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded-md ${diffStyle}`}>
          {example.difficulty}
        </span>
        <span className="text-[11px] text-gray-400">{example.skill}</span>
      </div>
    </div>
  );
}

const PREVIEW = 3;

export function AIResponse({ result }: { result: VocabSearchResult }) {
  const [expanded, setExpanded] = useState(false);
  const [showUpsell, setShowUpsell] = useState(false);

  if (result.count === 0) {
    return (
      <p className="text-sm text-gray-500 leading-relaxed pt-0.5">
        <span className="font-medium text-gray-700">&ldquo;{result.query}&rdquo;</span>는
        QB 지문에서 찾지 못했어요. 다른 형태로 다시 검색해보세요.
      </p>
    );
  }

  const tier = result.verdict ? TIER_STYLE[result.verdict.tier] : null;
  const shownExamples = expanded ? result.examples : result.examples.slice(0, PREVIEW);
  const remaining = result.examples.length - PREVIEW;

  return (
    <div className="space-y-2.5 pt-0.5 animate-slide-up">
      {/* Word title row */}
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="text-base font-bold text-gray-900">{result.lemma}</span>
        {result.lemma.toLowerCase() !== result.query.toLowerCase() && (
          <span className="text-xs text-gray-400">{result.query}의 기본형</span>
        )}
        {tier && (
          <span className={`text-xs font-semibold ${tier.color}`}>{tier.label} 어휘</span>
        )}
        <span className="text-xs text-gray-400">{result.count}개 문장</span>
      </div>

      {/* Verdict — the main "answer" */}
      {result.verdict && (
        <p className="text-sm text-gray-700 leading-relaxed">{result.verdict.text}</p>
      )}

      {/* Add to vocab button */}
      <div>
        <button
          onClick={() => setShowUpsell(v => !v)}
          className="inline-flex items-center gap-1.5 text-xs text-gray-400 border border-gray-200 rounded-full px-3 py-1.5 hover:border-gray-300 hover:text-gray-600 transition-colors"
        >
          <span>+</span> 단어장에 추가하기
        </button>
        {showUpsell && (
          <div
            className="mt-2 rounded-2xl px-4 py-4 animate-gradient-shift"
            style={{
              background: 'linear-gradient(135deg, #000 0%, #071be9 50%, #000 100%)',
              backgroundSize: '200% 200%',
              animation: 'gradientShift 4s ease infinite',
              border: '1px solid rgba(96,133,255,0.25)',
            }}
          >
            <p className="text-xs mb-3" style={{ color: 'rgba(255,255,255,0.5)' }}>Vocab Training 구독 후 이용 가능</p>
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <span className="text-sm font-semibold line-through" style={{ color: 'rgba(255,255,255,0.3)' }}>월 19,000원</span>
              <span className="text-sm font-black text-white">월 8,900원</span>
              <span className="text-sm font-bold px-1.5 py-0.5 rounded-full border" style={{ color: '#f87171', background: 'rgba(248,113,113,0.1)', borderColor: 'rgba(248,113,113,0.3)' }}>59% 할인</span>
            </div>
            <a
              href="https://buy.tosspayments.com/products/FGBn-Sut-I"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-white text-sm font-bold hover:opacity-80 transition-opacity"
            >
              <span>👉</span> 지금 구독하기
            </a>
          </div>
        )}
      </div>

      {/* Examples block */}
      <div className="bg-gray-50 rounded-xl px-4">
        {shownExamples.map((ex, i) => (
          <ExampleCard key={`${ex.question_id}-${i}`} example={ex} />
        ))}
        {!expanded && remaining > 0 && (
          <button
            onClick={() => setExpanded(true)}
            className="w-full py-3 text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            예문 {remaining}개 더 보기 ↓
          </button>
        )}
      </div>
    </div>
  );
}
