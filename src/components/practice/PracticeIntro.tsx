import type { PracticeCatalogEntry } from '@/lib/practice-catalog';

// 서버 컴포넌트다. 클라이언트 페이지에 prop 으로 주입되지만 HTML 은 서버에서 만들어지므로
// Googlebot 이 받는 초기 응답에 이 본문이 들어간다. 게이트 단계에서만 보이고 시험이 시작되면
// 사라지는데, 초기 phase 가 'gate' 라서 색인에는 문제가 없다.

export function PracticeIntro({ entry, slug }: { entry: PracticeCatalogEntry; slug: string }) {
    return (
        <section
            aria-label="문제 세트 소개"
            style={{ background: '#fff', borderTop: '1px solid #e5e7eb', padding: '56px 20px 72px' }}
        >
            <div style={{ maxWidth: 680, margin: '0 auto' }}>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', marginBottom: 20 }}>
                    {entry.heading}
                </h2>

                {entry.body.map((paragraph, i) => (
                    <p
                        key={i}
                        style={{ fontSize: 15, lineHeight: 1.75, color: '#475569', marginBottom: 16 }}
                    >
                        {paragraph}
                    </p>
                ))}

                <dl style={{ margin: '32px 0 0', display: 'grid', gap: 14 }}>
                    {entry.questionCount > 0 && (
                        <div style={{ display: 'flex', gap: 12, fontSize: 14 }}>
                            <dt style={{ color: '#94a3b8', minWidth: 72, flexShrink: 0 }}>문항 수</dt>
                            <dd style={{ margin: 0, color: '#334155' }}>{entry.questionCount}문항</dd>
                        </div>
                    )}
                    <div style={{ display: 'flex', gap: 12, fontSize: 14 }}>
                        <dt style={{ color: '#94a3b8', minWidth: 72, flexShrink: 0 }}>다루는 내용</dt>
                        <dd style={{ margin: 0, color: '#334155' }}>{entry.topics.join(' · ')}</dd>
                    </div>
                    <div style={{ display: 'flex', gap: 12, fontSize: 14 }}>
                        <dt style={{ color: '#94a3b8', minWidth: 72, flexShrink: 0 }}>추천 대상</dt>
                        <dd style={{ margin: 0, color: '#334155' }}>{entry.audience}</dd>
                    </div>
                    <div style={{ display: 'flex', gap: 12, fontSize: 14 }}>
                        <dt style={{ color: '#94a3b8', minWidth: 72, flexShrink: 0 }}>참여 방법</dt>
                        <dd style={{ margin: 0, color: '#334155' }}>
                            SuperfastSAT 인스타그램에서 액세스 코드를 받은 뒤 위 화면에 입력하면 바로 시작됩니다.
                        </dd>
                    </div>
                </dl>

                <p style={{ fontSize: 14, lineHeight: 1.7, color: '#64748b', marginTop: 32 }}>
                    SAT 학습 자료와 회차별 시험 분석은{' '}
                    <a href="/blog" style={{ color: '#2563eb', textDecoration: 'underline' }}>
                        SuperfastSAT 블로그
                    </a>
                    에서, 수업을 맡는 코치진은{' '}
                    <a href="/coaches" style={{ color: '#2563eb', textDecoration: 'underline' }}>
                        코치 소개
                    </a>
                    에서 확인할 수 있습니다.
                </p>

                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify({
                            '@context': 'https://schema.org',
                            '@type': 'LearningResource',
                            name: entry.title.split('|')[0].trim(),
                            description: entry.description,
                            url: `https://tutoring.superfastsat.com/practice/${slug}`,
                            inLanguage: 'ko-KR',
                            educationalLevel: 'HighSchool',
                            learningResourceType: 'Practice problem set',
                            teaches: entry.topics,
                            provider: {
                                '@type': 'Organization',
                                name: 'SuperfastSAT',
                                url: 'https://tutoring.superfastsat.com',
                            },
                        }),
                    }}
                />
            </div>
        </section>
    );
}
