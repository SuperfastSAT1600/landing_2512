import styles from './Features.module.css';
import { TEST_SCHEDULE, TIMEZONE_TIMES } from '../data/plans';

const FEATURES = [
    {
        title: '2주마다 열리는 정기 실전 일정',
        desc: '5월 30일부터 격주로 이어집니다. 꾸준한 실전 훈련이 점수를 만듭니다.',
        extra: 'schedule',
    },
    {
        title: '화상 카메라로 함께 보는 실전',
        desc: '다른 학생들과 화면을 켜고 동시에 응시. 집에서도 시험장과 같은 긴장감.',
        extra: 'timezone',
    },
    {
        title: 'Micro-skill 단위 약점 분석',
        desc: 'College Board보다 세밀하게. 어떤 스킬에서 틀렸는지 정확히 짚어냅니다.',
        extra: null,
    },
    {
        title: '시험 후 모르는 단어 바로 정리',
        desc: '시험이 끝나면 그날 몰랐던 단어만 골라 학습합니다. Live, Flex 한정.',
        extra: null,
    },
    {
        title: '코치의 1시간 집중 해설',
        desc: '안내된 시간에 접속하면 핵심만 짚어주는 리뷰 강의를 들을 수 있습니다.',
        extra: null,
    },
];

export default function Features() {
    return (
        <section aria-labelledby="features-heading">
            <p className={styles.sectionLabel}>SuperTest만의 차별점</p>
            <h2 id="features-heading" className={styles.title}>
                다른 모의고사와<br />무엇이 다른가
            </h2>

            <div className={styles.list}>
                {FEATURES.map((f, i) => (
                    <div key={i} className={styles.item}>
                        <p className={styles.number}>{String(i + 1).padStart(2, '0')}</p>
                        <div className={styles.content}>
                            <h3 className={styles.itemTitle}>{f.title}</h3>
                            <p className={styles.itemDesc}>{f.desc}</p>

                            {f.extra === 'schedule' && (
                                <div className={styles.scheduleWrap}>
                                    <div className={styles.scheduleList}>
                                        {TEST_SCHEDULE.map((item) => (
                                            <div key={item.date} className={styles.scheduleChip}>
                                                <strong>{item.label.split(' — ')[0]}</strong>
                                                {item.label.split(' — ')[1]}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {f.extra === 'timezone' && (
                                <div className={styles.timezoneRow}>
                                    {TIMEZONE_TIMES.map((tz) => (
                                        <div key={tz.region} className={styles.tzChip}>
                                            <span>{tz.region}</span>
                                            <strong>{tz.time}</strong>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
