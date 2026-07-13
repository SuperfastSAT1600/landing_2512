import type { Config } from "tailwindcss";
import typography from '@tailwindcss/typography';

const config: Config = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "var(--background)",
                foreground: "var(--foreground)",
                // --- class-enrollment (다크 clay 테마) 전용 색상. 신규 키만 추가 → 기존 페이지 무영향 ---
                page: '#050816',
                surface: {
                    DEFAULT: '#0d1225',
                    elevated: '#1e283c',
                    hover: '#283046',
                },
                clay: {
                    DEFAULT: 'rgba(25, 30, 45, 0.6)',
                    solid: '#191e2d',
                },
                accent: {
                    DEFAULT: '#071be9',
                    glow: '#6085ff',
                    secondary: '#00a6a6',
                },
                muted: {
                    DEFAULT: 'rgba(255,255,255,0.3)',
                    light: '#d1d5db',
                },
                border: {
                    DEFAULT: 'rgba(255,255,255,0.08)',
                    strong: 'rgba(255,255,255,0.1)',
                },
                primary: {
                    50: '#eef2ff',
                    100: '#dde4ff',
                    200: '#bfcbff',
                    300: '#93a5ff',
                    400: '#6085ff',
                    500: '#3b5dff',
                    600: '#071be9',
                    700: '#0516c0',
                    800: '#041198',
                    900: '#030d70',
                },
            },
            fontFamily: {
                sans: ["Pretendard Variable", "Pretendard", "sans-serif"],
                // enrollment 라우트에서 next/font로 주입하는 Outfit (전역 sans는 Pretendard 유지)
                display: ['var(--font-outfit)', 'Pretendard Variable', 'system-ui', 'sans-serif'],
            },
            borderRadius: {
                soft: '2rem',
                medium: '1.5rem',
                card: '1.25rem',
                btn: '0.75rem',
            },
            boxShadow: {
                clay: '20px 20px 40px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(255,255,255,0.05), inset 0 1px 0 rgba(255,255,255,0.1)',
                'clay-hover': '20px 20px 40px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.1), inset 0 1px 0 rgba(255,255,255,0.15)',
                'clay-float': '30px 30px 60px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.1)',
                'clay-button': '10px 10px 20px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(255,255,255,0.1)',
                glow: '0 0 20px rgba(96,133,255,0.4)',
                'glow-strong': '0 0 40px rgba(96,133,255,0.5)',
            },
            animation: {
                'fade-in': 'fadeIn 0.4s ease-out',
                'slide-up': 'slideUp 0.5s ease-out',
                'check-pop': 'checkPop 0.5s ease-out',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0', transform: 'translateY(12px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                slideUp: {
                    '0%': { opacity: '0', transform: 'translateY(24px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                checkPop: {
                    '0%': { transform: 'scale(0)' },
                    '50%': { transform: 'scale(1.2)' },
                    '100%': { transform: 'scale(1)' },
                },
            },
        },
    },
    plugins: [
        typography,
    ],
};
export default config;
