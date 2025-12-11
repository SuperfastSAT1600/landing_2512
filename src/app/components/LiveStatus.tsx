'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './LiveStatus.module.css';

const MESSAGES = [
    "***학생이 Vocab Trainer에 단어를 추가했습니다",
    "***학부모님이 레슨 피드백을 확인하였습니다",
    "***학습코치가 문제 해설 자료를 업데이트 하였습니다",
    "***학생이 Weakness Trainer에 문제를 추가했습니다",
    "***학부모님이 학습 상담을 요청하셨습니다",
    "***학생이 진단 테스트를 완료하였습니다",
    "***학습코치가 레슨 피드백을 입력하였습니다",
    "***학생이 Vocab Trainer에 단어를 추가했습니다",
    "***학부모님이 레슨 플랜을 확인하였습니다",
    "***학습코치가 질문에 답변을 등록했습니다",
    "***학생이 3문제 연속 정답을 기록하였습니다",
    "***학생이 숙제를 완료하였습니다",
    "***학습코치가 숙제를 내주었습니다",
    "***학생이 Daily Vocab을 완료하였습니다",
    "***학생 수업이 시작했습니다",
    "***학습코치가 오답 노트에 코멘트를 남겼습니다",
    "***학생 수업이 종료되었습니다",
];

export default function LiveStatus() {
    const [index, setIndex] = useState(0);
    const [timeString, setTimeString] = useState("");

    useEffect(() => {
        const updateTime = () => {
            const now = new Date();
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            setTimeString(`${hours}:${minutes}`);
        };

        updateTime();
        const timer = setInterval(updateTime, 60000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const timer = setInterval(() => {
            setIndex((prev) => (prev + 1) % MESSAGES.length);
        }, 4000); // Slower speed for better readability (per user feedback 'too fast')
        return () => clearInterval(timer);
    }, []);

    return (
        <div className={styles.container}>
            <span className={styles.badgeDot}></span>
            <div className={styles.textContainer}>
                <AnimatePresence mode="wait">
                    <motion.div
                        key={index}
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -20, opacity: 0 }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                        className={styles.text}
                    >
                        <span className={styles.time}>{timeString}</span>
                        {MESSAGES[index]}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}
