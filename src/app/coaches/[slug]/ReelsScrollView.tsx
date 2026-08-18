'use client';

import { ReelEmbed } from './ReelEmbed';

interface ReelsScrollViewProps {
    shortcodes: string[];
}

export function ReelsScrollView({ shortcodes }: ReelsScrollViewProps) {
    if (shortcodes.length === 0) {
        return (
            <div className="h-[calc(100vh-3.5rem)] flex items-center justify-center bg-black text-gray-400 text-sm">
                아직 등록된 영상이 없습니다.
            </div>
        );
    }

    return (
        <div
            className="h-[calc(100vh-3.5rem)] overflow-y-scroll snap-y snap-mandatory bg-black"
            style={{ scrollbarWidth: 'none' }}
        >
            {shortcodes.map((code, i) => (
                <section
                    key={code}
                    className="snap-start snap-always h-[calc(100vh-3.5rem)] flex items-center justify-center px-4"
                >
                    <ReelEmbed shortcode={code} eager={i === 0} />
                </section>
            ))}
        </div>
    );
}
