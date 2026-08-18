import React from 'react';
import { Check, X } from 'lucide-react';
import { RadioCard } from '@/components/enrollment/ui/RadioCard';
import { Badge } from '@/components/enrollment/ui/Badge';
import { MANAGEMENT_TYPES, MANAGEMENT_SERVICES } from '@/lib/enrollment/data/pricing';
import { useLanguage } from '@/lib/enrollment/i18n/LanguageContext';
import { useScrollReveal } from '@/hooks/enrollment/useScrollReveal';
import { ICON_MAP } from './icons';
import { SectionHeader } from './SectionHeader';
import type { ManagementType } from '@/types/enrollment';

const MANAGED_SERVICE_LIST = MANAGEMENT_SERVICES['one-on-one'];
const UNMANAGED_SET = new Set(
  MANAGEMENT_SERVICES['unmanaged'].filter((s) => s.included).map((s) => s.key)
);

const COMPARISON_DATA = MANAGED_SERVICE_LIST.map((s) => ({
  key: s.key,
  managed: s.included,
  unmanaged: UNMANAGED_SET.has(s.key),
}));

function StatusIcon({ included }: { included: boolean }) {
  return included ? (
    <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center">
      <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
    </div>
  ) : (
    <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center">
      <X className="w-3.5 h-3.5 text-white/20" strokeWidth={3} />
    </div>
  );
}

interface ManagementTypeSectionProps {
  managementType: ManagementType | null;
  onSelect: (type: ManagementType) => void;
  sectionNumber: number;
}

export const ManagementTypeSection = React.forwardRef<HTMLDivElement, ManagementTypeSectionProps>(
  function ManagementTypeSection({ managementType, onSelect, sectionNumber }, ref) {
    const { t } = useLanguage();
    const gridRef = useScrollReveal(0.05);
    const tableRef = useScrollReveal(0.1);

    return (
      <section ref={ref} className="max-w-3xl mx-auto px-4 sm:px-6 pb-10 sm:pb-16 animate-fade-in scroll-mt-20">
        <SectionHeader number={sectionNumber} title={t('managementType.sectionTitle')} />
        <div ref={gridRef} className="reveal-children grid grid-cols-1 sm:grid-cols-2 gap-4">
          {MANAGEMENT_TYPES.map((mt, i) => {
            const IconComponent = ICON_MAP[mt.icon];
            return (
              <div
                key={mt.id}
                className="reveal-item"
                style={{ '--stagger': i } as React.CSSProperties}
              >
              <RadioCard
                selected={managementType === mt.id}
                onSelect={() => onSelect(mt.id)}
                className="min-h-[140px] h-full"
              >
                <div className="flex flex-col gap-3 h-full">
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-xl bg-accent-glow/15 flex items-center justify-center">
                      {IconComponent && (
                        <IconComponent className="w-5 h-5 text-accent-glow" />
                      )}
                    </div>
                    {mt.recommended && <Badge variant="primary">{t('common.recommended')}</Badge>}
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-lg">{t(`managementType.${mt.id}.name`)}</h3>
                    <Badge variant="neutral" className="mt-1">{t(`managementType.${mt.id}.subtitle`)}</Badge>
                  </div>
                  <p className="text-xs sm:text-sm text-white/60 leading-relaxed">
                    {t(`managementType.${mt.id}.description`)}
                  </p>
                  {mt.socialProof && (
                    <p className="text-xs sm:text-sm font-medium text-accent-glow">
                      {t(`managementType.${mt.id}.socialProof`)}
                    </p>
                  )}
                  <div
                    className={`mt-auto rounded-lg px-3 py-2 text-center text-xs sm:text-sm font-medium border ${
                      mt.recommended
                        ? 'bg-accent/10 text-accent-glow border-accent/20'
                        : 'bg-white/5 text-white/50 border-white/5'
                    }`}
                  >
                    {t(`managementType.${mt.id}.serviceHighlight`)}
                  </div>
                </div>
              </RadioCard>
              </div>
            );
          })}
        </div>

        {managementType && (
          <div ref={tableRef} className="mt-6 reveal">
            <div className="bg-surface-elevated rounded-card border border-border-strong shadow-clay overflow-hidden">
              <div className="grid grid-cols-[1fr_80px_80px] sm:grid-cols-[1fr_120px_120px] bg-white/5 border-b border-white/5">
                <div className="px-4 sm:px-5 py-3 text-xs sm:text-sm font-bold text-white/50">{t('managementType.tableHeader.service')}</div>
                <div className="px-2 py-3 text-xs sm:text-sm font-bold text-center text-accent-glow">{t('managementType.tableHeader.managed')}</div>
                <div className="px-2 py-3 text-xs sm:text-sm font-bold text-center text-white/50">{t('managementType.tableHeader.unmanaged')}</div>
              </div>
              {COMPARISON_DATA.map((row, i) => (
                <div
                  key={row.key}
                  className={`grid grid-cols-[1fr_80px_80px] sm:grid-cols-[1fr_120px_120px] items-center ${
                    i < COMPARISON_DATA.length - 1 ? 'border-b border-white/5' : ''
                  }`}
                >
                  <div className="px-4 sm:px-5 py-3 text-xs sm:text-sm text-white/80">{t(`services.${row.key}`)}</div>
                  <div className="flex justify-center py-3"><StatusIcon included={row.managed} /></div>
                  <div className="flex justify-center py-3"><StatusIcon included={row.unmanaged} /></div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    );
  }
);
