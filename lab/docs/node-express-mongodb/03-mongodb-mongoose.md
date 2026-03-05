# 03 — MongoDB & Mongoose Deep Dive

> **TL;DR:** MongoDB is a document database — design schemas around query patterns, not normalization. Embed data that's read together, reference data that changes independently. Index every query. Use aggregation pipelines for complex data transformation. Mongoose 8 adds first-class TypeScript support. Always use transactions for multi-document writes.

---

## 1. MongoDB Architecture — How It Works

```
Client Application
       │
       ▼
┌──────────────────┐
│  MongoDB Driver  │  ← Official Node.js driver (mongodb npm package)
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│   mongos / URI   │  ← Connection string routing
└──────┬───────────┘
       │
       ▼
┌──────────────────────────────────────────┐
│           Replica Set                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │ Primary  │ │Secondary │ │Secondary │ │
│  │ (writes) │ │ (reads)  │ │ (reads)  │ │
│  └──────────┘ └──────────┘ └──────────┘ │
└──────────────────────────────────────────┘
```

**Key MongoDB concepts for interviews:**
- **Document** — JSON-like object (BSON internally), max 16MB
- **Collection** — Group of documents (like a table)
- **Database** — Group of collections
- **Replica Set** — Primary + Secondaries for HA
- **Sharding** — Horizontal partitioning across machines
- **WiredTiger** — Default storage engine (compression, document-level locking)

---

## 2. Mongoose 8 — Modern Setup with TypeScript

```typescript
// src/infrastructure/database/connection.ts
import mongoose from 'mongoose';
import { config } from '../../config';
import { logger } from '../../config/logger';

export async function connectDatabase(): Promise<void> {
  try {
    await mongoose.connect(config.databaseUrl, {
      maxPoolSize: 10,
      minPoolSize: 2,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 5000,
      heartbeatFrequencyMS: 10000,
      retryWrites: true,
      w: 'majority',
    });
    logger.info('MongoDB connected successfully');
  } catch (error) {
    logger.fatal({ err: error }, 'MongoDB connection failed');
    process.exit(1);
  }

  mongoose.connection.on('error', (err) => {
    logger.error({ err }, 'MongoDB connection error');
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected. Attempting reconnect...');
  });
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
  logger.info('MongoDB disconnected gracefully');
}
```

### Connection Pool Explained

```
Application (multiple requests)
    │   │   │   │   │
    ▼   ▼   ▼   ▼   ▼
┌─────────────────────────┐
│     Connection Pool      │  ← maxPoolSize: 10
│  [conn1][conn2]...[conn10]│
└─────────────────────────┘
            │
            ▼
       MongoDB Server
```

- Each connection can handle one operation at a time
- Pool reuses connections instead of creating new ones
- `maxPoolSize: 10` means 10 concurrent DB operations
- In production: `maxPoolSize` = (number of CPU cores) * 2 is a good starting point

---

## 3. Schema Design — TypeScript-First with Mongoose 8

```typescript
// src/modules/product/product.model.ts
import { Schema, model, Types } from 'mongoose';

// 1. Define the interface
interface IProduct {
  name: string;
  slug: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  category: Types.ObjectId;
  tags: string[];
  variants: IVariant[];
  inventory: {
    quantity: number;
    reserved: number;
    warehouse: string;
  };
  images: IImage[];
  isPublished: boolean;
  publishedAt?: Date;
  metadata: Map<string, string>;
}

interface IVariant {
  sku: string;
  name: string;
  price: number;
  attributes: Map<string, string>;
}

interface IImage {
  url: string;
  alt: string;
  isPrimary: boolean;
}

// 2. Define the schema
const productSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: { type: String, required: true, maxlength: 5000 },
    price: { type: Number, required: true, min: 0 },
    compareAtPrice: { type: Number, min: 0 },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    tags: [{ type: String, lowercase: true, trim: true }],
    variants: [
      {
        sku: { type: String, required: true },
        name: { type: String, required: true },
        price: { type: Number, required: true, min: 0 },
        attributes: { type: Map, of: String },
      },
    ],
    inventory: {
      quantity: { type: Number, required: true, min: 0, default: 0 },
      reserved: { type: Number, default: 0, min: 0 },
      warehouse: { type: String, required: true },
    },
    images: [
      {
        url: { type: String, required: true },
        alt: { type: String, default: '' },
        isPrimary: { type: Boolean, default: false },
      },
    ],
    isPublished: { type: Boolean, default: false, index: true },
    publishedAt: Date,
    metadata: { type: Map, of: String },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

// 3. Indexes
productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ price: 1, isPublished: 1 });
productSchema.index({ tags: 1 });
productSchema.index({ 'inventory.quantity': 1 });
productSchema.index({ slug: 1 }, { unique: true });

// 4. Virtual
productSchema.virtual('isOnSale').get(function () {
  return this.compareAtPrice != null && this.compareAtPrice > this.price;
});

// 5. Pre-save hook
productSchema.pre('save', function (next) {
  if (this.isModified('isPublished') && this.isPublished && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  next();
});

// 6. Static method
productSchema.statics.findPublished = function () {
  return this.find({ isPublished: true }).sort({ publishedAt: -1 });
};

export const Product = model<IProduct>('Product', productSchema);
```

