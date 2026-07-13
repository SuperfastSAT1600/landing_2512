'use client';

import Image from 'next/image';
import type { CourseType } from '@/types/enrollment';
import { LanguageToggle } from './LanguageToggle';

interface HeaderProps {
  courseType?: CourseType;
}

export function Header({ courseType = 'sat' }: HeaderProps) {
  const logo = courseType === 'ap' ? '/enrollment/logo-ap.png' : '/enrollment/logo.png';
  const alt = courseType === 'ap' ? 'SuperfastAP' : 'SuperfastSAT';

  return (
    <header className="sticky top-0 z-50 bg-[#050816d9] backdrop-blur-xl border-b border-border-strong">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="h-14 sm:h-16 flex items-center justify-between">
          <Image
            src={logo}
            alt={alt}
            width={200}
            height={32}
            className="h-8 w-[200px] object-contain"
            priority
          />
          <LanguageToggle />
        </div>
      </div>
    </header>
  );
}
