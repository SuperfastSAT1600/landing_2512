import { Check, X, ExternalLink } from 'lucide-react';

interface ServiceIndicatorProps {
  name: string;
  included: boolean;
  variant: 'card' | 'pill' | 'list';
  href?: string;
}

export function ServiceIndicator({ name, included, variant, href }: ServiceIndicatorProps) {
  if (variant === 'card') {
    const cardInner = (
      <>
        <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
          <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
        </div>
        <span className="text-xs sm:text-sm font-medium text-emerald-300">{name}</span>
        {href && <ExternalLink className="w-3.5 h-3.5 text-emerald-300/70 flex-shrink-0 ml-auto" />}
      </>
    );
    const cardClass =
      'flex items-center gap-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3.5 py-3';
    if (href) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={`${cardClass} hover:bg-emerald-500/20 hover:border-emerald-400/40 transition-colors`}
        >
          {cardInner}
        </a>
      );
    }
    return <div className={cardClass}>{cardInner}</div>;
  }

  if (variant === 'pill') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-white/40 bg-white/5 rounded-full px-3 py-1 border border-white/5">
        <X className="w-3 h-3" strokeWidth={2.5} />
        {name}
      </span>
    );
  }

  return (
    <li className="flex items-center gap-3">
      {included ? (
        <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
          <Check className="w-3 h-3 text-emerald-400" strokeWidth={3} />
        </div>
      ) : (
        <div className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0">
          <X className="w-3 h-3 text-white/30" strokeWidth={3} />
        </div>
      )}
      <span
        className={`text-xs sm:text-sm ${
          included ? 'text-white/80' : 'text-white/30 line-through'
        }`}
      >
        {name}
      </span>
    </li>
  );
}
