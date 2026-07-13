import React from 'react';
import { Calendar, Clock, Sparkles, Globe } from 'lucide-react';
import { Badge } from '@/components/enrollment/ui/Badge';
import { SUMMER_INTENSIVE_DATA } from '@/lib/enrollment/data/pricing';
import { useLanguage } from '@/lib/enrollment/i18n/LanguageContext';
import { ICON_MAP } from './icons';
import { ScheduleTable } from './ScheduleTable';

const PHILOSOPHY_KEYS = ['conceptFirst', 'repetition', 'application'] as const;
const WEEKLY_KEYS = ['monWed', 'thuFri'] as const;

export const SummerIntensiveSection = React.forwardRef<HTMLDivElement>(
  function SummerIntensiveSection(_props, ref) {
    const { t } = useLanguage();
    const data = SUMMER_INTENSIVE_DATA;

    return (
      <section ref={ref} className="max-w-3xl mx-auto px-4 sm:px-6 pb-10 sm:pb-16 animate-fade-in scroll-mt-20">
        {/* Hero */}
        <div className="rounded-card border border-border-strong bg-surface-elevated p-6 sm:p-8 shadow-clay mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                {t('summer.title')}
              </h2>
              <div className="flex items-center gap-3 text-sm text-white/60">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  {t('summer.classStart', { date: t('summer.startDate') })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Philosophy */}
        <div className="mb-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent-glow" />
            {t('summer.philosophy.title')}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {PHILOSOPHY_KEYS.map((key, i) => {
              const IconComponent = ICON_MAP[data.philosophy[i].icon];
              return (
                <div
                  key={key}
                  className="rounded-card border border-border-strong bg-clay-solid p-5 shadow-clay"
                >
                  <div className="w-10 h-10 rounded-xl bg-accent-glow/15 flex items-center justify-center mb-3">
                    {IconComponent && (
                      <IconComponent className="w-5 h-5 text-accent-glow" />
                    )}
                  </div>
                  <h4 className="font-bold text-white mb-1.5">{t(`summer.philosophy.${key}.title`)}</h4>
                  <p className="text-xs sm:text-sm text-white/60 leading-relaxed">
                    {t(`summer.philosophy.${key}.description`)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Weekly Structure */}
        <div className="mb-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-accent-glow" />
            {t('summer.weeklyStructure.title')}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {WEEKLY_KEYS.map((key) => (
              <div
                key={key}
                className="rounded-card border border-border-strong bg-clay-solid p-5 shadow-clay"
              >
                <Badge variant="neutral" className="mb-3">{t(`summer.weeklyStructure.${key}.days`)}</Badge>
                <h4 className="font-bold text-white text-lg mb-1.5">{t(`summer.weeklyStructure.${key}.focus`)}</h4>
                <p className="text-xs sm:text-sm text-white/60 leading-relaxed">
                  {t(`summer.weeklyStructure.${key}.description`)}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Daily Schedule */}
        <div className="mb-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-accent-glow" />
            {t('summer.schedule.title')}
          </h3>
          <ScheduleTable schedule={data.schedule} />
        </div>

        {/* Benefits Summary */}
        <div className="mb-6">
          <div className="rounded-card border border-border-strong bg-clay-solid p-5 sm:p-6 shadow-clay">
            <h3 className="font-bold text-white mb-4">{t('summer.benefits.title')}</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-sm text-white/70">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-emerald-400 text-xs">✓</span>
                </span>
                {t('summer.benefits.schedule')}
              </li>
              <li className="flex items-start gap-3 text-sm text-white/70">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-emerald-400 text-xs">✓</span>
                </span>
                {t('summer.benefits.curriculum')}
              </li>
            </ul>
          </div>
        </div>

        {/* Timezone Notice */}
        <div className="mb-8">
          <div className="flex items-start gap-3 rounded-card border border-border-strong bg-surface-elevated px-5 py-4 shadow-clay">
            <Globe className="w-5 h-5 text-accent-glow flex-shrink-0 mt-0.5" />
            <p className="text-xs sm:text-sm text-white/50 leading-relaxed">
              {t('summer.timezoneNotice')}
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <button type="button" className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-btn font-semibold text-base bg-accent text-white shadow-clay-button w-full sm:w-auto min-w-[280px]">
            {t('summer.cta.button')}
          </button>
          <p className="mt-3 text-xs text-white/40">
            {t('summer.cta.description')}
          </p>
        </div>
      </section>
    );
  }
);
