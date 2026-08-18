import { BookOpen, Users, TrendingUp, Star, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/enrollment/ui/Badge';
import { AP_PACKAGES, AP_SUBJECTS } from '@/lib/enrollment/data/pricing';
import { useLanguage } from '@/lib/enrollment/i18n/LanguageContext';
import { formatWon } from '@/lib/enrollment/utils/format';
import { APCustomHourSection } from './APCustomHourSection';

const CARD_STYLES: Record<string, string> = {
  'ap-standard': 'border-border-strong ring-1 ring-accent-glow/30',
};

const DEFAULT_CARD_STYLE = 'border-border-strong';
const CARD_ACCENT = 'text-indigo-300';

const SALES_BADGE: Record<string, { textKey: string; variant: 'warning' | 'success' | 'primary' }> = {
  entry: { textKey: 'salesLabels.entry', variant: 'primary' },
  popular: { textKey: 'salesLabels.popular', variant: 'warning' },
  bestValue: { textKey: 'salesLabels.bestValue', variant: 'success' },
};

const VALUE_PROP_KEYS = ['expertCoach', 'customCurriculum', 'performanceMgmt'] as const;
const VALUE_PROP_ICONS = [Star, ShieldCheck, TrendingUp] as const;

export function APEnrollmentSection() {
  const { t, locale } = useLanguage();

  return (
    <section className="max-w-3xl mx-auto px-4 sm:px-6 pb-10 sm:pb-16 animate-fade-in scroll-mt-20">
      {/* Package Cards */}
      <div className="mb-8">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-accent-glow" />
          {t('ap.packageTitle')}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {AP_PACKAGES.map((pkg) => {
            const badge = pkg.salesLabel ? SALES_BADGE[pkg.salesLabel] : null;
            return (
              <div
                key={pkg.id}
                className={`rounded-card border bg-clay-solid ${CARD_STYLES[pkg.id] || DEFAULT_CARD_STYLE} p-5 shadow-clay relative`}
              >
                <div className="h-5 mb-2">
                  {badge && <Badge variant={badge.variant}>{t(badge.textKey)}</Badge>}
                </div>
                <h4 className={`text-lg font-bold ${CARD_ACCENT} mb-1`}>
                  {pkg.name}
                </h4>
                <p className="text-2xl font-bold text-white flex items-baseline gap-2">
                  {formatWon(pkg.price, locale)}
                  <span className="text-sm font-medium text-white/60 tracking-wide">({pkg.hours}{t('common.hours')})</span>
                </p>
                {pkg.discountRate && (
                  <p className="mt-3 text-sm font-bold text-rose-400">
                    {t('common.discountApplied', { rate: pkg.discountRate })}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Custom Hour Calculator */}
      <APCustomHourSection />

      {/* Why AP with Us */}
      <div className="mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {VALUE_PROP_KEYS.map((key, i) => {
            const Icon = VALUE_PROP_ICONS[i];
            return (
              <div
                key={key}
                className="rounded-card border border-border-strong bg-clay-solid p-4 shadow-clay"
              >
                <div className="w-8 h-8 rounded-lg bg-accent-glow/15 flex items-center justify-center mb-2.5">
                  <Icon className="w-4 h-4 text-accent-glow" />
                </div>
                <h4 className="font-semibold text-white text-sm mb-1">{t(`ap.valueProps.${key}.title`)}</h4>
                <p className="text-xs text-white/70 leading-relaxed">{t(`ap.valueProps.${key}.description`)}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Subjects */}
      <div className="mb-8">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-accent-glow" />
          {t('ap.subjectsTitle')}
        </h3>
        <div className="rounded-card border border-border-strong bg-clay-solid shadow-clay overflow-hidden">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-5">
            {AP_SUBJECTS.map((name) => (
              <div key={name} className="flex items-center gap-2 text-sm text-white/80">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-glow" />
                {name}
              </div>
            ))}
          </div>
        </div>
        <p className="mt-2 text-xs text-white/50 text-center">
          {t('ap.subjectsNote')}
        </p>
      </div>

      {/* CTA */}
      <div className="text-center">
        <button type="button" className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-btn font-semibold text-base bg-accent text-white shadow-clay-button w-full sm:w-auto min-w-[280px]">
          {t('ap.cta.button')}
        </button>
        <p className="mt-3 text-xs text-white/60">
          {t('ap.cta.description')}
        </p>
      </div>
    </section>
  );
}
