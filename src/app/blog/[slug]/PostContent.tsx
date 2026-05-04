'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Tag } from 'lucide-react';
import { GateWall } from './GateWall';
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
      <div className={`prose prose-base sm:prose-lg max-w-none prose-headings:font-bold prose-headings:text-gray-900 prose-p:text-gray-700 prose-li:text-gray-700 prose-strong:text-gray-900 prose-a:text-blue-600 prose-img:rounded-xl prose-table:border-collapse [&_td]:border [&_th]:border [&_td]:border-gray-200 [&_th]:border-gray-200 [&_td]:p-2 [&_th]:p-2 ${styles.postContent ?? ''}`}>
        <div dangerouslySetInnerHTML={{ __html: contentHtml }} />
      </div>

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
