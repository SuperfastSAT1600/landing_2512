import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { getActiveCoaches, getCoachesBySubject } from '@/lib/coaches-data';
import Footer from '../components/Footer';

export const revalidate = 86400;

export const metadata: Metadata = {
    title: '학습코치 | SuperfastSAT',
    description: 'SuperfastSAT 전문 SAT·AP 학습코치를 만나보세요.',
};

interface Props {
    searchParams: Promise<{ subject?: string }>;
}

export default async function CoachesPage({ searchParams }: Props) {
    const { subject } = await searchParams;

    const coaches = subject
        ? await getCoachesBySubject(subject)
        : await getActiveCoaches();

    const SUBJECTS = ['SAT', 'AP'] as const;

    return (
        <div className="flex flex-col min-h-screen bg-[#151719] text-gray-100">
            <div className="flex-1">
                <header className="pt-28 pb-10 sm:pt-32 sm:pb-16 px-6 max-w-7xl mx-auto text-center">
                    <h1 className="text-3xl sm:text-5xl font-bold tracking-tight mb-4 bg-gradient-to-r from-[#6085FF] via-[#071be9] to-[#6085FF] bg-[length:200%_auto] bg-clip-text text-transparent">
                        학습코치
                    </h1>
                    <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                        SuperfastSAT 전문 코치진을 만나보세요.
                    </p>
                </header>

                <div className="max-w-7xl mx-auto px-6 mb-10">
                    <div className="flex items-center gap-3 flex-wrap">
                        <Link
                            href="/coaches"
                            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                                !subject
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                            }`}
                        >
                            전체
                        </Link>
                        {SUBJECTS.map((s) => (
                            <Link
                                key={s}
                                href={`/coaches?subject=${s}`}
                                className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                                    subject === s
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                                }`}
                            >
                                {s} 코치
                            </Link>
                        ))}
                    </div>
                </div>

                <div className="max-w-7xl mx-auto px-6 pb-24">
                    {coaches.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                            {coaches.map((coach) => (
                                <Link
                                    key={coach.slug}
                                    href={`/coaches/${coach.slug}`}
                                    className="group bg-[#1e2023] rounded-2xl overflow-hidden border border-white/5 hover:border-blue-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-900/10 flex flex-col"
                                >
                                    <div className="relative aspect-[16/9] overflow-hidden bg-gray-800">
                                        {coach.photo ? (
                                            <Image
                                                src={coach.photo}
                                                alt={coach.name}
                                                fill
                                                unoptimized
                                                className="object-cover group-hover:scale-105 transition-transform duration-500"
                                                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-600 text-6xl font-bold">
                                                {coach.name[0]}
                                            </div>
                                        )}
                                        {coach.subjects.length > 0 && (
                                            <div className="absolute top-3 left-3 flex gap-1.5">
                                                {coach.subjects.map((s) => (
                                                    <span
                                                        key={s}
                                                        className="px-2 py-0.5 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold rounded-full border border-white/10 uppercase tracking-wide"
                                                    >
                                                        {s}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                        {coach.isHeadCoach && (
                                            <div className="absolute top-3 right-3">
                                                <span className="px-2 py-0.5 bg-black/70 backdrop-blur-md text-yellow-400 text-[10px] font-bold rounded-full border border-yellow-400/40 tracking-wide">
                                                    ★ 대표코치
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="p-5 flex-1 flex flex-col">
                                        <h2 className="text-lg font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">
                                            {coach.name} 코치
                                        </h2>
                                        {coach.bio && (
                                            <div
                                                className="text-sm text-gray-400 leading-relaxed line-clamp-3 flex-1"
                                                dangerouslySetInnerHTML={{ __html: coach.bio }}
                                            />
                                        )}
                                        <div className="mt-4 text-blue-400 text-sm font-bold group-hover:translate-x-1 transition-transform">
                                            프로필 보기 →
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20 text-gray-500">
                            <p className="text-xl">해당 과목의 코치가 없습니다.</p>
                            <Link href="/coaches" className="text-blue-400 hover:underline mt-4 inline-block">
                                전체 코치 보기
                            </Link>
                        </div>
                    )}
                </div>
            </div>
            <Footer />
        </div>
    );
}
