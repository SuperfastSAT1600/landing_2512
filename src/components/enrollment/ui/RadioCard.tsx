'use client';

import { Check } from 'lucide-react';
import { Card } from './Card';

interface RadioCardProps {
  selected: boolean;
  onSelect: () => void;
  children: React.ReactNode;
  className?: string;
}

export function RadioCard({
  selected,
  onSelect,
  children,
  className = '',
}: RadioCardProps) {
  return (
    <Card
      onClick={onSelect}
      selected={selected}
      className={`relative ${className}`}
    >
      {selected && (
        <div className="absolute top-3 right-3 w-6 h-6 bg-accent-glow rounded-full flex items-center justify-center">
          <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
        </div>
      )}
      {children}
    </Card>
  );
}
