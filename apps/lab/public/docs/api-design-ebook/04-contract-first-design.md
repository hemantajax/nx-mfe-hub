# Chapter 04 — Contract-First Design: OpenAPI, Codegen & Shared Types

## TL;DR

**Contract-first** means defining the API schema before writing any implementation code. The schema is the source of truth. Both frontend and backend generate their types, validation, and mocks from it — eliminating drift.

> **One-liner for interviews:** "Contract-first means the schema ships before the code. Both sides generate types from the same source of truth, so they can't drift."

---

## Core Concept

### The Drift Problem

Without a contract, this happens:

```
Week 1: Backend ships { "userName": "Priya" }
Week 3: Backend renames it to { "user_name": "Priya" }  // camelCase → snake_case
Week 3: Frontend breaks in production.
```

Or the inverse:
```
Frontend calls API expecting: { "price": 150 }    // number
Backend ships:                { "price": "150.00" } // string
Frontend's parseInt() saves it, for now.
```

These bugs are invisible until runtime. Contract-first makes them compile-time errors.

### Contract-First Flow

```
1. Design API schema (OpenAPI / Proto / GraphQL SDL)
        ↓
2. Both teams agree on the schema
        ↓
3. Generate types from schema
   ├── Frontend: TypeScript types + fetch client
   └── Backend: Request validators + response serializers
        ↓
4. Implement against the generated types
        ↓
5. Tests mock from the schema — guaranteed compatibility
```

If the schema changes, codegen runs, and TypeScript errors tell you exactly what broke.

---

## Deep Dive

### OpenAPI (Swagger)

OpenAPI is the dominant contract format for REST APIs. It describes every endpoint, request shape, response shape, and error in YAML or JSON.

```yaml
# openapi.yaml
openapi: "3.1.0"
info:
  title: Order API
  version: "1.0"

paths:
  /orders/{id}:
    get:
      operationId: getOrder
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        "200":
          description: Order found
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Order"
        "404":
          $ref: "#/components/responses/NotFound"

components:
  schemas:
    Order:
      type: object
      required: [id, status, total]
      properties:
        id:
          type: string
        status:
          type: string
          enum: [pending, processing, shipped, delivered, cancelled]
        total:
          type: number
          format: float
        createdAt:
          type: string
          format: date-time
```

This file is the contract. It goes in version control. PRs that change it are reviewed by both teams.

---

### Codegen: Types from Schema

#### Frontend (TypeScript) — openapi-typescript

```bash
npx openapi-typescript ./openapi.yaml --output ./src/api/types.gen.ts
```

Generated output:
```typescript
// types.gen.ts — DO NOT EDIT MANUALLY
export interface Order {
  id: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  total: number;
  createdAt?: string;
}

export type GetOrderResponse = Order;
```

Now your fetch calls are typed:
```typescript
import type { Order } from './api/types.gen';

async function fetchOrder(id: string): Promise<Order> {
  const res = await fetch(`/api/orders/${id}`);
  if (!res.ok) throw new ApiError(res);
  return res.json() as Promise<Order>;
}
```

If the backend renames `status` to `orderStatus`, codegen regenerates, and every reference to `.status` in your codebase becomes a TypeScript error. Caught before production.

#### Backend (Node.js) — Express + Zod

Generate Zod schemas from OpenAPI for runtime validation:

```bash
npx openapi-zod-client ./openapi.yaml --output ./src/api/validators.gen.ts
```

```typescript
// In your route handler:
import { OrderSchema } from './api/validators.gen';

app.get('/orders/:id', async (req, res) => {
  const order = await db.orders.findById(req.params.id);
  
  // Runtime validation against the schema
  const validated = OrderSchema.parse(order);  // throws if shape is wrong
  res.json(validated);
});
```

The backend now *can't* return a shape that violates the contract without a runtime error.

---

### tRPC — Type Safety Without Schemas

tRPC eliminates the schema file entirely. The backend's TypeScript function signatures *are* the types. The frontend imports them directly.

```typescript
// server/router.ts
export const appRouter = t.router({
  getOrder: t.procedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return db.orders.findById(input.id);
      // Return type is inferred automatically
    }),
});

export type AppRouter = typeof appRouter;
```

```typescript
// client/OrderPage.tsx
import { trpc } from './trpc';  // client configured with AppRouter type

function OrderPage({ id }: { id: string }) {
  const { data } = trpc.getOrder.useQuery({ id });
  // data is fully typed — no codegen step needed
  return <div>{data?.status}</div>;
}
```

**When tRPC is ideal:**
- Full-stack TypeScript (Next.js, Remix)
- Same repo (monorepo) — client and server share types directly
- No need to support non-TypeScript clients

**When OpenAPI is better:**
- Separate repos
- Multiple client languages (Python client, iOS app)
- You need human-readable documentation for external consumers

---

### GraphQL SDL — Schema as Contract

