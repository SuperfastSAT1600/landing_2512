import Link from 'next/link';
import { ExternalLink, Inbox } from 'lucide-react';

export const metadata = {
    title: 'enrollment2026 | Admin',
};

export default function AdminEnrollment2026Page() {
    return (
        <div className="p-8 max-w-5xl">
            <header className="mb-8">
                <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                    <span className="opacity-80">🎫</span> enrollment2026
                </h1>
                <p className="text-gray-500">
                    신규 수업권 신청 페이지를 미리보고 관리합니다.
                </p>
            </header>

            {/* 공개 신청 페이지 */}
            <section className="mb-8">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold text-gray-300">수업권 신청 페이지 v2 (공개)</h2>
                    <Link
                        href="/enrollment2026"
                        target="_blank"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors"
                    >
                        새 탭에서 열기 <ExternalLink size={13} />
                    </Link>
                </div>
                <div className="rounded-lg border border-white/5 overflow-hidden bg-[#0d1225]">
                    <iframe
                        src="/enrollment2026"
                        title="수업권 신청 페이지 v2 미리보기"
                        className="w-full h-[560px] border-0"
                    />
                </div>
            </section>

            {/* 신청 목록 */}
            <section>
                <h2 className="text-sm font-semibold text-gray-300 mb-3">수업권 신청 목록</h2>
                <div className="rounded-lg border border-white/5 bg-[#1e2023] p-10 text-center">
                    <Inbox size={28} className="mx-auto text-gray-600 mb-3" />
                    <p className="text-gray-400 font-medium">아직 연결되지 않았습니다</p>
                    <p className="text-gray-600 text-sm mt-1">
                        신청 제출 → Supabase 저장 구축 후, 이곳에 신청 내역이 표시됩니다.
                    </p>
                </div>
            </section>
        </div>
    );
}
