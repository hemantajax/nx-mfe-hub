# Chapter 02 — Pagination, Filtering & Versioning

## TL;DR

| Topic | Recommended Default | When to Deviate |
|-------|-------------------|-----------------|
| **Pagination** | Cursor-based | Offset for admin UIs where users jump to page N |
| **Filtering** | Query params for simple; POST body for complex | Always document, never invent ad-hoc syntax |
| **Versioning** | URL prefix (`/v1/`) | Header versioning for internal or SDK-first APIs |

> **One-liner for interviews:** "Cursor pagination for feeds and infinite scroll, offset for numbered pages, URL versioning for public APIs, schema evolution for GraphQL."

---

## Core Concept

Pagination, filtering, and versioning are the three places APIs most commonly break in production. They look simple on day one and become painful at scale.

- **Pagination** is about how you slice a large dataset for delivery
- **Filtering** is about which slice the client wants
- **Versioning** is about how you change the shape of those slices over time without breaking existing consumers

Getting these right is the difference between an API that scales to millions of records and one that falls over at 10,000.

---

## Deep Dive

### Pagination

#### Offset / Page-Based

```
GET /api/orders?page=3&limit=20
GET /api/orders?offset=40&limit=20
```

**How it works:** Skip `offset` rows, return `limit` rows. Simple SQL: `LIMIT 20 OFFSET 40`.

**Strengths:**
- Intuitive — users can jump to "page 5"
- Easy to implement
- Works well for static, rarely-mutating data

**Weaknesses:**
- **Phantom rows:** If items are inserted or deleted between requests, page 2 can repeat or skip items
- **Deep pagination is slow:** `OFFSET 100000 LIMIT 20` forces the DB to scan 100,000 rows before returning 20
- **Inconsistent under writes:** High-write systems make numbered pages meaningless

**Use when:** Admin dashboards, search results, anything users navigate by page number.

---

#### Cursor-Based (Keyset Pagination)

```
GET /api/orders?limit=20
→ { data: [...], nextCursor: "eyJpZCI6MTAwfQ==" }

GET /api/orders?cursor=eyJpZCI6MTAwfQ==&limit=20
→ { data: [...], nextCursor: "eyJpZCI6MTIwfQ==" }
```

