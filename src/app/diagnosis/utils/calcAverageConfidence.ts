/**
 * Returns the mean confidence level (1 decimal) from a question→confidence map.
 * Returns null if no confidence values have been set.
 */
export function calcAverageConfidence(confidence: Record<string, number>): number | null {
  const values = Object.values(confidence);
  if (values.length === 0) return null;
  const sum = values.reduce((acc, v) => acc + v, 0);
  return Math.round((sum / values.length) * 10) / 10;
}
