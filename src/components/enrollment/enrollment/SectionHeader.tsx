export function SectionHeader({ number, title }: { number: number; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div aria-hidden="true" className="w-8 h-8 rounded-full bg-accent-glow text-white flex items-center justify-center text-sm font-bold flex-shrink-0 shadow-glow">
        {number}
      </div>
      <h2 className="text-xl sm:text-2xl font-bold text-white">{title}</h2>
    </div>
  );
}
