'use client';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  selected?: boolean;
  padding?: boolean;
}

export function Card({
  children,
  className = '',
  onClick,
  selected = false,
  padding = true,
}: CardProps) {
  const baseClasses = 'bg-clay-solid border border-border-strong rounded-card shadow-clay';
  const interactiveClasses = onClick
    ? 'card-selectable'
    : '';
  const selectedClasses = selected ? 'selected' : '';
  const paddingClasses = padding ? 'p-4 sm:p-5' : '';

  return (
    <div
      className={`${baseClasses} ${interactiveClasses} ${selectedClasses} ${paddingClasses} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      {children}
    </div>
  );
}
