/** REQ-014: Canonical slug for math concepts.
 * "Linear Equations" / " linear  equations " → "linear-equations"
 */
export function slugifyConcept(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9ㄱ-ㅎ가-힣-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
