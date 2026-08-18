'use client';

import { useState } from 'react';
import styles from './PortalFloatingCTA.module.css';
import ConsultationRequestModal from './ConsultationRequestModal';

export default function PortalFloatingCTA({ token }: { token: string }) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <div className={styles.wrapper}>
        <div className={styles.container}>
          <button
            onClick={() => setShowModal(true)}
            className={styles.primaryBtn}
          >
            💬 원장님 상담 신청
          </button>
        </div>
      </div>

      {showModal && (
        <ConsultationRequestModal
          token={token}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
