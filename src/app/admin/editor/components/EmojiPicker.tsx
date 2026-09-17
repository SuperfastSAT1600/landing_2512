'use client';

import { useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import data from '@emoji-mart/data';

// SSR 방지: Picker는 window를 참조하므로 클라이언트에서만 로드
const Picker = dynamic(() => import('@emoji-mart/react').then((m) => m.default), { ssr: false });

interface EmojiPickerProps {
    onSelect: (emoji: string) => void;
    onClose: () => void;
    anchorRef: React.RefObject<HTMLButtonElement | null>;
}

export function EmojiPicker({ onSelect, onClose, anchorRef }: EmojiPickerProps) {
    const containerRef = useRef<HTMLDivElement>(null);

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
        >
            <Picker
                data={data}
                onEmojiSelect={(emoji: { native: string }) => {
                    onSelect(emoji.native);
                    onClose();
                }}
                theme="dark"
                locale="ko"
                previewPosition="none"
                skinTonePosition="none"
                autoFocus
            />
        </div>
    );
}
