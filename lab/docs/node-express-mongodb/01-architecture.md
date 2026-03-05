# 01 — Project Architecture & Structure

> **TL;DR:** Use a layered, feature-based architecture with clear separation: routes → controllers → services → repositories → models. Keep business logic in services, never in controllers. Use TypeScript, dependency injection, and barrel exports. Structure scales from startup to enterprise.

---

## 1. Architecture Mindset for Backend

In an architect interview, they want to hear **why** you chose a pattern, not just what it is.

Key principles:
- **Separation of Concerns** — Each layer has one job
- **Testability** — Can you unit test business logic without a database?
- **Scalability** — Can you split this into microservices later without rewriting?
- **Team Ownership** — Can 5 teams work on the same codebase without stepping on each other?
- **Replaceability** — Can you swap MongoDB for PostgreSQL without touching business logic?

---

## 2. Layer-Based vs Feature-Based

### Layer-Based (Small Projects)

```
src/
  controllers/
    user.controller.ts
    order.controller.ts
    product.controller.ts
  services/
    user.service.ts
    order.service.ts
    product.service.ts
  models/
    user.model.ts
    order.model.ts
    product.model.ts
  routes/
    user.routes.ts
    order.routes.ts
    product.routes.ts
```

**Pros:** Simple, everyone knows where things are  
**Cons:** At 50+ features, each folder has 50+ files — impossible to navigate

### Feature-Based (Enterprise Standard)

```
src/
  modules/
    user/
      user.controller.ts
      user.service.ts
      user.repository.ts
      user.model.ts
      user.routes.ts
      user.validation.ts
      user.types.ts
      __tests__/
        user.service.test.ts
        user.controller.test.ts
    order/
      order.controller.ts
      order.service.ts
      ...
```

**Why it wins:**
- Each feature is self-contained — delete a folder, delete a feature
- Teams own specific modules
- Easy to extract into a microservice later
- Tests live next to what they test

---

## 3. Enterprise Folder Structure (Production-Grade)

```
project-root/
├── src/
│   ├── app.ts                        ← Express app setup (middleware, routes)
│   ├── server.ts                     ← HTTP server bootstrap (listen, graceful shutdown)
│   │
│   ├── config/                       ← Configuration layer
│   │   ├── index.ts                  ← Validated config object (single source of truth)
│   │   ├── database.ts               ← DB connection config
│   │   ├── logger.ts                 ← Logger config
│   │   └── env.validation.ts         ← Zod schema for env vars
│   │
│   ├── common/                       ← Cross-cutting shared code
│   │   ├── middleware/
│   │   │   ├── error-handler.ts      ← Global error handler
│   │   │   ├── not-found.ts          ← 404 handler
│   │   │   ├── request-id.ts         ← Attach UUID to every request
│   │   │   ├── rate-limiter.ts       ← Rate limiting middleware
│   │   │   └── validate.ts           ← Generic Zod validation middleware
│   │   ├── errors/
│   │   │   ├── app-error.ts          ← Base custom error class
│   │   │   ├── not-found.error.ts    ← 404 error
│   │   │   ├── validation.error.ts   ← 422 error
│   │   │   └── unauthorized.error.ts ← 401 error
│   │   ├── types/
│   │   │   ├── express.d.ts          ← Extended Express types
│   │   │   └── common.types.ts       ← Shared type definitions
│   │   ├── utils/
│   │   │   ├── async-handler.ts      ← Catch async errors in routes
│   │   │   ├── pagination.ts         ← Pagination helper
│   │   │   └── response.ts           ← Standard response formatter
│   │   └── constants/
│   │       └── http-status.ts        ← Status code constants
│   │
│   ├── modules/                      ← Feature modules (the heart of the app)
│   │   ├── auth/
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.routes.ts
│   │   │   ├── auth.validation.ts
│   │   │   ├── auth.types.ts
│   │   │   ├── strategies/
│   │   │   │   ├── jwt.strategy.ts
│   │   │   │   └── local.strategy.ts
│   │   │   └── __tests__/
│   │   │       └── auth.service.test.ts
│   │   │
│   │   ├── user/
│   │   │   ├── user.controller.ts
│   │   │   ├── user.service.ts
│   │   │   ├── user.repository.ts    ← Data access layer (Mongoose queries)
│   │   │   ├── user.model.ts         ← Mongoose schema + model
│   │   │   ├── user.routes.ts
│   │   │   ├── user.validation.ts    ← Zod schemas for request validation
│   │   │   ├── user.types.ts         ← Interfaces / DTOs
│   │   │   └── __tests__/
│   │   │       ├── user.service.test.ts
│   │   │       └── user.controller.test.ts
│   │   │
│   │   └── product/
│   │       └── ... (same pattern)
│   │
│   └── infrastructure/               ← External service integrations
│       ├── database/
│       │   └── connection.ts         ← MongoDB connection with retry logic
│       ├── cache/
│       │   └── redis.client.ts       ← Redis connection
│       ├── queue/
│       │   └── bull.config.ts        ← Job queue setup
│       └── email/
│           └── email.service.ts      ← Email provider adapter
│
├── tests/                            ← Integration / E2E tests
│   ├── setup.ts                      ← Global test setup (DB, server)
│   ├── helpers/
│   │   ├── db.helper.ts              ← Seed / teardown helpers
│   │   └── auth.helper.ts            ← Generate test tokens
│   └── integration/
│       ├── user.integration.test.ts
│       └── auth.integration.test.ts
│
├── scripts/                          ← CLI scripts (seeds, migrations)
│   ├── seed.ts
│   └── migrate.ts
│
├── .env.example                      ← Documented env template
├── .env                              ← Local env (gitignored)
├── docker-compose.yml                ← Local dev services (Mongo, Redis)
├── Dockerfile                        ← Multi-stage production build
├── tsconfig.json
├── vitest.config.ts
├── eslint.config.mjs
├── package.json
└── README.md
```

