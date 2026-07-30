'use client';

import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import { Header } from '@/components/enrollment/layout/Header';
import { Footer } from '@/components/enrollment/layout/Footer';
import { StickyTabNav } from '@/components/enrollment/layout/StickyTabNav';
import { useLanguage } from '@/lib/enrollment/i18n/LanguageContext';
import { ProgramTypeSection } from './enrollment/ProgramTypeSection';
import { ManagementTypeSection } from './enrollment/ManagementTypeSection';
import { ClassFormatSectionV2 } from './enrollment/ClassFormatSectionV2';
import { PackageSelectionSectionV2 } from './enrollment/PackageSelectionSectionV2';
import { SummarySection } from './enrollment/SummarySection';
import { SummerIntensiveSection } from './enrollment/SummerIntensiveSection';
import { CourseTypeToggle } from './enrollment/CourseTypeToggle';
import { APEnrollmentSection } from './enrollment/APEnrollmentSection';
import { ManagedShowcase } from './enrollment/ManagedShowcase';
import { useScrollBehavior } from '@/components/enrollment/hooks/useScrollBehavior';
import {
  ONE_ON_ONE_PACKAGES_V2,
  GROUP_PACKAGES_V2,
  UNMANAGED_PACKAGES_V2,
  CONTENT_ITEMS_V2,
} from '@/lib/enrollment/data/pricing-v2';
import {
  CATEGORIES,
  MANAGEMENT_SERVICES,
  resolveCategoryId,
} from '@/lib/enrollment/data/pricing';
import type { CourseType, ProgramType, ManagementType } from '@/types/enrollment';
import type { ClassFormatV2, CategoryIdV2, OptionSelectionV2 } from '@/types/enrollment-v2';
import type { LeadCoachProfile } from '@/lib/enrollment/data/lead-coaches';

interface EnrollmentPageV2Props {
  leadCoaches: LeadCoachProfile[];
}

/* ── 가격 계산 헬퍼 ─────────────────────────────────────────────── */
function getTotalPriceV2(categoryId: CategoryIdV2, option: OptionSelectionV2): number {
  if (option.type === 'hour-package') {
    const pkgs = categoryId === 'unmanaged' ? UNMANAGED_PACKAGES_V2 : ONE_ON_ONE_PACKAGES_V2;
    return pkgs.find(p => p.id === option.packageId)?.totalPrice ?? 0;
  }
  if (option.type === 'group-package') {
    return GROUP_PACKAGES_V2.find(p => p.id === option.packageId)?.totalPrice ?? 0;
  }
  if (option.type === 'content') {
    return option.contentIds.reduce((sum, id) => {
      return sum + (CONTENT_ITEMS_V2.find(c => c.id === id)?.monthlyPrice ?? 0);
    }, 0);
  }
  return 0;
}

function getSummaryLabelV2(categoryId: CategoryIdV2, option: OptionSelectionV2): string {
  if (option.type === 'hour-package') {
    const pkgs = categoryId === 'unmanaged' ? UNMANAGED_PACKAGES_V2 : ONE_ON_ONE_PACKAGES_V2;
    const pkg = pkgs.find(p => p.id === option.packageId);
    const catName = categoryId === 'unmanaged' ? '비관리형' : '1:1 정규수업';
    return pkg ? `${catName} ${pkg.hours}시간` : '';
  }
  if (option.type === 'group-package') {
    const pkg = GROUP_PACKAGES_V2.find(p => p.id === option.packageId);
    return pkg ? `1:4 그룹 ${pkg.name}` : '';
  }
  if (option.type === 'content') {
    const names = option.contentIds.map(id => CONTENT_ITEMS_V2.find(c => c.id === id)?.name).filter(Boolean);
    return `콘텐츠 — ${names.join(', ')}`;
  }
  return '';
}

/* ── 카테고리 매핑 ──────────────────────────────────────────────── */
function resolveCategoryIdV2(
  managementType: ManagementType,
  classFormat: ClassFormatV2 | null
): CategoryIdV2 | null {
  if (managementType === 'unmanaged') return 'unmanaged';
  if (!classFormat) return null;
  return classFormat; // 'one-on-one' | 'group' | 'content'
}

