import Link from 'next/link';
import Image from 'next/image';
import styles from './LatestPosts.module.css';
import { ScrollReveal } from './ScrollReveal';
import { getSortedPostsData } from '../../lib/posts';

export default function LatestPosts() {
    const allPosts = getSortedPostsData();
    const latestPosts = allPosts.slice(0, 3); // Top 3

    return (
        <section className={styles.section}>
            <div className={styles.container}>
                <ScrollReveal>
                    <div className={styles.header}>
                        <h2 className={styles.title}>SAT학습 자료 및 입시 소식</h2>
                        <Link href="/blog" className={styles.viewAll}>전체 보기</Link>
                    </div>
                </ScrollReveal>

                <div className={styles.grid}>
                    {latestPosts.map((post) => (
                        <ScrollReveal key={post.id}>
                            <Link href={`/blog/${post.id}`} className={styles.card}>
                                {/* Top Half: Image */}
                                <div className={styles.cardImageContainer}>
                                    {post.featuredImage ? (
                                        <img
                                            src={post.featuredImage}
                                            alt={post.title}
                                            className={styles.cardInfoImage}
                                        />
                                    ) : (
                                        /* Abstract Fallback for no image */
                                        <div className={styles.cardVisualFallback}>
                                            <div className={`${styles.circle} ${styles.circle1}`} />
                                            <div className={`${styles.circle} ${styles.circle2}`} />
                                        </div>
                                    )}
                                </div>

                                {/* Bottom Half: Content */}
                                <div className={styles.cardContent}>
                                    <div className={styles.metaRow}>
                                        <span className={styles.category}>{post.category || 'SAT Tips'}</span>
                                        <span className={styles.separator}>|</span>
                                        <span className={styles.source}>{post.author || 'SuperfastSAT'}</span>
                                    </div>
                                    <h3 className={styles.cardTitle}>{post.title}</h3>
                                    <p className={styles.date}>{post.date}</p>
                                </div>
                            </Link>
                        </ScrollReveal>
                    ))}
                </div>
            </div>
        </section>
    );
}
