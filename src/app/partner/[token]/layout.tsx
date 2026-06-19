import type { Metadata } from 'next';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function generateMetadata(
  { params }: { params: Promise<{ token: string }> }
): Promise<Metadata> {
  const { token } = await params;

  const { data } = await supabaseAdmin
    .from('partner_portals')
    .select('name')
    .eq('token', token)
    .single();

  const partnerName = data?.name ?? '파트너 센터';
  const title = `${partnerName} | 파트너 센터`;

  return {
    title,
    openGraph: {
      title,
      siteName: 'SuperfastSAT 파트너 센터',
      images: [{ url: '/og-image.png', alt: 'SuperfastSAT' }],
    },
    robots: { index: false, follow: false },
  };
}

export default function PartnerTokenLayout({ children }: { children: React.ReactNode }) {
  return children;
}
