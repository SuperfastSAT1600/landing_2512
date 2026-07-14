import React, { useMemo } from 'react';
import { Badge } from '@/components/enrollment/ui/Badge';
import { formatWon } from '@/lib/enrollment/utils/format';
import {
  MANAGEMENT_SERVICES,
  HOUR_PACKAGES,
  isHourPackageCategory,
  getBasePrice,
  getSavingsAmount,
} from '@/lib/enrollment/data/pricing';
import { useLanguage } from '@/lib/enrollment/i18n/LanguageContext';
import { ServiceIndicator } from './ServiceIndicator';
import { SectionHeader } from './SectionHeader';
import type { Category, CategoryId, ManagementType, ClassFormat, OptionSelection } from '@/types/enrollment';

interface SummarySectionProps {
  resolvedCategoryId: CategoryId;
  categoryData: Category | undefined;
  managementType: ManagementType;
  classFormat: ClassFormat | null;
  selectedOption: OptionSelection;
  totalPrice: number;
  summary: string;
  isMonthly: boolean;
  sectionNumber: number;
}

export const SummarySection = React.forwardRef<HTMLDivElement, SummarySectionProps>(
  function SummarySection(
    { resolvedCategoryId, categoryData, managementType, classFormat, selectedOption, totalPrice, summary, isMonthly, sectionNumber },
    ref
  ) {
    const { t, locale } = useLanguage();

    const savingsInfo = useMemo(() => {
      if (selectedOption.type !== 'hour-package' || !isHourPackageCategory(resolvedCategoryId)) return null;
      const pkg = HOUR_PACKAGES[resolvedCategoryId].find(
        (p) => p.id === selectedOption.packageId
      );
      if (!pkg?.discountRate) return null;
      const basePrice = getBasePrice(resolvedCategoryId);
      const savings = getSavingsAmount(pkg, basePrice);
      if (savings <= 0) return null;
      return { savings, discountRate: pkg.discountRate };
    }, [resolvedCategoryId, selectedOption]);

    return (
      <section
        ref={ref}
        className="max-w-3xl mx-auto px-4 sm:px-6 pb-12 sm:pb-20 animate-fade-in scroll-mt-20"
      >
        <SectionHeader number={sectionNumber} title={t('summary.sectionTitle')} />

        <div className="bg-surface-elevated rounded-card border border-border-strong shadow-clay-float overflow-hidden mb-6">
          {/* 선택 요약 */}
          <div className="bg-accent-glow/10 px-4 sm:px-6 py-3 sm:py-4 border-b border-accent-glow/15">
            <p className="text-accent-glow/70 text-xs sm:text-sm">{t('summary.selectedClass')}</p>
            <p className="text-white font-bold text-base sm:text-lg">{summary}</p>
          </div>

          {/* 가격 */}
          <div className="px-4 sm:px-6 py-6 sm:py-8 text-center border-b border-white/5">
            <p className="text-xs sm:text-sm text-white/50 mb-1">
              {isMonthly ? t('summary.monthlyPrice') : t('summary.totalPrice')}
            </p>
            <p className="text-3xl sm:text-5xl font-bold text-white">
              {formatWon(totalPrice, locale)}
              {isMonthly && (
                <span className="text-base sm:text-lg font-medium text-white/50">{t('common.perMonth')}</span>
              )}
            </p>
            {savingsInfo && (
              <p className="text-sm sm:text-base font-bold text-rose-400 mt-2">
                {t('common.savingsVsRegular', { amount: formatWon(savingsInfo.savings, locale, { manThreshold: 1 }), rate: savingsInfo.discountRate })}
              </p>
            )}
          </div>

          {/* 선택 상세 */}
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-white/5 bg-white/[0.02]">
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="text-white/50">{t('summary.managementTypeLabel')}</span>
              <span className="font-medium text-white/80">
                {managementType === 'managed' ? t('common.managed') : t('common.unmanaged')}
              </span>
            </div>
            {managementType === 'managed' && classFormat && (
              <div className="flex items-center justify-between text-xs sm:text-sm mt-2">
                <span className="text-white/50">{t('summary.classFormatLabel')}</span>
                <span className="font-medium text-white/80">
                  {t(`classFormat.${classFormat}.name`)}
                </span>
              </div>
            )}
          </div>

          {/* 포함 관리 서비스 요약 */}
          <div className="px-4 sm:px-6 py-4 sm:py-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="font-bold text-white">
                {t('summary.includedServices')}
              </h3>
              <Badge variant="neutral">{t(`category.${resolvedCategoryId}.managementLevel`)}</Badge>
            </div>
            <ul className="space-y-2.5">
              {MANAGEMENT_SERVICES[resolvedCategoryId].map((service) => (
                <ServiceIndicator
                  key={service.key}
                  name={t(`services.${service.key}`)}
                  included={service.included}
                  variant="list"
                />
              ))}
            </ul>
          </div>
        </div>

      </section>
    );
  }
);
