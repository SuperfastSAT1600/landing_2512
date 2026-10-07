import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { supabaseSFv2 } from '@/lib/supabase-sfv2';
import { isAuthenticated } from '@/lib/server-auth';

export interface CoachStat {
    /** SFv2 active matching 기준 현재 학생 수 */
    studentCount: number;
    /** CRM payments 누적 contracted hours */
    totalHours: number;
    /** SFv2 payments.management_status='active' 인 재원 학생 수 */
    activeStudentCount: number;
}

export interface CoachStatsResponse {
    stats: Record<string, CoachStat>;
    /** SFv2 전체 유니크 재원생 수 (중복 제거) */
    uniqueActiveStudentCount: number;
}

async function scanAll<T>(
    build: (from: number, to: number) => PromiseLike<{ data: T[] | null }>,
    onPage: (rows: T[]) => void,
): Promise<void> {
    let offset = 0;
    while (true) {
        const { data } = await build(offset, offset + 999);
        if (!data?.length) break;
        onPage(data);
        if (data.length < 1000) break;
        offset += 1000;
    }
}

/**
 * SFv2 active matching 기반 코치별 학생 수 집계.
 * coaches.v2_user_id → scheduled_events.assigned_teacher_id → 참여 학생(participants)
 */
async function fetchSFv2StudentCounts(teacherIds: string[]): Promise<{
    studentCount: Map<string, number>;
    activeStudentCount: Map<string, number>;
    uniqueActiveStudentCount: number;
}> {
    if (teacherIds.length === 0) {
        return { studentCount: new Map(), activeStudentCount: new Map(), uniqueActiveStudentCount: 0 };
    }

    // Step 1: scheduled_events 전체 스캔 (coach_room, 해당 teacher들)
    // matching_id → teacher_id, matching_id → event_ids 동시 구축
    const matchingTeacher = new Map<string, string>();
    const matchingEvents = new Map<string, string[]>();

    await scanAll<{ id: string; matching_id: string | null; assigned_teacher_id: string | null }>(
        (f, t) => supabaseSFv2
            .from('scheduled_events')
            .select('id, matching_id, assigned_teacher_id')
            .eq('category', 'coach_room')
            .in('assigned_teacher_id', teacherIds)
            .not('matching_id', 'is', null)
            .range(f, t),
        (rows) => {
            for (const r of rows) {
                if (!r.assigned_teacher_id || !r.matching_id) continue;
                matchingTeacher.set(r.matching_id, r.assigned_teacher_id);
                const evts = matchingEvents.get(r.matching_id) ?? [];
                evts.push(r.id);
                matchingEvents.set(r.matching_id, evts);
            }
        },
    );

    // Step 2: matchings 전체 스캔 후 메모리 필터로 active만 추출
    const knownMatchingIds = new Set(matchingTeacher.keys());
    const activeMatchingIds = new Set<string>();
    await scanAll<{ id: string; status: string }>(
        (f, t) => supabaseSFv2.from('matchings').select('id, status').range(f, t),
        (rows) => {
            for (const m of rows) {
                if (m.status === 'active' && knownMatchingIds.has(m.id)) activeMatchingIds.add(m.id);
            }
        },
    );

    // Step 3: active matching의 event_ids 수집
    const activeEventIds: string[] = [];
    const eventTeacher = new Map<string, string>();
    for (const matchingId of activeMatchingIds) {
        const teacher = matchingTeacher.get(matchingId);
        if (!teacher) continue;
        for (const evtId of matchingEvents.get(matchingId) ?? []) {
            activeEventIds.push(evtId);
            eventTeacher.set(evtId, teacher);
        }
    }

    // Step 4: participants 전체 스캔 (in() 대신 range 페이지네이션)
    // → event_id IN (...) 은 수백 개 UUID로 URL 초과 문제 발생, 전체 스캔 후 메모리 필터
    const activeEventIdSet = new Set(activeEventIds);
    const teacherIdSet = new Set(teacherIds);
    const teacherStudents = new Map<string, Set<string>>();

    await scanAll<{ event_id: string; user_id: string }>(
        (f, t) => supabaseSFv2
            .from('scheduled_event_participants')
            .select('event_id, user_id')
            .range(f, t),
        (rows) => {
            for (const p of rows) {
                if (!activeEventIdSet.has(p.event_id)) continue;
                const teacher = eventTeacher.get(p.event_id);
                if (!teacher || p.user_id === teacher || teacherIdSet.has(p.user_id)) continue;
                const students = teacherStudents.get(teacher) ?? new Set();
                students.add(p.user_id);
                teacherStudents.set(teacher, students);
            }
        },
    );

    // Step 5: active payment 학생 집합 구축 (재원 카운트용)
    // payments 전체 스캔 — 코치 배정 여부와 무관하게 전체 재원생도 함께 집계
    const allStudentIds = new Set(
        [...teacherStudents.values()].flatMap(s => [...s])
    );
    const activePayStudents = new Set<string>(); // 코치 담당 학생 중 재원생
    const globalActiveStudents = new Set<string>(); // SRM 기준 전체 재원생
    await scanAll<{ student_id: string; management_status: string | null }>(
        (f, t) => supabaseSFv2
            .from('payments')
            .select('student_id, management_status')
            .range(f, t),
        (rows) => {
            for (const p of rows) {
                if (p.management_status !== 'active') continue;
                globalActiveStudents.add(p.student_id);
                if (allStudentIds.has(p.student_id)) activePayStudents.add(p.student_id);
            }
        },
    );

    const studentCount = new Map<string, number>();
    const activeStudentCount = new Map<string, number>();
    for (const [teacher, students] of teacherStudents) {
        studentCount.set(teacher, students.size);
        activeStudentCount.set(teacher, [...students].filter(s => activePayStudents.has(s)).length);
    }
    return { studentCount, activeStudentCount, uniqueActiveStudentCount: globalActiveStudents.size };
}