/* ── Main Component ─────────────────────────────────────────────── */
export function EnrollmentPageV2({ leadCoaches }: EnrollmentPageV2Props) {
  const { t } = useLanguage();
  const [courseType, setCourseType] = useState<CourseType>('sat');
  const [programType, setProgramType] = useState<ProgramType | null>(null);
  const [managementType, setManagementType] = useState<ManagementType | null>(null);
  const [classFormat, setClassFormat] = useState<ClassFormatV2 | null>(null);
  const [selectedOption, setSelectedOption] = useState<OptionSelectionV2 | null>(null);

  const searchParams = useSearchParams();

  const summerRef = useRef<HTMLDivElement>(null);
  const managementTypeRef = useRef<HTMLDivElement>(null);
  const formatRef = useRef<HTMLDivElement>(null);
  const packageRef = useRef<HTMLDivElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);

  const { scrollTo, autoScrollTimerRef } = useScrollBehavior();

  useEffect(() => {
    const program = searchParams.get('program');
    if (program === 'summer-intensive' || program === 'regular') {
      setProgramType(program);
      setTimeout(() => {
        const targetRef = program === 'regular' ? managementTypeRef : summerRef;
        scrollTo(targetRef, 'top', 250);
      }, 100);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── 파생 상태 ────────────────────────────────────────────────── */
  const categoryId = useMemo(
    () => managementType ? resolveCategoryIdV2(managementType, classFormat) : null,
    [managementType, classFormat]
  );

  const totalPrice = useMemo(
    () => categoryId && selectedOption ? getTotalPriceV2(categoryId, selectedOption) : 0,
    [categoryId, selectedOption]
  );

  const summary = useMemo(
    () => categoryId && selectedOption ? getSummaryLabelV2(categoryId, selectedOption) : '',
    [categoryId, selectedOption]
  );

  const hasValidOption = useMemo(() => {
    if (!selectedOption) return false;
    if (selectedOption.type === 'content') return selectedOption.contentIds.length > 0;
    return true;
  }, [selectedOption]);

  /* ── SummarySection 호환용 (v1 타입 브리지) ──────────────────── */
  const summaryCompatOption = useMemo(() => {
    if (!selectedOption) return null;
    if (selectedOption.type === 'hour-package') return selectedOption;
    if (selectedOption.type === 'content') return selectedOption;
    // group-package → 임시 hour-package로 표시
    if (selectedOption.type === 'group-package') {
      return { type: 'hour-package' as const, packageId: selectedOption.packageId };
    }
    return null;
  }, [selectedOption]);

  /* ── 이벤트 핸들러 ────────────────────────────────────────────── */
  const handleCourseTypeChange = useCallback((type: CourseType) => {
    setCourseType(type);
    if (type === 'ap') {
      setProgramType(null); setManagementType(null);
      setClassFormat(null);  setSelectedOption(null);
    }
  }, []);

  const handleProgramSelect = useCallback((type: ProgramType) => {
    const changed = type !== programType;
    setProgramType(type);
    if (changed) { setManagementType(null); setClassFormat(null); setSelectedOption(null); }
    scrollTo(type === 'regular' ? managementTypeRef : summerRef, 'top', 250);
  }, [programType, scrollTo]);

  const handleManagementSelect = useCallback((type: ManagementType) => {
    const changed = type !== managementType;
    setManagementType(type);
    if (changed) {
      setSelectedOption(null);
      // 비관리형: 수업 형태 선택 불필요
      setClassFormat(type === 'unmanaged' ? null : null);
    }
    scrollTo(managementTypeRef, 'peek-next');
  }, [managementType, scrollTo]);

  const handleFormatSelect = useCallback((format: ClassFormatV2) => {
    const changed = format !== classFormat;
    setClassFormat(format);
    if (changed) setSelectedOption(null);
    scrollTo(packageRef, 'top', 250);
  }, [classFormat, scrollTo]);

  const handleOptionSelect = useCallback((option: OptionSelectionV2) => {
    setSelectedOption(option);
    if (option.type !== 'content') {
      if (autoScrollTimerRef.current) clearTimeout(autoScrollTimerRef.current);
      autoScrollTimerRef.current = setTimeout(() => scrollTo(summaryRef, 'top', 0), 400);
    }
  }, [scrollTo, autoScrollTimerRef]);

  const handleContentToggle = useCallback((contentId: string) => {
    setSelectedOption(prev => {
      const current = prev?.type === 'content' ? prev.contentIds : [];
      const next = current.includes(contentId)
        ? current.filter(id => id !== contentId)
        : [...current, contentId];
      return { type: 'content', contentIds: next };
    });
  }, []);

  /* ── 표시 조건 ────────────────────────────────────────────────── */
  const showRegularFlow = programType === 'regular';
  // 관리형: 수업 형태 선택 화면
  const showFormatSection = showRegularFlow && managementType === 'managed';
  // 비관리형 or 관리형+형태선택 완료
  const showPackageSection =
    showRegularFlow &&
    managementType !== null &&
    (managementType === 'unmanaged' || (managementType === 'managed' && classFormat !== null));
  const showSummarySection = showPackageSection && hasValidOption && selectedOption !== null;

  // sticky 탭은 정규수업 선택 이후 노출
  const showStickyNav = showRegularFlow;

  /* ── 가격 요약용 v1 categoryId 브리지 ───────────────────────── */
  const legacyCategoryId = useMemo(() => {
    if (!managementType) return null;
    if (managementType === 'unmanaged') return 'unmanaged' as const;
    if (classFormat === 'one-on-one') return 'one-on-one' as const;
    if (classFormat === 'content') return 'content' as const;
    return null;
  }, [managementType, classFormat]);

  const legacyCategoryData = useMemo(
    () => legacyCategoryId ? CATEGORIES.find(c => c.id === legacyCategoryId) : undefined,
    [legacyCategoryId]
  );

  return (
    <div className="min-h-screen flex flex-col bg-page">
      <Header courseType={courseType} />
      <StickyTabNav visible={showStickyNav} />

      <main className="flex-1">
        <CourseTypeToggle courseType={courseType} onChange={handleCourseTypeChange} />

        {/* Hero */}
        <section className="pt-12 sm:pt-20 pb-8 sm:pb-12 text-center px-4">
          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 tracking-tight">
            {courseType === 'sat' ? t('hero.sat.title') : t('hero.ap.title')}
          </h1>
          <p className="text-sm sm:text-base text-white/60 max-w-xl mx-auto mb-6">
            {courseType === 'sat' ? t('hero.sat.description') : t('hero.ap.description')}
          </p>
          <ChevronDown className="w-5 h-5 text-white/30 mx-auto animate-bounce" />
        </section>

        {courseType === 'sat' && (
          <>
            {/* Step 1: 프로그램 선택 */}
            <ProgramTypeSection programType={programType} onSelect={handleProgramSelect} />

            {programType === 'summer-intensive' && (
              <SummerIntensiveSection ref={summerRef} />
            )}

            {showRegularFlow && (
              <>
                {/* ── 관리형 서비스 쇼케이스 (anchor: section-showcase) ── */}
                <div id="section-showcase">
                  <ManagedShowcase />
                </div>

                {/* ── Step 2: 관리형/비관리형 선택 (anchor: section-selection) ── */}
                <div id="section-selection">
                  <ManagementTypeSection
                    ref={managementTypeRef}
                    managementType={managementType}
                    onSelect={handleManagementSelect}
                    sectionNumber={2}
                  />
                </div>

                {/* Step 3: 수업 형태 선택 (관리형만) */}
                {showFormatSection && (
                  <ClassFormatSectionV2
                    ref={formatRef}
                    classFormat={classFormat}
                    onSelect={handleFormatSelect}
                    sectionNumber={3}
                  />
                )}

                {/* Step 4: 패키지/콘텐츠 선택 */}
                {showPackageSection && categoryId && (
                  <PackageSelectionSectionV2
                    ref={packageRef}
                    categoryId={categoryId}
                    selectedOption={selectedOption}
                    onOptionSelect={handleOptionSelect}
                    onContentToggle={handleContentToggle}
                    totalPrice={totalPrice}
                    sectionNumber={managementType === 'managed' ? 4 : 3}
                  />
                )}

                {/* Step 5: 요약 (anchor: section-summary) */}
                {showSummarySection && legacyCategoryId && summaryCompatOption && managementType && (
                  <div id="section-summary">
                    <SummarySection
                      ref={summaryRef}
                      resolvedCategoryId={legacyCategoryId}
                      categoryData={legacyCategoryData}
                      managementType={managementType}
                      classFormat={classFormat === 'one-on-one' ? 'one-on-one' : classFormat === 'content' ? 'content' : null}
                      selectedOption={summaryCompatOption}
                      totalPrice={totalPrice}
                      summary={summary}
                      isMonthly={selectedOption?.type === 'content'}
                      sectionNumber={managementType === 'managed' ? 5 : 4}
                    />
                  </div>
                )}
              </>
            )}
          </>
        )}

        {courseType === 'ap' && <APEnrollmentSection />}
      </main>

      <Footer />
    </div>
  );
}
