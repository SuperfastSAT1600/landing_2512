'use client';

import { useEffect, useMemo, useState } from 'react';
import { Send, X } from 'lucide-react';
import { OCTOBER_RW_WORDS } from '@/data/october-rw-words';

interface Props {
  username: string;
  onDone: () => void;
}

interface CustomWord {
  id: string;
  word: string;
  submittedBy: string | null;
}

function parseComment(comment: string): { word: string; username: string | null } {
  const match = comment.match(/^(.+?)\s+\(@(.+?)\)$/);
  if (match) return { word: match[1], username: match[2] };
  return { word: comment, username: null };
}

export function CustomWordSubmit({ username, onDone }: Props) {
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [words, setWords] = useState<CustomWord[]>([]);

  useEffect(() => { loadWords(); }, []);

  async function loadWords() {
    const r = await fetch('/api/secret/rw-check/custom-words');
    const d = await r.json();
    setWords(
      (d.words ?? []).map((w: { id: string; comment: string }) => {
        const { word, username: u } = parseComment(w.comment);
        return { id: w.id, word, submittedBy: u };
      })
    );
  }

  const builtinSet = useMemo(
    () => new Set(OCTOBER_RW_WORDS.map(w => w.word.toLowerCase())),
    []
  );

  type DuplicateKind = 'builtin' | 'custom' | false;
  const duplicate: DuplicateKind = useMemo(() => {
    const q = input.trim().toLowerCase();
    if (!q) return false;
    if (builtinSet.has(q)) return 'builtin';
    if (words.some(w => w.word.toLowerCase() === q)) return 'custom';
    return false;
  }, [input, words, builtinSet]);

  async function handleSubmit() {
    const word = input.trim();
    if (!word || sending || duplicate) return;
    setSending(true);
    await fetch('/api/secret/rw-check/custom-words', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word, instagram_username: username }),
    });
    setInput('');
    await loadWords();
    setSending(false);
  }

  async function handleDelete(id: string) {
    // Optimistic remove
    setWords(prev => prev.filter(w => w.id !== id));
    await fetch('/api/secret/rw-check/custom-words', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, instagram_username: username }),
    });
  }

  const myWords = words.filter(w => w.submittedBy === username.toLowerCase());
  const othersWords = words.filter(w => w.submittedBy !== username.toLowerCase());

  return (
    <div className="min-h-screen bg-[#0f1117] text-white flex flex-col pt-14 pb-20">
      <div className="flex-1 max-w-xl mx-auto w-full px-4 py-10 space-y-8">

        <div className="text-center space-y-2">
          <div className="text-4xl mb-3">📝</div>
          <h1 className="text-xl font-bold">이런 단어도 나왔는데!</h1>
          <p className="text-gray-400 text-sm leading-relaxed">
            목록에 없는 단어가 시험에 나왔다면 추가해주세요.<br />
            다른 학생들에게도 도움이 됩니다.
          </p>
        </div>

        {/* 입력 */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="단어를 입력하세요 (예: ephemeral)"
              className={`flex-1 bg-white/5 border rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none transition-colors ${
                duplicate ? 'border-yellow-500/40' : 'border-white/10 focus:border-indigo-500/50'
              }`}
            />
            <button
              onClick={handleSubmit}
              disabled={!input.trim() || sending || !!duplicate}
              className="px-4 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 rounded-xl transition-colors"
            >
              <Send size={16} />
            </button>
          </div>

          {duplicate === 'builtin' && (
            <p className="text-xs text-yellow-400 px-1">
              이 단어는 이미 24개 목록에 포함된 단어예요.
            </p>
          )}
          {duplicate === 'custom' && (
            <p className="text-xs text-yellow-400 px-1">
              이미 등록되어 있는 단어예요.
            </p>
          )}
        </div>

        {/* 내가 추가한 단어 */}
        {myWords.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">내가 추가한 단어</p>
            <div className="flex flex-wrap gap-2">
              {myWords.map(w => (
                <span
                  key={w.id}
                  className="inline-flex items-center gap-1.5 text-xs bg-indigo-500/15 text-indigo-300 px-3 py-1.5 rounded-full font-mono border border-indigo-500/20"
                >
                  {w.word}
                  <button
                    onClick={() => handleDelete(w.id)}
                    className="text-indigo-400/50 hover:text-red-400 transition-colors"
                    aria-label="삭제"
                  >
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 다른 학생들이 추가한 단어 */}
        {othersWords.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">다른 학생들이 추가한 단어</p>
            <div className="flex flex-wrap gap-2">
              {othersWords.map(w => (
                <span key={w.id} className="text-xs bg-white/5 text-gray-300 px-3 py-1.5 rounded-full font-mono border border-white/5">
                  {w.word}
                </span>
              ))}
            </div>
          </div>
        )}

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
