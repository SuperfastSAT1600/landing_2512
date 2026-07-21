type BadgeVariant = 'primary' | 'success' | 'warning' | 'neutral';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const VARIANT_STYLES: Record<BadgeVariant, string> = {
  primary: 'bg-white text-accent',
  success: 'bg-accent-glow/15 text-accent-glow',
  warning: 'bg-amber-500/15 text-amber-400',
  neutral: 'bg-white/15 text-white/80',
};

export function Badge({
  children,
  variant = 'primary',
  className = '',
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${VARIANT_STYLES[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
