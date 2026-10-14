import { describe, it, expect } from 'vitest';
import { retiredEnrollmentTarget } from '../retired-enrollment';

describe('retiredEnrollmentTarget (REQ-001)', () => {
  it.each([
    ['/enrollment', '/enrollment-v3'],
    ['/enrollment/', '/enrollment-v3'],
    ['/enrollment2026', '/enrollment-v3'],
    ['/enrollment2026/en', '/enrollment-v3/en'],
    ['/enrollment2026/en/', '/enrollment-v3/en'],
    ['/enrollment-v2', '/enrollment-v3'],
  ])('%s → %s', (from, to) => {
    expect(retiredEnrollmentTarget(from)).toBe(to);
  });

  it.each(['/enrollment-v3', '/enrollment-v3/en', '/enrollment/logo.png', '/admin/enrollment', '/', '/enrollment2026x'])(
    '%s는 그대로',
    (p) => {
      expect(retiredEnrollmentTarget(p)).toBeNull();
    },
  );
});
