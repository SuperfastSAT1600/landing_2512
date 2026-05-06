interface Props {
  number: string;
  title: string;
  titleEn: string;
  subtitle: string;
}

export function SectionHeader({ number, title, titleEn, subtitle }: Props) {
  return (
    <div className="mb-6 print:mb-3">
      {/* Badge + Korean title row */}
      <div className="flex items-center gap-3 mb-1">
        <span
          className="flex-shrink-0 rounded-full px-2.5 py-0.5 text-white font-bold"
          style={{ background: '#6085FF', fontSize: 11, lineHeight: '1.6' }}
        >
          {number}
        </span>
        <h2
          className="leading-tight m-0"
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: '#0f172a',
            fontFamily: 'var(--font-sans)',
            lineHeight: 1.3,
          }}
        >
          {title}
          <span
            className="ml-2 font-normal"
            style={{ fontSize: 14, color: '#94a3b8' }}
          >
            {titleEn}
          </span>
        </h2>
      </div>
      {/* Subtitle question */}
      <p
        className="m-0"
        style={{
          paddingLeft: 'calc(28px + 0.75rem)',
          fontSize: 13,
          fontWeight: 400,
          color: '#64748B',
          lineHeight: 1.5,
        }}
      >
        {subtitle}
      </p>
    </div>
  );
}
