# 11 — Testing Strategy

> **TL;DR:** Follow the testing trophy — most investment in integration tests, then unit tests for complex logic, E2E for critical user journeys. Use React Testing Library (test behavior, not implementation), Vitest as the test runner, MSW for API mocking, and Playwright for E2E. Test what the user sees and does, not internal component state.

---

## 1. The Testing Trophy

The testing trophy (Kent C. Dodds) replaces the traditional testing pyramid for frontend:

```
         ▲
        / \        E2E Tests (few, critical paths)
       /   \       ← Playwright
      /─────\
     /       \     Integration Tests (most investment)
    /         \    ← React Testing Library + MSW
   /───────────\
  /             \  Unit Tests (pure logic)
 /               \ ← Vitest
/─────────────────\
  Static Analysis   ← TypeScript + ESLint
```

| Level | What It Tests | Tools | Confidence | Speed | Cost |
|-------|--|--|--|--|--|
| **Static** | Type errors, lint rules | TypeScript, ESLint | Medium | Instant | Free |
| **Unit** | Pure functions, hooks, utilities | Vitest | Low-Medium | Fast | Low |
| **Integration** | Components with deps (API, router, state) | RTL + MSW | High | Medium | Medium |
| **E2E** | Full user journeys across pages | Playwright | Very High | Slow | High |

---

## 2. React Testing Library Philosophy

### The Core Principle

> "The more your tests resemble the way your software is used, the more confidence they can give you."

This means:
- Query by accessible roles, labels, and text — not by CSS class or test ID
- Fire events the way a user would — click buttons, type in inputs
- Assert on what the user sees — visible text, form state, navigation
- Never test implementation details — component state, hook return values, internal methods

### Query Priority (Prefer Top → Bottom)

| Priority | Query | When |
|----------|-------|------|
| 1 | `getByRole` | Buttons, links, headings, textboxes |
| 2 | `getByLabelText` | Form fields with labels |
| 3 | `getByPlaceholderText` | Inputs with placeholder |
| 4 | `getByText` | Non-interactive text content |
| 5 | `getByDisplayValue` | Current input value |
| 6 | `getByAltText` | Images |
| 7 | `getByTitle` | Title attribute |
| 8 (last resort) | `getByTestId` | When no semantic query works |

---

## 3. Vitest Setup for React

### Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: ['node_modules/', 'src/test/'],
    },
  },
  resolve: {
    alias: { '@': '/src' },
  },
});
```

### Test Setup

```typescript
// src/test/setup.ts
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});
```

---

## 4. Unit Tests — Pure Logic

Test utility functions, custom hooks, and business logic in isolation.

### Testing a Utility Function

```typescript
// shared/utils/format-currency.ts
export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

// shared/utils/format-currency.test.ts
import { describe, it, expect } from 'vitest';
import { formatCurrency } from './format-currency';

describe('formatCurrency', () => {
  it('formats USD by default', () => {
    expect(formatCurrency(1234.5)).toBe('$1,234.50');
  });

  it('formats EUR when specified', () => {
    expect(formatCurrency(1000, 'EUR')).toBe('€1,000.00');
  });

  it('handles zero', () => {
    expect(formatCurrency(0)).toBe('$0.00');
  });

  it('handles negative values', () => {
    expect(formatCurrency(-50)).toBe('-$50.00');
  });
});
```

### Testing a Custom Hook

```typescript
// features/orders/hooks/use-order-total.ts
export function useOrderTotal(items: OrderItem[]) {
  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items]
  );
  const tax = subtotal * 0.08;
  const total = subtotal + tax;

  return { subtotal, tax, total };
}

// features/orders/hooks/use-order-total.test.ts
import { renderHook } from '@testing-library/react';
import { useOrderTotal } from './use-order-total';

describe('useOrderTotal', () => {
  it('calculates subtotal, tax, and total', () => {
    const items = [
      { id: '1', name: 'Widget', price: 10, quantity: 3 },
      { id: '2', name: 'Gadget', price: 25, quantity: 1 },
    ];

    const { result } = renderHook(() => useOrderTotal(items));

    expect(result.current.subtotal).toBe(55);
    expect(result.current.tax).toBeCloseTo(4.4);
    expect(result.current.total).toBeCloseTo(59.4);
  });

  it('returns zero for empty items', () => {
    const { result } = renderHook(() => useOrderTotal([]));
    expect(result.current.total).toBe(0);
  });
});
```

---

## 5. Integration Tests — Components with Dependencies

### Testing a Form Component

```tsx
// features/auth/components/login-form.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from './login-form';

