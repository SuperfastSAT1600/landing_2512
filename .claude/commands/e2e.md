---
description: Generate and run end-to-end tests for user workflows
allowed-tools: Bash(npx playwright:*), Bash(npx cypress:*), Bash(npm test:*), Bash(npm run e2e:*), Read, Edit, Write, Glob
---

# E2E Command

Generate and run end-to-end tests for user workflows.

---

## Usage

```
/e2e [workflow-description]
```

**Examples:**
```
/e2e user login and registration
/e2e checkout process
/e2e search functionality
```

---

## What This Command Does

1. **Analyzes Workflow**: Breaks down user journey into steps
2. **Generates Tests**: Creates Playwright or Cypress tests
3. **Runs Tests**: Executes E2E test suite
4. **Reports Results**: Shows pass/fail with screenshots
5. **Suggests Improvements**: Identifies flaky tests or missing coverage

---

## Test Framework Selection

The agent automatically detects your test framework:

- **Playwright**: If `@playwright/test` is installed
- **Cypress**: If `cypress` is installed
- **None**: Prompts you to choose and install

---

## Example Session

```
User: /e2e user login

E2E Runner: I'll generate E2E tests for user login.

### Detected Framework
Playwright is installed. Generating Playwright tests...

---

### Generated Test: tests/e2e/login.spec.ts

```typescript
import { test, expect } from '@playwright/test';

test.describe('User Login', () => {
  test('successful login', async ({ page }) => {
    await page.goto('/login');

    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator('.welcome')).toContainText('Welcome');
  });

  test('failed login with wrong password', async ({ page }) => {
    await page.goto('/login');

    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    await expect(page.locator('.error')).toContainText('Invalid credentials');
  });

  test('validation for empty email', async ({ page }) => {
    await page.goto('/login');

    await page.click('button[type="submit"]');

    await expect(page.locator('.error')).toContainText('Email is required');
  });
});
```

---

### Running Tests

```bash
npx playwright test tests/e2e/login.spec.ts
```

Running tests...

=== Test Results ===

✅ successful login (2.3s)
✅ failed login with wrong password (1.8s)
✅ validation for empty email (1.1s)

**Total**: 3 tests, 3 passed, 0 failed
**Duration**: 5.2 seconds

---

### Coverage Analysis

Tested scenarios:
- ✅ Happy path (successful login)
- ✅ Invalid credentials
- ✅ Empty field validation

Missing scenarios:
- ⚠️  Invalid email format
- ⚠️  "Remember me" functionality
- ⚠️  Password reset link

Should I generate tests for missing scenarios?
```

---

## User Workflow Examples

### Authentication Flow
```
/e2e user registration, email verification, and first login
```

Generates tests for:
1. User fills registration form
2. Receives verification email
3. Clicks verification link
4. Logs in with new credentials
5. Sees welcome dashboard

### E-commerce Checkout
```
/e2e complete purchase from product page to confirmation
```

Generates tests for:
1. Browse products
2. Add item to cart
3. Update quantity
4. Proceed to checkout
5. Enter shipping info
6. Enter payment details
7. Confirm order
8. View order confirmation

### Search and Filter
```
/e2e product search with filters
```

Generates tests for:
1. Enter search query
2. View results
3. Apply price filter
4. Apply category filter
5. Sort results
6. View product detail

---

## Command Behavior

**Delegates to**: `e2e-runner` agent

**Provides**:
- Test file generation
- Page Object Models (if complex)
- Test fixtures for authentication
- Test data setup
- Screenshot/video configuration

**Executes**:
- Test suite runner
- Result reporting
- Failure analysis
- Coverage suggestions

---

## Test Configuration

### Playwright Config
If not present, creates `playwright.config.ts`:

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: true,
  },
});
```

### Cypress Config
If not present, creates `cypress.config.ts`:

```typescript
import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    setupNodeEvents(on, config) {},
  },
  video: true,
  screenshotOnRunFailure: true,
});
```

---

## Best Practices Applied

### Stable Selectors
Uses `data-testid` attributes when available:
```typescript
await page.click('[data-testid="login-button"]');
// Instead of: await page.click('button.btn-primary.large');
```

### Auto-Waiting
Relies on framework auto-wait instead of hard-coded delays:
```typescript
await expect(page.locator('.message')).toBeVisible();
// Instead of: await page.waitForTimeout(5000);
```

### Test Isolation
Each test is independent:
```typescript
test.beforeEach(async ({ page }) => {
  // Fresh state for each test
  await page.goto('/');
});
```

### API Mocking
Mocks external APIs for consistency:
```typescript
await page.route('**/api/user', route => {
  route.fulfill({ body: JSON.stringify(mockUser) });
});
```

---

## Debugging Failed Tests

When tests fail, the command:

1. **Captures Screenshots**: Saved to `test-results/`
2. **Records Videos**: Replay failed test execution
3. **Shows Error Details**: Stack traces and assertion failures
4. **Suggests Fixes**: Common issues and solutions

**Example Debug Output:**
```
❌ Test Failed: successful login

Error: expect(received).toHaveURL(expected)

Expected: /.*dashboard/
Received: /login

Screenshot: test-results/login-failed-chrome.png
Video: test-results/login-failed-chrome.webm

Possible Issues:
- Incorrect credentials used
- Login button selector changed
- Dashboard redirect not working
- Network request failed

Suggestion: Check if login API returned success status
```

---

## CI/CD Integration

Automatically generates GitHub Actions workflow:

```yaml
# .github/workflows/e2e.yml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npx playwright test
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: test-results
          path: test-results/
```

---

## When to Use

- ✅ Before releasing new features
- ✅ After major refactoring
- ✅ For critical user workflows
- ✅ When adding new pages
- ✅ Before production deployment

---

## Related Commands

- `/test-and-build` - Run all tests including E2E
- `/review-changes` - Review E2E test coverage
- `/tdd` - Write E2E tests first (BDD style)

---

## Tips

**Start with Happy Paths**: Test successful workflows first

**Add Edge Cases**: Then test error scenarios

**Use Real Data**: Test with production-like data

**Run Regularly**: E2E tests catch integration issues

**Keep Tests Fast**: Mock APIs to avoid slow external calls

**Maintain Selectors**: Use stable `data-testid` attributes

---

"If it's not tested, it's broken." - Anonymous

Let's make sure your critical workflows work!
