'use client';

import { useEffect, useRef, useState } from 'react';
import { buildReelEmbedUrl } from '@/lib/instagram-url';

interface ReelEmbedProps {
    shortcode: string;
    eager?: boolean;
}

export function ReelEmbed({ shortcode, eager = false }: ReelEmbedProps) {
    const ref = useRef<HTMLDivElement>(null);
    const [shouldMount, setShouldMount] = useState(eager);

    useEffect(() => {
        if (shouldMount) return;
        const node = ref.current;
        if (!node) return;
        const observer = new IntersectionObserver(
            entries => {
                if (entries.some(e => e.isIntersecting)) {
                    setShouldMount(true);
                    observer.disconnect();
                }
            },
            { rootMargin: '100% 0px' }
        );
        observer.observe(node);
        return () => observer.disconnect();
    }, [shouldMount]);

    return (
        <div ref={ref} className="w-full h-full flex items-center justify-center">
            {shouldMount ? (
                <iframe
                    src={buildReelEmbedUrl(shortcode)}
                    className="w-full max-w-[420px] border-0 rounded-2xl bg-black"
                    style={{ height: 'min(85vh, 720px)' }}
                    allow="encrypted-media; fullscreen"
                    loading="lazy"
                    title={`Instagram reel ${shortcode}`}
                />
            ) : (
                <div
                    className="w-full max-w-[420px] rounded-2xl bg-white/5 animate-pulse"
                    style={{ height: 'min(85vh, 720px)' }}
                />
            )}
        </div>
    );
}