describe('LoginForm', () => {
  it('submits with valid credentials', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();

    render(<LoginForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /log in/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    });
  });

  it('shows validation error for invalid email', async () => {
    const user = userEvent.setup();

    render(<LoginForm onSubmit={vi.fn()} />);

    await user.type(screen.getByLabelText(/email/i), 'not-an-email');
    await user.click(screen.getByRole('button', { name: /log in/i }));

    expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
  });

  it('disables button while submitting', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(() => new Promise((r) => setTimeout(r, 1000)));

    render(<LoginForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /log in/i }));

    expect(screen.getByRole('button', { name: /logging in/i })).toBeDisabled();
  });
});
```

### Testing with TanStack Query

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserProfile } from './user-profile';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

describe('UserProfile', () => {
  it('renders user data after loading', async () => {
    render(<UserProfile userId="123" />, { wrapper: createWrapper() });

    expect(screen.getByText(/loading/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });
});
```

---

## 6. MSW — API Mocking at the Network Level

MSW (Mock Service Worker) intercepts HTTP requests at the network level — your code doesn't know it's mocked.

### Setup

```typescript
// src/test/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/users', () => {
    return HttpResponse.json([
      { id: '1', name: 'Alice', email: 'alice@example.com' },
      { id: '2', name: 'Bob', email: 'bob@example.com' },
    ]);
  }),

  http.get('/api/users/:id', ({ params }) => {
    return HttpResponse.json({
      id: params.id,
      name: 'Alice',
      email: 'alice@example.com',
    });
  }),

  http.post('/api/users', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ id: '3', ...body }, { status: 201 });
  }),

  http.delete('/api/users/:id', () => {
    return new HttpResponse(null, { status: 204 });
  }),
];

// src/test/mocks/server.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);

// src/test/setup.ts
import { server } from './mocks/server';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### Overriding Handlers Per Test

```tsx
import { server } from '@/test/mocks/server';
import { http, HttpResponse } from 'msw';

it('shows error message when API fails', async () => {
  server.use(
    http.get('/api/users', () => {
      return HttpResponse.json({ error: 'Server error' }, { status: 500 });
    })
  );

  render(<UserList />, { wrapper: createWrapper() });

  await waitFor(() => {
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
  });
});
```

**Why MSW over `vi.mock`:**
- Tests the full data flow (fetch → parse → render)
- Same handlers work in browser (Storybook) and Node (tests)
- No coupling to fetch implementation (axios, fetch, ky)
- Catches real integration bugs (wrong URL, missing headers)

---

## 7. Testing Async Components and Server Components

### Testing Async Server Components (in Unit Tests)

Server Components are async functions — you can test their output:

```tsx
import { render, screen } from '@testing-library/react';

// Mock the database call
vi.mock('@/lib/db', () => ({
  db: {
    users: {
      findMany: vi.fn().mockResolvedValue([
        { id: '1', name: 'Alice' },
        { id: '2', name: 'Bob' },
      ]),
    },
  },
}));

it('renders users from database', async () => {
  const UsersPage = (await import('./page')).default;
  const jsx = await UsersPage();

  render(jsx);

  expect(screen.getByText('Alice')).toBeInTheDocument();
  expect(screen.getByText('Bob')).toBeInTheDocument();
});
```

### Testing Components with Suspense

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import { Suspense } from 'react';

it('shows loading then content', async () => {
  render(
    <Suspense fallback={<div>Loading...</div>}>
      <AsyncComponent />
    </Suspense>
  );

  expect(screen.getByText('Loading...')).toBeInTheDocument();

  await waitFor(() => {
    expect(screen.getByText('Content loaded')).toBeInTheDocument();
  });

  expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
});
```

---

## 8. E2E Testing with Playwright