In GraphQL, the Schema Definition Language (SDL) is the contract:

```graphql
# schema.graphql
type Order {
  id: ID!
  status: OrderStatus!
  total: Float!
  createdAt: DateTime!
  items: [OrderItem!]!
}

enum OrderStatus {
  PENDING
  PROCESSING
  SHIPPED
  DELIVERED
  CANCELLED
}

type Query {
  order(id: ID!): Order
}
```

Generate TypeScript types with `graphql-codegen`:

```bash
npx graphql-codegen --config codegen.yml
```

Both the frontend query types and resolver signatures are generated from the same SDL. The schema is git-tracked; changes require both teams to update.

---

### Mocking from the Contract

One underused power of contract-first: **both teams can work in parallel from day one**.

The backend hasn't shipped yet? The frontend uses `msw` (Mock Service Worker) to mock based on the OpenAPI schema:

```typescript
// mocks/handlers.ts
import { http, HttpResponse } from 'msw';
import type { Order } from './api/types.gen';

const mockOrder: Order = {
  id: 'order_123',
  status: 'shipped',
  total: 249.99,
  createdAt: '2024-03-01T10:00:00Z',
};

export const handlers = [
  http.get('/api/orders/:id', ({ params }) => {
    return HttpResponse.json(mockOrder);
  }),
];
```

The mock exactly matches the contract. When the real backend ships, remove the mock — no shape surprises.

---

## Best Practices

- **Schema lives in version control.** The OpenAPI or SDL file is a first-class citizen. It has a PR review process.
- **Run codegen in CI.** If generated types are out of sync with the schema, the CI build fails. No drift reaches production.
- **Design the contract before coding.** Write the schema first. Review it with both teams. Then implement. Don't generate OpenAPI from code after the fact — you get the shape the backend happened to produce, not the shape the frontend needs.
- **Use `$ref` for reusability.** Define common schemas (pagination, errors) once and reference them across endpoints.
- **Version the schema file alongside the API.** When you bump to `/v2/`, create `openapi.v2.yaml`. Keep both in the repo.
- **Never edit generated files manually.** Add `.gen.ts` to a comment header: `// DO NOT EDIT — generated from openapi.yaml`. Enforce this in linting.

---

## Common Mistakes

❌ **"Code first" then generate docs** — You get types that reflect what the backend built, not what the frontend needs. The contract should define the implementation, not describe it after the fact.

❌ **Checking in generated files but not running codegen in CI** — Generated files drift from the schema. Someone edits a `.gen.ts` file by hand. The contract is now wrong.

❌ **Optional everywhere** — Over-using `?` on response fields means every property access needs a null check. Be deliberate — if the field always exists, make it required in the schema.

❌ **No error schema** — Defining the success response but not the error response leaves the frontend guessing. Every endpoint should define its error shapes too.

❌ **tRPC across repos** — tRPC's magic requires TypeScript on both sides in the same project. Across repos or languages, you need a real schema file.

---

## Interview Q&A

**Q: What's contract-first API design?**  
A: "Contract-first means the API schema is written before the implementation. The schema — whether that's an OpenAPI spec, GraphQL SDL, or Proto file — is the source of truth. Both frontend and backend generate their types from it. If the schema changes, codegen runs and TypeScript errors immediately surface every affected call site. It eliminates the runtime surprises you get when teams work from informal agreements."

**Q: How do you keep frontend and backend types in sync?**  
A: "By treating the OpenAPI spec or GraphQL schema as the single source of truth and running codegen in CI. If the generated types are out of sync with the schema, the build fails. Frontend uses tools like `openapi-typescript` or `graphql-codegen` to generate TypeScript interfaces. Backend uses Zod schemas generated from the same spec for runtime validation. Neither side can drift without breaking the build."

**Q: When would you use tRPC vs OpenAPI?**  
A: "tRPC when it's a full-stack TypeScript project in a monorepo — you get end-to-end type safety without any schema file or codegen step. The backend's TypeScript types are the contract. OpenAPI when you have multiple clients (iOS, Python, another team's service), need human-readable documentation, or the frontend and backend live in separate repos. tRPC's magic doesn't travel across language or repo boundaries."

**Q: How do you use the contract to unblock parallel development?**  
A: "Once the schema is agreed on, the frontend mocks the API using MSW or similar, building against the exact contract shapes. The backend implements against the same contract. Both work in parallel. When the backend ships, you remove the mock — no integration surprises because both sides were working from the same document."

---

## Next Steps

- **Error Handling** → [05-error-handling-and-resilience.md](./05-error-handling-and-resilience.md) — typing and handling error responses from your contract
- **Cheat Sheet** → [06-cheat-sheet-and-qa.md](./06-cheat-sheet-and-qa.md) — quick reference checklist for contract-first
- **BFF Pattern** → [03-bff-pattern.md](./03-bff-pattern.md) — where the BFF's contract fits in the bigger picture