---

## 4. Embed vs Reference — The Critical Design Decision

### When to Embed (Denormalize)

```typescript
// GOOD: Address embedded in User — always read together
const userSchema = new Schema({
  name: String,
  addresses: [{
    street: String,
    city: String,
    state: String,
    zip: String,
    isPrimary: Boolean,
  }],
});
```

**Embed when:**
- Data is always read together (1 query instead of 2)
- Child data doesn't exceed 16MB document limit
- Child data doesn't change independently
- Child belongs to exactly one parent (1:few relationship)
- You need atomic updates on parent + child

### When to Reference (Normalize)

```typescript
// GOOD: Order references User — User exists independently
const orderSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  items: [{
    product: { type: Schema.Types.ObjectId, ref: 'Product' },
    quantity: Number,
    priceAtPurchase: Number, // snapshot the price!
  }],
  total: Number,
  status: { type: String, enum: ['pending', 'paid', 'shipped', 'delivered'] },
});
```

**Reference when:**
- Data is shared across multiple parents (many-to-many)
- Child data changes independently and frequently
- Child collection can grow unbounded
- You need to query children independently

### Decision Matrix

| Criteria | Embed | Reference |
|----------|-------|-----------|
| Read together? | Always | Sometimes |
| Child count | 1–few (< 100) | Many (100+) or unbounded |
| Child size | Small | Large or growing |
| Update frequency | Rarely | Frequently |
| Need to query independently? | No | Yes |

### The Hybrid Pattern (Subset)

```typescript
// Store recent 3 reviews embedded + all reviews in separate collection
const productSchema = new Schema({
  name: String,
  recentReviews: [{           // Embedded subset for fast reads
    userId: Schema.Types.ObjectId,
    rating: Number,
    text: String,
    createdAt: Date,
  }],
  reviewCount: Number,
  averageRating: Number,
});

// Full review collection for pagination, search, etc.
const reviewSchema = new Schema({
  product: { type: Schema.Types.ObjectId, ref: 'Product', index: true },
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  rating: { type: Number, min: 1, max: 5 },
  text: String,
});
```

---

## 5. Indexing — Make or Break Performance

### Index Types

```typescript
// Single field index
schema.index({ email: 1 });                          // Ascending

// Compound index (order matters!)
schema.index({ status: 1, createdAt: -1 });          // Filter by status, sort by date

// Text index (full-text search)
schema.index({ name: 'text', description: 'text' }); // One text index per collection

// TTL index (auto-delete documents)
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Unique index
schema.index({ email: 1 }, { unique: true });

// Partial index (index only matching documents)
schema.index(
  { email: 1 },
  { partialFilterExpression: { isActive: true } }     // Only index active users
);

// Wildcard index (dynamic fields)
schema.index({ 'metadata.$**': 1 });
```

### Compound Index Rules (ESR Rule)

The order of fields in a compound index matters enormously:

```
E — Equality fields first   (exact match: status === 'active')
S — Sort fields second       (orderBy: createdAt DESC)
R — Range fields last        (price > 10 AND price < 100)
```

```typescript
// Query: find active products in price range, sorted by date
db.products.find({ status: 'active', price: { $gte: 10, $lte: 100 } }).sort({ createdAt: -1 });

// Optimal index (ESR):
schema.index({ status: 1, createdAt: -1, price: 1 });
//              E            S               R
```

### Explain Plans — Verify Your Indexes

```typescript
// Check if query uses index
const explanation = await Product.find({ status: 'active' })
  .sort({ createdAt: -1 })
  .explain('executionStats');

// Look for:
// - winningPlan.stage: 'IXSCAN' (good) vs 'COLLSCAN' (bad!)
// - executionStats.totalKeysExamined vs totalDocsExamined
// - Ideal: keysExamined ≈ docsExamined ≈ nReturned
```

