'use client';

import { useState } from 'react';
import { WinbackPlayList } from './WinbackPlayList';
import { WinbackPlayDetail } from './WinbackPlayDetail';
import { WinbackPlayModal } from './WinbackPlayModal';
import type { useWinbackPlays } from './hooks/useWinbackPlays';

interface Props {
  adminKey: string;
  userName?: string;
  /** LeadPool이 소유한 훅 인스턴스를 그대로 받는다(플레이 바와 목록이 같은 상태를 본다). */
  winback: ReturnType<typeof useWinbackPlays>;
  onStudentClick?: (studentId: string) => void;
}

/** 이탈 리드풀의 '플레이' 하위탭 — 목록 ↔ 상세 마스터-디테일(모달 아님). */
export function WinbackPlaysTab({ adminKey, userName, winback, onStudentClick }: Props) {
  const [openPlayId, setOpenPlayId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      {openPlayId ? (
        <WinbackPlayDetail
          playId={openPlayId}
          userName={userName}
          onBack={() => setOpenPlayId(null)}
          fetchPlay={winback.fetchPlay}
          patchTarget={winback.patchTarget}
          bulkTargets={winback.bulkTargets}
          onStudentClick={onStudentClick}
        />
      ) : (
        <WinbackPlayList
          plays={winback.plays}
          loading={winback.loading}
          error={winback.error}
          onOpen={setOpenPlayId}
          onNew={() => setShowModal(true)}
        />
      )}

      {showModal && (
        <WinbackPlayModal
          adminKey={adminKey}
          createdBy={userName}
          onClose={() => setShowModal(false)}
          createPlay={winback.createPlay}
          recommend={winback.recommend}
          addTargets={winback.addTargets}
          onCreated={(playId) => {
            setShowModal(false);
            setOpenPlayId(playId);
          }}
        />
      )}
    </>
  );
}
