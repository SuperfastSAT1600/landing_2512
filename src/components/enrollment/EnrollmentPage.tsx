'use client';

import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import { Header } from '@/components/enrollment/layout/Header';
import { Footer } from '@/components/enrollment/layout/Footer';
import { useLanguage } from '@/lib/enrollment/i18n/LanguageContext';
import {
  CATEGORIES,
  resolveCategoryId,
  getSelectedOptionSummary,
  getSelectedTotalPrice,
} from '@/lib/enrollment/data/pricing';
import { ProgramTypeSection } from './enrollment/ProgramTypeSection';
import { ManagementTypeSection } from './enrollment/ManagementTypeSection';
import { ClassFormatSection } from './enrollment/ClassFormatSection';
import { PackageSelectionSection } from './enrollment/PackageSelectionSection';
import { SummarySection } from './enrollment/SummarySection';
import { SummerIntensiveSection } from './enrollment/SummerIntensiveSection';
import { CourseTypeToggle } from './enrollment/CourseTypeToggle';
import { APEnrollmentSection } from './enrollment/APEnrollmentSection';
import { useScrollBehavior } from '@/components/enrollment/hooks/useScrollBehavior';
import type { CourseType, ProgramType, ManagementType, ClassFormat, OptionSelection } from '@/types/enrollment';
import type { LeadCoachProfile } from '@/lib/enrollment/data/lead-coaches';

interface EnrollmentPageProps {
  leadCoaches: LeadCoachProfile[];
}