### Setup

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  baseURL: 'http://localhost:3000',
  use: {
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'firefox', use: { browserName: 'firefox' } },
    { name: 'webkit', use: { browserName: 'webkit' } },
  ],
});
```

### Testing a User Journey

```typescript
// e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('user can log in and see dashboard', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('Email').fill('user@example.com');
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: 'Log in' }).click();

    await expect(page).toHaveURL('/dashboard');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByText('Welcome, User')).toBeVisible();
  });

  test('shows error for invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('Email').fill('wrong@example.com');
    await page.getByLabel('Password').fill('wrongpass');
    await page.getByRole('button', { name: 'Log in' }).click();

    await expect(page.getByText('Invalid credentials')).toBeVisible();
    await expect(page).toHaveURL('/login');
  });
});
```

### Page Object Model (Scalable E2E)

```typescript
// e2e/pages/login.page.ts
import { type Page, type Locator } from '@playwright/test';

export class LoginPage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;

  constructor(private page: Page) {
    this.emailInput = page.getByLabel('Email');
    this.passwordInput = page.getByLabel('Password');
    this.submitButton = page.getByRole('button', { name: 'Log in' });
    this.errorMessage = page.getByRole('alert');
  }

  async goto() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }
}

// e2e/auth.spec.ts
test('user can log in', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login('user@example.com', 'password123');
  await expect(page).toHaveURL('/dashboard');
});
```

---

## 9. Visual Regression Testing

### Playwright Visual Comparison

```typescript
test('product card matches snapshot', async ({ page }) => {
  await page.goto('/products/1');
  await expect(page.getByTestId('product-card')).toHaveScreenshot('product-card.png', {
    maxDiffPixelRatio: 0.01,
  });
});
```

### Chromatic (Storybook Integration)

```bash
npx chromatic --project-token=<token>
```

Chromatic captures every Storybook story as a snapshot, detects visual changes, and requires approval before merge.

---

## 10. Accessibility Testing

### Automated (axe-core via Testing Library)

```typescript
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

it('has no accessibility violations', async () => {
  const { container } = render(<LoginForm onSubmit={vi.fn()} />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

### Playwright Accessibility Scan

```typescript
import AxeBuilder from '@axe-core/playwright';

test('home page passes accessibility audit', async ({ page }) => {
  await page.goto('/');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toHaveLength(0);
});
```

---

## 11. Testing Strategy by Component Type

| Component Type | What to Test | Approach |
|---|---|---|
| **Dumb/Presentational** | Renders correct output for props | Unit test with RTL; snapshot for structure |
| **Smart/Container** | Data flow, loading/error states | Integration test with MSW + RTL |
| **Forms** | Validation, submission, error display | Integration test with `userEvent` |
| **Hooks (custom)** | Return values, state transitions | `renderHook` from RTL |
| **Server Components** | Rendered output with mocked data | Async render test |
| **Utilities** | Input/output correctness | Pure unit tests |
| **User journeys** | Multi-page flows (login → dashboard → action) | E2E with Playwright |

---

## Common Mistakes — Avoid Saying These

| Mistake | Why It's Wrong |
|---------|---------------|
| "I test implementation details (state, private methods)" | Tests break on refactor; test behavior instead |
| "I mock everything in integration tests" | Over-mocking gives false confidence; MSW mocks the network, not the code |
| "100% coverage means no bugs" | Coverage measures lines executed, not correctness of assertions |
| "E2E tests for everything" | Too slow, too flaky; use for critical paths only |
| "I don't test loading and error states" | Users spend real time in these states — test them |

---

## Interview-Ready Answer

> "How do you approach testing in a React application?"

**Strong answer:**

> I follow the testing trophy — most investment in integration tests because they give the best confidence-to-cost ratio. Static analysis with TypeScript and ESLint catches type errors and common bugs for free. Unit tests cover pure utilities and complex custom hooks. Integration tests use React Testing Library with MSW for API mocking — I render components, simulate user interactions with `userEvent`, and assert on visible output, not implementation details. Queries follow the accessibility priority: `getByRole`, `getByLabelText`, `getByText`. E2E tests with Playwright cover critical user journeys like auth flows and checkout, using the Page Object Model for maintainability. Accessibility is automated with axe-core in both unit tests and Playwright scans. Visual regression testing via Chromatic catches unintended UI changes. I enforce coverage thresholds and test quality in CI, but I optimize for meaningful assertions over coverage percentage.

---

## Next Topic

→ [12-interview-qa.md](12-interview-qa.md) — Architect-level Q&A cheat sheet covering architecture, React 19, performance, hooks, Server Components, and security.
