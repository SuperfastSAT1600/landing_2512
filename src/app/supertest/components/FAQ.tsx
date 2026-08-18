import styles from './FAQ.module.css';

const FAQS = [
    {
        q: '사전에 취소하면 환불이 되나요?',
        a: '네, 정해진 기한 내에 사전 취소를 요청하시면 전액 환불됩니다. 취소 기한은 결제 후 안내 이메일에서 확인하실 수 있습니다.',
    },
    {
        q: '화상 카메라는 어떻게 세팅하나요?',
        a: 'SuperTest를 볼 페이지에서 자동으로 화상 카메라 세팅이 이루어집니다.',
    },
    {
        q: '태블릿이나 핸드폰으로도 시험을 볼 수 있나요?',
        a: '노트북으로 접속해서 시험을 보시는 것을 권장합니다.',
    },
    {
        q: '국가별로 시험 시작 시간이 다른가요?',
        a: '시험 날짜는 각 국가 현지 날짜 기준으로 동일합니다. 예를 들어 5월 30일 시험이라면, 한국에서든 미국에서든 베트남에서든 현지 날짜 5월 30일에 응시하시면 됩니다. 정확한 현지 접속 시간은 결제 후 안내 이메일에서 확인하실 수 있습니다.',
    },
];

export default function FAQ() {
    return (
        <section aria-labelledby="faq-heading">
            <p className={styles.sectionLabel}>자주 묻는 질문</p>
            <h2 id="faq-heading" className={styles.title}>FAQ</h2>
            <div className={styles.list}>
                {FAQS.map((faq, i) => (
                    <details key={i} className={styles.item} open={i === 0}>
                        <summary>{faq.q}</summary>
                        <div className={styles.answer}>{faq.a}</div>
                    </details>
                ))}
            </div>
        </section>
    );
}
