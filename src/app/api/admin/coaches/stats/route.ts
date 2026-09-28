import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { supabaseSFv2 } from '@/lib/supabase-sfv2';
import { isAuthenticated } from '@/lib/server-auth';

export interface CoachStat {
    studentCount: number;
    totalHours: number;
    /** v2 payments.management_status='active' 인 재원 학생 수 */
    activeStudentCount: number;
}

export interface CoachStatsResponse {
    stats: Record<string, CoachStat>;
}

/**
 * GET /api/admin/coaches/stats
 * 코치별 현재 학생 수 + 누적 수업 시간(contracted hours) 집계.
 * - 학생 수: student_coach_assignments WHERE is_confirmed=true, grouped by coach_slug
 * - 누적 시간: payments WHERE hours IS NOT NULL, grouped by coach_name → matched to coach slug
 */
export async function GET(request: NextRequest) {
    if (!isAuthenticated(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const [assignmentsResult, paymentsResult, coachesResult] = await Promise.all([
            supabaseAdmin
                .from('student_coach_assignments')
                .select('coach_slug, student_id')
                .eq('is_confirmed', true),
            supabaseAdmin
                .from('payments')
                .select('coach_name, hours')
                .not('hours', 'is', null)
                .gt('hours', 0),
            supabaseAdmin
                .from('coaches')
                .select('slug, name'),
        ]);

        // coach name → slug 매핑 (대소문자 무시)
        const nameToSlug = new Map<string, string>();
        for (const c of coachesResult.data ?? []) {
            nameToSlug.set(c.name.toLowerCase().trim(), c.slug);
        }

        // 학생 수: coach_slug → count
        const studentCount = new Map<string, number>();
        for (const row of assignmentsResult.data ?? []) {
            studentCount.set(row.coach_slug, (studentCount.get(row.coach_slug) ?? 0) + 1);
        }

        // 누적 시간: coach_name → hours 합산 → slug로 매핑
        const totalHours = new Map<string, number>();
        for (const row of paymentsResult.data ?? []) {
            if (!row.coach_name || row.hours == null) continue;
            const slug = nameToSlug.get(row.coach_name.toLowerCase().trim());
            if (!slug) continue;
            totalHours.set(slug, (totalHours.get(slug) ?? 0) + Number(row.hours));
        }

        // 재원 학생 수 집계
        // - v2 연결된 학생: SFv2 payments.management_status='active'
        // - v2 미연결 학생: CRM students.lead_status='enrolled' + 현재 휴원 아님 (폴백)
        // SFv2 연결 실패 시 non-fatal — 기존 studentCount/totalHours는 영향 없음
        const activeStudentCount = new Map<string, number>();
        try {
            const assignmentRows = assignmentsResult.data ?? [];
            const studentIds = [...new Set(assignmentRows.map(r => r.student_id).filter(Boolean))];

            if (studentIds.length > 0) {
                const today = new Date().toISOString().slice(0, 10);

                // 현재 휴원 중인 student_id 집합
                const { data: pauseRows } = await supabaseAdmin
                    .from('student_pauses')
                    .select('student_id')
                    .not('student_id', 'is', null)
                    .is('ended_at', null)
                    .lte('pause_start', today)
                    .or(`pause_until.is.null,pause_until.gte.${today}`);
                const pausedStudentIds = new Set(
                    (pauseRows ?? []).map(p => p.student_id).filter(Boolean)
                );

                // student_id → { sfv2_profile_id, lead_status }
                const { data: crmStudents } = await supabaseAdmin
                    .from('students')
                    .select('id, sfv2_profile_id, lead_status')
                    .in('id', studentIds);

                // v2 연결된 학생: profile_id → student_id 매핑
                const profileToStudentId = new Map<string, string>();
                // v2 미연결 학생: CRM lead_status='enrolled' + 미휴원이면 바로 카운트
                const studentToCoach = new Map<string, string>();
                for (const row of assignmentRows) {
                    if (row.student_id) studentToCoach.set(row.student_id, row.coach_slug);
                }

                for (const s of crmStudents ?? []) {
                    if (s.sfv2_profile_id) {
                        profileToStudentId.set(s.sfv2_profile_id, s.id);
                    } else {
                        // 폴백: v2 미연결 → CRM 기준 재원 판별
                        if (s.lead_status === 'enrolled' && !pausedStudentIds.has(s.id)) {
                            const slug = studentToCoach.get(s.id);
                            if (slug) activeStudentCount.set(slug, (activeStudentCount.get(slug) ?? 0) + 1);
                        }
                    }
                }

                // v2 연결된 학생: SFv2 management_status='active' 기준
                const profileIds = [...profileToStudentId.keys()];
                if (profileIds.length > 0) {
                    const { data: v2Payments } = await supabaseSFv2
                        .from('payments')
                        .select('student_id')
                        .in('student_id', profileIds)
                        .eq('management_status', 'active');

                    const activeProfileIds = new Set((v2Payments ?? []).map(p => p.student_id));

                    for (const profileId of activeProfileIds) {
                        const studentId = profileToStudentId.get(profileId);
                        if (!studentId) continue;
                        if (pausedStudentIds.has(studentId)) continue;
                        const slug = studentToCoach.get(studentId);
                        if (!slug) continue;
                        activeStudentCount.set(slug, (activeStudentCount.get(slug) ?? 0) + 1);
                    }
                }
            }
        } catch {
            // 재원 집계 실패는 non-fatal — activeStudentCount는 0으로 유지
        }

        // 모든 코치 slug를 union해서 결과 조립
        const allSlugs = new Set([
            ...studentCount.keys(),
            ...totalHours.keys(),
            ...(coachesResult.data ?? []).map(c => c.slug),
        ]);

        const stats: Record<string, CoachStat> = {};
        for (const slug of allSlugs) {
            stats[slug] = {
                studentCount: studentCount.get(slug) ?? 0,
                totalHours: Math.round((totalHours.get(slug) ?? 0) * 10) / 10,
                activeStudentCount: activeStudentCount.get(slug) ?? 0,
            };
        }

        return NextResponse.json({ stats } satisfies CoachStatsResponse);
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
