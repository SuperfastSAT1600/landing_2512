'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './LiveStatus.module.css';
import { useLiveStatus } from '../context/LiveStatusContext';

type MessageType = 'green' | 'red';

interface Message {
    text: string;
    type: MessageType;
}

const RELATIVE_TIMES = ['방금 전', '1분 전', '2분 전', '3분 전', '5분 전'];

const MESSAGES: Message[] = [
    { text: '*** 학생이 수업을 시작했습니다', type: 'green' },
    { text: '*** 학생 오답률이 상승했습니다', type: 'red' },
    { text: '*** 학습코치가 레슨 피드백을 입력했습니다', type: 'green' },
    { text: '*** 학생 숙제가 미제출 상태입니다', type: 'red' },
    { text: '*** 학생이 Daily Vocab을 완료했습니다', type: 'green' },
    { text: '*** 학생 집중도가 낮아졌습니다', type: 'red' },
    { text: '*** 학부모님이 레슨 피드백을 확인했습니다', type: 'green' },
    { text: '*** 학생이 3문제 연속 정답을 기록했습니다', type: 'green' },
    { text: '*** 학생 취약 유형이 발견됐습니다', type: 'red' },
    { text: '*** 학습코치가 오답 노트에 코멘트를 남겼습니다', type: 'green' },
    { text: '*** 학생이 진단테스트에 접속했습니다', type: 'green' },
    { text: '*** 학생이 진단테스트를 시작했습니다', type: 'green' },
    { text: '*** 학생이 진단 테스트를 완료했습니다', type: 'green' },
    { text: '*** 학생의 진단테스트 결과가 분석 중입니다', type: 'green' },
    { text: '*** 학생의 진단테스트에서 취약 영역이 발견됐습니다', type: 'red' },
    { text: '*** 학생 학습 패턴에 이상 징후가 감지됐습니다', type: 'red' },
];

export default function LiveStatus() {
    const pathname = usePathname();
    const [index, setIndex] = useState(0);
    const [relativeTime, setRelativeTime] = useState(RELATIVE_TIMES[0]);
    const { injectedMessage } = useLiveStatus();
    const isDiagnosis = pathname?.startsWith('/diagnosis');

    useEffect(() => {
        if (injectedMessage) return;
        const timer = setInterval(() => {
            setIndex((prev) => (prev + 1) % MESSAGES.length);
            setRelativeTime(RELATIVE_TIMES[Math.floor(Math.random() * RELATIVE_TIMES.length)]);
        }, 4000);
        return () => clearInterval(timer);
    }, [injectedMessage]);

    const current = injectedMessage ?? MESSAGES[index];
    const displayKey = injectedMessage ? `injected-${injectedMessage.text}` : `cycle-${index}`;

    // Hide LiveStatus on diagnosis page
    if (isDiagnosis) return null;

    return (
        <div className={styles.container}>
            <div className={styles.liveLabel}>
                <span className={`${styles.dot} ${current.type === 'red' ? styles.dotRed : styles.dotGreen}`} />
                <span className={styles.liveText}>LIVE</span>
                <span className={styles.divider}>|</span>
            </div>
            <div className={styles.textContainer}>
                <AnimatePresence mode="wait">
                    <motion.div
                        key={displayKey}
                        initial={{ x: 20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -20, opacity: 0 }}
                        transition={{ duration: 0.4, ease: 'easeOut' }}
                        className={styles.text}
                    >
                        <span className={styles.time}>{relativeTime}</span>
                        {current.text}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}
