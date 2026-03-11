import { Metadata } from 'next';
import { getSortedPostsData, getPostsByCategory } from '../../lib/posts';
import Footer from '../components/Footer';
import BlogList from './BlogList';

const BASE_URL = 'https://www.satmasterclass.com';

export const metadata: Metadata = {
    title: '입시 자료 & 학습 칼럼 | SuperfastSAT Blog',
    description: 'SAT 고득점 비법, 최신 유학 정보, Digital SAT 문법·독해 전략을 SuperfastSAT 블로그에서 확인하세요.',
    alternates: { canonical: `${BASE_URL}/blog` },
    openGraph: {
        type: 'website',
        url: `${BASE_URL}/blog`,
        title: '입시 자료 & 학습 칼럼 | SuperfastSAT Blog',
        description: 'SAT 고득점 비법, 최신 유학 정보, Digital SAT 문법·독해 전략을 SuperfastSAT 블로그에서 확인하세요.',
        siteName: 'SuperfastSAT',
    },
    twitter: {
        card: 'summary_large_image',
        title: '입시 자료 & 학습 칼럼 | SuperfastSAT Blog',
        description: 'SAT 고득점 비법, 최신 유학 정보, Digital SAT 문법·독해 전략을 SuperfastSAT 블로그에서 확인하세요.',
    },
};

export const revalidate = 60;

export default async function Blog({
    searchParams,
}: {
    searchParams: Promise<{ category?: string }>;
}) {
    const { category } = await searchParams;
    const filteredPosts = category
        ? await getPostsByCategory(category)
        : await getSortedPostsData();

    // Header Content Logic
    const headerContent: Record<string, { title: string; desc: string }> = {
        'SAT RW': {
            title: 'SAT 리딩 & 라이팅',
            desc: 'Digital SAT 고득점을 위한 핵심 문법, 독해 전략 및 필수 어휘를 정리했습니다.'
        },
        'SAT Math': {
            title: 'SAT 수학 완전 정복',
            desc: '기초 개념부터 심화 문제풀이, 만점을 위한 실전 팁까지 모두 담았습니다.'
        },
        '입시뉴스': {
            title: '미국 대학 입시 뉴스',
            desc: '최신 입시 트렌드, 대학별 전형 분석 및 합격 데이터를 신속하게 전달합니다.'
        }
    };

    const currentHeader = category && headerContent[category] ? headerContent[category] : {
        title: '입시 자료 & 학습 칼럼',
        desc: 'SuperfastSAT이 제공하는 SAT 고득점 비법과 최신 유학 정보를 확인하세요.'
    };

    return (
        <div className="flex flex-col min-h-screen bg-[#151719] text-gray-100 font-sans">
            <div className="flex-1">
                {/* Header */}
                <header className="pt-28 pb-10 sm:pt-32 sm:pb-16 px-6 max-w-7xl mx-auto text-center">
                    <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-4 bg-gradient-to-r from-[#6085FF] via-[#071be9] to-[#6085FF] bg-[length:200%_auto] bg-clip-text text-transparent">
                        {currentHeader.title}
                    </h1>
                    <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                        {currentHeader.desc}
                    </p>
                </header>

                {/* Post List with View Toggle */}
                <BlogList posts={filteredPosts} />
            </div>
            <Footer />
        </div>
    );
}
