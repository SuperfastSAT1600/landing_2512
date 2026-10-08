'use client';

import { useEffect, useState } from 'react';
import { MessageCircle, Send } from 'lucide-react';

interface Comment {
  id: string;
  comment: string;
  created_at: string;
}

export function CommentSection({ problemId }: { problemId: string }) {
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch(`/api/secret/math-check/comments?problemId=${encodeURIComponent(problemId)}`)
      .then(r => r.json())
      .then(d => setComments(d.comments ?? []))
      .finally(() => setLoading(false));
  }, [open, problemId]);

  // 문제 바뀌면 닫기
  useEffect(() => { setOpen(false); setComments([]); setInput(''); }, [problemId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || sending) return;
    setSending(true);
    const res = await fetch('/api/secret/math-check/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ problem_id: problemId, comment: input.trim() }),
    });
    if (res.ok) {
      const newComment: Comment = { id: Date.now().toString(), comment: input.trim(), created_at: new Date().toISOString() };
      setComments(prev => [newComment, ...prev]);
      setInput('');
    }
    setSending(false);
  }

  return (
    <div className="border-t border-white/10 pt-4">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-300 transition-colors"
      >
        <MessageCircle size={13} />
        {open ? '코멘트 닫기' : `이 문제에 대해 생각 남기기${comments.length > 0 ? ` (${comments.length})` : ''}`}
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          {/* 입력 */}
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="익명으로 남겨주세요..."
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 outline-none focus:border-white/20"
            />
            <button
              type="submit"
              disabled={!input.trim() || sending}
              className="p-2 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-400 disabled:opacity-40 transition-colors"
            >
              <Send size={13} />
            </button>
          </form>

          {/* 코멘트 목록 */}
          {loading ? (
            <p className="text-xs text-gray-600 text-center py-2">불러오는 중...</p>
          ) : comments.length === 0 ? (
            <p className="text-xs text-gray-600 text-center py-2">아직 코멘트가 없습니다.</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {comments.map(c => (
                <div key={c.id} className="bg-white/3 rounded-lg px-3 py-2">
                  <p className="text-xs text-gray-300 leading-relaxed">{c.comment}</p>
                  <p className="text-[10px] text-gray-600 mt-1">
                    {new Date(c.created_at).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
