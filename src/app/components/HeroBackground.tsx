"use client";

import { useEffect, useRef, type RefObject } from 'react';

interface HeroBackgroundProps {
    titleRef?: RefObject<HTMLHeadingElement | null>;
}

// REQ-002: Color LUT — computed once at module level, never again
const COLOR_LUT: string[] = Array.from({ length: 101 }, (_, i) => {
    const t = i / 100;
    const r = Math.max(7, Math.min(255, Math.round(7 + t * 150)));
    const g = Math.max(27, Math.min(255, Math.round(27 + t * 220)));
    const b = Math.max(233, Math.min(255, Math.round(233 + t * 22)));
    return `rgb(${r}, ${g}, ${b})`;
});

const getPaletteColor = (t: number): string =>
    COLOR_LUT[Math.min(100, Math.round(t * 100))];

export default function HeroBackground({ titleRef }: HeroBackgroundProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // prefers-reduced-motion gate — draw one static frame and return
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            const parent = canvas.parentElement;
            if (parent) {
                const rect = parent.getBoundingClientRect();
                const w = rect.width || window.innerWidth;
                const h = rect.height || window.innerHeight;
                canvas.width = w;
                canvas.height = h;
                canvas.style.width = `${w}px`;
                canvas.style.height = `${h}px`;
                ctx.fillStyle = '#010204';
                ctx.fillRect(0, 0, w, h);
                const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.4);
                grad.addColorStop(0, 'rgba(7, 27, 233, 0.4)');
                grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, w, h);
            }
            return;
        }

        let animationFrameId: number;
        let streams: Stream[] = [];
        const brandColor = 'rgb(7, 27, 233)';

        let parentWidth = 0;
        let parentHeight = 0;
        let originX = 0;
        let originY = 0;

        // Cached radial gradient — recreated only on resize
        let centerGrad: CanvasGradient | null = null;

        // Quality tier — determines stream count, shadows, and frame rate
        let qualityTier: 'low' | 'medium' | 'high' = 'high';

        // Frame-rate throttle state (targets ~30fps on low/medium)
        let lastTime = 0;

        const resize = () => {
            if (!canvas || !ctx) return;
            const parent = canvas.parentElement;
            if (!parent) return;

            const rect = parent.getBoundingClientRect();
            parentWidth = rect.width;
            parentHeight = rect.height;

            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            canvas.width = parentWidth * dpr;
            canvas.height = parentHeight * dpr;
            ctx.scale(dpr, dpr);

            canvas.style.width = `${parentWidth}px`;
            canvas.style.height = `${parentHeight}px`;

            const heroEl = parent.parentElement;
            if (titleRef?.current && heroEl) {
                const heroRect = heroEl.getBoundingClientRect();
                const titleRect = titleRef.current.getBoundingClientRect();
                const titleCenterX = titleRect.left + titleRect.width / 2 - heroRect.left;
                const titleCenterY = titleRect.top + titleRect.height / 2 - heroRect.top;
                originX = parentWidth - titleCenterX;
                originY = parentHeight - titleCenterY;
            } else {
                originX = parentWidth / 2;
                originY = parentHeight / 2;
            }

            // Cache radial gradient — origin only changes on resize
            centerGrad = ctx.createRadialGradient(
                originX, originY, 0,
                originX, originY, Math.max(parentWidth, parentHeight) * 0.4
            );
            centerGrad.addColorStop(0, 'rgba(7, 27, 233, 0.4)');
            centerGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

            // Adaptive quality tier: 3 levels based on screen size and CPU cores
            const cores = navigator.hardwareConcurrency ?? 4;
            const isMobile = /Mobi|Android/i.test(navigator.userAgent);
            if (parentWidth < 480 || (isMobile && cores <= 2)) {
                qualityTier = 'low';
            } else if (parentWidth < 768 || cores <= 4) {
                qualityTier = 'medium';
            } else {
                qualityTier = 'high';
            }

            initStreams();
        };

        class Stream {
            originX: number = 0;
            originY: number = 0;
            angle: number = 0;
            // REQ-003: precomputed trig values — set once in reset(), reused every frame
            cosAngle: number = 0;
            sinAngle: number = 0;
            speed: number = 0;
            progress: number = 0;
            maxProgress: number = 0;
            widthBase: number = 0;
            length: number = 0;
            isBright: boolean = false;
            alphaBase: number = 0;

            constructor() {
                this.reset();
                this.progress = Math.random();
            }

            reset() {
                this.originX = originX;
                this.originY = originY;

                this.angle = Math.random() * Math.PI * 2;
                // REQ-003: compute once here, not inside draw() every frame
                this.cosAngle = Math.cos(this.angle);
                this.sinAngle = Math.sin(this.angle);
                this.speed = Math.random() * 0.007 + 0.004;
                this.progress = 0;
                this.maxProgress = 1.3 + Math.random() * 0.2;

                this.length = Math.random() * 0.5 + 0.3;
                this.widthBase = Math.random() * 3.85 + 1.32;
                this.isBright = Math.random() > 0.7;
                this.alphaBase = Math.random() * 0.6 + 0.4;
            }

            update() {
                const acceleration = 1 + (this.progress * 3);
                this.progress += this.speed * acceleration;
                if (this.progress > this.maxProgress) this.reset();
            }

            draw() {
                if (!ctx || !canvas) return;
                const p = this.progress;
                const lp = Math.max(0, p - this.length);

                // REQ-003: use precomputed cosAngle/sinAngle — no Math.cos/sin per frame
                const getPos = (prog: number) => {
                    const distMultiplier = Math.pow(Math.max(0, 1.3 - prog), 1.5);
                    const maxDim = Math.max(parentWidth, parentHeight);
                    const dist = maxDim * distMultiplier * 0.8;
                    return {
                        x: this.originX + this.cosAngle * dist,
                        y: this.originY + this.sinAngle * dist,
                    };
                };

                const head = getPos(p);
                const tail = getPos(lp);

                ctx.beginPath();
                ctx.moveTo(tail.x, tail.y);
                ctx.lineTo(head.x, head.y);

                const intensity = this.isBright ? p : p * 0.7;
                const color = getPaletteColor(intensity);

                // REQ-001: Low/Medium tier — skip gradient, use solid color
                // High tier keeps gradient for richer visuals on capable devices
                if (qualityTier === 'high') {
                    const grad = ctx.createLinearGradient(tail.x, tail.y, head.x, head.y);
                    grad.addColorStop(1, 'rgba(7, 27, 233, 0)');
                    grad.addColorStop(0, color);
                    ctx.strokeStyle = grad;
                } else {
                    ctx.strokeStyle = color;
                }

                ctx.lineWidth = this.widthBase * (2.0 - p);
                ctx.lineCap = 'round';
                ctx.globalAlpha = this.alphaBase * p * 1.2;

                // REQ-004: Shadow only on high tier, AND condition (was OR), blur 8 (was 15)
                if (qualityTier === 'high' && this.isBright && p > 0.7) {
                    ctx.shadowBlur = 8 * p;
                    ctx.shadowColor = brandColor;
                }

                ctx.stroke();
                ctx.shadowBlur = 0;
                ctx.globalAlpha = 1.0;
            }
        }

        const initStreams = () => {
            streams = [];
            // REQ-005: reduced stream counts — low 20, medium 45, high 80
            const countMap: Record<string, number> = { low: 20, medium: 45, high: 80 };
            const count = countMap[qualityTier];
            for (let i = 0; i < count; i++) {
                streams.push(new Stream());
            }
        };

        const animate = (timestamp: number) => {
            if (!canvas || !ctx) return;

            // Throttle to ~30fps on low/medium tiers to save battery
            if (qualityTier !== 'high') {
                const elapsed = timestamp - lastTime;
                if (elapsed < 33) {
                    animationFrameId = requestAnimationFrame(animate);
                    return;
                }
                lastTime = timestamp;
            }

            ctx.fillStyle = '#010204';
            ctx.fillRect(0, 0, parentWidth, parentHeight);

            if (centerGrad) {
                ctx.fillStyle = centerGrad;
                ctx.fillRect(0, 0, parentWidth, parentHeight);
            }

            ctx.globalCompositeOperation = 'lighter';
            streams.forEach(s => {
                s.update();
                s.draw();
            });
            ctx.globalCompositeOperation = 'source-over';

            animationFrameId = requestAnimationFrame(animate);
        };

        // Page Visibility API — pause RAF when tab is hidden, resume when visible
        const handleVisibilityChange = () => {
            if (document.hidden) {
                cancelAnimationFrame(animationFrameId);
            } else {
                lastTime = 0;
                animationFrameId = requestAnimationFrame(animate);
            }
        };

        window.addEventListener('resize', resize);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        resize();
        animationFrameId = requestAnimationFrame(animate);

        return () => {
            window.removeEventListener('resize', resize);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 w-full h-full object-cover pointer-events-none"
            style={{ background: '#010204' }}
        />
    );
}
