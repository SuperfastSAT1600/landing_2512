/** REQ-014: Canonical slug for math concepts.
 * "Linear Equations" / " linear  equations " → "linear-equations"
 */
export function slugifyConcept(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[/\\|]+/g, '')   // / \ | → 제거 (단어 붙임)
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9ㄱ-ㅎ가-힣-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
