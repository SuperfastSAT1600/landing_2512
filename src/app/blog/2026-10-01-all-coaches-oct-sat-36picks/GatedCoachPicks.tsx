'use client';

import { useState, useEffect } from 'react';
import { GateWall } from '../[slug]/GateWall';
import { ClientPage } from './ClientPage';
import type { PostData } from '@/lib/posts';

interface Props {
  postData: PostData;
}

const SLUG = '2026-10-01-all-coaches-oct-sat-36picks';

export function GatedCoachPicks({ postData }: Props) {
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    const cached = sessionStorage.getItem(`gated_post_${SLUG}`);
    if (cached) setUnlocked(true);
  }, []);

  const preview = (postData.excerpt || postData.description || '').replace(/<[^>]*>/g, '').slice(0, 200);

  if (!unlocked) {
    return (
      <GateWall
        slug={SLUG}
        preview={preview}
        onUnlock={() => setUnlocked(true)}
        isVip
      />
    );
  }

  return <ClientPage />;
}
