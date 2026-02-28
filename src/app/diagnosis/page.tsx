'use client';

import { useState, useRef, useCallback } from 'react';
import { KeyRound } from 'lucide-react';
import { useLiveStatus } from '../context/LiveStatusContext';

const CODE_LENGTH = 6;

export default function DiagnosisPage() {
    const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(''));
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
    const { pushMessage } = useLiveStatus();

    const setRef = useCallback((el: HTMLInputElement | null, idx: number) => {
        inputRefs.current[idx] = el;
    }, []);

    const focusInput = (idx: number) => {
        inputRefs.current[idx]?.focus();
    };

    const handleChange = (idx: number, value: string) => {
        // Allow only digits
        const digit = value.replace(/\D/g, '').slice(-1);
        const next = [...code];
        next[idx] = digit;
        setCode(next);

        if (digit && idx < CODE_LENGTH - 1) {
            focusInput(idx + 1);
        }
    };

    const handleKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && !code[idx] && idx > 0) {
            focusInput(idx - 1);
        }
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, CODE_LENGTH);
        if (!pasted) return;

        const next = [...code];
        for (let i = 0; i < pasted.length; i++) {
            next[i] = pasted[i];
        }
        setCode(next);

        const focusIdx = Math.min(pasted.length, CODE_LENGTH - 1);
        focusInput(focusIdx);
    };

    const isFilled = code.every(d => d !== '');

    const handleSubmit = () => {
        if (!isFilled) return;
        pushMessage({ text: '*** 님이 진단테스트에 접속했습니다', type: 'green' });
        // TODO: 접속코드 검증 로직
    };

    return (
        <div className="min-h-screen bg-[#151719] text-gray-100 flex flex-col items-center justify-center p-4 font-sans">
            {/* Branding */}
            <div className="mb-8 text-center">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                    SuperfastSAT
                </h1>
                <p className="text-gray-500 text-sm tracking-widest mt-1 uppercase">Diagnostic Test</p>
            </div>

            <div className="w-full max-w-md bg-[#1e2023] rounded-2xl border border-white/5 p-6 md:p-8 shadow-2xl">
                {/* Icon */}
                <div className="flex justify-center mb-6">
                    <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center">
                        <KeyRound size={32} className="text-blue-400" />
                    </div>
                </div>

                {/* Title */}
                <h2 className="text-2xl font-bold text-center mb-2">접속 코드를 입력하세요</h2>
                <p className="text-gray-500 text-sm text-center mb-8">
                    선생님에게 받은 6자리 코드를 입력해주세요
                </p>

                {/* OTP-style inputs */}
                <div className="flex justify-center gap-2 md:gap-3 mb-8">
                    {Array.from({ length: CODE_LENGTH }).map((_, idx) => (
                        <input
                            key={idx}
                            ref={(el) => setRef(el, idx)}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={code[idx]}
                            onChange={(e) => handleChange(idx, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(idx, e)}
                            onPaste={idx === 0 ? handlePaste : undefined}
                            autoFocus={idx === 0}
                            className="w-12 h-14 md:w-14 md:h-16 text-center text-2xl font-bold bg-[#151719] border border-white/10 rounded-xl text-white outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 placeholder-gray-700"
                            aria-label={`코드 ${idx + 1}번째 자리`}
                        />
                    ))}
                </div>

                {/* Submit */}
                <button
                    onClick={handleSubmit}
                    disabled={!isFilled}
                    className="w-full py-4 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed text-lg shadow-lg shadow-blue-900/20"
                >
                    확인
                </button>
            </div>
        </div>
    );
}
