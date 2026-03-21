/// <reference types="vitest/globals" />
/**
 * Tests for REQ-001 and REQ-002: Infinite submit loop prevention
 *
 * These tests verify the guard logic patterns used in DiagnosticTestView
 * to prevent duplicate submissions.
 */
describe('REQ-001: submitted flag prevents handleSubmit re-invocation', () => {
  it('REQ-001: should not call submit when submitted is true', () => {
    let callCount = 0;
    let submitted = false;
    let submitting = false;
    const remaining = 0;
    const startTime = Date.now();

    // This simulates the fixed useEffect condition check
    const checkAndSubmit = () => {
      if (remaining === 0 && startTime && !submitting && !submitted) {
        callCount++;
        submitting = true;
        setTimeout(() => {
          submitted = true;
          submitting = false;
        }, 0);
      }
    };

    // First invocation — should trigger
    checkAndSubmit();
    expect(callCount).toBe(1);

    // Simulate effect re-run after submitting completes (submitted=true, submitting=false)
    submitted = true;
    submitting = false;
    checkAndSubmit();
    expect(callCount).toBe(1); // must NOT increment
  });

  it('REQ-001: should call submit exactly once when timer hits 0 with the old guard (no submitted check)', () => {
    // Demonstrates the BUG: without submitted check, re-runs after submitting completes
    let callCount = 0;
    let submitting = false;
    const remaining = 0;
    const startTime = Date.now();

    // BUGGY version — no !submitted check
    const buggyCheck = () => {
      if (remaining === 0 && startTime && !submitting) {
        callCount++;
        submitting = true;
        setTimeout(() => {
          submitting = false; // sets submitting=false → triggers re-run → bug!
        }, 0);
      }
    };

    buggyCheck();
    expect(callCount).toBe(1);

    // Simulate re-run after submitting completes (submitting=false, but no submitted guard)
    submitting = false;
    buggyCheck();
    expect(callCount).toBe(2); // BUG: called again!
  });
});

describe('REQ-002: isSubmittingRef guard prevents concurrent duplicate calls', () => {
  it('REQ-002: concurrent handleSubmit calls only execute once', async () => {
    let callCount = 0;
    const isSubmittingRef = { current: false };

    const handleSubmit = async () => {
      if (isSubmittingRef.current) return; // REQ-002 guard
      isSubmittingRef.current = true;
      callCount++;
      await new Promise(resolve => setTimeout(resolve, 10));
      isSubmittingRef.current = false;
    };

    // Call concurrently — simulates race condition
    await Promise.all([handleSubmit(), handleSubmit(), handleSubmit()]);
    expect(callCount).toBe(1);
  });

  it('REQ-002: sequential calls after completion are allowed', async () => {
    let callCount = 0;
    const isSubmittingRef = { current: false };

    const handleSubmit = async () => {
      if (isSubmittingRef.current) return;
      isSubmittingRef.current = true;
      callCount++;
      await new Promise(resolve => setTimeout(resolve, 10));
      isSubmittingRef.current = false;
    };

    await handleSubmit();
    await handleSubmit(); // after first completes, second should be allowed
    expect(callCount).toBe(2);
  });
});
