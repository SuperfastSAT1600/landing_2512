'use client';

import { useEffect } from 'react';

interface Props {
  instagramUrl: string;
  date: string;
  repCount?: number;
}

export default function TeacherPost({ instagramUrl, date, repCount }: Props) {
  const dateObj = new Date(date + 'T00:00:00');
  const month = dateObj.getMonth() + 1;
  const day = dateObj.getDate();
  const label = `${month}월 ${day}일 미션 인증`;

  useEffect(() => {
    if (!instagramUrl) return;
    if ((window as unknown as { instgrm?: { Embeds: { process: () => void } } }).instgrm) {
      (window as unknown as { instgrm: { Embeds: { process: () => void } } }).instgrm.Embeds.process();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://www.instagram.com/embed.js';
    script.async = true;
    document.body.appendChild(script);
  }, [instagramUrl]);

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-orange-500" />
          <span className="text-sm font-semibold text-gray-700">{label}</span>
        </div>
        {repCount != null && (
          <span className="text-sm font-bold text-orange-600">{repCount}개</span>
        )}
      </div>
      <p className="text-xs text-gray-400 ml-4 mb-3">미션 수행 결과</p>
      <div className="flex justify-center">
        <blockquote
          className="instagram-media"
          data-instgrm-permalink={instagramUrl}
          data-instgrm-version="14"
          style={{ maxWidth: 540, width: '100%', minWidth: 326 }}
        />
      </div>
    </div>
  );
}
