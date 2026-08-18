---
description: Analyze test coverage and improve untested code
allowed-tools: Bash(npm test:*), Bash(pytest:*), Bash(cargo test:*), Bash(go test:*), Read, Edit, Write, Grep, Glob
---

# Test Coverage Command

Analyze test coverage and improve untested code.

---

## Usage

```
/test-coverage [scope]
```

**Scope options:**
- Full analysis: `/test-coverage`
- Specific file: `/test-coverage src/services/UserService.ts`
- Directory: `/test-coverage src/services/`
- Threshold check: `/test-coverage --threshold 80`

---

## What This Command Does

1. **Runs Coverage Analysis**: Executes tests with coverage reporting
2. **Identifies Gaps**: Finds untested code paths
3. **Prioritizes Testing**: Ranks files by risk and complexity
4. **Generates Tests**: Creates missing tests for critical paths
5. **Verifies Improvement**: Confirms coverage increase

---

## Coverage Metrics

### Line Coverage
Percentage of lines executed during tests
- **Target**: 80%+
- **Critical code**: 90%+

### Branch Coverage
Percentage of conditional branches tested
- **Target**: 75%+
- **Complex logic**: 85%+

### Function Coverage
Percentage of functions called during tests
- **Target**: 85%+

### Statement Coverage
Percentage of statements executed
- **Target**: 80%+

---

## Example Session

```
User: /test-coverage

Test Coverage Analyzer: Running tests with coverage...

=== Coverage Report ===

**Overall Coverage: 68%** ⚠️ Below 80% target

Breakdown:
- Line coverage: 68% (1,247 / 1,834 lines)
- Branch coverage: 54% (89 / 165 branches)
- Function coverage: 73% (102 / 140 functions)
- Statement coverage: 69% (1,289 / 1,867 statements)

---

### Critical Gaps (High Risk)

**1. UserService.ts: 42% coverage** 🔴
- Lines tested: 67 / 159
- Branches tested: 8 / 23
- **Risk**: HIGH (handles authentication)
- **Complexity**: 8.5 (high)

Untested code paths:
- Line 45-67: Password reset logic (CRITICAL)
- Line 89-102: Admin role validation (CRITICAL)
- Line 134-145: Account deletion (HIGH)

**2. PaymentService.ts: 38% coverage** 🔴
- Lines tested: 45 / 118
- Branches tested: 5 / 18
- **Risk**: CRITICAL (handles money)
- **Complexity**: 9.2 (very high)

Untested code paths:
- Line 23-45: Refund processing (CRITICAL)
- Line 67-89: Failed payment retry logic (HIGH)
- Line 103-115: Subscription cancellation (HIGH)

**3. EmailService.ts: 55% coverage** 🟡
- Lines tested: 78 / 142
- Branches tested: 12 / 24
- **Risk**: MEDIUM (user notifications)
- **Complexity**: 5.3 (medium)

Untested code paths:
- Line 34-52: Template rendering (MEDIUM)
- Line 89-98: Unsubscribe handling (MEDIUM)

---

### Recommended Actions

**Priority 1: PaymentService.ts (CRITICAL)**

Missing test: Refund processing

I'll generate a test:

```typescript
describe('PaymentService - Refunds', () => {
  it('should process refund for valid payment', async () => {
    // Arrange
    const payment = await createTestPayment({
      amount: 5000,
      status: 'completed'
    });

    // Act
    const refund = await paymentService.refundPayment(payment.id, {
      amount: 5000,
      reason: 'customer_request'
    });

    // Assert
    expect(refund.status).toBe('succeeded');
    expect(refund.amount).toBe(5000);
    expect(payment.status).toBe('refunded');
  });

  it('should reject refund for pending payment', async () => {
    // Arrange
    const payment = await createTestPayment({
      amount: 5000,
      status: 'pending'
    });

    // Act & Assert
    await expect(
      paymentService.refundPayment(payment.id, { amount: 5000 })
    ).rejects.toThrow('Cannot refund pending payment');
  });

  it('should reject partial refund exceeding original amount', async () => {
    // Arrange
    const payment = await createTestPayment({
      amount: 5000,
      status: 'completed'
    });

    // Act & Assert
    await expect(
      paymentService.refundPayment(payment.id, { amount: 6000 })
    ).rejects.toThrow('Refund amount exceeds payment amount');
  });
});
```

**Priority 2: UserService.ts (HIGH)**

Missing test: Password reset logic

```typescript
describe('UserService - Password Reset', () => {
  it('should generate reset token and send email', async () => {
    // Arrange
    const user = await createTestUser({ email: 'test@example.com' });
    const emailSpy = jest.spyOn(emailService, 'sendPasswordReset');

    // Act
    await userService.requestPasswordReset('test@example.com');

    // Assert
    const updatedUser = await db.users.findOne({ id: user.id });
    expect(updatedUser.resetToken).toBeDefined();
    expect(updatedUser.resetTokenExpiry).toBeInstanceOf(Date);
    expect(emailSpy).toHaveBeenCalledWith(
      'test@example.com',
      expect.objectContaining({ resetToken: updatedUser.resetToken })
    );
  });

  it('should reset password with valid token', async () => {
    // Arrange
    const user = await createTestUser();
    const resetToken = await userService.generateResetToken(user.id);

    // Act
    await userService.resetPassword(resetToken, 'newSecurePassword123!');

    // Assert
    const updatedUser = await db.users.findOne({ id: user.id });
    expect(updatedUser.resetToken).toBeNull();
    expect(await userService.verifyPassword(user.id, 'newSecurePassword123!')).toBe(true);
  });

  it('should reject expired reset token', async () => {
    // Arrange
    const user = await createTestUser();
    const resetToken = await userService.generateResetToken(user.id);

    // Simulate token expiry
    await db.users.update(user.id, {
      resetTokenExpiry: new Date(Date.now() - 1000) // 1 second ago
    });

    // Act & Assert
    await expect(
      userService.resetPassword(resetToken, 'newPassword')
    ).rejects.toThrow('Reset token expired');
  });
});
```

**Priority 3: EmailService.ts (MEDIUM)**

Missing test: Template rendering

```typescript
describe('EmailService - Templates', () => {
  it('should render welcome email template', () => {
    // Arrange
    const user = { name: 'Alice', email: 'alice@example.com' };

    // Act
    const html = emailService.renderTemplate('welcome', { user });

    // Assert
    expect(html).toContain('Welcome, Alice');
    expect(html).toContain('alice@example.com');
  });

  it('should throw error for invalid template', () => {
    // Act & Assert
    expect(() => {
      emailService.renderTemplate('nonexistent', {});
    }).toThrow('Template not found: nonexistent');
  });
});
```

---

### Applying Tests

Shall I create these test files?

1. `__tests__/services/PaymentService.test.ts` (3 tests)
2. `__tests__/services/UserService.test.ts` (3 tests)
3. `__tests__/services/EmailService.test.ts` (2 tests)

This will increase coverage by approximately 15-20%.

---

After applying tests...

=== Updated Coverage Report ===

**Overall Coverage: 83%** ✅ Above 80% target!

Breakdown:
- Line coverage: 83% (+15%)
- Branch coverage: 71% (+17%)
- Function coverage: 86% (+13%)
- Statement coverage: 84% (+15%)

**Files improved:**
- PaymentService.ts: 42% → 89% ✅
- UserService.ts: 38% → 85% ✅
- EmailService.ts: 55% → 78% ✅

Remaining gaps:
- Error handling edge cases (4% of total)
- Legacy deprecated functions (2% of total)
- Environment-specific code (1% of total)

Great progress! Coverage is now above target.
```