---

## 4. The Layered Architecture — Request Flow

```
HTTP Request
    │
    ▼
┌─────────────┐
│   Routes     │  ← URL → Controller mapping, validation middleware
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Middleware   │  ← Auth, rate limit, request ID, logging
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Controller   │  ← Parse request, call service, format response
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Service     │  ← Business logic, orchestration, NO HTTP concepts
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Repository   │  ← Data access, Mongoose queries, DB-specific code
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Model      │  ← Mongoose schema, validation, virtuals, hooks
└─────────────┘
```

### Rules for Each Layer

| Layer | Knows About | Never Knows About |
|-------|-------------|-------------------|
| **Route** | Controller, validation schema | Service, Repository, Model |
| **Controller** | Service, Request/Response | Repository, Model, Database |
| **Service** | Repository, other Services | Express (req/res), HTTP |
| **Repository** | Model, Database | Express, Business rules |
| **Model** | Database schema | Everything else |

---

## 5. Code Example — Full Feature Module

### 5.1 Model Layer

```typescript
// src/modules/user/user.model.ts
import { Schema, model, type Document } from 'mongoose';

export interface IUser {
  email: string;
  name: string;
  password: string;
  role: 'user' | 'admin' | 'moderator';
  isActive: boolean;
  lastLoginAt?: Date;
}

export interface IUserDocument extends IUser, Document {
  createdAt: Date;
  updatedAt: Date;
  fullName: string;
}

const userSchema = new Schema<IUserDocument>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    password: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ['user', 'admin', 'moderator'],
      default: 'user',
    },
    isActive: { type: Boolean, default: true },
    lastLoginAt: Date,
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
  }
);

userSchema.index({ email: 1, isActive: 1 });
userSchema.index({ role: 1 });

export const User = model<IUserDocument>('User', userSchema);
```

### 5.2 Repository Layer

```typescript
// src/modules/user/user.repository.ts
import { User, type IUserDocument } from './user.model';
import type { FilterQuery, UpdateQuery } from 'mongoose';

export class UserRepository {
  async findById(id: string): Promise<IUserDocument | null> {
    return User.findById(id).lean();
  }

  async findByEmail(email: string): Promise<IUserDocument | null> {
    return User.findOne({ email }).select('+password');
  }

  async findAll(
    filter: FilterQuery<IUserDocument> = {},
    page = 1,
    limit = 20
  ): Promise<{ data: IUserDocument[]; total: number }> {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      User.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }).lean(),
      User.countDocuments(filter),
    ]);

    return { data, total };
  }

  async create(userData: Partial<IUserDocument>): Promise<IUserDocument> {
    const user = new User(userData);
    return user.save();
  }

  async updateById(
    id: string,
    update: UpdateQuery<IUserDocument>
  ): Promise<IUserDocument | null> {
    return User.findByIdAndUpdate(id, update, { new: true, runValidators: true }).lean();
  }

  async deleteById(id: string): Promise<IUserDocument | null> {
    return User.findByIdAndDelete(id).lean();
  }
}
```

### 5.3 Service Layer

