import styles from './Hero.module.css';
import HeroLiveInfo from './HeroLiveInfo';

export default function Hero() {
    return (
        <section className={styles.hero} aria-labelledby="hero-heading">
            <div className={styles.glow} aria-hidden="true" />
            <div className={styles.inner}>
                <h1 id="hero-heading" className={styles.headline}>
                    실전의 긴장감
                    <br />
                    그 이상의 난이도
                    <br />
                    <span className={styles.highlight}>SuperTest</span>
                </h1>

                <p className={styles.sub}>
                    혼자 푸는 쉬운 모의고사는 그만.
                    <br />
                    다른 학생들과 함께 실전처럼 시험 보고
                    <br />
                    정밀 분석 리포트로 약점도 확인하세요.
                </p>

                <HeroLiveInfo />
            </div>
        </section>
    );
}