---

## Command Behavior

**Test Frameworks Supported**:
- Jest (JavaScript/TypeScript)
- Pytest (Python)
- Go test (Go)
- Cargo test (Rust)
- JUnit (Java)

**Coverage Tools**:
- Jest built-in coverage
- Istanbul/nyc
- Coverage.py
- Go coverage
- Tarpaulin

**Auto-Detection**: Finds test command from package.json or project config

---

## Coverage Targets

### By Code Type

**Business Logic**: 90%+
- Payment processing
- Authentication
- Data validation

**API Endpoints**: 85%+
- All routes tested
- Error cases covered

**Utilities**: 80%+
- Helper functions
- Shared logic

**UI Components**: 70%+
- React components
- User interactions

**Configuration**: 60%+
- Low priority
- Often environment-specific

---

## Analysis Output

### Coverage Report
- Overall percentage
- File-by-file breakdown
- Untested lines highlighted

### Risk Assessment
- Critical untested code
- High-complexity untested code
- Security-sensitive gaps

### Generated Tests
- Ready-to-use test code
- Follows project patterns
- Covers critical paths

### Improvement Plan
- Prioritized test creation
- Expected coverage gain
- Estimated effort

---

## Best Practices

### Do:
- ✅ Aim for 80%+ overall coverage
- ✅ Prioritize critical code (auth, payments)
- ✅ Test edge cases and error handling
- ✅ Run coverage regularly
- ✅ Track coverage trends

### Don't:
- ❌ Chase 100% coverage blindly
- ❌ Test trivial getters/setters
- ❌ Skip integration tests
- ❌ Write tests just for coverage numbers
- ❌ Ignore branch coverage

---

## When to Use

- ✅ Before releasing features
- ✅ During code review
- ✅ After refactoring
- ✅ Regular health checks (weekly/monthly)
- ✅ Before production deployment

---

## Coverage Thresholds

**Enforcement in CI/CD**:
```json
// package.json
{
  "jest": {
    "coverageThreshold": {
      "global": {
        "branches": 75,
        "functions": 85,
        "lines": 80,
        "statements": 80
      },
      "./src/services/": {
        "branches": 85,
        "functions": 90,
        "lines": 90,
        "statements": 90
      }
    }
  }
}
```

---

## Metrics Beyond Coverage

Coverage is not the only quality metric:

**Also Consider**:
- Mutation testing (test quality)
- Integration test depth
- E2E test scenarios
- Performance test coverage
- Security test coverage

**Remember**: 100% coverage ≠ bug-free code

---

## Related Commands

- `/tdd` - Write tests first
- `/checkpoint` - Run tests, build, and full verification
- `/review` - Include coverage in reviews

---

## Tips

**Cover Critical Paths First**: Auth, payments, data integrity

**Test Behavior, Not Implementation**: Focus on what, not how

**Use Coverage as Guide**: Not as absolute goal

**Write Meaningful Tests**: Not just to increase numbers

**Maintain Over Time**: Coverage can decay with new features

---

"Code without tests is broken by design." - Jacob Kaplan-Moss

Let's make sure your code is well-tested!
