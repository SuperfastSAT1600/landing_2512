'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { MARKETING_GROUPS, PAID_GROUPS, GROUP_COLORS } from '@/lib/marketing-groups';
import type { MarketingGroupStats, MarketingDailyRow, AdSpend, WeeklyStats } from '@/types/marketing';
import HeroWidget from './components/HeroWidget';
import ChannelHealthTable from './components/ChannelHealthTable';
import WeeklyGoalEditor from './components/WeeklyGoalEditor';
import MarketingTabs from './components/MarketingTabs';
import { fmt, fmtRate, toDateStr } from './components/format';

function defaultRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 29);
  return { from: toDateStr(from), to: toDateStr(to) };
}

function getAdminKey() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('admin_key') || '';
}

// ── Ad Spend Modal ────────────────────────────────────────────────────────────

function AdSpendModal({
  group, onClose, onSaved, adminKey,
}: {
  group: 'META' | '구글 SEO';
  onClose: () => void;
  onSaved: () => void;
  adminKey: string;
}) {
  const [date, setDate] = useState(toDateStr(new Date()));
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    const parsed = parseInt(amount.replace(/,/g, ''), 10);
    if (isNaN(parsed) || parsed < 0) { setError('0 이상의 금액을 입력하세요.'); return; }
    setSaving(true); setError('');
    try {
      const res = await fetch('/api/crm/marketing/ad-spend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({ date, channel_group: group, amount: parsed, note: note || null }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error?.message ?? '저장 실패'); }
      onSaved(); onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '저장 중 오류');
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-[#1e2023] border border-white/10 rounded-xl w-full max-w-sm p-6 space-y-4">
        <h3 className="text-white font-semibold text-lg">{group} 광고비 입력</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">날짜</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="w-full bg-[#151719] border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">광고비 (원)</label>
            <input type="text" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)}
              placeholder="예: 150000"
              className="w-full bg-[#151719] border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">메모 (선택)</label>
            <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="캠페인명 등"
              className="w-full bg-[#151719] border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-blue-500" />
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
        </div>
        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-white/10 text-gray-400 hover:text-white text-sm transition-colors">취소</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors disabled:opacity-50">
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Channel Compare Table ─────────────────────────────────────────────────────

function ChannelCompareTable({ groups, onAddSpend }: {
  groups: MarketingGroupStats[];
  onAddSpend: (group: 'META' | '구글 SEO') => void;
}) {
  const rows = groups.filter((g) => g.group !== '미분류' || g.leads > 0);
  if (rows.length === 0) return <p className="text-gray-600 text-sm text-center py-8">데이터 없음</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/5">
            <th className="text-left py-2.5 pr-4 text-xs text-gray-500 font-medium">채널</th>
            <th className="text-right py-2.5 px-3 text-xs text-gray-500 font-medium">리드</th>
            <th className="text-right py-2.5 px-3 text-xs text-gray-500 font-medium">컨택 성공률</th>
            <th className="text-right py-2.5 px-3 text-xs text-gray-500 font-medium">결제 전환율</th>
            <th className="text-right py-2.5 px-3 text-xs text-gray-500 font-medium">매출</th>
            <th className="text-right py-2.5 px-3 text-xs text-orange-400 font-medium">광고비</th>
            <th className="text-right py-2.5 pl-3 text-xs text-yellow-400 font-medium">ROAS</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((g) => {
            const isPaid = PAID_GROUPS.includes(g.group as typeof PAID_GROUPS[number]);
            return (
              <tr key={g.group} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors">
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: GROUP_COLORS[g.group] }} />
                    <span className="font-semibold text-xs" style={{ color: GROUP_COLORS[g.group] }}>{g.group}</span>
                  </div>
                </td>
                <td className="text-right py-3 px-3 text-white font-semibold">{fmt(g.leads)}</td>
                <td className="text-right py-3 px-3 text-gray-300">{fmtRate(g.contact_rate)}</td>
                <td className="text-right py-3 px-3 text-gray-300">{fmtRate(g.conversion_rate)}</td>
                <td className="text-right py-3 px-3 text-gray-300 text-xs">{fmt(g.revenue)}원</td>
                <td className="text-right py-3 px-3 text-xs">
                  {isPaid ? (
                    g.ad_spend && g.ad_spend > 0
                      ? <span className="text-orange-300">{fmt(g.ad_spend)}원</span>
                      : <button onClick={() => onAddSpend(g.group as 'META' | '구글 SEO')}
                          className="text-blue-400 hover:text-blue-300 border border-blue-500/30 rounded px-2 py-0.5 transition-colors">
                          + 입력
                        </button>
                  ) : <span className="text-gray-600">—</span>}
                </td>
                <td className="text-right py-3 pl-3 text-xs">
                  {isPaid && g.roas != null
                    ? <span className={g.roas >= 1 ? 'text-emerald-400' : 'text-red-400'}>{g.roas.toFixed(2)}x</span>
                    : <span className="text-gray-600">—</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Trend Chart ───────────────────────────────────────────────────────────────

function TrendChart({ daily }: { daily: MarketingDailyRow[] }) {
  const allChannels = [...MARKETING_GROUPS, '미분류' as const];

  const chartData = useMemo(() => {
    const dateMap = new Map<string, Record<string, number>>();
    for (const row of daily) {
      if (!dateMap.has(row.date)) dateMap.set(row.date, {});
      dateMap.get(row.date)![row.group] = row.leads;
    }
    return Array.from(dateMap.entries()).sort(([a], [b]) => a.localeCompare(b))
      .map(([date, groups]) => ({ date: date.slice(5), ...groups }));
  }, [daily]);

  if (chartData.length === 0) return null;

  return (
    <div className="bg-[#1e2023] border border-white/5 rounded-xl p-5">
      <h3 className="text-white font-semibold mb-4">일별 리드 인입 추이</h3>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            {allChannels.map((ch) => (
              <linearGradient key={ch} id={`tg-${ch}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={GROUP_COLORS[ch]} stopOpacity={0.25} />
                <stop offset="95%" stopColor={GROUP_COLORS[ch]} stopOpacity={0.03} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
          <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} tickLine={false} interval="preserveStartEnd" />
          <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={{ background: '#1e2023', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
            labelStyle={{ color: '#e0e0e0', fontSize: 12 }} itemStyle={{ fontSize: 11 }} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: '#9ca3af' }} />
          {allChannels.map((ch) => (
            <Area key={ch} type="monotone" dataKey={ch}
              stroke={GROUP_COLORS[ch]} strokeWidth={2}
              fill={`url(#tg-${ch})`}
              dot={{ r: 2.5, fill: GROUP_COLORS[ch], strokeWidth: 0 }}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Overview Summary ──────────────────────────────────────────────────────────

function OverviewStrip({ groups }: { groups: MarketingGroupStats[] }) {
  const totals = useMemo(() => groups.reduce(
    (acc, g) => ({ leads: acc.leads + g.leads, contacted: acc.contacted + g.contacted,
      paid: acc.paid + g.paid, revenue: acc.revenue + g.revenue }),
    { leads: 0, contacted: 0, paid: 0, revenue: 0 }
  ), [groups]);

  const contactRate = totals.leads > 0 ? (totals.contacted / totals.leads) * 100 : 0;
  const convRate = totals.leads > 0 ? (totals.paid / totals.leads) * 100 : 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {[
        { label: '총 인입', value: `${fmt(totals.leads)}명` },
        { label: '컨택 성공률', value: fmtRate(contactRate) },
        { label: '결제 전환율', value: fmtRate(convRate) },
        { label: '총 매출', value: `${fmt(totals.revenue)}원` },
      ].map(({ label, value }) => (
        <div key={label} className="bg-[#1e2023] border border-white/5 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">{label}</p>
          <p className="text-xl font-bold text-white">{value}</p>
        </div>
      ))}
    </div>
  );
}

// ── Section Divider ───────────────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</span>
      <div className="flex-1 h-px bg-white/5" />
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const PRESETS = [
  { label: '이번 주', fn: () => { const d = new Date(); const mon = new Date(d); mon.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return { from: toDateStr(mon), to: toDateStr(d) }; } },
  { label: '이번 달', fn: () => { const d = new Date(); return { from: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`, to: toDateStr(d) }; } },
  { label: '지난 달', fn: () => { const d = new Date(); d.setDate(1); d.setDate(d.getDate()-1); const y = d.getFullYear(); const m = String(d.getMonth()+1).padStart(2,'0'); return { from: `${y}-${m}-01`, to: toDateStr(d) }; } },
  { label: '3개월', fn: () => { const to = new Date(); const from = new Date(); from.setMonth(from.getMonth()-3); return { from: toDateStr(from), to: toDateStr(to) }; } },
];

export default function MarketingPage() {
  const range = defaultRange();
  const [appliedFrom, setAppliedFrom] = useState(range.from);
  const [appliedTo, setAppliedTo] = useState(range.to);
  const [activePreset, setActivePreset] = useState<string | null>('30일');
  const [showGoalEditor, setShowGoalEditor] = useState(false);

  const [groups, setGroups] = useState<MarketingGroupStats[]>([]);
  const [daily, setDaily] = useState<MarketingDailyRow[]>([]);
  const [adSpends, setAdSpends] = useState<AdSpend[]>([]);
  const [weekly, setWeekly] = useState<WeeklyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [weeklyLoading, setWeeklyLoading] = useState(true);
  const [adSpendModal, setAdSpendModal] = useState<'META' | '구글 SEO' | null>(null);
  const adminKey = typeof window !== 'undefined' ? getAdminKey() : '';

  const fetchWeekly = useCallback(async () => {
    setWeeklyLoading(true);
    try {
      const res = await fetch('/api/crm/marketing/weekly', { headers: { 'x-admin-key': getAdminKey() } });
      const json = await res.json();
      setWeekly(json.data ?? null);
    } catch { /* silent */ }
    finally { setWeeklyLoading(false); }
  }, []);

  const fetchStats = useCallback(async (f: string, t: string) => {
    setLoading(true);
    try {
      const [statsRes, spendRes] = await Promise.all([
        fetch(`/api/crm/marketing/stats?from=${f}&to=${t}`, { headers: { 'x-admin-key': getAdminKey() } }),
        fetch(`/api/crm/marketing/ad-spend?from=${f}&to=${t}`, { headers: { 'x-admin-key': getAdminKey() } }),
      ]);
      const statsJson = await statsRes.json();
      const spendJson = await spendRes.json();
      setGroups(statsJson.data?.groups ?? []);
      setDaily(statsJson.data?.daily ?? []);
      setAdSpends(spendJson.data ?? []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchWeekly(); }, [fetchWeekly]);
  useEffect(() => { fetchStats(appliedFrom, appliedTo); }, [appliedFrom, appliedTo, fetchStats]);

  function applyPreset(label: string, from: string, to: string) {
    setAppliedFrom(from);
    setAppliedTo(to);
    setActivePreset(label);
  }

  const enrichedGroups = useMemo((): MarketingGroupStats[] => {
    const spendByGroup = new Map<string, number>();
    for (const s of adSpends) spendByGroup.set(s.channel_group, (spendByGroup.get(s.channel_group) ?? 0) + s.amount);
    return groups.map((g) => {
      if (!PAID_GROUPS.includes(g.group as typeof PAID_GROUPS[number])) return g;
      const ad_spend = spendByGroup.get(g.group) ?? 0;
      if (ad_spend === 0) return { ...g, ad_spend: 0 };
      const roas = g.revenue / ad_spend;
      const roi = ((g.revenue - ad_spend) / ad_spend) * 100;
      return { ...g, ad_spend, roas, roi };
    });
  }, [groups, adSpends]);

  return (
    <div className="min-h-screen bg-[#151719] text-[#E0E0E0] p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">마케팅</h1>
          <p className="text-sm text-gray-500 mt-0.5">채널별 리드 인입 · 컨택 성공률 · 결제 전환율 · ROI</p>
        </div>
        <MarketingTabs active="/admin/marketing" />
      </div>

      {/* ── 이번 주 헬스체크 ── */}
      {weeklyLoading ? (
        <div className="bg-[#1e2023] border border-white/5 rounded-xl p-6 animate-pulse">
          <div className="h-4 w-48 bg-white/5 rounded mb-4" />
          <div className="h-10 w-24 bg-white/5 rounded mb-3" />
          <div className="h-2 w-full bg-white/5 rounded" />
        </div>
      ) : weekly ? (
        <HeroWidget
          weekly={weekly}
          onAddSpend={(g) => setAdSpendModal(g)}
          onSetGoal={() => setShowGoalEditor((v) => !v)}
        />
      ) : null}

      {showGoalEditor && weekly && (
        <WeeklyGoalEditor
          adminKey={adminKey}
          currentWeekStart={weekly.week_start}
          onSaved={() => { fetchWeekly(); setShowGoalEditor(false); }}
        />
      )}

      {/* ── 채널별 현황 ── */}
      {weekly && !weeklyLoading && <ChannelHealthTable weekly={weekly} />}

      {/* ── 기간 선택 ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500">빠른 선택:</span>
          {PRESETS.map(({ label, fn }) => (
            <button key={label}
              onClick={() => { const r = fn(); applyPreset(label, r.from, r.to); }}
              className={`text-xs px-3 py-1.5 rounded-md transition-colors font-medium ${
                activePreset === label ? 'bg-blue-600 text-white' : 'bg-[#1e2023] text-gray-400 hover:text-white hover:bg-white/10'
              }`}>{label}</button>
          ))}
        </div>
        <div className="flex items-center gap-2 sm:ml-auto">
          <input type="date" value={appliedFrom}
            onChange={(e) => { setAppliedFrom(e.target.value); setActivePreset(null); }}
            className="bg-[#1e2023] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-blue-500" />
          <span className="text-gray-500 text-sm">~</span>
          <input type="date" value={appliedTo}
            onChange={(e) => { setAppliedTo(e.target.value); setActivePreset(null); }}
            className="bg-[#1e2023] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-blue-500" />
        </div>
      </div>

      {/* ── 기간별 상세 ── */}
      {loading ? (
        <div className="flex items-center justify-center h-32 text-gray-500">불러오는 중...</div>
      ) : (
        <>
          <SectionLabel label={`${appliedFrom} ~ ${appliedTo} 기간 상세`} />
          <OverviewStrip groups={enrichedGroups} />

          <div className="bg-[#1e2023] border border-white/5 rounded-xl p-5">
            <h3 className="text-white font-semibold mb-4">채널별 성과 비교</h3>
            <ChannelCompareTable
              groups={enrichedGroups}
              onAddSpend={(g) => setAdSpendModal(g)}
            />
          </div>

          <TrendChart daily={daily} />
        </>
      )}

      {adSpendModal && (
        <AdSpendModal group={adSpendModal} adminKey={adminKey}
          onClose={() => setAdSpendModal(null)}
          onSaved={() => { fetchStats(appliedFrom, appliedTo); fetchWeekly(); }} />
      )}
    </div>
  );
}
