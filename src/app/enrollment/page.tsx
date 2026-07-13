import { Suspense } from 'react';
import { EnrollmentPage } from '@/components/enrollment/EnrollmentPage';
import { getCoachesBySlugs } from '@/lib/coaches-data';
import { LEAD_COACH_SLUGS, type LeadCoachProfile } from '@/lib/enrollment/data/lead-coaches';

export const revalidate = 86400;

/** bio(HTML)를 카드용 짧은 평문으로 변환 */
function bioSnippet(html: string): string {
  const text = html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[^;]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > 120 ? `${text.slice(0, 120).trim()}…` : text;
}

async function getLeadCoaches(): Promise<LeadCoachProfile[]> {
  const coaches = await getCoachesBySlugs(LEAD_COACH_SLUGS);
  return coaches.map((c) => ({
    slug: c.slug,
    name: c.name,
    photo: c.photo,
    subjects: c.subjects,
    bio: bioSnippet(c.bio ?? ''),
  }));
}

export default async function Page() {
  const leadCoaches = await getLeadCoaches();
  return (
    <Suspense>
      <EnrollmentPage leadCoaches={leadCoaches} />
    </Suspense>
  );
}
