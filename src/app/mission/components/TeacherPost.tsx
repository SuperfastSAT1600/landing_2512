'use client';

import { useEffect } from 'react';

interface Props {
  instagramUrl: string;
  date: string;
  repCount?: number;
}

function isStoryUrl(url: string) {
  return url.includes('/stories/');
}

export default function TeacherPost({ instagramUrl, date, repCount }: Props) {
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const dateObj = new Date(date + 'T00:00:00');
  const label = `Mission Log · ${MONTHS[dateObj.getMonth()]} ${dateObj.getDate()}`;
  const isStory = isStoryUrl(instagramUrl);

  useEffect(() => {
    if (!instagramUrl || isStory) return;
    type WinWithInstgrm = { instgrm?: { Embeds: { process: () => void } } };
    const win = window as unknown as WinWithInstgrm;

    const process = () => win.instgrm?.Embeds.process();

    if (win.instgrm) {
      process();
      return;
    }

    const existing = document.querySelector('script[src="https://www.instagram.com/embed.js"]');
    if (existing) {
      if ((existing as HTMLScriptElement).dataset.loaded === 'true') {
        process();
      } else {
        existing.addEventListener('load', process);
      }
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://www.instagram.com/embed.js';
    script.async = true;
    script.onload = () => {
      script.dataset.loaded = 'true';
      process();
    };
    document.body.appendChild(script);
  }, [instagramUrl, isStory]);

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-[#3182F6]" />
          <span className="text-sm font-semibold text-gray-700">{label}</span>
        </div>
        {repCount != null && (
          <span className="text-sm font-bold text-[#3182F6]">{repCount}개</span>
        )}
      </div>
      <p className="text-xs text-gray-400 ml-4 mb-3">Daily mission result</p>
      {isStory ? (
        <div className="flex justify-center">
          <a
            href={instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-5 py-3 bg-[#3182F6] hover:bg-[#1B6AE0] text-white text-sm font-semibold rounded-2xl shadow transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
            </svg>
            View Instagram Story
          </a>
        </div>
      ) : (
        <div className="flex justify-center">
          <blockquote
            className="instagram-media"
            data-instgrm-permalink={instagramUrl}
            data-instgrm-version="14"
            style={{ maxWidth: 540, width: '100%', minWidth: 326 }}
          />
        </div>
      )}
    </div>
  );
}
