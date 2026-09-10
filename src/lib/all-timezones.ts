// 전 세계 IANA 타임존을 국가명(한/영)·도시·UTC오프셋으로 검색 가능한 옵션 목록으로 빌드.
// 저장 값은 IANA 문자열(예: 'Asia/Seoul') 그대로 — DB/API 스키마 변경 없음.
//
// 국가 매핑 재생성(존→국가코드): IANA tz database 의 zone.tab 을 파싱해
// src/lib/timezone-country-map.ts 를 다시 생성한다. (레거시 별칭 19개는 수동 보충)
// 향후 정확도/편의를 위해 `countries-and-timezones` 라이브러리로 바꾸려면
// ZONE_COUNTRY import 한 곳만 교체하면 된다.

import { ZONE_COUNTRY, LEGACY_ALIASES } from './timezone-country-map';
import { getUTCOffsetLabel } from './timezone-utils';
import { TIMEZONE_OPTIONS as CRM_TIMEZONE_OPTIONS } from '@/types/crm';

export interface TimezoneOption {
  iana: string;
  koCountry: string;
  enCountry: string;
  city: string;
  offsetLabel: string;
  label: string;
  keywords: string;
}

// 검색어가 없을 때 상단에 먼저 노출되는 "빠른 선택" — CRM 공통 목록을 단일 소스로 재사용.
export const QUICK_PICK_VALUES: readonly string[] = CRM_TIMEZONE_OPTIONS.map((o) => o.value);

const koNames = new Intl.DisplayNames(['ko'], { type: 'region' });
const enNames = new Intl.DisplayNames(['en'], { type: 'region' });

function countryName(iana: string, locale: Intl.DisplayNames): string {
  const code = ZONE_COUNTRY[iana] ?? LEGACY_ALIASES[iana];
  if (!code) return '';
  try {
    return locale.of(code) ?? '';
  } catch {
    return '';
  }
}

function cityFromIana(iana: string): string {
  const last = iana.split('/').pop() ?? iana;
  return last.replace(/_/g, ' ');
}

function toOption(iana: string): TimezoneOption {
  const koCountry = countryName(iana, koNames);
  const enCountry = countryName(iana, enNames);
  const city = cityFromIana(iana);
  const offsetLabel = getUTCOffsetLabel(iana);
  const country = koCountry || enCountry;
  const label = country ? `${country} · ${city} (${offsetLabel})` : `${city} (${offsetLabel})`;
  const keywords = [koCountry, enCountry, city, iana, offsetLabel].join(' ').toLowerCase();
  return { iana, koCountry, enCountry, city, offsetLabel, label, keywords };
}

let cache: TimezoneOption[] | null = null;
let labelMap: Map<string, string> | null = null;

/**
 * 전 세계 모든 IANA 타임존 옵션을 반환한다(모듈 레벨 1회 계산 후 캐시).
 * 정렬: 빠른 선택(QUICK_PICK_VALUES) 순서대로 먼저 → 나머지는 한국어 국가명 가나다순.
 */
export function buildTimezoneOptions(): TimezoneOption[] {
  if (cache) return cache;

  // 큐레이션한 ZONE_COUNTRY(모던 canonical)를 표시 목록의 권위 소스로 삼고, 런타임
  // Intl 존 중 레거시 별칭(구 ICU가 반환하는 Asia/Saigon 등)은 제외해 중복을 막는다.
  // 이렇게 하면 환경별 ICU 차이와 무관하게 항상 모던 이름으로 일관되게 표시된다.
  const zones = new Set<string>(Object.keys(ZONE_COUNTRY));
  for (const z of Intl.supportedValuesOf('timeZone')) {
    if (!(z in LEGACY_ALIASES)) zones.add(z);
  }

  const quickSet = new Set(QUICK_PICK_VALUES);

  const rest = [...zones]
    .filter((z) => !quickSet.has(z))
    .map(toOption)
    .sort((a, b) => a.label.localeCompare(b.label, 'ko'));

  // 빠른 선택은 선언된 순서를 그대로 유지(실제 존재하는 존만).
  const quick = QUICK_PICK_VALUES.filter((z) => zones.has(z)).map(toOption);

  cache = [...quick, ...rest];
  labelMap = new Map(cache.map((o) => [o.iana, o.label]));
  return cache;
}

/**
 * 저장된 IANA 값을 사람이 읽는 라벨로 변환(표시용).
 * 알 수 없는 값이면 원문 그대로, 빈 값이면 빈 문자열.
 */
export function getTimezoneLabel(iana: string): string {
  if (!iana) return '';
  if (!labelMap) buildTimezoneOptions();
  return labelMap!.get(iana) ?? iana;
}
