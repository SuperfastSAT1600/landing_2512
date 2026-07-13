'use client';

import { Check } from 'lucide-react';
import { Card } from './Card';

interface CheckboxCardProps {
  checked: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  className?: string;
}

export function CheckboxCard({
  checked,
  onToggle,
  children,
  className = '',
}: CheckboxCardProps) {
  return (
    <Card
      onClick={onToggle}
      selected={checked}
      className={`relative ${className}`}
    >
      <div
        className={`absolute top-3 right-3 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
          checked
            ? 'bg-accent-glow border-accent-glow'
            : 'border-white/20 bg-white/5'
        }`}
      >
        {checked && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
      </div>
      {children}
    </Card>
  );
}
