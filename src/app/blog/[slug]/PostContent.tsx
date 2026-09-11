'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Tag } from 'lucide-react';
import { GateWall } from './GateWall';
import { HighlightObserver } from './HighlightObserver';
import type { PostData } from '@/lib/posts';
import styles from './post.module.css';

interface PostContentProps {
  postData: PostData;
}

export function PostContent({ postData }: PostContentProps) {
  const [unlockedHtml, setUnlockedHtml] = useState<string | null>(null);

  const contentHtml = unlockedHtml ?? postData.contentHtml ?? '';
  const isLocked = postData.isGated && !unlockedHtml;

  // Plain text preview for GateWall (strip HTML tags)
  const preview = (postData.excerpt || postData.description || '').replace(/<[^>]*>/g, '').slice(0, 200);

  if (isLocked) {
    return (
      <GateWall
        slug={postData.id}
        preview={preview}
        onUnlock={setUnlockedHtml}
        isVip={postData.isVip}
      />
    );
  }

  return (
    <>
      <div className={`prose max-w-none prose-headings:font-bold prose-headings:text-gray-900 prose-p:text-gray-700 prose-li:text-gray-700 prose-strong:text-gray-900 prose-a:text-blue-600 prose-img:rounded-xl prose-table:border-collapse text-[1.0625rem] leading-[1.5] break-keep [&_p]:mb-5 [&_p]:break-keep [&_li]:break-keep [&_h2]:text-[1.375rem] [&_h2]:font-extrabold [&_h2]:mt-14 [&_h2]:mb-3 [&_h2]:leading-[1.41] [&_h3]:text-[1.1875rem] [&_h3]:font-bold [&_h3]:mt-9 [&_h3]:mb-2 [&_h3]:leading-[1.47] [&_figcaption]:text-[0.8125rem] [&_figcaption]:leading-[1.5] [&_figcaption]:text-gray-400 [&_figcaption]:mt-2 [&_figcaption]:text-center [&_td]:border [&_th]:border [&_td]:border-gray-200 [&_th]:border-gray-200 [&_td]:p-3 [&_th]:p-3 [&_th]:bg-gray-50 [&_th]:font-semibold [&_.instagram-reel-wrapper]:flex [&_.instagram-reel-wrapper]:justify-center [&_.instagram-reel-wrapper]:py-4 [&_.instagram-reel-embed]:max-w-[420px] [&_.instagram-reel-embed]:w-full [&_.instagram-reel-embed]:rounded-2xl [&_.instagram-reel-embed]:border-0 ${styles.postContent ?? ''}`}>
        <div dangerouslySetInnerHTML={{ __html: contentHtml }} />
      </div>
      <HighlightObserver />

      {postData.tags && postData.tags.filter(t => t !== 'vip').length > 0 && (
        <div className="mt-16 pt-8 border-t border-gray-200">
          <div className="flex flex-wrap gap-2">
            {postData.tags.filter(t => t !== 'vip').map(tag => (
              <Link
                key={tag}
                href={`/blog?tag=${encodeURIComponent(tag)}`}
                className="bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 px-3 py-1 rounded-full text-sm border border-gray-200 flex items-center gap-1 transition-colors"
              >
                <Tag size={12} /> {tag}
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
