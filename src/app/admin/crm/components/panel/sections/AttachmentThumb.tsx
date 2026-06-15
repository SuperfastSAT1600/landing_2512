'use client';

import { useEffect, useState } from 'react';
import { FileText, Loader2, AlertCircle } from 'lucide-react';
import type { Attachment } from '@/types/crm';

interface Props {
  studentId: string;
  adminKey: string;
  attachment: Attachment;
}

/** 타임라인 첨부 1개: 비공개 버킷 서명 URL을 받아 이미지 썸네일 또는 파일 칩으로 표시. */
export function AttachmentThumb({ studentId, adminKey, attachment }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const isImage = attachment.mime.startsWith('image/');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/crm/students/${studentId}/attachment?path=${encodeURIComponent(attachment.path)}`,
          { headers: { 'x-admin-key': adminKey } }
        );
        const json = await res.json();
        if (cancelled) return;
        if (res.ok && json.data?.url) setUrl(json.data.url);
        else setError(true);
      } catch {
        if (!cancelled) setError(true);
      }
    })();
    return () => { cancelled = true; };
  }, [studentId, adminKey, attachment.path]);

  if (error) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-red-400">
        <AlertCircle size={11} />첨부를 불러올 수 없어요
      </span>
    );
  }

  if (!url) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-gray-400">
        <Loader2 size={11} className="animate-spin" />불러오는 중…
      </span>
    );
  }

  if (isImage) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" title={attachment.name}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={attachment.name}
          className="h-20 w-20 rounded-lg border border-gray-200 object-cover hover:opacity-90 transition-opacity"
        />
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 text-[12px] text-gray-700 hover:bg-gray-50 transition-colors max-w-[180px]"
    >
      <FileText size={13} className="shrink-0 text-gray-400" />
      <span className="truncate">{attachment.name}</span>
    </a>
  );
}
