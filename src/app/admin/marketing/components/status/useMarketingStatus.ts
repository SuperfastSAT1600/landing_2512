'use client';

import { useState, useEffect, useCallback } from 'react';
import type { MarketingDailyRow, MarketingGroupStats, WeeklyStats } from '@/types/marketing';
import { getMonthRange, getQuarterRange, getCurrentQuarter, getPreviousQuarter } from './utils/compareUtils';

function getAdminKey() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('admin_key') || '';
}

async function fetchStats(from: string, to: string): Promise<{ groups: MarketingGroupStats[]; daily: MarketingDailyRow[] }> {
  const res = await fetch(`/api/crm/marketing/stats?from=${from}&to=${to}`, {
    headers: { 'x-admin-key': getAdminKey() },
  });
  const json = await res.json();
  return { groups: json.data?.groups ?? [], daily: json.data?.daily ?? [] };
}

export interface CompareData {
  currentLabel: string;
  previousLabel: string;
  currentGroups: MarketingGroupStats[];
  previousGroups: MarketingGroupStats[];
}

export interface MarketingStatusData {
  // Part A: 인입 트래킹
  recentDaily: MarketingDailyRow[];
  recentDailyLoading: boolean;
  adSpendByDate: Record<string, number>;

  // Part B: 비교 분석
  momData: CompareData | null;
  qoqData: CompareData | null;
  yoyMonthData: CompareData | null;
  yoyQuarterData: CompareData | null;
  compareLoading: boolean;

  // Part C: 시그널 (weekly 재사용)
  weekly: WeeklyStats | null;
  weeklyLoading: boolean;

  refetch: () => void;
}

function getRecentRange(weeks: number): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - weeks * 7);
  const pad = (n: number) => String(n).padStart(2, '0');
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return { from: fmt(from), to: fmt(to) };
}

export function useMarketingStatus(): MarketingStatusData {
  const [recentDaily, setRecentDaily] = useState<MarketingDailyRow[]>([]);
  const [recentDailyLoading, setRecentDailyLoading] = useState(true);
  const [adSpendByDate, setAdSpendByDate] = useState<Record<string, number>>({});

  const [momData, setMomData] = useState<CompareData | null>(null);
  const [qoqData, setQoqData] = useState<CompareData | null>(null);
  const [yoyMonthData, setYoyMonthData] = useState<CompareData | null>(null);
  const [yoyQuarterData, setYoyQuarterData] = useState<CompareData | null>(null);
  const [compareLoading, setCompareLoading] = useState(true);

  const [weekly, setWeekly] = useState<WeeklyStats | null>(null);
  const [weeklyLoading, setWeeklyLoading] = useState(true);

  const load = useCallback(async () => {
    const now = new Date();
    const thisYear = now.getFullYear();
    const thisMonth = now.getMonth() + 1;
    const { year: qYear, quarter: qNum } = getCurrentQuarter(now);
    const prevQ = getPreviousQuarter(qYear, qNum);

    // Part A: 최근 12주 일별 데이터 + 광고비 병렬 조회
    setRecentDailyLoading(true);
    const recentRange = getRecentRange(12);
    Promise.all([
      fetchStats(recentRange.from, recentRange.to),
      fetch(`/api/crm/marketing/ad-spend?from=${recentRange.from}&to=${recentRange.to}`, {
        headers: { 'x-admin-key': getAdminKey() },
      }).then((r) => r.json()),
    ]).then(([{ daily }, spendJson]) => {
      setRecentDaily(daily);
      const spendRows: { date: string; amount: number }[] = spendJson.data ?? [];
      const byDate: Record<string, number> = {};
      for (const row of spendRows) {
        byDate[row.date] = (byDate[row.date] ?? 0) + row.amount;
      }
      setAdSpendByDate(byDate);
    }).finally(() => setRecentDailyLoading(false));

    // Part B: 비교 분석 — 4개 기간 병렬 fetch
    setCompareLoading(true);
    const prevMonth = thisMonth === 1 ? 12 : thisMonth - 1;
    const prevMonthYear = thisMonth === 1 ? thisYear - 1 : thisYear;
    const yoyYear = thisYear - 1;

    const currentMonthRange = getMonthRange(thisYear, thisMonth);
    const prevMonthRange = getMonthRange(prevMonthYear, prevMonth);
    const currentQRange = getQuarterRange(qYear, qNum);
    const prevQRange = getQuarterRange(prevQ.year, prevQ.quarter);
    const yoyMonthRange = getMonthRange(yoyYear, thisMonth);
    const yoyQRange = getQuarterRange(yoyYear, qNum);

    Promise.all([
      fetchStats(currentMonthRange.from, currentMonthRange.to),
      fetchStats(prevMonthRange.from, prevMonthRange.to),
      fetchStats(currentQRange.from, currentQRange.to),
      fetchStats(prevQRange.from, prevQRange.to),
      fetchStats(yoyMonthRange.from, yoyMonthRange.to),
      fetchStats(yoyQRange.from, yoyQRange.to),
    ]).then(([curMon, prevMon, curQ, prevQData, yoyMon, yoyQ]) => {
      const ml = (y: number, m: number) => `${y}년 ${m}월`;
      const ql = (y: number, q: number) => `${y}년 Q${q}`;

      setMomData({
        currentLabel: ml(thisYear, thisMonth),
        previousLabel: ml(prevMonthYear, prevMonth),
        currentGroups: curMon.groups,
        previousGroups: prevMon.groups,
      });
      setQoqData({
        currentLabel: ql(qYear, qNum),
        previousLabel: ql(prevQ.year, prevQ.quarter),
        currentGroups: curQ.groups,
        previousGroups: prevQData.groups,
      });
      setYoyMonthData({
        currentLabel: ml(thisYear, thisMonth),
        previousLabel: ml(yoyYear, thisMonth),
        currentGroups: curMon.groups,
        previousGroups: yoyMon.groups,
      });
      setYoyQuarterData({
        currentLabel: ql(qYear, qNum),
        previousLabel: ql(yoyYear, qNum),
        currentGroups: curQ.groups,
        previousGroups: yoyQ.groups,
      });
    }).finally(() => setCompareLoading(false));

    // Part C: weekly
    setWeeklyLoading(true);
    fetch('/api/crm/marketing/weekly', { headers: { 'x-admin-key': getAdminKey() } })
      .then((r) => r.json())
      .then((j) => setWeekly(j.data ?? null))
      .finally(() => setWeeklyLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  return {
    recentDaily, recentDailyLoading, adSpendByDate,
    momData, qoqData, yoyMonthData, yoyQuarterData, compareLoading,
    weekly, weeklyLoading,
    refetch: load,
  };
}
