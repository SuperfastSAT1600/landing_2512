import Link from 'next/link';
import { Clock } from 'lucide-react';
import styles from './LatestPosts.module.css';
import { ScrollReveal } from './ScrollReveal';
import { getSortedPostsData } from '../../lib/posts';

export default async function LatestPosts() {
    const latestPosts = await getSortedPostsData();

    return (
        <section className={styles.section}>
            <div className={styles.container}>
                <ScrollReveal>
                    <div className={styles.header}>
                        <h2 className={styles.title}>SAT학습 자료 및 입시 소식</h2>
                    </div>
                </ScrollReveal>

                <div className={styles.list}>
                    {latestPosts.map((post) => (
                        <Link key={post.id} href={`/blog/${post.id}`} className={styles.item}>
                            {/* Thumbnail */}
                            <div className={styles.thumbnail}>
                                {post.featuredImage ? (
                                    /* eslint-disable-next-line @next/next/no-img-element */
                                    <img
                                        src={post.featuredImage}
                                        alt={post.title}
                                        className={styles.thumbnailImage}
                                    />
                                ) : (
                                    <div className={styles.thumbnailFallback}>
                                        <span>Aa</span>
                                    </div>
                                )}
                            </div>

                            {/* Content */}
                            <div className={styles.content}>
                                <div className={styles.meta}>
                                    <span className={styles.categoryBadge}>{post.category || 'SAT Tips'}</span>
                                </div>
                                <h3 className={styles.postTitle}>{post.title}</h3>
                                <p className={styles.excerpt}>
                                    {post.excerpt || post.description || '자세한 내용을 확인해보세요...'}
                                </p>
                                <div className={styles.footer}>
                                    <span className={styles.date}>
                                        <Clock size={12} />
                                        {post.date}
                                    </span>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}
