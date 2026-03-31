'use client';

import { getTimezonesByCountry, getUTCOffsetLabel } from '@/lib/timezone-utils';

interface TimezoneSelectProps {
  value: string;
  onChange: (tz: string) => void;
  /** When true, shows compact view with abbreviated labels for inline use */
  compact?: boolean;
  disabled?: boolean;
}

export function TimezoneSelect({ value, onChange, compact = false, disabled = false }: TimezoneSelectProps) {
  const groups = getTimezonesByCountry();

  if (compact) {
    return (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="px-1 py-1 bg-gray-600 border border-gray-500 rounded text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
        title="시간대 선택"
      >
        {Object.entries(groups).map(([country, tzList]) => (
          <optgroup key={country} label={country}>
            {tzList.map((tz) => (
              <option key={tz.iana} value={tz.iana}>
                {tz.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    );
  }

  return (
    <div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {Object.entries(groups).map(([country, tzList]) => (
          <optgroup key={country} label={country}>
            {tzList.map((tz) => (
              <option key={tz.iana} value={tz.iana}>
                {tz.label} ({getUTCOffsetLabel(tz.iana)})
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  );
}
