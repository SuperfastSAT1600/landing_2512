'use client';

import { useState, useEffect } from 'react';
import styles from './ConsultModal.module.css';

interface ConsultModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

interface FormData {
    phone: string;
    grade: string;
    targetScore: string;
}

export default function ConsultModal({ onClose, onSuccess }: ConsultModalProps) {
    const [step, setStep] = useState<'form' | 'success'>('form');
    const [formData, setFormData] = useState<FormData>({
        phone: '',
        grade: '중3',
        targetScore: '1200+',
    });
    const [phoneError, setPhoneError] = useState(false);

    useEffect(() => {
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prev;
        };
    }, []);

    const handleSubmit = () => {
        if (!formData.phone.trim()) {
            setPhoneError(true);
            return;
        }
        setPhoneError(false);
        setStep('success');
        onSuccess();
    };

    return (
        <>
            <div className={styles.backdrop} onClick={onClose} />
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                {step === 'form' ? (
                    <>
                        <div className={styles.header}>
                            <span className={styles.title}>전화상담 예약</span>
                            <button className={styles.closeBtn} onClick={onClose} aria-label="닫기">
                                ✕
                            </button>
                        </div>

                        <div className={styles.body}>
                            <div className={styles.fieldGroup}>
                                <label className={styles.label} htmlFor="consult-phone">
                                    연락처 <span className={styles.required}>*</span>
                                </label>
                                <input
                                    id="consult-phone"
                                    type="tel"
                                    placeholder="010-0000-0000"
                                    className={`${styles.input} ${phoneError ? styles.inputError : ''}`}
                                    value={formData.phone}
                                    onChange={(e) => {
                                        setFormData({ ...formData, phone: e.target.value });
                                        if (phoneError) setPhoneError(false);
                                    }}
                                />
                                {phoneError && (
                                    <span className={styles.errorMsg}>연락처를 입력해주세요.</span>
                                )}
                            </div>

                            <div className={styles.fieldGroup}>
                                <label className={styles.label} htmlFor="consult-grade">
                                    학생 학년
                                </label>
                                <select
                                    id="consult-grade"
                                    className={styles.select}
                                    value={formData.grade}
                                    onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                                >
                                    <option value="중3">중3</option>
                                    <option value="고1">고1</option>
                                    <option value="고2">고2</option>
                                    <option value="고3">고3</option>
                                    <option value="N수생/졸업생">N수생/졸업생</option>
                                </select>
                            </div>

                            <div className={styles.fieldGroup}>
                                <label className={styles.label} htmlFor="consult-score">
                                    목표점수
                                </label>
                                <select
                                    id="consult-score"
                                    className={styles.select}
                                    value={formData.targetScore}
                                    onChange={(e) => setFormData({ ...formData, targetScore: e.target.value })}
                                >
                                    <option value="1200+">1200+</option>
                                    <option value="1300+">1300+</option>
                                    <option value="1400+">1400+</option>
                                    <option value="1450+">1450+</option>
                                    <option value="1500+">1500+</option>
                                    <option value="1550+">1550+</option>
                                    <option value="1600">1600</option>
                                </select>
                            </div>

                            <button className={styles.submitBtn} onClick={handleSubmit}>
                                예약하기
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <div className={styles.header}>
                            <span className={styles.title}>전화상담 예약</span>
                            <button className={styles.closeBtn} onClick={onClose} aria-label="닫기">
                                ✕
                            </button>
                        </div>

                        <div className={styles.successBox}>
                            <div className={styles.checkIcon}>✓</div>
                            <p className={styles.successTitle}>상담 예약이 완료되었습니다.</p>
                            <p className={styles.successSub}>빠른 시일 내에 연락드리겠습니다.</p>
                            <button className={styles.closeSuccessBtn} onClick={onClose}>
                                닫기
                            </button>
                        </div>
                    </>
                )}
            </div>
        </>
    );
}
