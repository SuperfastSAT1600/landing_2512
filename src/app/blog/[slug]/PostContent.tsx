'use client';

import { useState } from 'react';
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
      />
    );
  }

  return (
    <>
      <div className={`prose prose-invert prose-base sm:prose-lg max-w-none prose-headings:font-bold prose-headings:text-white prose-a:text-blue-400 prose-img:rounded-xl prose-table:border-collapse [&_td]:border [&_th]:border [&_td]:border-white/10 [&_th]:border-white/10 [&_td]:p-2 [&_th]:p-2 ${styles.postContent ?? ''}`}>
        <div dangerouslySetInnerHTML={{ __html: contentHtml }} />
      </div>

      {postData.tags && postData.tags.length > 0 && (
        <div className="mt-16 pt-8 border-t border-white/10">
          <div className="flex flex-wrap gap-2">
            {postData.tags.map(tag => (
              <span key={tag} className="bg-white/5 text-gray-400 px-3 py-1 rounded-full text-sm border border-white/5 flex items-center gap-1">
                <Tag size={12} /> {tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