---

## 6. Aggregation Pipeline

The aggregation pipeline processes documents through stages. Each stage transforms the document set.

```typescript
// Example: Sales analytics
const analytics = await Order.aggregate([
  // Stage 1: Filter to last 30 days
  {
    $match: {
      status: 'delivered',
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    },
  },
  // Stage 2: Unwind order items
  { $unwind: '$items' },
  // Stage 3: Group by product
  {
    $group: {
      _id: '$items.product',
      totalRevenue: { $sum: { $multiply: ['$items.quantity', '$items.priceAtPurchase'] } },
      totalQuantity: { $sum: '$items.quantity' },
      orderCount: { $sum: 1 },
    },
  },
  // Stage 4: Lookup product details
  {
    $lookup: {
      from: 'products',
      localField: '_id',
      foreignField: '_id',
      as: 'product',
    },
  },
  { $unwind: '$product' },
  // Stage 5: Project final shape
  {
    $project: {
      productName: '$product.name',
      totalRevenue: { $round: ['$totalRevenue', 2] },
      totalQuantity: 1,
      orderCount: 1,
      averageOrderValue: {
        $round: [{ $divide: ['$totalRevenue', '$orderCount'] }, 2],
      },
    },
  },
  // Stage 6: Sort by revenue
  { $sort: { totalRevenue: -1 } },
  // Stage 7: Top 10
  { $limit: 10 },
]);
```

### Common Aggregation Stages

| Stage | Purpose | Example |
|-------|---------|---------|
| `$match` | Filter documents | `{ status: 'active' }` |
| `$group` | Group and aggregate | `{ _id: '$category', count: { $sum: 1 } }` |
| `$project` | Reshape documents | `{ name: 1, totalPrice: { $multiply: ['$qty', '$price'] } }` |
| `$sort` | Order results | `{ createdAt: -1 }` |
| `$limit` / `$skip` | Pagination | `{ $skip: 20 }, { $limit: 10 }` |
| `$lookup` | Join collections | Like SQL LEFT JOIN |
| `$unwind` | Flatten arrays | One doc per array element |
| `$addFields` | Add computed fields | `{ fullName: { $concat: ['$first', ' ', '$last'] } }` |
| `$facet` | Multiple pipelines | Parallel aggregations in one query |
| `$bucket` | Histogram grouping | Group by ranges |
| `$merge` | Write results | Output to another collection |

### Pagination with $facet (Efficient)

```typescript
const result = await Product.aggregate([
  { $match: filter },
  {
    $facet: {
      data: [
        { $sort: { createdAt: -1 } },
        { $skip: (page - 1) * limit },
        { $limit: limit },
      ],
      total: [{ $count: 'count' }],
    },
  },
]);

const data = result[0].data;
const total = result[0].total[0]?.count ?? 0;
```

---

## 7. Transactions — Multi-Document ACID

MongoDB supports multi-document transactions since v4.0 (replica set required).

```typescript
import mongoose from 'mongoose';

async function transferFunds(
  fromAccountId: string,
  toAccountId: string,
  amount: number
): Promise<void> {
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const fromAccount = await Account.findById(fromAccountId).session(session);
      if (!fromAccount || fromAccount.balance < amount) {
        throw new AppError('Insufficient funds', 400);
      }

      await Account.findByIdAndUpdate(
        fromAccountId,
        { $inc: { balance: -amount } },
        { session }
      );

      await Account.findByIdAndUpdate(
        toAccountId,
        { $inc: { balance: amount } },
        { session }
      );

      await Transaction.create(
        [{ from: fromAccountId, to: toAccountId, amount, type: 'transfer' }],
        { session }
      );
    });
  } finally {
    await session.endSession();
  }
}
```

**Transaction rules:**
- Requires replica set (even for local dev — use `rs.initiate()`)
- All operations in a transaction must use the same session
- Keep transactions short (< 60 seconds by default)
- Transactions lock documents — can cause contention
- Use `session.withTransaction()` for automatic retry on transient errors

---

## 8. Mongoose Middleware (Hooks)

