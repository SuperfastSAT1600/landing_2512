import { describe, it, expect } from 'vitest';
import { retiredEnrollmentTarget } from '../retired-enrollment';

describe('retiredEnrollmentTarget (REQ-001, REQ-004)', () => {
  it.each([
    ['/enrollment', '/blog'],
    ['/enrollment/', '/blog'],
    ['/enrollment2026', '/blog'],
    ['/enrollment2026/en', '/blog'],
    ['/enrollment2026/en/', '/blog'],
    ['/enrollment-v2', '/blog'],
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