```typescript
// src/modules/user/user.service.ts
import { hash } from 'bcryptjs';
import { UserRepository } from './user.repository';
import { AppError } from '../../common/errors/app-error';
import type { CreateUserDto, UpdateUserDto } from './user.types';

export class UserService {
  constructor(private readonly userRepo = new UserRepository()) {}

  async getUsers(page: number, limit: number) {
    return this.userRepo.findAll({ isActive: true }, page, limit);
  }

  async getUserById(id: string) {
    const user = await this.userRepo.findById(id);
    if (!user) throw new AppError('User not found', 404);
    return user;
  }

  async createUser(dto: CreateUserDto) {
    const existing = await this.userRepo.findByEmail(dto.email);
    if (existing) throw new AppError('Email already registered', 409);

    const hashedPassword = await hash(dto.password, 12);
    return this.userRepo.create({ ...dto, password: hashedPassword });
  }

  async updateUser(id: string, dto: UpdateUserDto) {
    const user = await this.userRepo.updateById(id, dto);
    if (!user) throw new AppError('User not found', 404);
    return user;
  }

  async deleteUser(id: string) {
    const user = await this.userRepo.deleteById(id);
    if (!user) throw new AppError('User not found', 404);
    return user;
  }
}
```

### 5.4 Controller Layer

```typescript
// src/modules/user/user.controller.ts
import type { Request, Response } from 'express';
import { UserService } from './user.service';
import { sendSuccess } from '../../common/utils/response';

const userService = new UserService();

export class UserController {
  async getAll(req: Request, res: Response) {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await userService.getUsers(page, limit);
    sendSuccess(res, result.data, 200, {
      page,
      limit,
      total: result.total,
    });
  }

  async getById(req: Request, res: Response) {
    const user = await userService.getUserById(req.params.id);
    sendSuccess(res, user);
  }

  async create(req: Request, res: Response) {
    const user = await userService.createUser(req.body);
    sendSuccess(res, user, 201);
  }

  async update(req: Request, res: Response) {
    const user = await userService.updateUser(req.params.id, req.body);
    sendSuccess(res, user);
  }

  async delete(req: Request, res: Response) {
    await userService.deleteUser(req.params.id);
    sendSuccess(res, null, 204);
  }
}
```

### 5.5 Routes Layer

```typescript
// src/modules/user/user.routes.ts
import { Router } from 'express';
import { UserController } from './user.controller';
import { validate } from '../../common/middleware/validate';
import { authenticate } from '../../common/middleware/authenticate';
import { authorize } from '../../common/middleware/authorize';
import { createUserSchema, updateUserSchema } from './user.validation';
import { asyncHandler } from '../../common/utils/async-handler';

const router = Router();
const controller = new UserController();

router.use(authenticate);

router.get('/', asyncHandler(controller.getAll));
router.get('/:id', asyncHandler(controller.getById));
router.post('/', authorize('admin'), validate(createUserSchema), asyncHandler(controller.create));
router.patch('/:id', validate(updateUserSchema), asyncHandler(controller.update));
router.delete('/:id', authorize('admin'), asyncHandler(controller.delete));

export { router as userRoutes };
```

### 5.6 Validation Schemas

```typescript
// src/modules/user/user.validation.ts
import { z } from 'zod';

export const createUserSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    name: z.string().min(2, 'Name must be at least 2 characters'),
    password: z
      .string()
      .min(8)
      .regex(/[A-Z]/, 'Must contain uppercase')
      .regex(/[0-9]/, 'Must contain number')
      .regex(/[^A-Za-z0-9]/, 'Must contain special character'),
    role: z.enum(['user', 'admin', 'moderator']).optional(),
  }),
});

export const updateUserSchema = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    role: z.enum(['user', 'admin', 'moderator']).optional(),
    isActive: z.boolean().optional(),
  }),
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId'),
  }),
});
```

### 5.7 Types / DTOs

```typescript
// src/modules/user/user.types.ts
import type { z } from 'zod';
import type { createUserSchema, updateUserSchema } from './user.validation';

export type CreateUserDto = z.infer<typeof createUserSchema>['body'];
export type UpdateUserDto = z.infer<typeof updateUserSchema>['body'];

export interface UserResponse {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}
```

---

## 6. Standard Response Format

Every API should return consistent response shapes:

```typescript
// src/common/utils/response.ts
import type { Response } from 'express';

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages?: number;
}

export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode = 200,
  pagination?: PaginationMeta
) {
  const response: Record<string, unknown> = {
    success: true,
    data,
  };

  if (pagination) {
    response.pagination = {
      ...pagination,
      totalPages: Math.ceil(pagination.total / pagination.limit),
    };
  }

  res.status(statusCode).json(response);
}

export function sendError(
  res: Response,
  message: string,
  statusCode = 500,
  errors?: unknown[]
) {
  res.status(statusCode).json({
    success: false,
    message,
    ...(errors && { errors }),
  });
}
```

**Consistent API responses:**

```json
// Success
{
  "success": true,
  "data": { "id": "...", "name": "John" },
  "pagination": { "page": 1, "limit": 20, "total": 150, "totalPages": 8 }
}

// Error
{
  "success": false,
  "message": "Validation failed",
  "errors": [{ "field": "email", "message": "Invalid email format" }]
}
```

---

## 7. Dependency Injection Without a Framework

