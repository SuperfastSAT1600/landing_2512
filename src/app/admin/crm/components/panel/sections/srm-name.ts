// CRM은 동명이인 방지를 위해 이름에 숫자 접미사를 붙여 기록한다 (예: "박시연03").
// v2 학습 플랫폼 profiles.full_name은 순수 이름("박시연")이라, 접미사를 뗀 값으로
// 검색해야 매칭된다. CRM 원본 이름은 건드리지 않고 검색어 프리필에만 사용한다.
export function stripNameSuffix(name: string): string {
  return name.replace(/\s*\d+\s*$/, '').trim();
}
