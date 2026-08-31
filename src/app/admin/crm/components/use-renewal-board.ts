'use client';

// 재결제 보드의 단일 데이터 소유자.
// 학생 소스는 '튜터링 중' 탭과 동일하게 enrolled + SRM 튜터링 상태 둘뿐이다
// (EnrolledLeads.tsx 참고). 후보 패널이 따로 fetch하면 드래그·추가마다
// 전체 파이프라인이 재실행되므로 여기서 한 번만 가져와 내려준다.

import { useCallback, useEffect, useState } from 'react';
import { getCurrentWeekDef } from '@/lib/week-definitions';
import type { RenewalTarget, RenewalWeeklyStat, Student } from '@/types/crm';
import { classifyTutoringEntries, type TutoringEntry } from './TutoringStudentRow';
import type { TutoringUser } from '@/app/api/admin/srm/tutoring-users/route';

/** 보드가 보고 있는 범위. open = 코호트 무관 진행 중 전체(일상 운영 화면). */
export type RenewalScope = { kind: 'open' } | { kind: 'week'; weekStart: string };

const WEEKS = 8;

/**
 * 보드 초기 스코프 = 이번 주차.
 * 이 화면의 목적이 '주차별 재결제 전환율'이라 첫 화면부터 그 주차의 5단계를 보여준다.
 * 정의된 주차 범위 밖(연말 이후 등)이면 진행 중 전체로 폴백한다.
 */
export function defaultRenewalScope(now: Date = new Date()): RenewalScope {
  const week = getCurrentWeekDef(now);
  return week ? { kind: 'week', weekStart: week.start } : { kind: 'open' };
}

export function scopeQuery(scope: RenewalScope): string {
  return scope.kind === 'open' ? '?scope=open' : `?week_start=${scope.weekStart}`;
}

/**
 * 주차 이월은 페이지 로드당 주차당 1회만 실행한다.
 * useRenewalBoard 는 LeadsHub 탭을 오갈 때마다 mount 되므로 훅 안의 ref 로는 못 막는다.
 * 서버가 멱등이라 중복 호출이 데이터를 깨지는 않지만, 왕복을 낭비할 이유도 없다.
 */
let carriedWeek: string | null = null;
let carryPromise: Promise<void> | null = null;

function runCarryOverOnce(adminKey: string, weekStart: string): Promise<void> {
  if (carriedWeek === weekStart) return Promise.resolve();
  if (!carryPromise) {
    carryPromise = fetch('/api/crm/renewal-targets/carry-over', {
      method: 'POST',
      headers: { 'x-admin-key': adminKey },
    })
      .then((res) => {
        if (res.ok) carriedWeek = weekStart;
      })
      // 이월이 실패해도 보드는 떠야 한다 — 지난 주차 인원이 안 넘어올 뿐이다.
      .catch(() => {})
      .finally(() => {
        carryPromise = null;
      });
  }
  return carryPromise;
}

async function getJson(url: string, adminKey: string) {
  const res = await fetch(url, { headers: { 'x-admin-key': adminKey } });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.error?.message ?? '요청이 실패했습니다.');
  return json;
}

export function useRenewalBoard(adminKey: string, scope: RenewalScope) {
  const [targets, setTargets] = useState<RenewalTarget[]>([]);
  // 후보 제외용 — 코호트 무관 '진행 중' 타깃. 주차 스코프에서 targets는 그 주차만 담으므로
  // 그것만으로 걸러내면 지난 주차에 진행 중인 학생이 후보로 다시 뜬다(추가 시 서버가 409).
  const [openTargets, setOpenTargets] = useState<RenewalTarget[]>([]);
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
  const isOpenScope = scope.kind === 'open';

  /** 보드 + 주차 통계. 변경(추가·이동·종결) 후 함께 갱신해야 숫자가 어긋나지 않는다. */
  const refresh = useCallback(
    async (showLoading = false) => {
      if (showLoading) setLoading(true);
      try {
        // 데이터를 읽기 전에 이월을 끝낸다 — 순서가 뒤집히면 이월 전 보드가 한 번
        // 그려졌다가 깜빡인다.
        const currentWeek = getCurrentWeekDef();
        if (currentWeek) await runCarryOverOnce(adminKey, currentWeek.start);

        const [targetsJson, statsJson, openJson] = await Promise.all([
          getJson(`/api/crm/renewal-targets${query}`, adminKey),
          getJson(`/api/crm/renewal-targets/stats?weeks=${WEEKS}`, adminKey),
          // 스코프가 이미 open이면 같은 목록이라 다시 부르지 않는다.
          isOpenScope ? null : getJson('/api/crm/renewal-targets?scope=open', adminKey),
        ]);
        setTargets(targetsJson.data ?? []);
        setOpenTargets((openJson ?? targetsJson).data ?? []);
        setWeekly(statsJson.data ?? []);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : '로딩에 실패했습니다.');
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [adminKey, query, isOpenScope]
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
    openTargets,
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
