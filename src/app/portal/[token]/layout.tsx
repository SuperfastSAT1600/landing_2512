import type { Metadata } from 'next';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function generateMetadata(
  { params }: { params: Promise<{ token: string }> }
): Promise<Metadata> {
  const { token } = await params;

  const { data } = await supabaseAdmin
    .from('students')
    .select('name, portal_name, target_score')
    .eq('portal_token', token)
    .single();

  if (!data) {
    return {
      title: '상담 리포트 | SuperfastSAT',
      description: 'SuperfastSAT 학부모 전용 상담 포털',
      robots: { index: false, follow: false },
    };
  }

  const displayName = data.portal_name || data.name;
  const description = data.target_score
    ? `${displayName} 학생의 학습 포털 페이지 · 목표 점수 ${data.target_score}점`
    : `${displayName} 학생의 학습 포털 페이지`;

  return {
    title: `${displayName} 학생 | SuperfastSAT 상담 리포트`,
    description,
    openGraph: {
      title: `${displayName} 학생 | SuperfastSAT 상담 리포트`,
      description,
      siteName: 'SuperfastSAT',
      images: [{ url: '/og-image.png', alt: 'SuperfastSAT' }],
    },
    robots: { index: false, follow: false },
  };
}

export default function TokenLayout({ children }: { children: React.ReactNode }) {
  return children;
}