export function EnrollmentPage({ leadCoaches }: EnrollmentPageProps) {
  const { t } = useLanguage();
  const [courseType, setCourseType] = useState<CourseType>('sat');
  const [programType, setProgramType] = useState<ProgramType | null>(null);
  const [managementType, setManagementType] = useState<ManagementType | null>(null);
  const [classFormat, setClassFormat] = useState<ClassFormat | null>(null);
  const [selectedOption, setSelectedOption] = useState<OptionSelection | null>(null);

  const searchParams = useSearchParams();

  const summerRef = useRef<HTMLDivElement>(null);
  const managementTypeRef = useRef<HTMLDivElement>(null);
  const formatRef = useRef<HTMLDivElement>(null);
  const packageRef = useRef<HTMLDivElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const serviceCardRef = useRef<HTMLDivElement>(null);

  const { scrollTo, autoScrollTimerRef } = useScrollBehavior();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const program = searchParams.get('program');
    if (program === 'summer-intensive' || program === 'regular') {
      setProgramType(program);
      setTimeout(() => {
        const targetRef = program === 'regular' ? managementTypeRef : summerRef;
        scrollTo(targetRef, 'top', 250);
      }, 100);
    }
  }, []);

  const resolvedCategoryId = useMemo(
    () => (managementType ? resolveCategoryId(managementType, classFormat) : null),
    [managementType, classFormat]
  );

  const categoryData = useMemo(
    () => (resolvedCategoryId ? CATEGORIES.find((c) => c.id === resolvedCategoryId) : undefined),
    [resolvedCategoryId]
  );

  const totalPrice = useMemo(
    () => (resolvedCategoryId && selectedOption ? getSelectedTotalPrice(resolvedCategoryId, selectedOption) : 0),
    [resolvedCategoryId, selectedOption]
  );

  const summary = useMemo(
    () => (resolvedCategoryId && selectedOption ? getSelectedOptionSummary(resolvedCategoryId, selectedOption, t) : ''),
    [resolvedCategoryId, selectedOption, t]
  );

  const hasValidOption = useMemo(() => {
    if (!selectedOption) return false;
    if (selectedOption.type === 'content') return selectedOption.contentIds.length > 0;
    return true;
  }, [selectedOption]);

  const handleCourseTypeChange = useCallback((type: CourseType) => {
    setCourseType(type);
    if (type === 'ap') {
      setProgramType(null);
      setManagementType(null);
      setClassFormat(null);
      setSelectedOption(null);
    }
  }, []);

  const handleProgramSelect = useCallback((type: ProgramType) => {
    const changed = type !== programType;
    setProgramType(type);

    if (changed) {
      setManagementType(null);
      setClassFormat(null);
      setSelectedOption(null);
    }

    const targetRef = type === 'regular' ? managementTypeRef : summerRef;
    scrollTo(targetRef, 'top', 250);
  }, [programType, scrollTo]);

  const handleManagementSelect = useCallback((type: ManagementType) => {
    const changed = type !== managementType;
    setManagementType(type);

    if (changed) {
      setSelectedOption(null);
      setClassFormat(type === 'unmanaged' ? 'one-on-one' : null);
    }
    scrollTo(managementTypeRef, 'peek-next');
  }, [managementType, scrollTo]);

  const handleFormatSelect = useCallback((format: ClassFormat) => {
    const changed = format !== classFormat;
    setClassFormat(format);
    if (changed) setSelectedOption(null);

    const isMobile = window.innerWidth < 640;
    scrollTo(isMobile ? serviceCardRef : formatRef, isMobile ? 'center' : 'peek-next', 250);

    if (isMobile && changed) {
      if (autoScrollTimerRef.current) clearTimeout(autoScrollTimerRef.current);
      autoScrollTimerRef.current = setTimeout(() => scrollTo(packageRef, 'top', 0), 3000);
    }
  }, [classFormat, scrollTo, autoScrollTimerRef]);

  const handleOptionSelect = useCallback((option: OptionSelection) => {
    setSelectedOption(option);
    if (option.type !== 'content') {
      scrollTo(summaryRef, 'top', 300);
    }
  }, [scrollTo]);

  const handleContentToggle = useCallback((contentId: string) => {
    setSelectedOption((prev) => {
      const current = prev?.type === 'content' ? prev.contentIds : [];
      const next = current.includes(contentId)
        ? current.filter((id) => id !== contentId)
        : [...current, contentId];
      return { type: 'content', contentIds: next };
    });
  }, []);

  const showRegularFlow = programType === 'regular';
  const showFormatSection = showRegularFlow && managementType === 'managed';
  const showPackageSection = showRegularFlow && resolvedCategoryId !== null;
  const showSummarySection = showRegularFlow && resolvedCategoryId !== null && hasValidOption && selectedOption !== null;

  return (
    <div className="min-h-screen flex flex-col bg-page">
      <Header courseType={courseType} />

      <main className="flex-1">
        <CourseTypeToggle courseType={courseType} onChange={handleCourseTypeChange} />

        {/* Hero */}
        <section className="pt-12 sm:pt-20 pb-8 sm:pb-12 text-center px-4">
          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 tracking-tight">
            {courseType === 'sat'
              ? t('hero.sat.title')
              : t('hero.ap.title')}
          </h1>
          <p className="text-sm sm:text-base text-white/60 max-w-xl mx-auto mb-6">
            {courseType === 'sat'
              ? t('hero.sat.description')
              : t('hero.ap.description')}
          </p>
          <ChevronDown className="w-5 h-5 text-white/30 mx-auto animate-bounce" />
        </section>

        {courseType === 'sat' && (
          <>
            <ProgramTypeSection
              programType={programType}
              onSelect={handleProgramSelect}
            />

            {programType === 'summer-intensive' && (
              <SummerIntensiveSection ref={summerRef} />
            )}

            {showRegularFlow && (
              <ManagementTypeSection
                ref={managementTypeRef}
                managementType={managementType}
                onSelect={handleManagementSelect}
                sectionNumber={2}
              />
            )}

            {showFormatSection && (
              <ClassFormatSection
                ref={formatRef}
                classFormat={classFormat}
                onSelect={handleFormatSelect}
                sectionNumber={3}
                resolvedCategoryId={resolvedCategoryId}
                categoryData={categoryData}
                serviceCardRef={serviceCardRef}
              />
            )}

            {showPackageSection && resolvedCategoryId && (
              <PackageSelectionSection
                ref={packageRef}
                resolvedCategoryId={resolvedCategoryId}
                selectedOption={selectedOption}
                onOptionSelect={handleOptionSelect}
                onContentToggle={handleContentToggle}
                totalPrice={totalPrice}
                sectionNumber={4}
                leadCoaches={leadCoaches}
              />
            )}

            {showSummarySection && resolvedCategoryId && selectedOption && managementType && (
              <SummarySection
                ref={summaryRef}
                resolvedCategoryId={resolvedCategoryId}
                categoryData={categoryData}
                managementType={managementType}
                classFormat={classFormat}
                selectedOption={selectedOption}
                totalPrice={totalPrice}
                summary={summary}
                isMonthly={selectedOption.type === 'content'}
                sectionNumber={5}
              />
            )}
          </>
        )}

        {courseType === 'ap' && (
          <APEnrollmentSection />
        )}
      </main>

      <Footer />
    </div>
  );
}
