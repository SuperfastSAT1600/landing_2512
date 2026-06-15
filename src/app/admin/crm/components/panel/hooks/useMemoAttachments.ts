'use client';

import { useCallback, useState } from 'react';
import type { Attachment } from '@/types/crm';

const MAX_BYTES = 10 * 1024 * 1024;

function isAllowed(mime: string): boolean {
  const base = mime.split(';')[0].trim().toLowerCase();
  return base.startsWith('image/') || base === 'application/pdf';
}

export interface StagedAttachment {
  localId: string;
  name: string;
  mime: string;
  size: number;
  previewUrl?: string; // 이미지 로컬 미리보기 (object URL)
  uploading: boolean;
  error?: string;
  path?: string; // 업로드 완료 후 설정
}

interface Params {
  studentId: string;
  adminKey: string;
}

/**
 * 상담 메모 첨부 staged 상태 관리.
 * 파일을 추가하면 즉시 업로드(POST .../attachment)하고, 메모 저장 시 toAttachments()로
 * 업로드 완료된 항목만 전송한다. 붙여넣기·파일선택 모두 addFiles로 처리.
 */
export function useMemoAttachments({ studentId, adminKey }: Params) {
  const [staged, setStaged] = useState<StagedAttachment[]>([]);

  const upload = useCallback(
    async (localId: string, file: File) => {
      try {
        const form = new FormData();
        form.append('file', file);
        const res = await fetch(`/api/crm/students/${studentId}/attachment`, {
          method: 'POST',
          headers: { 'x-admin-key': adminKey },
          body: form,
        });
        const json = await res.json();
        if (res.ok && json.data?.path) {
          setStaged(prev => prev.map(s =>
            s.localId === localId ? { ...s, uploading: false, path: json.data.path } : s
          ));
        } else {
          setStaged(prev => prev.map(s =>
            s.localId === localId ? { ...s, uploading: false, error: json.error?.message ?? '업로드 실패' } : s
          ));
        }
      } catch {
        setStaged(prev => prev.map(s =>
          s.localId === localId ? { ...s, uploading: false, error: '네트워크 오류' } : s
        ));
      }
    },
    [studentId, adminKey]
  );

  const addFiles = useCallback((files: File[]) => {
    for (const file of files) {
      const localId = crypto.randomUUID();
      if (!isAllowed(file.type)) {
        setStaged(prev => [...prev, {
          localId, name: file.name || '파일', mime: file.type, size: file.size,
          uploading: false, error: '이미지 또는 PDF만 첨부할 수 있어요',
        }]);
        continue;
      }
      if (file.size > MAX_BYTES) {
        setStaged(prev => [...prev, {
          localId, name: file.name || '파일', mime: file.type, size: file.size,
          uploading: false, error: '파일이 너무 커요(최대 10MB)',
        }]);
        continue;
      }
      const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined;
      const name = file.name || `clipboard-${Date.now()}.${file.type.split('/')[1] || 'png'}`;
      setStaged(prev => [...prev, {
        localId, name, mime: file.type, size: file.size, previewUrl, uploading: true,
      }]);
      void upload(localId, file);
    }
  }, [upload]);

  const remove = useCallback((localId: string) => {
    setStaged(prev => {
      const target = prev.find(s => s.localId === localId);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter(s => s.localId !== localId);
    });
  }, []);

  const clear = useCallback(() => {
    setStaged(prev => {
      prev.forEach(s => { if (s.previewUrl) URL.revokeObjectURL(s.previewUrl); });
      return [];
    });
  }, []);

  /** 업로드 완료된 첨부만 영속화용 Attachment[]로 반환. */
  const toAttachments = useCallback((): Attachment[] =>
    staged.filter(s => s.path).map(s => ({ path: s.path!, name: s.name, mime: s.mime, size: s.size })),
    [staged]
  );

  const uploading = staged.some(s => s.uploading);

  return { staged, addFiles, remove, clear, toAttachments, uploading };
}
