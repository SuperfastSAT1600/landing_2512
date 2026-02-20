# E2E Testing Checklist

Quality checklist for end-to-end tests to ensure reliability and maintainability.

---

## Test Design

### Coverage Requirements
- [ ] Critical user journeys covered
  - [ ] User registration/signup flow
  - [ ] User login/logout flow
  - [ ] Core feature workflows
  - [ ] Payment/checkout flow (if applicable)
  - [ ] Error handling scenarios

- [ ] Edge cases considered
  - [ ] Empty states
  - [ ] Maximum input lengths
  - [ ] Invalid inputs
  - [ ] Network failures (offline mode)

### Test Structure
- [ ] Tests are independent (no shared state)
- [ ] Tests can run in any order
- [ ] Each test has clear setup/teardown
- [ ] Test data is isolated (unique per test)
- [ ] Page Object Model used for complex pages

---

## Locator Strategy

### Best Practices
- [ ] Prefer test IDs (`data-testid="submit-btn"`)
- [ ] Use semantic locators when stable
  - `getByRole('button', { name: 'Submit' })`
  - `getByLabel('Email')`
  - `getByText('Welcome')`
- [ ] Avoid fragile selectors
  - ❌ `.btn-primary:nth-child(2)`
  - ❌ `div > div > span`
  - ❌ Dynamic class names

### Locator Checklist
- [ ] Locators are resilient to UI changes
- [ ] Locators use meaningful names
- [ ] No hardcoded indexes unless necessary
- [ ] Text locators use exact match when needed

---

## Reliability

### Waiting & Timing
- [ ] No hardcoded `sleep()` or `wait()`
- [ ] Use proper wait conditions
  - `waitForSelector()`
  - `waitForResponse()`
  - `waitForLoadState()`
- [ ] Timeouts are appropriate
  - Default: 30s for page loads
  - 10s for element visibility
  - 60s for file uploads/downloads

### Network Handling
- [ ] Tests handle slow networks gracefully
- [ ] API mocking used for external services
- [ ] Network errors are tested
- [ ] Response stubbing for flaky APIs

### Flakiness Prevention
- [ ] Tests retry on failure (CI)
- [ ] Screenshots on failure enabled
- [ ] Video recording enabled (CI)
- [ ] No race conditions in assertions
- [ ] Stable test data seeding

---

## Test Data

### Data Management
- [ ] Test accounts use unique identifiers
- [ ] Test data cleaned up after tests
- [ ] No dependency on production data
- [ ] Sensitive data not in test files
- [ ] Factory patterns for data creation

### Database State
- [ ] Database seeded before tests
- [ ] Tests isolated from each other
- [ ] Transactions rolled back (when possible)
- [ ] Test database separate from dev

---

## Authentication

### Auth Flow Testing
- [ ] Login flow works correctly
- [ ] Session persistence tested
- [ ] Token refresh handled
- [ ] Logout clears session
- [ ] Protected routes redirect properly

### Auth Shortcuts
- [ ] API-based login for non-auth tests
- [ ] Storage state reuse for speed
- [ ] Auth fixtures shared across tests
- [ ] Service accounts for CI

```typescript
// Example: Reuse auth state
// global-setup.ts
async function globalSetup() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('/login');
  await page.fill('[name=email]', 'test@example.com');
  await page.fill('[name=password]', 'password');
  await page.click('button[type=submit]');
  await page.context().storageState({ path: 'auth.json' });
  await browser.close();
}
```

---

## Cross-Browser Testing

### Browser Coverage
- [ ] Chromium (Chrome, Edge) tested
- [ ] Firefox tested
- [ ] WebKit (Safari) tested
- [ ] Mobile viewports tested
  - [ ] iPhone viewport
  - [ ] Android viewport

### Browser-Specific Issues
- [ ] Date picker works across browsers
- [ ] File upload works across browsers
- [ ] Clipboard API handled
- [ ] CSS differences accounted for

---

## Assertions

### Assertion Quality
- [ ] Assertions are specific and meaningful
- [ ] Multiple related assertions grouped
- [ ] Error messages are helpful
- [ ] Soft assertions used when appropriate
- [ ] Visual regression tests where needed

### Common Assertions
```typescript
// Element state
await expect(page.locator('button')).toBeEnabled();
await expect(page.locator('.error')).toBeVisible();
await expect(page.locator('input')).toHaveValue('test');

// Page state
await expect(page).toHaveURL('/dashboard');
await expect(page).toHaveTitle(/Dashboard/);

// Content
await expect(page.locator('h1')).toHaveText('Welcome');
await expect(page.locator('.items')).toHaveCount(3);
```

---

## Performance

### Test Speed
- [ ] Tests run in parallel where possible
- [ ] Auth state reused across tests
- [ ] Minimal setup/teardown
- [ ] API calls mocked when appropriate
- [ ] Resource-heavy tests isolated

### Target Metrics
| Metric | Target |
|--------|--------|
| Single test | <30 seconds |
| Full suite | <10 minutes |
| CI feedback | <15 minutes |
| Flaky rate | <1% |

---

## CI/CD Integration

### Pipeline Requirements
- [ ] Tests run on every PR
- [ ] Tests run on main branch
- [ ] Artifacts saved on failure
  - [ ] Screenshots
  - [ ] Videos
  - [ ] Traces
- [ ] Results reported to PR

### Configuration
```yaml
# Example: GitHub Actions
- name: Run E2E Tests
  run: npx playwright test
  env:
    BASE_URL: ${{ secrets.TEST_URL }}

- name: Upload Artifacts
  if: failure()
  uses: actions/upload-artifact@v4
  with:
    name: playwright-report
    path: playwright-report/
```

---

## Debugging

### On Failure
- [ ] Check screenshot for visual state
- [ ] Review trace file step-by-step
- [ ] Check network requests in trace
- [ ] Review console errors
- [ ] Run locally with `--debug`

### Debug Commands
```bash
# Run with debug mode
npx playwright test --debug

# Run specific test
npx playwright test tests/login.spec.ts

# Show report
npx playwright show-report

# View trace
npx playwright show-trace trace.zip
```

---

## Documentation

### Test Documentation
- [ ] Test names describe user behavior
- [ ] Complex flows have comments
- [ ] Setup requirements documented
- [ ] Environment variables documented
- [ ] README includes how to run tests

### Example Test Structure
```typescript
test.describe('User Registration', () => {
  test('should register new user with valid email', async ({ page }) => {
    // Navigate to registration
    await page.goto('/register');

    // Fill registration form
    await page.fill('[name=email]', 'new@example.com');
    await page.fill('[name=password]', 'SecurePass123!');
    await page.click('button[type=submit]');

    // Verify success
    await expect(page).toHaveURL('/welcome');
    await expect(page.locator('h1')).toHaveText('Welcome!');
  });

  test('should show error for existing email', async ({ page }) => {
    await page.goto('/register');
    await page.fill('[name=email]', 'existing@example.com');
    await page.fill('[name=password]', 'SecurePass123!');
    await page.click('button[type=submit]');

    await expect(page.locator('.error')).toHaveText('Email already registered');
  });
});
```

---

## Review Checklist

Before merging E2E test PR:
- [ ] Tests pass locally
- [ ] Tests pass in CI
- [ ] No flaky tests introduced
- [ ] Proper locators used
- [ ] Test data isolated
- [ ] Documentation updated
- [ ] Code reviewed by team member
