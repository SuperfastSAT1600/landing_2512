"use client";

import { useEffect, useRef } from 'react';

export default function HeroBackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let streams: Stream[] = [];
        const brandColor = 'rgb(7, 27, 233)';

        const getPaletteColor = (t: number, alpha: number) => {
            // Priority: Stay Blue, then shift to Cyan/White-ish (not Purple)
            // Reducing Red increment (150) and increasing Green increment (220)
            const r = Math.max(7, Math.min(255, 7 + t * 150));
            const g = Math.max(27, Math.min(255, 27 + t * 220));
            const b = Math.max(233, Math.min(255, 233 + t * 22));
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        };

        const resize = () => {
            if (!canvas || !ctx) return;
            // High DPI support capped at 2x for performance
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            canvas.width = window.innerWidth * dpr;
            canvas.height = window.innerHeight * dpr;
            ctx.scale(dpr, dpr);

            // Sync CSS display size
            canvas.style.width = `${window.innerWidth}px`;
            canvas.style.height = `${window.innerHeight}px`;

            initStreams();
        };

        class Stream {
            originX: number = 0;
            originY: number = 0;
            angle: number = 0;
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
                if (!canvas) return;
                this.originX = (canvas?.width || 0) / ((window.devicePixelRatio || 1) * 2);
                this.originY = (canvas?.height || 0) / ((window.devicePixelRatio || 1) * 2);

                this.angle = Math.random() * Math.PI * 2;
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

                const getPos = (prog: number) => {
                    const distMultiplier = Math.pow(Math.max(0, 1.3 - prog), 1.5);
                    const maxDim = Math.max(window.innerWidth, window.innerHeight);
                    const dist = maxDim * distMultiplier * 0.8;
                    const x = this.originX + Math.cos(this.angle) * dist;
                    const y = this.originY + Math.sin(this.angle) * dist;

                    return { x, y };
                };

                const head = getPos(p);
                const tail = getPos(lp);

                ctx.beginPath();
                ctx.moveTo(tail.x, tail.y);
                ctx.lineTo(head.x, head.y);

                const intensity = this.isBright ? p : p * 0.7;
                const color = getPaletteColor(intensity, 1.0);

                const grad = ctx.createLinearGradient(tail.x, tail.y, head.x, head.y);
                grad.addColorStop(1, 'rgba(7, 27, 233, 0)');
                grad.addColorStop(0, color);

                ctx.strokeStyle = grad;
                ctx.lineWidth = this.widthBase * (2.0 - p);
                ctx.lineCap = 'round';
                ctx.globalAlpha = this.alphaBase * p * 1.2;

                // Optimization: Disable expensive shadows on mobile screens
                if (window.innerWidth > 768 && (this.isBright || p > 0.8)) {
                    ctx.shadowBlur = 15 * p;
                    ctx.shadowColor = brandColor;
                }

                ctx.stroke();
                ctx.shadowBlur = 0;
                ctx.globalAlpha = 1.0;
            }
        }

        const initStreams = () => {
            streams = [];
            // Dynamic stream count: Fewer on mobile to maintain 60FPS
            const isMobile = window.innerWidth < 768;
            const count = isMobile ? 80 : 120;
            for (let i = 0; i < count; i++) {
                streams.push(new Stream());
            }
        };

        const animate = () => {
            if (!canvas || !ctx) return;
            const width = window.innerWidth;
            const height = window.innerHeight;

            ctx.fillStyle = '#010204';
            ctx.fillRect(0, 0, width, height);

            const centerGrad = ctx.createRadialGradient(
                width / 2, height / 2, 0,
                width / 2, height / 2, Math.max(width, height) * 0.4
            );
            centerGrad.addColorStop(0, 'rgba(7, 27, 233, 0.4)');
            centerGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = centerGrad;
            ctx.fillRect(0, 0, width, height);

            ctx.globalCompositeOperation = 'lighter';
            streams.forEach(s => {
                s.update();
                s.draw();
            });
            ctx.globalCompositeOperation = 'source-over';

            animationFrameId = requestAnimationFrame(animate);
        };

        window.addEventListener('resize', resize);

        resize();
        animate();

        return () => {
            window.removeEventListener('resize', resize);
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
