# 10 — Testing Strategy

> **TL;DR:** Follow the Testing Trophy — heavy on integration tests, lighter on unit/E2E. Use Vitest for speed, Supertest for HTTP testing, and mongodb-memory-server for isolated DB tests. Mock external services, never internal logic. Test behavior, not implementation. Aim for 80%+ coverage on services and controllers.

---

## 1. Testing Trophy (Not Pyramid)

```
                ┌─────┐
                │ E2E │         ← Few, slow, expensive — critical user paths only
               ┌┴─────┴┐
               │       │
              ┌┴───────┴┐
              │Integr-  │       ← MOST tests here — controllers + services + DB
              │  ation  │
             ┌┴─────────┴┐
             │           │
            ┌┴───────────┴┐
            │    Unit     │     ← Pure logic, utils, transformations
            └─────────────┘
         ┌─────────────────────┐
         │   Static Analysis   │ ← TypeScript + ESLint (free confidence)
         └─────────────────────┘
```

| Level | What | Tools | Speed | Confidence |
|-------|------|-------|-------|------------|
| **Static** | Type errors, lint rules | TypeScript, ESLint | Instant | Medium |
| **Unit** | Pure functions, utils | Vitest | Fast | Medium |
| **Integration** | API routes + DB | Vitest, Supertest, mongodb-memory-server | Moderate | High |
| **E2E** | Full user flows | Playwright, Newman | Slow | Very High |

---

## 2. Vitest Setup

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts', 'src/**/*.test.ts', 'src/**/index.ts'],
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
    testTimeout: 30000,
    hookTimeout: 30000,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
```

### Global Test Setup

```typescript
// tests/setup.ts
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  // Clean all collections between tests
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});
```

---

## 3. Unit Tests — Pure Logic

```typescript
// src/common/utils/pagination.ts
export function buildPaginationMeta(
  total: number,
  page: number,
  limit: number
) {
  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    hasNextPage: page * limit < total,
    hasPrevPage: page > 1,
  };
}

// src/common/utils/__tests__/pagination.test.ts
import { describe, it, expect } from 'vitest';
import { buildPaginationMeta } from '../pagination';

describe('buildPaginationMeta', () => {
  it('should calculate total pages correctly', () => {
    const meta = buildPaginationMeta(100, 1, 20);
    expect(meta.totalPages).toBe(5);
    expect(meta.hasNextPage).toBe(true);
    expect(meta.hasPrevPage).toBe(false);
  });

  it('should detect last page', () => {
    const meta = buildPaginationMeta(100, 5, 20);
    expect(meta.hasNextPage).toBe(false);
    expect(meta.hasPrevPage).toBe(true);
  });

  it('should handle zero results', () => {
    const meta = buildPaginationMeta(0, 1, 20);
    expect(meta.totalPages).toBe(0);
    expect(meta.hasNextPage).toBe(false);
    expect(meta.hasPrevPage).toBe(false);
  });

  it('should handle exact page boundary', () => {
    const meta = buildPaginationMeta(40, 2, 20);
    expect(meta.totalPages).toBe(2);
    expect(meta.hasNextPage).toBe(false);
  });
});
```

---

## 4. Integration Tests — API Routes + Database

```typescript
// tests/integration/user.integration.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app';
import { User } from '../../src/modules/user/user.model';
import { generateTestToken } from '../helpers/auth.helper';

