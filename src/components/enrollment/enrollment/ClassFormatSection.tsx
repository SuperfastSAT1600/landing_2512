import React from 'react';
import { RadioCard } from '@/components/enrollment/ui/RadioCard';
import { Badge } from '@/components/enrollment/ui/Badge';
import { CLASS_FORMATS, MANAGEMENT_SERVICES } from '@/lib/enrollment/data/pricing';
import { useLanguage } from '@/lib/enrollment/i18n/LanguageContext';
import { useScrollReveal } from '@/hooks/enrollment/useScrollReveal';
import { ICON_MAP } from './icons';
import { SectionHeader } from './SectionHeader';
import { ServiceCard } from './ServiceCard';
import type { ClassFormat, Category, CategoryId } from '@/types/enrollment';

interface ClassFormatSectionProps {
  classFormat: ClassFormat | null;
  onSelect: (format: ClassFormat) => void;
  sectionNumber: number;
  resolvedCategoryId: CategoryId | null;
  categoryData: Category | undefined;
  serviceCardRef?: React.Ref<HTMLDivElement>;
}

export const ClassFormatSection = React.forwardRef<HTMLDivElement, ClassFormatSectionProps>(
  function ClassFormatSection({ classFormat, onSelect, sectionNumber, resolvedCategoryId, categoryData, serviceCardRef }, ref) {
    const { t } = useLanguage();
    const gridRef = useScrollReveal(0.05);
    const services = resolvedCategoryId ? MANAGEMENT_SERVICES[resolvedCategoryId] : null;

    return (
      <section
        ref={ref}
        className="max-w-3xl mx-auto px-4 sm:px-6 pb-10 sm:pb-16 animate-fade-in scroll-mt-20"
      >
        <SectionHeader number={sectionNumber} title={t('classFormat.sectionTitle')} />
        <div ref={gridRef} className="reveal-children grid grid-cols-1 sm:grid-cols-3 gap-4">
          {CLASS_FORMATS.map((cf, i) => {
            const IconComponent = ICON_MAP[cf.icon];
            const isSelected = classFormat === cf.id;
            return (
              <React.Fragment key={cf.id}>
                <div className="reveal-item" style={{ '--stagger': i } as React.CSSProperties}>
                <RadioCard
                  selected={isSelected}
                  onSelect={() => onSelect(cf.id)}
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start justify-between">
                      <div className="w-10 h-10 rounded-xl bg-accent-glow/15 flex items-center justify-center">
                        {IconComponent && (
                          <IconComponent className="w-5 h-5 text-accent-glow" />
                        )}
                      </div>
                      {cf.recommended && (
                        <Badge variant="primary">{t('common.recommended')}</Badge>
                      )}
                    </div>
                    <h3 className="font-bold text-white text-lg">{t(`classFormat.${cf.id}.name`)}</h3>
                    <p className="text-xs sm:text-sm text-white/60 leading-relaxed">
                      {t(`classFormat.${cf.id}.description`)}
                    </p>
                  </div>
                </RadioCard>
                </div>
                {/* Mobile: ServiceCard inline after selected card */}
                {isSelected && services && categoryData && (
                  <div ref={serviceCardRef} className="sm:hidden animate-fade-in">
                    <ServiceCard
                      categoryName={t(`classFormat.${resolvedCategoryId}.name`)}
                      managementLevel={t(`category.${resolvedCategoryId}.managementLevel`)}
                      services={services}
                    />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Desktop: ServiceCard below grid */}
        {classFormat && services && categoryData && (
          <div className="hidden sm:block mt-6 animate-fade-in">
            <ServiceCard
              categoryName={t(`classFormat.${resolvedCategoryId}.name`)}
              managementLevel={t(`category.${resolvedCategoryId}.managementLevel`)}
              services={services}
            />
          </div>
        )}
      </section>
    );
  }
);
