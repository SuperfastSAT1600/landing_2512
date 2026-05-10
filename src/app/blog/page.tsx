import { Metadata } from 'next';
import { getSortedPostsData, getPostsByCategory, getPostsByTag } from '../../lib/posts';
import Footer from '../components/Footer';
import BlogList from './BlogList';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://tutoring.superfastsat.com';

const categoryMeta: Record<string, { title: string; description: string }> = {
    'SAT RW': {
        title: 'SAT 리딩 & 라이팅 전략 | SuperfastSAT Blog',
        description: 'Digital SAT 고득점을 위한 핵심 문법, 독해 전략 및 필수 어휘를 정리했습니다.',
    },
    'SAT Math': {
        title: 'SAT 수학 완전 정복 | SuperfastSAT Blog',
        description: '기초 개념부터 심화 문제풀이, 만점을 위한 실전 팁까지 모두 담았습니다.',
    },
    '입시뉴스': {
        title: '미국 대학 입시 뉴스 | SuperfastSAT Blog',
        description: '최신 입시 트렌드, 대학별 전형 분석 및 합격 데이터를 신속하게 전달합니다.',
    },
    '학습코치': {
        title: '학습코치 칼럼 | SuperfastSAT Blog',
        description: 'SuperfastSAT 코치진이 직접 작성한 학습 노하우와 전략을 확인하세요.',
    },
};

export async function generateMetadata({
    searchParams,
}: {
    searchParams: Promise<{ category?: string; tag?: string }>;
}): Promise<Metadata> {
    const { category, tag } = await searchParams;
    const meta = category && categoryMeta[category]
        ? categoryMeta[category]
        : tag
        ? {
            title: `#${tag} | SuperfastSAT Blog`,
            description: `${tag} 태그가 달린 SAT 학습 자료를 확인하세요.`,
        }
        : {
            title: '입시 자료 & 학습 칼럼 | SuperfastSAT Blog',
            description: 'SAT 고득점 비법, 최신 유학 정보, Digital SAT 문법·독해 전략을 SuperfastSAT 블로그에서 확인하세요.',
        };
    const canonicalUrl = category
        ? `${BASE_URL}/blog?category=${encodeURIComponent(category)}`
        : tag
        ? `${BASE_URL}/blog?tag=${encodeURIComponent(tag)}`
        : `${BASE_URL}/blog`;

    return {
        title: meta.title,
        description: meta.description,
        alternates: { canonical: canonicalUrl },
        openGraph: {
            type: 'website',
            url: canonicalUrl,
            title: meta.title,
            description: meta.description,
            siteName: 'SuperfastSAT',
        },
        twitter: {
            card: 'summary_large_image',
            title: meta.title,
            description: meta.description,
        },
    };
}

export const revalidate = 60;

export default async function Blog({
    searchParams,
}: {
    searchParams: Promise<{ category?: string; tag?: string }>;
}) {
    const { category, tag } = await searchParams;
    const filteredPosts = category
        ? await getPostsByCategory(category)
        : tag
        ? await getPostsByTag(tag)
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
        },
        '학습코치': {
            title: '학습코치 칼럼',
            desc: 'SuperfastSAT 코치진이 직접 작성한 학습 노하우와 전략을 확인하세요.'
        }
    };

    const currentHeader = category && headerContent[category]
        ? headerContent[category]
        : tag
        ? { title: `#${tag}`, desc: `${tag} 태그가 달린 글 모음입니다.` }
        : {
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
                <BlogList posts={filteredPosts} currentCategory={category ?? ''} />
            </div>
            <Footer />
        </div>
    );
}
