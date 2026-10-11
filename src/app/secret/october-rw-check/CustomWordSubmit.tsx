'use client';

import { useEffect, useState } from 'react';
import { Send } from 'lucide-react';

interface Props {
  username: string;
  onDone: () => void;
}

interface SubmittedWord {
  id: string;
  comment: string;
  created_at: string;
}

export function CustomWordSubmit({ username, onDone }: Props) {
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [submitted, setSubmitted] = useState<string[]>([]);
  const [others, setOthers] = useState<SubmittedWord[]>([]);

  useEffect(() => {
    fetch('/api/secret/rw-check/custom-words')
      .then(r => r.json())
      .then(d => setOthers(d.words ?? []));
  }, []);

  async function handleSubmit() {
    const word = input.trim();
    if (!word || sending) return;
    setSending(true);
    await fetch('/api/secret/rw-check/custom-words', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word, instagram_username: username }),
    });
    setSubmitted(prev => [...prev, word]);
    setInput('');
    setSending(false);
  }

  return (
    <div className="min-h-screen bg-[#0f1117] text-white flex flex-col pt-14 pb-20">
      <div className="flex-1 max-w-xl mx-auto w-full px-4 py-10 space-y-8">

        {/* 헤더 */}
        <div className="text-center space-y-2">
          <div className="text-4xl mb-3">📝</div>
          <h1 className="text-xl font-bold">이런 단어도 나왔는데!</h1>
          <p className="text-gray-400 text-sm leading-relaxed">
            목록에 없는 단어가 시험에 나왔다면 추가해주세요.<br />
            다른 학생들에게도 도움이 됩니다.
          </p>
        </div>

        {/* 입력 */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="단어를 입력하세요 (예: ephemeral)"
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 transition-colors"
            />
            <button
              onClick={handleSubmit}
              disabled={!input.trim() || sending}
              className="px-4 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 rounded-xl transition-colors"
            >
              <Send size={16} />
            </button>
          </div>

          {/* 이번 세션에 제출한 단어들 */}
          {submitted.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {submitted.map((w, i) => (
                <span key={i} className="text-xs bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full font-mono">
                  {w} ✓
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 다른 학생들이 제출한 단어들 */}
        {others.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">다른 학생들이 추가한 단어</p>
            <div className="flex flex-wrap gap-2">
              {others.map(w => (
                <span key={w.id} className="text-xs bg-white/5 text-gray-300 px-3 py-1.5 rounded-full font-mono border border-white/5">
                  {w.comment.split(' (@')[0]}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 완료 버튼 */}
        <button
          onClick={onDone}
          className="w-full py-3.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-colors"
        >
          완료
        </button>
      </div>
    </div>
  );
}
