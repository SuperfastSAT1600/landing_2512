import styles from './LatestPosts.module.css';
import { ScrollReveal } from './ScrollReveal';
import { getSortedPostsData } from '../../lib/posts';
import BlogList from '../blog/BlogList';

export default async function LatestPosts() {
    const allPosts = await getSortedPostsData();

    return (
        <section className={styles.section}>
            <div className={styles.container}>
                <ScrollReveal>
                    <div className={styles.header}>
                        <h2 className={styles.title}>SAT학습 자료 및 입시 소식</h2>
                    </div>
                </ScrollReveal>

                <BlogList posts={allPosts} />
            </div>
        </section>
    );
}