```typescript
// Pre-save: hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await hash(this.password, 12);
  next();
});

// Pre-find: always exclude deleted documents
userSchema.pre(/^find/, function (next) {
  this.where({ isDeleted: { $ne: true } });
  next();
});

// Post-save: send welcome email
userSchema.post('save', async function (doc) {
  if (doc.isNew) {
    await emailService.sendWelcome(doc.email, doc.name);
  }
});

// Pre-findOneAndUpdate: update the 'updatedBy' field
userSchema.pre('findOneAndUpdate', function (next) {
  this.set({ updatedBy: this.getOptions().userId });
  next();
});
```

---

## 9. Populate vs Aggregate $lookup

```typescript
// Populate (Mongoose convenience — multiple queries under the hood)
const order = await Order.findById(id)
  .populate('user', 'name email')
  .populate('items.product', 'name price');
// N+1 problem: 1 query for order + 1 for user + 1 for each unique product

// $lookup (single aggregation query — more efficient)
const order = await Order.aggregate([
  { $match: { _id: new Types.ObjectId(id) } },
  {
    $lookup: {
      from: 'users',
      localField: 'user',
      foreignField: '_id',
      as: 'user',
      pipeline: [{ $project: { name: 1, email: 1 } }],
    },
  },
  { $unwind: '$user' },
]);
```

**Rule of thumb:** Use `populate` for simple cases in CRUD. Use `$lookup` in aggregation pipelines and performance-critical queries.

---

## 10. Soft Deletes Pattern

```typescript
// Add soft delete fields to schema
const baseSchemaOptions = {
  timestamps: true,
  toJSON: {
    transform(_doc: any, ret: any) {
      delete ret.__v;
      delete ret.isDeleted;
      delete ret.deletedAt;
      return ret;
    },
  },
};

function applySoftDelete(schema: Schema) {
  schema.add({
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
  });

  // Auto-filter deleted documents on all find queries
  schema.pre(/^find/, function (next) {
    const query = this.getFilter();
    if (query.isDeleted === undefined) {
      this.where({ isDeleted: false });
    }
    next();
  });

  // Soft delete method
  schema.methods.softDelete = function () {
    this.isDeleted = true;
    this.deletedAt = new Date();
    return this.save();
  };

  // Restore method
  schema.methods.restore = function () {
    this.isDeleted = false;
    this.deletedAt = null;
    return this.save();
  };
}
```

---

## 11. Common Mistakes

| Mistake | Why It's Bad | Fix |
|---------|-------------|-----|
| No indexes on query fields | Collection scans (O(n)) | Index every field you query/sort on |
| Unbounded arrays in documents | Document grows past 16MB | Use references or bucket pattern |
| Using `populate` in loops | N+1 query problem | Use `$lookup` or batch queries |
| No connection pool config | Default pool too small for production | Set `maxPoolSize` based on load |
| Storing prices as floats | Rounding errors (0.1 + 0.2 ≠ 0.3) | Store as integer cents or use Decimal128 |
| No `lean()` for read-only queries | Full Mongoose documents waste memory | Use `.lean()` when you don't need virtuals/methods |
| Missing `select: false` on password | Password returned in every query | `password: { select: false }` |
| No schema validation | Garbage data in DB | Define types, enums, min/max, required |
| Not using transactions for multi-doc writes | Inconsistent data on failure | Use `session.withTransaction()` |

---

## 12. Interview-Ready Answers

### "Embed or reference — how do you decide?"

> "I follow the query-driven design principle. If data is always read together and the child document count is bounded (few to low hundreds), I embed for single-query reads. If data is shared across parents, queried independently, or can grow unbounded, I reference. For hot reads where I need both, I use the subset pattern — embed a small snapshot while keeping the full collection referenced."

### "How do you optimize MongoDB queries?"

> "First, I ensure every query field and sort field has an appropriate index using the ESR rule: Equality first, Sort second, Range last. I use `explain('executionStats')` to verify IXSCAN over COLLSCAN. I add `.lean()` to read-only queries to skip Mongoose hydration. For complex queries, I use aggregation pipelines with `$match` early to reduce the dataset before expensive stages like `$lookup`. I also set proper read concern and write concern based on consistency needs."

### "When would you use MongoDB over PostgreSQL?"

> "MongoDB excels when the data model is document-oriented — nested objects, variable schemas, rapid iteration. It's ideal for content management, product catalogs (variable attributes), event logging, and real-time analytics. I'd choose PostgreSQL when I need strong relational integrity, complex joins, or ACID transactions across many tables. In practice, many systems use both — MongoDB for flexible document storage and PostgreSQL for financial/transactional data."

---

> **Next:** [04-middleware-patterns.md](04-middleware-patterns.md) — Middleware chain, custom middleware, and error middleware
