'use client';

import { createContext, useContext, useState, useCallback, useRef } from 'react';

type MessageType = 'green' | 'red';

interface Message {
    text: string;
    type: MessageType;
}

interface LiveStatusContextValue {
    injectedMessage: Message | null;
    pushMessage: (msg: Message) => void;
}

const LiveStatusContext = createContext<LiveStatusContextValue | null>(null);

export function useLiveStatus() {
    const ctx = useContext(LiveStatusContext);
    if (!ctx) throw new Error('useLiveStatus must be used within LiveStatusProvider');
    return ctx;
}

export function LiveStatusProvider({ children }: { children: React.ReactNode }) {
    const [injectedMessage, setInjectedMessage] = useState<Message | null>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const pushMessage = useCallback((msg: Message) => {
        if (timerRef.current) clearTimeout(timerRef.current);
        setInjectedMessage(msg);
        timerRef.current = setTimeout(() => {
            setInjectedMessage(null);
        }, 4000);
    }, []);

    return (
        <LiveStatusContext.Provider value={{ injectedMessage, pushMessage }}>
            {children}
        </LiveStatusContext.Provider>
    );
}