**How it works:** The cursor encodes the "position" (usually the last item's ID or timestamp). Next query says "give me items after this position."

SQL equivalent:
```sql
SELECT * FROM orders
WHERE id > :last_seen_id
ORDER BY id ASC
LIMIT 20;
```

**Strengths:**
- Stable under inserts/deletes — no phantom rows
- Fast even for deep pages (index seek, not full scan)
- Natural fit for infinite scroll, feeds, and real-time data

**Weaknesses:**
- Users can't jump to "page 50"
- Cursor is usually opaque (base64) — harder to debug
- Bidirectional cursors (prev + next) are more complex to implement

**Use when:** Feeds, activity logs, infinite scroll, any high-write or large dataset.

---

#### Cursor Design Best Practices

```json
{
  "data": [ ... ],
  "pagination": {
    "nextCursor": "eyJpZCI6MTIwLCJ0cyI6MTcwMDAwMH0=",
    "hasMore": true,
    "limit": 20
  }
}
```

- Encode cursors as base64-encoded JSON (not raw IDs) — gives you flexibility to add fields later
- Always include `hasMore` so clients know when to stop
- Treat cursors as opaque strings — document that clients must not parse them
- Set a max `limit` server-side (e.g., 100) regardless of what client requests

---

### Filtering

#### Query Parameter Patterns

**Simple equality:**
```
GET /api/orders?status=shipped&userId=123
```

**Range filters:**
```
GET /api/orders?createdAfter=2024-01-01&createdBefore=2024-03-31
```

**Array / multi-value:**
```
GET /api/orders?status=shipped&status=delivered   # repeated params
GET /api/orders?status[]=shipped&status[]=delivered  # bracket notation
```

**Operator-based (LHS colon style):**
```
GET /api/products?price[gte]=10&price[lte]=100&rating[gte]=4
```

Pick one convention and document it. Teams that invent ad-hoc filter syntax on a per-endpoint basis create unmaintainable APIs.

#### Complex Filters via POST

When filters become graph-like (AND/OR/NOT trees), query params become unreadable. Use a POST body:

```
POST /api/products/search
{
  "filter": {
    "AND": [
      { "field": "category", "op": "eq", "value": "electronics" },
      { "OR": [
        { "field": "price", "op": "lte", "value": 500 },
        { "field": "inStock", "op": "eq", "value": true }
      ]}
    ]
  },
  "sort": [{ "field": "rating", "dir": "desc" }],
  "pagination": { "limit": 20 }
}
```

This pattern is common in search engines (Elasticsearch DSL) and data-heavy dashboards.

#### Sorting

```
GET /api/orders?sort=createdAt:desc,total:asc
```

- Always define a default sort order server-side
- Document which fields are sortable (don't let clients attempt to sort on non-indexed columns)
- For multi-sort, use a consistent delimiter (comma-separated `field:dir` is common)

---

### API Versioning

Versioning is about making breaking changes without breaking existing consumers.

#### URL Versioning (Recommended for public APIs)

```
/api/v1/users
/api/v2/users
```

**Pros:**
- Visible in logs, browser history, and copy-pastes
- Easy to route at the infrastructure level (nginx, API gateway)
- Clients can pin to a version explicitly

**Cons:**
- Clients must opt in to each new version
- You end up maintaining multiple codepaths in parallel

#### Header Versioning

```
GET /api/users
Accept: application/vnd.myapi.v2+json
```

or:
```
GET /api/users
API-Version: 2024-01-15
```

**Pros:**
- Cleaner URLs
- Date-based versioning (like Stripe's) lets you tie version to a specific API snapshot

**Cons:**
- Harder to test in browsers or with curl without tooling
- Less visible when debugging

#### GraphQL: Schema Evolution (No Versioning)

GraphQL avoids traditional versioning by evolving the schema backwards-compatibly:

1. **Add** new fields freely — old clients ignore unknown fields
2. **Deprecate** old fields: `oldField: String @deprecated(reason: "Use newField instead")`
3. **Remove** only after all clients have migrated

Never make a field required if it was optional. Never change a field's type.

#### What Counts as a Breaking Change?

| Change | Breaking? |
|--------|-----------|
| Adding a new optional field | ✅ No |
| Removing a field | ❌ Yes |
| Renaming a field | ❌ Yes |
| Changing a field's type | ❌ Yes |
| Adding a required request param | ❌ Yes |
| Changing error codes/status | ❌ Yes |
| Adding a new endpoint | ✅ No |

---

## Examples

### Paginated Response Shape (Cursor)

```json
GET /api/v1/feed?limit=10

{
  "data": [
    { "id": "post_1", "title": "Hello World", "createdAt": "2024-03-01T12:00:00Z" },
    { "id": "post_2", "title": "Second Post", "createdAt": "2024-03-02T08:30:00Z" }
  ],
  "pagination": {
    "nextCursor": "eyJpZCI6InBvc3RfMiIsInRzIjoiMjAyNC0wMy0wMlQwODozMDowMFoifQ==",
    "hasMore": true,
    "limit": 10
  }
}
```

### Filter + Sort + Paginate (Combined)

```
GET /api/v1/products
  ?category=electronics
  &price[gte]=50
  &price[lte]=500
  &inStock=true
  &sort=rating:desc
  &limit=20
  &cursor=eyJpZCI6IjEwMCJ9
```

---

## Best Practices

- **Always set a max page size.** Never trust the client's `limit` value without bounding it server-side.
- **Return total count carefully.** `SELECT COUNT(*)` on large tables is slow. Return `hasMore` from cursor pagination instead of total. Only compute totals when users explicitly need them.
- **Index your filter fields.** Every filterable or sortable field needs a DB index. Document which fields are filterable to prevent expensive full-table scans.
- **Keep cursors opaque.** Never let clients build or modify cursors. Treat them as tokens.
- **Deprecate before removing.** Add a `Sunset` response header (`Sunset: Sat, 31 Dec 2024 00:00:00 GMT`) when a version has an end-of-life date.
- **Use semantic versioning for SDKs, date versioning for APIs.** Stripe's date versioning (`2023-10-16`) is a clean pattern for long-lived public APIs.

---

## Common Mistakes

❌ **Offset pagination on a high-write feed** — Users will see duplicate or missing items as content is inserted mid-scroll. Use cursors.

❌ **Deep offset queries in production** — `OFFSET 50000` will scan 50,000 rows. On a 10M-row table, this causes timeouts. Add cursor pagination or force a max depth.

❌ **Inventing per-endpoint filter syntax** — If `/orders` uses `?from=` but `/products` uses `?createdAfter=` for the same concept, your API is inconsistent and hard to document.

❌ **Changing a field type without versioning** — Changing `"total": 150` (integer) to `"total": "150.00"` (string) silently breaks clients that expect a number.

❌ **No default sort** — Without a deterministic default sort, pagination is non-deterministic. Always include a tiebreaker (e.g., `id`) in your sort.

---

## Interview Q&A

**Q: Why is cursor pagination better than offset for infinite scroll?**  
A: "With offset, if a new post is inserted at the top of a feed between page 1 and page 2, page 2 will include the last item from page 1 again — a duplicate. With cursor pagination, you say 'give me everything after item X' — inserts above X don't affect the result. It's also faster: offset forces a DB scan of all skipped rows, while a cursor uses an index seek directly to the position."

**Q: What's a breaking change in an API?**  
A: "Removing or renaming a field, changing a field's type, making an optional field required, or changing status codes and error structures. Adding new optional fields is non-breaking. That distinction drives my versioning strategy — I try to design APIs that can evolve without breaking changes, and I bump the version only when I can't avoid one."

**Q: How does Stripe-style date versioning work?**  
A: "Each API version is tied to a specific date. Clients pin to a date version in their API key settings or a header. New features land in the latest version. When you're ready to adopt them, you upgrade your version. This gives Stripe the ability to ship breaking changes without forcing immediate migration. It's powerful for SDKs where the upgrade path is controlled."

**Q: How do you handle filtering without exposing your DB schema?**  
A: "I define an explicit allowlist of filterable fields on the API layer and map them to internal field names. The client sends `?status=shipped`, the API maps it to `order_status = 'SHIPPED'` internally. This decouples the API contract from the DB schema — I can rename columns, swap ORMs, or shard without changing the public API."

---

## Next Steps

- **BFF Pattern** → [03-bff-pattern.md](./03-bff-pattern.md) — how BFF layers handle aggregated, paginated queries
- **Error Handling** → [05-error-handling-and-resilience.md](./05-error-handling-and-resilience.md) — what to return when filters fail or a version is sunset
- **Cheat Sheet** → [06-cheat-sheet-and-qa.md](./06-cheat-sheet-and-qa.md) — quick reference for all pagination patterns
