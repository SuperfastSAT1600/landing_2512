'use client';

import { useState, useEffect } from 'react';
import { X, Copy, Check } from 'lucide-react';
import { CoachData } from '@/lib/coaches-data';

interface Props {
  onClose: () => void;
  adminKey: string;
}

export function CreateOnboardingLinkModal({ onClose, adminKey }: Props) {
  const [coaches, setCoaches] = useState<CoachData[]>([]);
  const [selectedSlug, setSelectedSlug] = useState('');
  const [coachEmail, setCoachEmail] = useState('');
  const [expiresDays, setExpiresDays] = useState(30);
  const [loading, setLoading] = useState(false);
  const [fetchingCoaches, setFetchingCoaches] = useState(true);
  const [result, setResult] = useState<{ url: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch('/api/admin/coaches', { headers: { 'x-admin-key': adminKey } })
      .then(r => r.json())
      .then(d => { if (d.success) setCoaches(d.coaches); })
      .finally(() => setFetchingCoaches(false));
  }, [adminKey]);

  const selectedCoach = coaches.find(c => c.slug === selectedSlug);

  const handleCreate = async () => {
    if (!selectedSlug) { alert('코치를 선택해 주세요.'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/coach-onboarding/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({
          coach_name: selectedCoach!.name,
          coach_email: coachEmail.trim() || undefined,
          expires_days: expiresDays,
          coach_slug: selectedSlug,
        }),
      });
      const data = await res.json();
      if (data.data?.url) setResult({ url: data.data.url });
      else alert(data.error ?? '링크 생성에 실패했습니다.');
    } catch {
      alert('오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-[#1e2023] rounded-2xl border border-white/10 p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-bold text-white">온보딩 링크 재발급</h2>
            <p className="text-xs text-gray-500 mt-0.5">기존 코치에게 새 링크를 발급합니다</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors">
            <X size={18} />
          </button>
        </div>

        {!result ? (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">코치 선택 <span className="text-red-400">*</span></label>
              {fetchingCoaches ? (
                <div className="w-full bg-[#151719] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-gray-500">불러오는 중...</div>
              ) : (
                <select
                  value={selectedSlug}
                  onChange={e => setSelectedSlug(e.target.value)}
                  className="w-full bg-[#151719] border border-white/10 focus:border-blue-500 rounded-lg px-3 py-2.5 text-sm text-white outline-none"
                >
                  <option value="">-- 코치 선택 --</option>
                  {coaches.map(c => (
                    <option key={c.slug} value={c.slug}>{c.name} ({c.slug})</option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">이메일 (선택)</label>
              <input
                type="email"
                value={coachEmail}
                onChange={e => setCoachEmail(e.target.value)}
                placeholder="coach@example.com"
                className="w-full bg-[#151719] border border-white/10 focus:border-blue-500 rounded-lg px-3 py-2.5 text-sm text-white outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">링크 유효 기간</label>
              <select
                value={expiresDays}
                onChange={e => setExpiresDays(parseInt(e.target.value))}
                className="w-full bg-[#151719] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
              >
                <option value={7}>7일</option>
                <option value={14}>14일</option>
                <option value={30}>30일</option>
              </select>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleCreate}
                disabled={loading || !selectedSlug}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg text-sm font-bold text-white transition-colors"
              >
                {loading ? '생성 중...' : '링크 생성'}
              </button>
              <button onClick={onClose} className="px-4 py-2.5 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-gray-400 transition-colors">
                취소
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <p className="text-xs text-green-400 font-medium mb-1">링크가 생성되었습니다</p>
              <p className="text-xs text-gray-400">{selectedCoach?.name} 코치에게 아래 링크를 전달해 주세요.</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-[#151719] rounded-lg px-3 py-2.5 text-xs text-gray-300 font-mono overflow-hidden text-ellipsis whitespace-nowrap">
                {result.url}
              </div>
              <button
                onClick={handleCopy}
                className="px-3 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm text-white transition-colors flex items-center gap-1.5"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? '복사됨' : '복사'}
              </button>
            </div>
            <button onClick={onClose} className="w-full py-2.5 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-gray-400 transition-colors">
              닫기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
