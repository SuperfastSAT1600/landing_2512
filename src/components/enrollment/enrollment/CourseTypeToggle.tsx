'use client';

import type { CourseType } from '@/types/enrollment';

interface CourseTypeToggleProps {
  courseType: CourseType;
  onChange: (type: CourseType) => void;
}

const OPTIONS: { id: CourseType; label: string }[] = [
  { id: 'sat', label: 'SAT' },
  { id: 'ap', label: 'AP' },
];

export function CourseTypeToggle({ courseType, onChange }: CourseTypeToggleProps) {
  const toggle = () => onChange(courseType === 'sat' ? 'ap' : 'sat');

  return (
    <div className="flex justify-center px-4 pt-6 sm:pt-8">
      <button
        onClick={toggle}
        className="relative inline-flex rounded-full border border-border-strong bg-clay-solid p-1 shadow-clay cursor-pointer"
      >
        {/* Sliding indicator */}
        <div
          className={`absolute top-1 bottom-1 w-[calc(50%-2px)] rounded-full transition-all duration-300 ease-out ${
            courseType === 'sat'
              ? 'left-1 bg-gradient-to-r from-accent to-blue-400/80'
              : 'left-[calc(50%+2px)] bg-gradient-to-r from-rose-400/80 to-red-500/80'
          }`}
        />
        {OPTIONS.map((opt) => (
          <span
            key={opt.id}
            className={`relative z-10 px-8 py-2.5 rounded-full text-base font-semibold transition-colors duration-200 select-none ${
              courseType === opt.id
                ? 'text-white'
                : 'text-white/60'
            }`}
          >
            {opt.label}
          </span>
        ))}
      </button>
    </div>
  );
}
