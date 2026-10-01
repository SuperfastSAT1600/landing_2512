import Link from 'next/link';
import Footer from '../../components/Footer';
import { ArrowLeft } from 'lucide-react';
import { ClientPage } from './ClientPage';

export const metadata = {
  title: 'SuperfastSAT 코치 6인이 고른 10월 SAT 예상 36문항',
  description:
    'Brandon, Ben, 박시원, Laura, Julie, Dana Jung — 6명의 코치가 선정한 10월 SAT 예상 36문항. 새로 등장한 유형, 정답률 35% 이하 고난도, 함정 포인트를 담은 풀이.',
};

export default function Page() {
  return (
    <div className="bg-[#fafaf9] min-h-screen">
      <nav className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-md border-b border-gray-200 h-16 flex items-center">
        <div className="max-w-[780px] mx-auto w-full px-6 flex justify-between items-center">
          <Link
            href="/blog"
            className="text-gray-500 hover:text-gray-900 flex items-center gap-2 text-sm font-medium transition-colors"
          >
            <ArrowLeft size={16} /> Back to Blog
          </Link>
          <Link href="/" className="font-bold text-gray-900">
            SuperfastSAT
          </Link>
        </div>
      </nav>
      <main className="pt-24 pb-32">
        <ClientPage />
      </main>
      <Footer />
    </div>
  );
}
