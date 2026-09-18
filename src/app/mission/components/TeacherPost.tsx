'use client';

import { useEffect, useRef } from 'react';

interface Props {
  instagramUrl: string;
}

export default function TeacherPost({ instagramUrl }: Props) {
  const ref = useRef<HTMLDivElement>(null);

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
      <div className="flex items-center gap-2 mb-3">
        <span className="inline-block w-2 h-2 rounded-full bg-orange-500" />
        <span className="text-sm font-semibold text-gray-700">오늘의 선생님 인증</span>
      </div>
      <div ref={ref} className="flex justify-center">
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
