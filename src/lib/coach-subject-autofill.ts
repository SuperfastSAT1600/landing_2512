import { supabaseAdmin } from './supabase-admin';
import { deriveSubjectDetails } from './coach-subject-details';

/** 상세 과목이 비어 있는 코치를 활성화할 때 온보딩 폼에서 채울 값을 구한다. 이미 값이 있으면 null. */
export async function subjectDetailsForActivation(slug: string): Promise<string[] | null> {
    const { data: coach } = await supabaseAdmin
        .from('coaches')
        .select('subject_details')
        .eq('slug', slug)
        .maybeSingle();
    if (!coach || (coach.subject_details ?? []).length > 0) return null;

    const { data: invites } = await supabaseAdmin.from('coach_onboarding_invites').select('id').eq('coach_slug', slug);
    const inviteIds = (invites ?? []).map(i => i.id as string);
    const { data: submission } = inviteIds.length
        ? await supabaseAdmin
            .from('coach_onboarding_submissions')
            .select('subjects')
            .in('invite_id', inviteIds)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()
        : { data: null };

    const derived = deriveSubjectDetails({ onboardingSubjects: submission?.subjects ?? [] });
    return derived.length > 0 ? derived : null;
}
