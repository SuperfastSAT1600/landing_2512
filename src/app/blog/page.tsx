import Link from 'next/link';
import { getSortedPostsData } from '../../lib/posts';
import SidebarLayout from '../components/SidebarLayout';
import { Clock, Tag } from 'lucide-react';

export default async function Blog({
    searchParams,
}: {
    searchParams: Promise<{ category?: string }>;
}) {
    const { category } = await searchParams;
    const allPostsData = getSortedPostsData();

    // Filter logic
    const filteredPosts = category
        ? allPostsData.filter((post) => post.category.toLowerCase().includes(category.toLowerCase()))
        : allPostsData;

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
        <SidebarLayout>
            <div className="bg-[#151719] min-h-screen text-gray-100 font-sans">
                {/* Header */}
                <header className="pt-24 pb-16 px-6 max-w-7xl mx-auto text-center">
                    <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                        {currentHeader.title}
                    </h1>
                    <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                        {currentHeader.desc}
                    </p>
                </header>

                {/* Grid */}
                <div className="max-w-7xl mx-auto px-6 pb-24">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredPosts.length > 0 ? (
                            filteredPosts.map((post) => (
                                <Link
                                    href={`/blog/${post.id}`}
                                    key={post.id}
                                    className="group bg-[#1e2023] rounded-2xl overflow-hidden border border-white/5 hover:border-blue-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-900/10 flex flex-col"
                                >
                                    {/* Featured Image */}
                                    <div className="relative aspect-[16/9] overflow-hidden bg-gray-800">
                                        {post.featuredImage ? (
                                            <img
                                                src={post.featuredImage}
                                                alt={post.title}
                                                className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-600">
                                                <span className="text-4xl font-serif italic opacity-20">Aa</span>
                                            </div>
                                        )}
                                        {/* Category Badge */}
                                        <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider border border-white/10">
                                            {post.category}
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="p-6 flex-1 flex flex-col">
                                        <div className="flex items-center gap-2 text-xs text-gray-500 mb-3 font-medium">
                                            <Tag size={12} />
                                            <span>{post.tags?.[0] || 'Article'}</span>
                                            <span className="mx-1">•</span>
                                            <Clock size={12} />
                                            <span>{post.date}</span>
                                        </div>

                                        <h2 className="text-xl font-bold text-gray-100 mb-3 group-hover:text-blue-400 transition-colors leading-tight">
                                            {post.title}
                                        </h2>

                                        <p className="text-gray-400 text-sm leading-relaxed line-clamp-3 mb-6 flex-1">
                                            {post.excerpt || post.description || "자세한 내용을 확인해보세요..."}
                                        </p>

                                        <div className="flex items-center text-blue-400 text-sm font-bold group-hover:translate-x-1 transition-transform">
                                            글 읽기 <span className="ml-1">→</span>
                                        </div>
                                    </div>
                                </Link>
                            ))
                        ) : (
                            <div className="col-span-full text-center py-20 text-gray-500">
                                <p className="text-xl">이 카테고리에 아직 글이 없습니다.</p>
                                <Link href="/blog" className="text-blue-400 hover:underline mt-4 inline-block">전체 글 보기</Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </SidebarLayout>
    );
}
