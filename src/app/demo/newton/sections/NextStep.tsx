'use client';

import { brand } from '../theme';

export function NextStep() {
  return (
    <section id="next" className="scroll-mt-16 px-6 py-16 sm:px-10 sm:py-20" style={{ background: brand.primary }}>
      <div className="mx-auto w-full max-w-6xl">
        <div className="flex flex-col gap-6 sm:flex-row sm:gap-16">
          <div>
            <p className="text-[12px] sm:text-[11px] uppercase tracking-wide text-white/40">Email</p>
            <a href="mailto:ethan@argonautai.co.kr" className="mt-1 block text-[15px] text-white hover:underline">
              ethan@argonautai.co.kr
            </a>
          </div>
          <div>
            <p className="text-[12px] sm:text-[11px] uppercase tracking-wide text-white/40">Phone</p>
            <a href="tel:+821056579703" className="mt-1 block text-[15px] text-white hover:underline">
              +82 10-5657-9703
            </a>
          </div>
        </div>

        <p className="mt-12 font-serif text-[13px] tracking-[0.22em] text-white/35">ARGONAUT AI</p>
      </div>
    </section>
  );
}