You don't need NestJS for DI. A simple factory pattern works:

```typescript
// src/modules/user/user.module.ts
import { UserRepository } from './user.repository';
import { UserService } from './user.service';
import { UserController } from './user.controller';

const userRepository = new UserRepository();
const userService = new UserService(userRepository);
const userController = new UserController(userService);

export { userController, userService, userRepository };
```

For larger apps, use a DI container like **tsyringe** or **awilix**:

```typescript
// src/container.ts — using awilix
import { createContainer, asClass, InjectionMode } from 'awilix';

const container = createContainer({
  injectionMode: InjectionMode.CLASSIC,
});

container.register({
  userRepository: asClass(UserRepository).scoped(),
  userService: asClass(UserService).scoped(),
  orderRepository: asClass(OrderRepository).scoped(),
  orderService: asClass(OrderService).scoped(),
});

export { container };
```

---

## 8. NestJS vs Express — When to Choose What

| Criteria | Express | NestJS |
|----------|---------|--------|
| **Team size** | Small–Medium | Medium–Large |
| **Opinionated?** | No — you decide | Yes — Angular-like structure |
| **DI built-in?** | No | Yes (core feature) |
| **TypeScript** | Optional | First-class |
| **Performance** | Fast (minimal overhead) | Slightly slower (decorators, reflection) |
| **Learning curve** | Low | Higher (decorators, modules, providers) |
| **Microservices** | Manual setup | Built-in transports (TCP, NATS, Kafka, gRPC) |
| **Testing** | Manual DI setup | Built-in testing module |
| **Interview frequency** | Very high | Growing |

**Architect answer:** "For startups and small teams, Express with a clean layered architecture is sufficient. For enterprise teams with 10+ developers, NestJS provides the guardrails that prevent architectural drift."

---

## 9. Fastify — The Performance Alternative

```typescript
// Fastify equivalent for comparison
import Fastify from 'fastify';

const app = Fastify({
  logger: true,               // Built-in Pino logger
  ajv: { customOptions: {} }, // Built-in JSON schema validation
});

app.get('/users', {
  schema: {
    querystring: {
      type: 'object',
      properties: {
        page: { type: 'integer', minimum: 1 },
        limit: { type: 'integer', minimum: 1, maximum: 100 },
      },
    },
    response: {
      200: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: { type: 'array' },
        },
      },
    },
  },
  handler: async (request, reply) => {
    const { page = 1, limit = 20 } = request.query as any;
    const users = await userService.getUsers(page, limit);
    return { success: true, data: users };
  },
});
```

**Why Fastify matters:**
- 2-3x faster than Express in benchmarks
- Schema-based validation (JSON Schema, compiled at startup)
- Built-in serialization (fast-json-stringify)
- Built-in logging (Pino)
- Plugin-based architecture (encapsulated contexts)
- Full TypeScript support

---

## 10. Common Mistakes

| Mistake | Why It's Bad | Fix |
|---------|-------------|-----|
| Business logic in controllers | Untestable, duplicated | Move to service layer |
| `require()` instead of ES modules | Outdated, no tree-shaking | Use `import/export` with `"type": "module"` |
| No TypeScript | Runtime errors, no IDE support | Always use TypeScript |
| Flat folder structure | Unscalable, messy | Feature-based modules |
| Direct DB calls in routes | Tight coupling, no reuse | Repository pattern |
| No error handling layer | Crashes leak stack traces | Global error handler |
| Hardcoded config values | Can't deploy to multiple envs | Use env vars + config module |
| No request validation | SQL/NoSQL injection, garbage data | Zod / Joi on every route |
| God services (2000+ lines) | Unmaintainable | Split by responsibility |

---

## 11. Interview-Ready Answers

### "How would you structure a large Node.js API?"

> "I use a feature-based modular architecture with clear layers: Routes define endpoints and attach validation middleware. Controllers handle HTTP — parsing the request and formatting the response. Services contain all business logic and are framework-agnostic (no `req`/`res`). Repositories abstract database access. Models define the schema.
>
> Cross-cutting concerns like authentication, logging, error handling, and rate limiting live in a shared middleware layer. Configuration is validated at startup using Zod against a strict schema. The whole app uses TypeScript with strict mode enabled.
>
> For 3+ teams, I'd introduce a DI container (awilix or tsyringe) and consider NestJS for its opinionated module system. For high-throughput services, Fastify is my go-to over Express."

### "Why not put everything in one file?"

> "Separation of concerns. A controller shouldn't know how data is stored. A service shouldn't know what HTTP framework you're using. This makes testing trivial — I can unit test a service by mocking the repository without spinning up Express or a database."

---

> **Next:** [02-express-deep-dive.md](02-express-deep-dive.md) — Express 5 internals, router, and request lifecycle
