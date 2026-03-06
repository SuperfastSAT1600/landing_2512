'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

export function TestSubmittedScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#F4F5F9' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="text-center"
        style={{ maxWidth: 420 }}
      >
        {/* Animated checkmark */}
        <div className="confetti-pop mb-6">
          <svg className="mx-auto" style={{ width: 80, height: 80 }} viewBox="0 0 52 52" fill="none">
            <circle className="checkmark-circle" cx="26" cy="26" r="25" stroke="#3182F6" strokeWidth="2" />
            <path className="checkmark-check" d="M15 27l7 7 15-15" stroke="#3182F6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <h2 className="text-2xl font-bold tracking-tight text-gray-900 mb-3">
          테스트 제출 완료!
        </h2>

        <p className="text-gray-500 leading-relaxed mb-2" style={{ fontSize: 15 }}>
          진단 테스트를 완료하셨습니다.
        </p>
        <p className="text-gray-500 leading-relaxed mb-8" style={{ fontSize: 15 }}>
          선생님이 결과를 검토한 후, <strong className="text-gray-700">개인 맞춤 피드백</strong>과 함께 연락드리겠습니다.
        </p>

        {/* Info card */}
        <div
          className="rounded-2xl p-5 mb-8 text-left"
          style={{ background: '#EBF4FF', border: '1px solid #BFDBFE' }}
        >
          <p className="text-sm font-semibold text-blue-700 mb-1">다음 단계</p>
          <p className="text-sm text-blue-600 leading-relaxed">
            결과 분석 후 취약 영역과 맞춤 학습 플랜을 안내드립니다.
            곧 연락드릴 예정이니 잠시만 기다려 주세요.
          </p>
        </div>

        {/* CTAs */}
        <div className="flex flex-col gap-3">
          <Link
            href="/#contact"
            className="btn-toss btn-press"
            style={{ display: 'block', textDecoration: 'none' }}
          >
            상담 예약하기
          </Link>
          <Link
            href="/"
            className="btn-press"
            style={{
              display: 'block',
              padding: '14px 24px',
              borderRadius: 16,
              fontSize: 15,
              fontWeight: 700,
              color: '#6B7684',
              background: '#ffffff',
              textDecoration: 'none',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            }}
          >
            홈으로 돌아가기
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
