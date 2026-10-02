/** 배열을 size 개씩 자른다 — Supabase .in() 필터의 URL 길이 한도를 피할 때 쓴다. */
export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}
