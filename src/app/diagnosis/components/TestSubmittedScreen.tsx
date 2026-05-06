'use client';

import { motion } from 'framer-motion';
import { Icon } from '@iconify/react';

interface Props {
  resultId: string | null;
}

export function TestSubmittedScreen({ resultId }: Props) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#F4F5F9' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="text-center"
        style={{ maxWidth: 420 }}
      >
        {/* Checkmark icon */}
        <div className="confetti-pop mb-6 flex justify-center">
          <Icon icon="fluent:checkmark-circle-48-regular" width={80} height={80} color="#071be9" />
        </div>

        <h2 className="text-2xl font-bold tracking-tight text-gray-900 mb-3">
          Test Submitted!
        </h2>

        <p className="text-gray-500 leading-relaxed mb-2" style={{ fontSize: 15 }}>
          You have completed the diagnostic test.
        </p>
        <p className="text-gray-500 leading-relaxed mb-8" style={{ fontSize: 15 }}>
          Your instructor will review the results and reach out with{' '}
          <strong className="text-gray-700">personalized feedback</strong>.
        </p>

        {/* Info card */}
        <div
          className="rounded-2xl p-5 text-left"
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
