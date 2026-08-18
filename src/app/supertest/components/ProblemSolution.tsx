import styles from './ProblemSolution.module.css';

const PROBLEMS = [
    {
        title: '실전 긴장감을 경험할 수 없다',
        desc: '혼자 푸는 모의고사는 시험장의 압박감을 재현하지 못한다. 점수가 실제와 다르게 나오는 이유다.',
    },
    {
        title: '점수 정체기가 온다',
        desc: '풀이 양은 늘어도 실력이 제자리인 이유는, 진짜 시험 조건에서 한 번도 훈련하지 않았기 때문이다.',
    },
    {
        title: '약점이 정확히 잡히지 않는다',
        desc: 'College Board 성적표는 스킬 단위가 너무 넓다. 틀린 이유를 알아야 다음에 맞힐 수 있다.',
    },
];

const SOLUTIONS = [
    {
        title: '실제보다 조금 더 어렵게',
        desc: '바람직한 어려움(Desirable Difficulties) 원리. 더 어렵게 훈련할수록 실제 시험이 더 쉬워진다.',
    },
    {
        title: '화상 카메라로 글로벌 동시 응시',
        desc: '전 세계 학생들과 화면을 켜고 같은 시간에 시험을 본다. 집에서도 시험장과 동일한 긴장감.',
    },
];

export default function ProblemSolution() {
    return (
        <section className={styles.section} aria-labelledby="problem-heading">
            <div className={styles.inner}>
                <p className={styles.sectionLabel}>왜 SuperTest인가</p>
                <h2 id="problem-heading" className={styles.title}>
                    혼자 푸는 모의고사로는<br />부족한 이유
                </h2>
                <div className={styles.grid}>
                    <div className={styles.column}>
                        <p className={`${styles.columnLabel} ${styles.problem}`}>현재의 문제</p>
                        {PROBLEMS.map((p) => (
                            <div key={p.title} className={styles.card}>
                                <p className={styles.cardTitle}>{p.title}</p>
                                <p className={styles.cardDesc}>{p.desc}</p>
                            </div>
                        ))}
                    </div>
                    <div className={styles.column}>
                        <p className={`${styles.columnLabel} ${styles.solution}`}>SuperTest의 해결책</p>
                        {SOLUTIONS.map((s) => (
                            <div key={s.title} className={`${styles.card} ${styles.solutionCard}`}>
                                <p className={styles.cardTitle}>{s.title}</p>
                                <p className={styles.cardDesc}>{s.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