export async function GET(request: NextRequest) {
    if (!isAuthenticated(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // CRM: 코치 목록 (v2_user_id 포함) + 누적 contracted hours
        const [coachesResult, paymentsResult] = await Promise.all([
            supabaseAdmin.from('coaches').select('slug, name, v2_user_id'),
            supabaseAdmin
                .from('payments')
                .select('coach_name, hours')
                .not('hours', 'is', null)
                .gt('hours', 0),
        ]);

        const coaches = coachesResult.data ?? [];

        // coach name → slug 매핑 (누적 시간용)
        const nameToSlug = new Map<string, string>();
        for (const c of coaches) nameToSlug.set(c.name.toLowerCase().trim(), c.slug);

        // 누적 시간: coach_name → hours → slug 변환
        const totalHours = new Map<string, number>();
        for (const row of paymentsResult.data ?? []) {
            if (!row.coach_name || row.hours == null) continue;
            const slug = nameToSlug.get(row.coach_name.toLowerCase().trim());
            if (!slug) continue;
            totalHours.set(slug, (totalHours.get(slug) ?? 0) + Number(row.hours));
        }

        // v2_user_id → slug 매핑
        const v2IdToSlug = new Map<string, string>();
        for (const c of coaches) {
            if (c.v2_user_id) v2IdToSlug.set(c.v2_user_id, c.slug);
        }
        const teacherIds = [...v2IdToSlug.keys()];

        // SFv2 학생 카운트 (실패 시 non-fatal)
        let sfv2StudentCount = new Map<string, number>();
        let sfv2ActiveStudentCount = new Map<string, number>();
        let sfv2UniqueActiveStudentCount = 0;
        try {
            const result = await fetchSFv2StudentCounts(teacherIds);
            sfv2StudentCount = result.studentCount;
            sfv2ActiveStudentCount = result.activeStudentCount;
            sfv2UniqueActiveStudentCount = result.uniqueActiveStudentCount;
        } catch {
            // SFv2 연결 실패 → 0으로 유지
        }

        // 결과 조립 (모든 코치 slug 포함)
        const allSlugs = new Set(coaches.map(c => c.slug));
        const stats: Record<string, CoachStat> = {};
        for (const slug of allSlugs) {
            // v2_user_id가 있는 코치만 SFv2 카운트 사용
            const v2Id = coaches.find(c => c.slug === slug)?.v2_user_id ?? null;
            stats[slug] = {
                studentCount: v2Id ? (sfv2StudentCount.get(v2Id) ?? 0) : 0,
                totalHours: Math.round((totalHours.get(slug) ?? 0) * 10) / 10,
                activeStudentCount: v2Id ? (sfv2ActiveStudentCount.get(v2Id) ?? 0) : 0,
            };
        }

        return NextResponse.json({ stats, uniqueActiveStudentCount: sfv2UniqueActiveStudentCount } satisfies CoachStatsResponse);
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
