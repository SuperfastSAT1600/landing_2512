'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { getAPCustomPrice, AP_PRICE_TIERS } from '@/lib/enrollment/data/pricing';
import { useLanguage } from '@/lib/enrollment/i18n/LanguageContext';
import { formatWon } from '@/lib/enrollment/utils/format';

export function APCustomHourSection() {
  const { t, locale } = useLanguage();
  const [hours, setHours] = useState(24);
  const [inputText, setInputText] = useState('24');
  const price = getAPCustomPrice(hours);

  function handleSlider(e: React.ChangeEvent<HTMLInputElement>) {
    const val = Number(e.target.value);
    setHours(val);
    setInputText(String(val));
  }

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    setInputText(e.target.value);
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val)) {
      setHours(Math.max(1, Math.min(60, val)));
    }
  }

  function handleInputBlur() {
    const val = parseInt(inputText, 10);
    const clamped = isNaN(val) ? 1 : Math.max(1, Math.min(60, val));
    setHours(clamped);
    setInputText(String(clamped));
  }

  // Calculate slider fill percentage for gradient track
  const fillPct = ((hours - 1) / (60 - 1)) * 100;

  // Find current tier index for visual feedback
  const tierIdx = AP_PRICE_TIERS.findIndex(
    (t) => hours >= t.minHours && hours <= t.maxHours
  );

  return (
    <div className="mb-8">
      <div className="rounded-card border border-border-strong bg-clay-solid shadow-clay overflow-hidden">
        {/* Header */}
        <div className="px-5 pt-5 pb-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4.5 h-4.5 text-accent-glow" />
            {t('ap.custom.title')}
          </h3>
          <p className="text-xs text-white/60 mt-1">
            {t('ap.custom.description')}
          </p>
        </div>

        {/* Slider area */}
        <div className="px-5 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <input
                type="range"
                min={1}
                max={60}
                value={hours}
                onChange={handleSlider}
                className="w-full h-2 rounded-full appearance-none cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none
                  [&::-webkit-slider-thumb]:w-5
                  [&::-webkit-slider-thumb]:h-5
                  [&::-webkit-slider-thumb]:rounded-full
                  [&::-webkit-slider-thumb]:bg-accent-glow
                  [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(99,102,241,0.5)]
                  [&::-webkit-slider-thumb]:cursor-pointer
                  [&::-webkit-slider-thumb]:relative
                  [&::-webkit-slider-thumb]:z-10"
                style={{
                  background: `linear-gradient(to right, rgb(99 102 241) 0%, rgb(99 102 241) ${fillPct}%, rgb(255 255 255 / 0.1) ${fillPct}%, rgb(255 255 255 / 0.1) 100%)`,
                }}
              />
              {/* Tier markers */}
              <div className="flex justify-between mt-1.5 px-0.5">
                <span className="text-[10px] text-white/50">1</span>
                <span className="text-[10px] text-white/50">16</span>
                <span className="text-[10px] text-white/50">32</span>
                <span className="text-[10px] text-white/50">48</span>
                <span className="text-[10px] text-white/50">60</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <input
                type="number"
                min={1}
                max={60}
                value={inputText}
                onChange={handleInput}
                onBlur={handleInputBlur}
                className="w-14 text-center text-white font-bold text-lg bg-white/5 border border-border-strong rounded-lg px-1.5 py-1
                  focus:outline-none focus:border-accent-glow/50 focus:ring-1 focus:ring-accent-glow/30
                  [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="text-sm text-white/70">{t('common.hours')}</span>
            </div>
          </div>

          {/* Tier pills */}
          <div className="flex gap-1.5 mt-3">
            {AP_PRICE_TIERS.map((tier, idx) => (
              <button
                key={tier.minHours}
                type="button"
                onClick={() => { setHours(tier.minHours); setInputText(String(tier.minHours)); }}
                className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
                  idx === tierIdx
                    ? 'border-accent-glow/50 bg-accent-glow/15 text-accent-glow'
                    : 'border-white/10 bg-white/5 text-white/60 hover:text-white/80'
                }`}
              >
                {tier.minHours}~{tier.maxHours}h
                {tier.discountRate > 0 && ` -${tier.discountRate}%`}
              </button>
            ))}
          </div>
        </div>

        {/* Price summary */}
        <div className="border-t border-border-strong bg-white/[0.02] px-5 py-4">
          <div className="grid grid-cols-2 gap-y-2.5 text-sm">
            <span className="text-white/70">{t('ap.custom.classHours')}</span>
            <span className="text-right text-white font-semibold">{price.hours}{t('common.hours')}</span>

            <span className="text-white/70">{t('ap.custom.pricePerHour')}</span>
            <span className="text-right text-white font-semibold">
              {formatWon(price.pricePerHour, locale)}
            </span>

            <span className="text-white/70">{t('ap.custom.discountRate')}</span>
            <span className={`text-right font-semibold ${price.discountRate > 0 ? 'text-rose-400' : 'text-white/60'}`}>
              {price.discountRate > 0 ? `-${price.discountRate}%` : '—'}
            </span>
          </div>

          <div className="border-t border-border-strong mt-3 pt-3 flex items-end justify-between">
            <div>
              <p className="text-xs text-white/60">{t('ap.custom.totalAmount')}</p>
              <p className="text-xl font-bold text-white">{formatWon(price.totalPrice, locale)}</p>
            </div>
            {price.discountAmount > 0 && (
              <p className="text-sm font-bold text-rose-400">
                -{formatWon(price.discountAmount, locale)} {t('common.savings')}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
