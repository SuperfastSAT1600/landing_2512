'use client';

import { useEffect, useRef } from 'react';

interface EmojiPickerProps {
    onSelect: (emoji: string) => void;
    onClose: () => void;
    anchorRef: React.RefObject<HTMLButtonElement | null>;
}

export function EmojiPicker({ onSelect, onClose, anchorRef }: EmojiPickerProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    // emoji-mart를 useEffect 안에서 동적 import → SSR 문제 없음, React 19 호환
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        Promise.all([
            import('emoji-mart'),
            import('@emoji-mart/data'),
        ]).then(([{ Picker }, { default: data }]) => {
            if (!container) return;
            new (Picker as any)({
                data,
                onEmojiSelect: (emoji: { native: string }) => {
                    onSelect(emoji.native);
                    onClose();
                },
                theme: 'dark',
                locale: 'ko',
                previewPosition: 'none',
                skinTonePosition: 'none',
                autoFocus: true,
                parent: container,
            });
        });

        return () => {
            container.innerHTML = '';
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (
                containerRef.current &&
                !containerRef.current.contains(e.target as Node) &&
                anchorRef.current &&
                !anchorRef.current.contains(e.target as Node)
            ) {
                onClose();
            }
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [onClose, anchorRef]);

    return (
        <div
            ref={containerRef}
            className="fixed z-[200]"
            style={{ top: '108px', left: '50%', transform: 'translateX(-50%)' }}
        />
    );
}
