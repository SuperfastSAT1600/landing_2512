'use client';

// 재결제 보드의 단일 데이터 소유자.
// 학생 소스는 '튜터링 중' 탭과 동일하게 enrolled + SRM 튜터링 상태 둘뿐이다
// (EnrolledLeads.tsx 참고). 후보 패널이 따로 fetch하면 드래그·추가마다
// 전체 파이프라인이 재실행되므로 여기서 한 번만 가져와 내려준다.

import { useCallback, useEffect, useState } from 'react';
import type { RenewalTarget, RenewalWeeklyStat, Student } from '@/types/crm';
import { classifyTutoringEntries, type TutoringEntry } from './TutoringStudentRow';
import type { TutoringUser } from '@/app/api/admin/srm/tutoring-users/route';

/** 보드가 보고 있는 범위. open = 코호트 무관 진행 중 전체(일상 운영 화면). */
export type RenewalScope = { kind: 'open' } | { kind: 'week'; weekStart: string };

const WEEKS = 8;

export function scopeQuery(scope: RenewalScope): string {
  return scope.kind === 'open' ? '?scope=open' : `?week_start=${scope.weekStart}`;
}

async function getJson(url: string, adminKey: string) {
  const res = await fetch(url, { headers: { 'x-admin-key': adminKey } });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.error?.message ?? '요청이 실패했습니다.');
  return json;
}

export function useRenewalBoard(adminKey: string, scope: RenewalScope) {
  const [targets, setTargets] = useState<RenewalTarget[]>([]);
  const [entries, setEntries] = useState<TutoringEntry<Student>[]>([]);
  // SRM에서는 튜터링 중인데 CRM lead_status가 enrolled가 아니어서 학생 소스에 없는 인원.
  // '튜터링 중' 탭에서도 안 보이는 학생들이므로 목록에 끼워 넣지 않고 건수만 드러낸다.
  const [missingFromEnrolled, setMissingFromEnrolled] = useState(0);
  const [weekly, setWeekly] = useState<RenewalWeeklyStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [candidatesLoading, setCandidatesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [candidatesError, setCandidatesError] = useState<string | null>(null);

  const query = scopeQuery(scope);

  /** 보드 + 주차 통계. 변경(추가·이동·종결) 후 함께 갱신해야 숫자가 어긋나지 않는다. */
  const refresh = useCallback(
    async (showLoading = false) => {
      if (showLoading) setLoading(true);
      try {
        const [targetsJson, statsJson] = await Promise.all([
          getJson(`/api/crm/renewal-targets${query}`, adminKey),
          getJson(`/api/crm/renewal-targets/stats?weeks=${WEEKS}`, adminKey),
        ]);
        setTargets(targetsJson.data ?? []);
        setWeekly(statsJson.data ?? []);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : '로딩에 실패했습니다.');
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [adminKey, query]
  );

  useEffect(() => {
    refresh(true);
  }, [refresh]);

  // 후보 목록의 학생 소스 — scope와 무관하므로 adminKey당 1회만 가져온다.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setCandidatesLoading(true);
      try {
        const [studentsJson, tutoringJson] = await Promise.all([
          getJson('/api/crm/students?lead_status=enrolled', adminKey),
          getJson('/api/admin/srm/tutoring-users', adminKey),
        ]);
        if (cancelled) return;
        const enrolled: Student[] = studentsJson.data ?? [];
        const linked: TutoringUser[] = tutoringJson.linked ?? [];
        setEntries(classifyTutoringEntries(enrolled, linked));

        const enrolledIds = new Set(enrolled.map((s) => s.id));
        setMissingFromEnrolled(
          linked.filter(
            (u) => u.status !== 'ended' && u.crmStudentId && !enrolledIds.has(u.crmStudentId)
          ).length
        );
        setCandidatesError(null);
      } catch (e) {
        if (!cancelled) {
          setCandidatesError(e instanceof Error ? e.message : '튜터링 학생 목록을 불러오지 못했습니다.');
        }
      } finally {
        if (!cancelled) setCandidatesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [adminKey]);

  return {
    targets,
    setTargets,
    entries,
    missingFromEnrolled,
    weekly,
    loading,
    candidatesLoading,
    error,
    setError,
    candidatesError,
    refresh,
  };
}
