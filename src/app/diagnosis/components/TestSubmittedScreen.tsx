'use client';

import { motion } from 'framer-motion';

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
          Test Submitted!
        </h2>

        <p className="text-gray-500 leading-relaxed mb-2" style={{ fontSize: 15 }}>
          You have completed the diagnostic test.
        </p>
        <p className="text-gray-500 leading-relaxed mb-8" style={{ fontSize: 15 }}>
          Your instructor will review the results and reach out with <strong className="text-gray-700">personalized feedback</strong>.
        </p>

        {/* Info card */}
        <div
          className="rounded-2xl p-5 mb-8 text-left"
          style={{ background: '#EBF4FF', border: '1px solid #BFDBFE' }}
        >
          <p className="text-sm font-semibold text-blue-700 mb-1">Next Steps</p>
          <p className="text-sm text-blue-600 leading-relaxed">
            After analyzing your results, we will provide a study plan
            tailored to your weak areas. Please wait for us to get in touch.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
