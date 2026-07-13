import React from 'react';
import { Zap, Users } from 'lucide-react';
import { RadioCard } from '@/components/enrollment/ui/RadioCard';
import { CheckboxCard } from '@/components/enrollment/ui/CheckboxCard';
import { Badge } from '@/components/enrollment/ui/Badge';
import { formatWon } from '@/lib/enrollment/utils/format';
import {
  HOUR_PACKAGES,
  CONTENT_ITEMS,
  SALES_LABELS,
  isHourPackageCategory,
  getBasePrice,
  getSavingsAmount,
} from '@/lib/enrollment/data/pricing';
import { useLanguage } from '@/lib/enrollment/i18n/LanguageContext';
import { SectionHeader } from './SectionHeader';
import { LeadCoachesModal } from './LeadCoachesModal';
import type { CategoryId, OptionSelection } from '@/types/enrollment';
import type { LeadCoachProfile } from '@/lib/enrollment/data/lead-coaches';

interface PackageSelectionSectionProps {
  resolvedCategoryId: CategoryId;
  selectedOption: OptionSelection | null;
  onOptionSelect: (option: OptionSelection) => void;
  onContentToggle: (contentId: string) => void;
  totalPrice: number;
  sectionNumber: number;
  leadCoaches: LeadCoachProfile[];
}

export const PackageSelectionSection = React.forwardRef<HTMLDivElement, PackageSelectionSectionProps>(
  function PackageSelectionSection(
    { resolvedCategoryId, selectedOption, onOptionSelect, onContentToggle, totalPrice, sectionNumber, leadCoaches },
    ref
  ) {
    const { t, locale } = useLanguage();
    const [coachesOpen, setCoachesOpen] = React.useState(false);

    const sectionTitle =
      resolvedCategoryId === 'content'
        ? t('packageSelection.content')
        : t('packageSelection.hourPackage');

    const hourPackages = isHourPackageCategory(resolvedCategoryId)
      ? HOUR_PACKAGES[resolvedCategoryId]
      : [];
    const standardPackages = hourPackages.filter((pkg) => !pkg.premium);
    const premiumPackages = hourPackages.filter((pkg) => pkg.premium);

    return (
      <section
        ref={ref}
        className="max-w-3xl mx-auto px-4 sm:px-6 pb-10 sm:pb-16 animate-fade-in scroll-mt-20"
      >
        <SectionHeader number={sectionNumber} title={sectionTitle} />

        {/* 1:1 / 비관리: 시간 패키지 */}
        {isHourPackageCategory(resolvedCategoryId) && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {standardPackages.map((pkg) => {
                const savings = getSavingsAmount(pkg, getBasePrice(resolvedCategoryId));
                const labelInfo = pkg.salesLabel ? SALES_LABELS[pkg.salesLabel] : null;
                return (
                  <RadioCard
                    key={pkg.id}
                    selected={
                      selectedOption?.type === 'hour-package' &&
                      selectedOption.packageId === pkg.id
                    }
                    onSelect={() => onOptionSelect({ type: 'hour-package', packageId: pkg.id })}
                  >
                    <div className="text-center space-y-3">
                      <div className="h-5">
                        {labelInfo && (
                          <Badge variant={labelInfo.variant}>{t(labelInfo.textKey)}</Badge>
                        )}
                      </div>
                      <p className="text-2xl font-bold text-white">{pkg.hours}{t('common.hours')}</p>
                      <div>
                        <p className="text-lg font-bold text-accent-glow">
                          {formatWon(pkg.totalPrice, locale)}
                        </p>
                        {savings > 0 && pkg.discountRate && (
                          <p className="text-sm sm:text-base font-bold text-rose-400 mt-1">
                            {t('common.savingsAmount', { amount: formatWon(savings, locale), rate: pkg.discountRate })}
                          </p>
                        )}
                      </div>
                    </div>
                  </RadioCard>
                );
              })}
            </div>

            {/* 프리미엄: 대표 코치와의 수업권 */}
            {premiumPackages.map((pkg) => (
              <RadioCard
                key={pkg.id}
                selected={
                  selectedOption?.type === 'hour-package' &&
                  selectedOption.packageId === pkg.id
                }
                onSelect={() => onOptionSelect({ type: 'hour-package', packageId: pkg.id })}
                className="mt-4"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-3 pr-7">
                    <div className="min-w-0">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-white/45">
                        <Zap className="w-3.5 h-3.5 fill-current" />
                        {t('packageSelection.premium.badge')}
                      </span>
                      <h3 className="text-base font-bold text-white mt-1.5">
                        {t('packageSelection.premium.name')}
                      </h3>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs sm:text-sm text-white/50">{pkg.hours}{t('common.hours')}</p>
                      <p className="text-lg font-bold text-accent-glow whitespace-nowrap">
                        {formatWon(pkg.totalPrice, locale)}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-white/50">
                    {t('packageSelection.premium.description')}
                  </p>
                  {leadCoaches.length > 0 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCoachesOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 mt-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-accent-glow/15 text-accent-glow border border-accent-glow/30 hover:bg-accent-glow/25 transition-colors"
                    >
                      <Users className="w-3.5 h-3.5" />
                      {t('packageSelection.premium.viewCoaches')}
                    </button>
                  )}
                </div>
              </RadioCard>
            ))}
          </>
        )}

        {/* 콘텐츠: 복수 선택 */}
        {resolvedCategoryId === 'content' && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {CONTENT_ITEMS.map((item) => {
                const checked =
                  selectedOption?.type === 'content' &&
                  selectedOption.contentIds.includes(item.id);
                return (
                  <CheckboxCard
                    key={item.id}
                    checked={!!checked}
                    onToggle={() => onContentToggle(item.id)}
                  >
                    <div className="space-y-2 pr-6">
                      <h4 className="font-bold text-white">{t(`contentItems.${item.id}.name`)}</h4>
                      <p className="text-xs text-white/40">
                        {t(`contentItems.${item.id}.description`)}
                      </p>
                      <p className="text-base font-bold text-accent-glow">
                        {t('packageSelection.monthlyPrefix')} {formatWon(item.monthlyPrice, locale)}
                      </p>
                    </div>
                  </CheckboxCard>
                );
              })}
            </div>
            {selectedOption?.type === 'content' &&
              selectedOption.contentIds.length > 0 && (
                <div className="mt-4 p-4 bg-accent-glow/10 rounded-card text-center border border-accent-glow/20">
                  <p className="text-xs sm:text-sm text-white/60">{t('packageSelection.totalMonthlyPrice')}</p>
                  <p className="text-2xl font-bold text-white">
                    {t('packageSelection.monthlyPrefix')} {formatWon(totalPrice, locale)}
                  </p>
                </div>
              )}
          </>
        )}

        <LeadCoachesModal
          open={coachesOpen}
          onClose={() => setCoachesOpen(false)}
          coaches={leadCoaches}
        />
      </section>
    );
  }
);
