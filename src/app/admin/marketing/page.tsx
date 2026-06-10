'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { ChevronDown, ChevronUp, TrendingUp, Users, CreditCard, DollarSign } from 'lucide-react';
import { MARKETING_GROUPS, PAID_GROUPS, GROUP_COLORS, GROUP_ICONS } from '@/lib/marketing-groups';
import type { MarketingGroup } from '@/lib/marketing-groups';
import type { MarketingGroupStats, MarketingDailyRow, AdSpend } from '@/types/marketing';

function getAdminKey() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('admin_key') || '';
}

function fmt(n: number) {
  return n.toLocaleString('ko-KR');
}

function fmtRate(n: number) {
  return `${n.toFixed(1)}%`;
}

// ── Date helpers ──────────────────────────────────────────────────────────────

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

function defaultRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 29);
  return { from: toDateStr(from), to: toDateStr(to) };
}

// ── Ad Spend Modal ────────────────────────────────────────────────────────────

function AdSpendModal({
  group,
  onClose,
  onSaved,
  adminKey,
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
    if (isNaN(parsed) || parsed < 0) {
      setError('0 이상의 금액을 입력하세요.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/crm/marketing/ad-spend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({ date, channel_group: group, amount: parsed, note: note || null }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error?.message ?? '저장 실패');
      }
      onSaved();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '저장 중 오류');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-[#1e2023] border border-white/10 rounded-xl w-full max-w-sm p-6 space-y-4">
        <h3 className="text-white font-semibold text-lg">{group} 광고비 입력</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">날짜</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-[#151719] border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">광고비 (원)</label>
            <input
              type="text"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="예: 150000"
              className="w-full bg-[#151719] border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">메모 (선택)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="캠페인명 등"
              className="w-full bg-[#151719] border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-blue-500"
            />
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
        </div>
        <div className="flex gap-2 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg border border-white/10 text-gray-400 hover:text-white text-sm transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Source Detail Table ───────────────────────────────────────────────────────

function SourceTable({ sources }: { sources: MarketingGroupStats['sources'] }) {
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full text-xs text-gray-300">
        <thead>
          <tr className="border-b border-white/5 text-gray-500">
            <th className="text-left py-2 pr-4 font-medium">소스</th>
            <th className="text-right py-2 px-2 font-medium">인입</th>
            <th className="text-right py-2 px-2 font-medium">컨택률</th>
            <th className="text-right py-2 px-2 font-medium">전환율</th>
            <th className="text-right py-2 pl-2 font-medium">매출</th>
          </tr>
        </thead>
        <tbody>
          {sources.map((s) => (
            <tr key={s.source} className="border-b border-white/5 last:border-0">
              <td className="py-2 pr-4 text-gray-200">{s.source}</td>
              <td className="text-right py-2 px-2">{fmt(s.leads)}</td>
              <td className="text-right py-2 px-2">{fmtRate(s.contact_rate)}</td>
              <td className="text-right py-2 px-2">{fmtRate(s.conversion_rate)}</td>
              <td className="text-right py-2 pl-2">{fmt(s.revenue)}원</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Group Card ────────────────────────────────────────────────────────────────

function GroupCard({
  stats,
  isPaid: isPaidChannel,
  onAddSpend,
}: {
  stats: MarketingGroupStats;
  isPaid: boolean;
  onAddSpend: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const color = GROUP_COLORS[stats.group];
  const icon = GROUP_ICONS[stats.group];

  return (
    <div
      className="bg-[#1e2023] border border-white/5 rounded-xl p-5 transition-all"
      style={{ borderLeftColor: color, borderLeftWidth: 3 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span
            className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold text-white"
            style={{ backgroundColor: color }}
          >
            {icon}
          </span>
          <span className="text-white font-semibold">{stats.group}</span>
          <span className="text-xs text-gray-500 ml-1">{fmt(stats.leads)}명</span>
        </div>
        {isPaidChannel && (
          <button
            onClick={onAddSpend}
            className="text-xs text-blue-400 hover:text-blue-300 border border-blue-500/30 rounded px-2 py-1 transition-colors"
          >
            + 광고비
          </button>
        )}
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 gap-3">
        <Metric
          icon={<Users size={13} />}
          label="컨택 성공률"
          value={fmtRate(stats.contact_rate)}
          sub={`${fmt(stats.contacted)}명 / ${fmt(stats.leads)}명`}
        />
        <Metric
          icon={<CreditCard size={13} />}
          label="결제 전환율"
          value={fmtRate(stats.conversion_rate)}
          sub={`${fmt(stats.paid)}건`}
        />
        <Metric
          icon={<DollarSign size={13} />}
          label="매출"
          value={`${fmt(stats.revenue)}원`}
          sub={`순매출 ${fmt(stats.net_revenue)}원`}
        />
        {isPaidChannel && stats.ad_spend != null && stats.ad_spend > 0 ? (
          <Metric
            icon={<TrendingUp size={13} />}
            label="ROAS / ROI"
            value={`${stats.roas?.toFixed(2)}x`}
            sub={`ROI ${stats.roi! >= 0 ? '+' : ''}${stats.roi?.toFixed(0)}%`}
            highlight={stats.roi != null && stats.roi > 0}
          />
        ) : isPaidChannel ? (
          <div className="bg-[#151719] rounded-lg p-3 flex flex-col gap-1">
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <TrendingUp size={13} /> ROAS / ROI
            </span>
            <span className="text-sm text-gray-600">광고비 미입력</span>
          </div>
        ) : null}
      </div>

      {/* Ad spend total */}
      {isPaidChannel && stats.ad_spend != null && stats.ad_spend > 0 && (
        <p className="text-xs text-gray-500 mt-3">
          이 기간 광고비 합계: <span className="text-gray-300">{fmt(stats.ad_spend)}원</span>
        </p>
      )}

      {/* Drill-down toggle */}
      {stats.sources.length > 0 && (
        <>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="mt-4 flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors w-full"
          >
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            {expanded ? '접기' : `소스 상세 보기 (${stats.sources.length}개)`}
          </button>
          {expanded && <SourceTable sources={stats.sources} />}
        </>
      )}
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
  sub,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  highlight?: boolean;
}) {
  return (
    <div className="bg-[#151719] rounded-lg p-3 flex flex-col gap-1">
      <span className="text-xs text-gray-500 flex items-center gap-1">
        {icon} {label}
      </span>
      <span className={`text-sm font-semibold ${highlight ? 'text-emerald-400' : 'text-white'}`}>
        {value}
      </span>
      <span className="text-xs text-gray-600">{sub}</span>
    </div>
  );
}

// ── Trend Chart ───────────────────────────────────────────────────────────────

function TrendChart({ daily }: { daily: MarketingDailyRow[] }) {
  const chartData = useMemo(() => {
    const dateMap = new Map<string, Record<string, number>>();
    for (const row of daily) {
      if (!dateMap.has(row.date)) dateMap.set(row.date, {});
      dateMap.get(row.date)![row.group] = row.leads;
    }
    return Array.from(dateMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, groups]) => ({ date: date.slice(5), ...groups }));
  }, [daily]);

  if (chartData.length === 0) return null;

  return (
    <div className="bg-[#1e2023] border border-white/5 rounded-xl p-5">
      <h3 className="text-white font-semibold mb-4">일별 리드 인입 추이</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
          <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} tickLine={false} />
          <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{ background: '#1e2023', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
            labelStyle={{ color: '#e0e0e0', fontSize: 12 }}
            itemStyle={{ color: '#9ca3af', fontSize: 11 }}
          />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: '#9ca3af' }} />
          {[...MARKETING_GROUPS, '미분류' as const].map((g) => (
            <Bar key={g} dataKey={g} stackId="a" fill={GROUP_COLORS[g]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Overview Summary ──────────────────────────────────────────────────────────

function OverviewStrip({ groups }: { groups: MarketingGroupStats[] }) {
  const totals = useMemo(() => {
    return groups.reduce(
      (acc, g) => ({
        leads: acc.leads + g.leads,
        contacted: acc.contacted + g.contacted,
        paid: acc.paid + g.paid,
        revenue: acc.revenue + g.revenue,
      }),
      { leads: 0, contacted: 0, paid: 0, revenue: 0 }
    );
  }, [groups]);

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

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function MarketingPage() {
  const range = defaultRange();
  const [from, setFrom] = useState(range.from);
  const [to, setTo] = useState(range.to);
  const [appliedFrom, setAppliedFrom] = useState(range.from);
  const [appliedTo, setAppliedTo] = useState(range.to);

  const [groups, setGroups] = useState<MarketingGroupStats[]>([]);
  const [daily, setDaily] = useState<MarketingDailyRow[]>([]);
  const [adSpends, setAdSpends] = useState<AdSpend[]>([]);
  const [loading, setLoading] = useState(true);
  const [adSpendModal, setAdSpendModal] = useState<'META' | '구글 SEO' | null>(null);
  const adminKey = typeof window !== 'undefined' ? getAdminKey() : '';

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
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats(appliedFrom, appliedTo);
  }, [appliedFrom, appliedTo, fetchStats]);

  function applyRange() {
    setAppliedFrom(from);
    setAppliedTo(to);
  }

  // 광고비를 그룹 통계에 병합
  const enrichedGroups = useMemo((): MarketingGroupStats[] => {
    const spendByGroup = new Map<string, number>();
    for (const s of adSpends) {
      spendByGroup.set(s.channel_group, (spendByGroup.get(s.channel_group) ?? 0) + s.amount);
    }
    return groups.map((g) => {
      if (!PAID_GROUPS.includes(g.group as typeof PAID_GROUPS[number])) return g;
      const ad_spend = spendByGroup.get(g.group) ?? 0;
      if (ad_spend === 0) return { ...g, ad_spend: 0 };
      const roas = g.revenue / ad_spend;
      const roi = ((g.revenue - ad_spend) / ad_spend) * 100;
      return { ...g, ad_spend, roas, roi };
    });
  }, [groups, adSpends]);

  const mainGroups = enrichedGroups.filter((g) => g.group !== '미분류');
  const unclassified = enrichedGroups.find((g) => g.group === '미분류');

  return (
    <div className="min-h-screen bg-[#151719] text-[#E0E0E0] p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">마케팅</h1>
          <p className="text-sm text-gray-500 mt-0.5">채널별 리드 인입 · 컨택 성공률 · 결제 전환율 · ROI</p>
        </div>
        {/* Date range picker */}
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="bg-[#1e2023] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
          />
          <span className="text-gray-500 text-sm">~</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="bg-[#1e2023] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
          />
          <button
            onClick={applyRange}
            className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            적용
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-gray-500">불러오는 중...</div>
      ) : (
        <>
          <OverviewStrip groups={enrichedGroups} />

          {/* Group cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {mainGroups.map((g) => (
              <GroupCard
                key={g.group}
                stats={g}
                isPaid={PAID_GROUPS.includes(g.group as typeof PAID_GROUPS[number])}
                onAddSpend={() => setAdSpendModal(g.group as 'META' | '구글 SEO')}
              />
            ))}
          </div>

          {/* Unclassified */}
          {unclassified && unclassified.leads > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-2">미분류 리드</p>
              <GroupCard
                stats={unclassified}
                isPaid={false}
                onAddSpend={() => {}}
              />
            </div>
          )}

          <TrendChart daily={daily} />
        </>
      )}

      {/* Ad Spend Modal */}
      {adSpendModal && (
        <AdSpendModal
          group={adSpendModal}
          adminKey={adminKey}
          onClose={() => setAdSpendModal(null)}
          onSaved={() => fetchStats(appliedFrom, appliedTo)}
        />
      )}
    </div>
  );
}