describe('User API', () => {
  let adminToken: string;
  let userToken: string;
  let userId: string;

  beforeAll(async () => {
    adminToken = generateTestToken({ userId: 'admin1', role: 'admin', email: 'admin@test.com' });
    userToken = generateTestToken({ userId: 'user1', role: 'user', email: 'user@test.com' });
  });

  describe('POST /api/v1/users', () => {
    it('should create a user with valid data', async () => {
      const res = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'john@example.com',
          name: 'John Doe',
          password: 'SecureP@ss1',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('john@example.com');
      expect(res.body.data.password).toBeUndefined(); // Password not in response
      userId = res.body.data.id;
    });

    it('should reject duplicate email', async () => {
      await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'john@example.com',
          name: 'Jane Doe',
          password: 'SecureP@ss1',
        });

      const res = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'john@example.com',
          name: 'Another John',
          password: 'SecureP@ss1',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it('should reject invalid email format', async () => {
      const res = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'not-an-email',
          name: 'Test',
          password: 'SecureP@ss1',
        });

      expect(res.status).toBe(422);
      expect(res.body.errors).toBeDefined();
      expect(res.body.errors[0].field).toContain('email');
    });

    it('should reject weak password', async () => {
      const res = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'test@example.com',
          name: 'Test',
          password: '123',
        });

      expect(res.status).toBe(422);
    });

    it('should require admin role', async () => {
      const res = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          email: 'new@example.com',
          name: 'New User',
          password: 'SecureP@ss1',
        });

      expect(res.status).toBe(403);
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .post('/api/v1/users')
        .send({
          email: 'new@example.com',
          name: 'New User',
          password: 'SecureP@ss1',
        });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/users', () => {
    it('should return paginated users', async () => {
      // Seed data
      await User.insertMany([
        { email: 'a@test.com', name: 'A', password: 'hashed', role: 'user' },
        { email: 'b@test.com', name: 'B', password: 'hashed', role: 'user' },
        { email: 'c@test.com', name: 'C', password: 'hashed', role: 'user' },
      ]);

      const res = await request(app)
        .get('/api/v1/users?page=1&limit=2')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.pagination.total).toBe(3);
      expect(res.body.pagination.totalPages).toBe(2);
    });
  });

  describe('GET /api/v1/users/:id', () => {
    it('should return 404 for non-existent user', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const res = await request(app)
        .get(`/api/v1/users/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });

    it('should return 400 for invalid ObjectId', async () => {
      const res = await request(app)
        .get('/api/v1/users/not-a-valid-id')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
    });
  });
});
```

### Test Helpers

```typescript
// tests/helpers/auth.helper.ts
import jwt from 'jsonwebtoken';
import { config } from '../../src/config';

interface TestTokenPayload {
  userId: string;
  email: string;
  role: string;
}

export function generateTestToken(payload: TestTokenPayload): string {
  return jwt.sign(payload, config.jwt.accessSecret, { expiresIn: '1h' });
}

// tests/helpers/db.helper.ts
import { User } from '../../src/modules/user/user.model';
import { hash } from 'bcryptjs';

export async function createTestUser(overrides = {}) {
  const defaults = {
    email: `test-${Date.now()}@example.com`,
    name: 'Test User',
    password: await hash('TestP@ss1', 4), // Low rounds for speed
    role: 'user',
    isActive: true,
  };

  return User.create({ ...defaults, ...overrides });
}

export async function seedUsers(count: number) {
  const users = Array.from({ length: count }, (_, i) => ({
    email: `user${i}@example.com`,
    name: `User ${i}`,
    password: 'hashed',
    role: 'user',
  }));

  return User.insertMany(users);
}
```

---

## 5. Service Layer Unit Tests (with Mocking)

```typescript
// src/modules/user/__tests__/user.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserService } from '../user.service';
import { UserRepository } from '../user.repository';
import { AppError } from '../../../common/errors/app-error';

// Mock the repository
vi.mock('../user.repository');

describe('UserService', () => {
  let service: UserService;
  let mockRepo: vi.Mocked<UserRepository>;

  beforeEach(() => {
    mockRepo = new UserRepository() as vi.Mocked<UserRepository>;
    service = new UserService(mockRepo);
    vi.clearAllMocks();
  });

  describe('getUserById', () => {
    it('should return user when found', async () => {
      const mockUser = { _id: '123', email: 'john@example.com', name: 'John' };
      mockRepo.findById.mockResolvedValue(mockUser as any);

      const result = await service.getUserById('123');

      expect(result).toEqual(mockUser);
      expect(mockRepo.findById).toHaveBeenCalledWith('123');
      expect(mockRepo.findById).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFound when user does not exist', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(service.getUserById('nonexistent')).rejects.toThrow(AppError);
      await expect(service.getUserById('nonexistent')).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });

  describe('createUser', () => {
    it('should hash password and create user', async () => {
      mockRepo.findByEmail.mockResolvedValue(null);
      mockRepo.create.mockResolvedValue({
        _id: 'new-id',
        email: 'new@test.com',
        name: 'New User',
      } as any);

      const result = await service.createUser({
        email: 'new@test.com',
        name: 'New User',
        password: 'SecureP@ss1',
      });

      expect(result.email).toBe('new@test.com');
      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'new@test.com',
          password: expect.not.stringContaining('SecureP@ss1'), // Hashed!
        })
      );
    });

    it('should throw 409 if email already exists', async () => {
      mockRepo.findByEmail.mockResolvedValue({ email: 'existing@test.com' } as any);

      await expect(
        service.createUser({
          email: 'existing@test.com',
          name: 'Test',
          password: 'SecureP@ss1',
        })
      ).rejects.toMatchObject({ statusCode: 409 });
    });
  });
});
```

---

## 6. Testing Middleware

```typescript
// src/common/middleware/__tests__/validate.test.ts
import { describe, it, expect, vi } from 'vitest';
import { validate } from '../validate';
import { z } from 'zod';
import type { Request, Response, NextFunction } from 'express';

describe('validate middleware', () => {
  const schema = z.object({
    body: z.object({
      email: z.string().email(),
      name: z.string().min(2),
    }),
  });

  const mockRes = {} as Response;
  const mockNext: NextFunction = vi.fn();

  it('should call next() for valid input', () => {
    const req = {
      body: { email: 'test@example.com', name: 'John' },
      query: {},
      params: {},
    } as unknown as Request;

    validate(schema)(req, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalledWith();
  });

  it('should throw AppError for invalid input', () => {
    const req = {
      body: { email: 'invalid', name: '' },
      query: {},
      params: {},
    } as unknown as Request;

    expect(() => validate(schema)(req, mockRes, mockNext)).toThrow();
  });
});
```

---

## 7. Testing with Test Containers (Docker-Based)

```typescript
// tests/containers/mongo.container.ts
import { MongoDBContainer, type StartedMongoDBContainer } from '@testcontainers/mongodb';
import mongoose from 'mongoose';

let container: StartedMongoDBContainer;

export async function startMongoContainer() {
  container = await new MongoDBContainer('mongo:7').start();
  const uri = container.getConnectionString();
  await mongoose.connect(uri, { directConnection: true });
  return uri;
}

export async function stopMongoContainer() {
  await mongoose.disconnect();
  await container.stop();
}

// Usage in test setup
beforeAll(async () => {
  await startMongoContainer();
}, 60000);

afterAll(async () => {
  await stopMongoContainer();
});
```

---

## 8. E2E Testing with Newman (Postman)

```bash
# Export Postman collection and run in CI
npx newman run ./tests/e2e/api-collection.json \
  --environment ./tests/e2e/local.env.json \
  --reporters cli,junit \
  --reporter-junit-export ./test-results/e2e.xml
```

---

## 9. Test Organization Patterns

```typescript
// Pattern: Arrange-Act-Assert (AAA)
it('should deactivate user', async () => {
  // Arrange
  const user = await createTestUser({ isActive: true });

  // Act
  const result = await userService.deactivateUser(user._id.toString());

  // Assert
  expect(result.isActive).toBe(false);
  const dbUser = await User.findById(user._id);
  expect(dbUser?.isActive).toBe(false);
});

// Pattern: Given-When-Then (BDD style)
describe('when user has insufficient balance', () => {
  it('should reject the transaction', async () => {
    // Given
    const user = await createTestUser({ balance: 10 });

    // When / Then
    await expect(
      transactionService.transfer(user._id, 'target', 100)
    ).rejects.toMatchObject({
      statusCode: 400,
      message: 'Insufficient funds',
    });
  });
});
```

---

## 10. Common Mistakes

| Mistake | Why It's Bad | Fix |
|---------|-------------|-----|
| No integration tests | Unit tests pass but API breaks | Test full request → response flow |
| Sharing state between tests | Flaky, order-dependent | Clean DB after each test |
| Testing implementation details | Tests break on refactor | Test behavior (input → output) |
| Mocking everything | Tests pass but nothing works | Mock external services only |
| Slow tests in CI | Developers stop running them | Use in-memory DB, parallelize |
| No test for error paths | Only happy path tested | Test 400, 401, 403, 404, 409, 422 |
| Hardcoded test data | Magic numbers everywhere | Use factory functions |
| No coverage thresholds | Coverage drops silently | Set 80% minimum in CI |

---

## 11. Interview-Ready Answers

### "How do you approach testing a Node.js API?"

> "I follow the testing trophy: heavy on integration tests (API routes → DB), lighter on unit tests (pure logic) and E2E. For integration tests, I use Vitest with Supertest and mongodb-memory-server so each test suite gets an isolated database. I test both happy paths and error scenarios — 401 for missing auth, 403 for forbidden roles, 422 for validation errors, 404 for missing resources, 409 for duplicates. Service layer unit tests mock only the repository layer. I maintain 80%+ coverage enforced in CI."

### "What do you mock and what do you not?"

> "I mock external boundaries: third-party APIs, email services, payment gateways, cloud storage. I never mock internal logic like services or repositories in integration tests — the whole point is testing them together. For unit tests, I mock the repository to test service logic in isolation. The database is 'mocked' by using an in-memory MongoDB instance that's fast and isolated."

---

> **Next:** [11-configuration.md](11-configuration.md) — Environment variables, secrets management, config validation
