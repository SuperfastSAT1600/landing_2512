import styles from './FinalCTA.module.css';
import { LAUNCH_DATE } from '../data/plans';

function formatLaunchDate(dateStr: string): { before: string; highlight: string; after: string } {
    // LAUNCH_DATE = '2026-05-30'
    const [year, month, day] = dateStr.split('-');
    const m = parseInt(month, 10);
    const d = parseInt(day, 10);
    return {
        before: `다음 시험 ${year}년 `,
        highlight: `${m}월 ${d}일`,
        after: '',
    };
}

export default function FinalCTA() {
    const { before, highlight } = formatLaunchDate(LAUNCH_DATE);

    return (
        <section className={styles.section} aria-labelledby="finalcta-heading">
            <div className={styles.glow} aria-hidden="true" />
            <div className={styles.inner}>
                <h2 id="finalcta-heading" className={styles.title}>
                    다음 시험도 이렇게 치르실 건가요?
                </h2>
                <p className={styles.sub}>
                    5월 30일까지 첫 할인 30% 적용됩니다.
                </p>
                <a href="#pricing" className={styles.cta}>
                    시험 신청하기
                </a>
                <p className={styles.dateNote}>
                    {before}
                    <span className={styles.dateHighlight}>{highlight}</span>
                </p>
            </div>
        </section>
    );
}
