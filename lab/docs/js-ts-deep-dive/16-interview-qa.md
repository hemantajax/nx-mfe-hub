# 16 — Interview Q&A Cheat Sheet (Architect Level)

> **How to use this chapter:** Read the question, cover the answer, and give your own version out loud — then compare with the reference answer below. If you can explain *why* in addition to *what*, you're at architect level. Each answer is kept to 3-6 sentences of production-level depth. Code-output questions are marked with a code block you should evaluate before reading the answer.

---

## Execution & Scope

**Q1: What is an execution context and what are its phases?**

> An execution context is the environment in which JavaScript code is evaluated and executed. Every context has two phases: the **creation phase** (where the scope chain, `this`, and variable/function declarations are set up) and the **execution phase** (where code runs line-by-line and assignments happen). There are three types: Global Execution Context (created once), Function Execution Context (created per invocation), and Eval Execution Context. The engine manages these on a **call stack** — the currently running context is always on top.

---

**Q2: Explain hoisting — what actually gets hoisted and what doesn't?**

> Hoisting is a creation-phase behavior where `var` declarations and function declarations are registered in memory before execution begins. `var` is initialized to `undefined`, while function declarations are fully hoisted (name + body). `let` and `const` declarations are hoisted into the scope but remain in the **Temporal Dead Zone (TDZ)** — accessing them before their lexical declaration throws a `ReferenceError`. Class declarations are also TDZ-bound. Arrow functions assigned to `let`/`const`/`var` follow the variable's hoisting rule, not function hoisting.

---

**Q3: What is the Temporal Dead Zone and why does it exist?**

> The TDZ is the region from the start of a block scope to the point where a `let` or `const` variable is declared. During TDZ, the binding exists (it's hoisted) but is **uninitialized** — any access throws a `ReferenceError`. This exists to catch programming errors: using a variable before its declaration is almost always a bug. The TDZ enforces a "declare before use" discipline that `var` never had, making code more predictable.

---

**Q4: What's the output? Explain why.**

```javascript
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0);
}
```

> **Output: `3, 3, 3`**. Because `var` is function-scoped (not block-scoped), there is a single `i` shared across all iterations. By the time the `setTimeout` callbacks execute (after the loop completes), `i` is already `3`. The classic fix is replacing `var` with `let` (which creates a new binding per iteration) or wrapping in an IIFE: `(function(j){ setTimeout(() => console.log(j), 0); })(i)`. This is one of the most common closure-related interview traps.

---

**Q5: Explain the scope chain and how variable resolution works.**

> When code references a variable, the engine first looks in the **current execution context's scope**. If not found, it walks up the **lexical scope chain** — the chain of outer scopes determined at author time, not call time. This continues until it reaches the Global scope; if still not found, a `ReferenceError` is thrown (in strict mode) or an implicit global is created (in sloppy mode). Closures work because a function retains a reference to its outer lexical environment even after the outer function has returned. This is why closures can "remember" variables — they hold a live reference to the scope, not a snapshot.

---

## this & Prototypes

**Q6: List the 5 rules of `this` binding in order of precedence.**

> From highest to lowest priority: **(1) `new` binding** — `this` points to the newly created object. **(2) Explicit binding** — `call()`, `apply()`, or `bind()` explicitly set `this`. **(3) Implicit binding** — `this` is the object to the left of the dot at call site (`obj.fn()` → `this === obj`). **(4) Default binding** — standalone function call; `this` is `globalThis` (or `undefined` in strict mode). **(5) Arrow functions** — have no own `this`; they inherit `this` lexically from the enclosing scope at definition time, and `call`/`bind`/`apply` cannot override it.

---

**Q7: What's the output? Explain each line.**

```javascript
const obj = {
  name: 'Arch',
  greet: function () { console.log(this.name); },
  delayGreet: function () {
    setTimeout(function () { console.log(this.name); }, 0);
  },
  arrowGreet: function () {
    setTimeout(() => { console.log(this.name); }, 0);
  },
};

obj.greet();
obj.delayGreet();
obj.arrowGreet();
```

> **Output: `"Arch"`, `undefined`, `"Arch"`**. `obj.greet()` uses implicit binding — `this` is `obj`. In `delayGreet`, the regular function inside `setTimeout` loses its binding (default binding → `globalThis`, which has no `name` so it's `undefined`). In `arrowGreet`, the arrow function captures `this` lexically from `delayGreet`'s execution context where `this === obj`, so it prints `"Arch"`. This demonstrates exactly why arrow functions were introduced — to solve the "lost `this`" problem in callbacks.

---

**Q8: What is the prototype chain and how does property lookup work?**

> Every JavaScript object has an internal `[[Prototype]]` slot pointing to another object (or `null`). When you access a property, the engine first checks the object itself (own property). If not found, it follows `[[Prototype]]` to the next object and checks there, continuing up the chain until it finds the property or hits `null` (end of chain). This is **prototypal inheritance** — objects delegate to other objects. `Object.prototype` sits at the top of almost every chain, which is why all objects have `toString()`, `hasOwnProperty()`, etc.

---

**Q9: What's the difference between `__proto__` and `.prototype`?**

> `.prototype` is a property on **constructor functions** (and classes). It's the object that will become the `[[Prototype]]` of instances created with `new`. `__proto__` (or `Object.getPrototypeOf()`) is an accessor on **every object** that exposes its internal `[[Prototype]]` link. So `new Foo().__proto__ === Foo.prototype` is `true`. Using `__proto__` directly is deprecated — prefer `Object.getPrototypeOf()` / `Object.setPrototypeOf()`. The confusion arises because `.prototype` doesn't mean "this object's prototype" — it means "the prototype I give to my instances."

---

**Q10: How does `Object.create()` work and when would you use it?**

> `Object.create(proto)` creates a new object with its `[[Prototype]]` set directly to `proto`. Unlike `new Constructor()`, it doesn't invoke any function or run constructor logic — it's a pure prototype linkage. Use it for clean prototypal inheritance without classes: `const child = Object.create(parent)`. It's also used to create "dictionary" objects with no prototype: `Object.create(null)` produces an object with no inherited properties (no `toString`, `hasOwnProperty`, etc.), useful for pure hash maps where you don't want prototype pollution.

---

**Q11: What is prototype pollution and how do you prevent it?**

> Prototype pollution occurs when an attacker modifies `Object.prototype` (or another shared prototype) by injecting properties through unsafe operations like deep merging user input: `obj['__proto__']['isAdmin'] = true`. Once polluted, every object in the runtime inherits the injected property. **Prevention:** validate/sanitize keys (reject `__proto__`, `constructor`, `prototype`), use `Object.create(null)` for lookup maps, freeze prototypes with `Object.freeze(Object.prototype)` in sensitive contexts, and use `Map` instead of plain objects for dynamic key storage.

---

## OOP & Patterns

**Q12: Composition vs inheritance — when do you pick each?**

> **Prefer composition** when you need to combine behaviors from multiple sources, when the relationship is "has-a" rather than "is-a", or when you want to avoid fragile base class problems. Inheritance creates tight coupling — changing a parent can break all children. Composition assembles behavior from small, focused pieces: `const flyingSwimmer = { ...canFly, ...canSwim }`. Use inheritance only for true taxonomic hierarchies (e.g., `HttpError extends Error`) where polymorphism and `instanceof` checks are genuinely needed. The GoF mantra applies: *"Favor object composition over class inheritance."*

---

**Q13: How would you apply SOLID principles in JavaScript?**

> **S (Single Responsibility):** each module/class does one thing — a `UserService` fetches users, it doesn't validate forms. **O (Open/Closed):** extend via composition or strategy injection, not by modifying existing code. **L (Liskov):** subclasses must be substitutable — if `Square extends Rectangle`, setting width shouldn't break area calculations. **I (Interface Segregation):** in TS, use small focused interfaces rather than one mega-interface; in JS, keep function signatures lean. **D (Dependency Inversion):** depend on abstractions (injected services, callbacks, interfaces) not concrete implementations — this is the core of Angular's DI and any plugin architecture.

---

**Q14: Implement a Singleton pattern in modern JavaScript.**

```javascript
class ConfigManager {
  static #instance;

  #settings = {};

  constructor() {
    if (ConfigManager.#instance) return ConfigManager.#instance;
    ConfigManager.#instance = this;
  }

  set(key, value) { this.#settings[key] = value; }
  get(key) { return this.#settings[key]; }
}
```

> The `#instance` static private field ensures only one instance exists. The constructor returns the existing instance on subsequent calls. Private fields (`#settings`) prevent external mutation. In ES modules you can skip the class entirely — a module's top-level scope is evaluated once, so `export const config = { ... }` is already a singleton by nature. The class-based version is useful when you need lazy initialization or constructor logic.

---

**Q15: Implement a basic Observer (Pub/Sub) pattern.**

```javascript
class EventBus {
  #listeners = new Map();

  on(event, fn) {
    if (!this.#listeners.has(event)) this.#listeners.set(event, new Set());
    this.#listeners.get(event).add(fn);
    return () => this.#listeners.get(event)?.delete(fn); // unsubscribe
  }

  emit(event, ...args) {
    this.#listeners.get(event)?.forEach(fn => fn(...args));
  }
}
```

> The Observer pattern decouples producers from consumers — emitters don't know who's listening. Using `Map<string, Set<Function>>` gives O(1) lookup and prevents duplicate subscriptions. The `on()` method returns an unsubscribe function (similar to RxJS `Subscription.unsubscribe()`). This pattern is the backbone of Angular's `EventEmitter`, Node's `EventEmitter`, and DOM events. For production use, add error isolation per listener and consider `WeakRef` for auto-cleanup.

---

**Q16: How do you decide which design pattern to use?**

> Match the pattern to the problem: **Singleton** when you need exactly one shared instance (config, cache). **Factory** when object creation logic is complex or varies by type. **Strategy** when you have multiple algorithms for the same task (sorting, validation, pricing). **Observer** when one-to-many notification is needed (events, reactive state). **Decorator** when you want to layer behaviors without subclassing (logging, caching, retry). **Builder** for step-by-step construction of complex objects. The anti-pattern is picking a pattern first and forcing your code into it — patterns should emerge from the problem, not the other way around.

---

## Async

**Q17: Explain the event loop — how does JavaScript handle concurrency with a single thread?**

> JavaScript has a single call stack but delegates I/O to the runtime (browser/Node). When an async operation (timer, fetch, file read) completes, its callback is placed in a **task queue**. The **event loop** continuously checks: if the call stack is empty, it dequeues the next task and pushes it onto the stack. There's also a **microtask queue** (for Promises, `queueMicrotask`, `MutationObserver`) that is drained completely before the next macrotask. This means a resolved Promise callback always runs before a `setTimeout(..., 0)` callback, even if the timer was registered first.

---

**Q18: What's the output? Trace the event loop.**

```javascript
console.log('A');

setTimeout(() => console.log('B'), 0);

Promise.resolve().then(() => console.log('C'));

queueMicrotask(() => console.log('D'));

console.log('E');
```

> **Output: `A, E, C, D, B`**. `A` and `E` are synchronous — they run immediately on the call stack. After the synchronous code completes, the microtask queue is drained: `C` (Promise `.then`) and `D` (`queueMicrotask`) execute in order. Only then does the event loop pick up the macrotask `B` (`setTimeout`). This order — sync → microtasks → macrotasks — is the fundamental event loop priority that every senior developer must know.

---

**Q19: Compare `Promise.all`, `Promise.allSettled`, `Promise.race`, and `Promise.any`.**

> **`Promise.all(promises)`**: resolves when *all* fulfill; rejects immediately on the *first* rejection — use for "all or nothing" (parallel fetches where any failure is fatal). **`Promise.allSettled(promises)`**: always resolves with an array of `{status, value/reason}` for *every* promise — use when you want results regardless of failures. **`Promise.race(promises)`**: settles with the *first* promise to settle (fulfill or reject) — use for timeouts. **`Promise.any(promises)`**: resolves with the *first* to fulfill; rejects only if *all* reject (with `AggregateError`) — use for "fastest success" strategies like querying multiple mirrors.

---

**Q20: How do you properly handle errors in async/await code?**

> The primary pattern is `try/catch` around `await` calls, but wrapping every single `await` leads to noisy code. Better approaches: **(1)** Use a helper that returns tuples: `const [err, data] = await to(fetchUser())` — inspired by Go-style error handling. **(2)** Let errors bubble up and catch them at the boundary (e.g., route handler, Angular `ErrorHandler`). **(3)** Use `.catch()` inline for non-critical operations: `await fetchAnalytics().catch(() => null)`. Always type your errors — in TypeScript, the `catch` variable is `unknown`, so narrow it before accessing properties.

---

**Q21: What is the difference between microtasks and macrotasks? Give examples of each.**

> **Microtasks** are high-priority: `Promise.then/catch/finally`, `queueMicrotask()`, `MutationObserver`. They are drained *completely* after each macrotask before the next macrotask runs — if a microtask enqueues another microtask, that also runs before any macrotask. **Macrotasks** (tasks) are lower priority: `setTimeout`, `setInterval`, `setImmediate` (Node), I/O callbacks, UI rendering events. The practical implication: a tight loop of microtasks can starve the UI — `while (true) queueMicrotask(() => {})` would block rendering forever, just like synchronous code.

---

**Q22: What's the output? Explain the scheduling.**

```javascript
async function foo() {
  console.log('1');
  const x = await Promise.resolve('2');
  console.log(x);
  console.log('3');
}

console.log('4');
foo();
console.log('5');
```

> **Output: `4, 1, 5, 2, 3`**. `console.log('4')` runs first (sync). Calling `foo()` executes synchronously until the first `await` — so `'1'` prints. The `await` pauses `foo` and schedules the continuation as a microtask, returning control to the caller. `'5'` prints (sync). Then the microtask queue runs: `x` resolves to `'2'`, so `'2'` and `'3'` print. The key insight is that everything before the first `await` in an async function is synchronous.

---

## Modern JavaScript (ES2020–2024+)

**Q23: Optional chaining (`?.`) vs the `&&` operator — when do you use each?**

> `?.` short-circuits to `undefined` if the left side is `null` or `undefined`, making it purpose-built for safe property access: `user?.address?.city`. The `&&` operator short-circuits on any *falsy* value (`0`, `''`, `false`, `null`, `undefined`, `NaN`), which can cause bugs: `user && user.score` returns `0` if score is `0`, which is falsy but valid. Use `?.` for null-safe navigation and `&&` for boolean logic. Also note `?.()` for optional method calls and `?.[]` for optional bracket access.

---

**Q24: Nullish coalescing (`??`) vs logical OR (`||`) — what's the difference?**

> `??` returns the right side only when the left is `null` or `undefined`. `||` returns the right side for any *falsy* value. This matters for legitimate falsy values: `const port = config.port ?? 3000` correctly keeps `0` if `config.port` is `0`. With `||`, it would fall through to `3000`. Combine with nullish assignment: `obj.name ??= 'default'` only assigns if `obj.name` is nullish. The `??` operator cannot be mixed with `&&` or `||` without parentheses — this is a syntax error by design to prevent ambiguity.

---

**Q25: What new immutable array methods were added in ES2023 and why?**

> ES2023 added `toSorted()`, `toReversed()`, `toSpliced()`, and `with()` — these are copying counterparts of `sort()`, `reverse()`, `splice()`, and bracket assignment. The originals mutate in-place, which is error-prone in functional/reactive code (Angular signals, React state, Redux). Now you can write `const sorted = arr.toSorted((a, b) => a - b)` without cloning first. `arr.with(2, 'new')` returns a copy with index 2 replaced. These methods work on TypedArrays too.

---

**Q26: `structuredClone()` vs spread/`Object.assign()` — when do you use each?**

> Spread (`{ ...obj }`) and `Object.assign()` create **shallow** copies — nested objects are still shared references. `structuredClone(obj)` creates a **deep** copy using the structured clone algorithm, handling nested objects, `Map`, `Set`, `Date`, `ArrayBuffer`, `RegExp`, and circular references. Use spread for flat objects or when you intentionally want shared references. Use `structuredClone` when you need a true deep copy. Limitations: it cannot clone functions, DOM nodes, or objects with `Symbol` keys.

---

**Q27: What is the `using` keyword (Explicit Resource Management)?**

> `using` (and `await using`) is the TC39 Explicit Resource Management proposal (stage 3 / shipping in V8). It works like C#'s `using` or Python's `with` — when the block exits, the runtime calls `[Symbol.dispose]()` (or `[Symbol.asyncDispose]()`) on the resource. This ensures cleanup (closing files, releasing locks, disconnecting sockets) even if an error is thrown. Example: `using file = openFile('data.txt')` — the file handle is automatically closed when the scope ends. It replaces manual `try/finally` cleanup patterns.

```javascript
class TempConnection {
  constructor(url) { this.conn = connect(url); }
  [Symbol.dispose]() { this.conn.close(); }
}

function query() {
  using db = new TempConnection('postgres://...');
  return db.conn.execute('SELECT 1');
  // db[Symbol.dispose]() called automatically here
}
```

---

## Functional Patterns

**Q28: What makes a function "pure" and why does it matter?**

> A pure function: **(1)** always returns the same output for the same input (deterministic), and **(2)** produces no side effects (no mutation, no I/O, no DOM manipulation). Pure functions are trivially testable (no mocks needed), cacheable (`memoize`), parallelizable, and safe to refactor. In practice, an entire app can't be pure — side effects are pushed to the boundaries (event handlers, services), while the core logic stays pure. Angular's `pipe()` functions and computed signals are essentially pure function pipelines.

---

**Q29: Explain currying with a practical use case.**

> Currying transforms a function of N arguments into N nested functions of 1 argument each: `f(a, b, c)` → `f(a)(b)(c)`. The practical value is **partial application** — pre-filling arguments to create specialized functions.

```javascript
const withTax = rate => price => price * (1 + rate);

const withVAT  = withTax(0.20);  // 20% VAT
const withGST  = withTax(0.18);  // 18% GST

withVAT(100); // 120
withGST(100); // 118
```

> This eliminates repetition and creates reusable, composable building blocks. In Angular, curried validators are a common pattern: `Validators.minLength(5)` returns a configured validator function.

---

**Q30: What are `compose` and `pipe`? How do they differ?**

> Both combine multiple functions into a single pipeline. **`pipe`** applies functions left-to-right (first function runs first), while **`compose`** applies right-to-left (last function runs first). `pipe` is more intuitive for most developers because it reads in execution order.

```javascript
const pipe = (...fns) => x => fns.reduce((acc, fn) => fn(acc), x);

const processUser = pipe(
  normalize,     // runs first
  validate,      // runs second
  formatOutput   // runs last
);
```

> RxJS's `pipe()` operator is the most widespread example in Angular. Use pipe when building data transformation chains — each step is a small, testable, reusable function.

---

## TypeScript

**Q31: `unknown` vs `any` vs `never` — when do you use each?**

> **`any`** disables type checking entirely — it accepts and returns anything, bypassing the compiler. Avoid it; it defeats the purpose of TypeScript. **`unknown`** is the type-safe top type — it accepts any value but you *must* narrow it before use (`if (typeof x === 'string')`). Use it for values of uncertain type (API responses, `catch` errors, user input). **`never`** is the bottom type — it represents values that never occur (functions that always throw, exhaustive switch defaults). Use `never` in exhaustive checks: a `default` case that assigns to `never` will cause a compile error if you miss a union member.

---

**Q32: `interface` vs `type` — when do you choose one over the other?**

> **`interface`** supports declaration merging (multiple declarations combine automatically) and `extends` for composition. **`type`** supports unions, intersections, mapped types, conditional types, and tuple types. Rule of thumb: use `interface` for object shapes that might be extended (public APIs, class contracts), and `type` for unions (`type Status = 'ok' | 'error'`), computed types, or any non-object type. Functionally, for plain object shapes they're interchangeable. In large codebases, `interface` gives slightly better error messages and compiler performance due to caching.

---

**Q33: How do generic constraints work? Give an example.**

> Generic constraints use `extends` to restrict what types a generic can accept, ensuring the type has certain properties or structure.

```typescript
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const user = { name: 'Ada', age: 30 };
getProperty(user, 'name'); // ✅ string
getProperty(user, 'foo');  // ❌ Compile error: 'foo' not in keyof user
```

> `K extends keyof T` constrains `K` to only valid keys of `T`. The return type `T[K]` is an indexed access type that gives you the exact type of that property. Without the constraint, TypeScript couldn't guarantee that `obj[key]` is a valid access, and you'd lose type safety.

---

**Q34: Explain conditional types and give a practical example.**

> Conditional types follow the syntax `T extends U ? X : Y` — if `T` is assignable to `U`, the type resolves to `X`, otherwise `Y`. They are the "if/else" of the type system.

```typescript
type IsArray<T> = T extends any[] ? 'array' : 'not-array';

type A = IsArray<string[]>; // 'array'
type B = IsArray<number>;   // 'not-array'
```

> When applied to **union types**, conditional types distribute over each member: `IsArray<string[] | number>` becomes `'array' | 'not-array'`. Built-in utility types like `Extract`, `Exclude`, `NonNullable`, and `ReturnType` are all implemented with conditional types. They're essential for writing library-level type abstractions.

---

**Q35: What does `infer` do in TypeScript? Show a use case.**

> `infer` declares a type variable *inside* a conditional type's `extends` clause, letting you extract part of a complex type. It's pattern matching for types.

```typescript
type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;

type A = UnwrapPromise<Promise<string>>;  // string
type B = UnwrapPromise<number>;           // number

type Params<T> = T extends (...args: infer P) => any ? P : never;

type C = Params<(a: string, b: number) => void>; // [string, number]
```

> The built-in `ReturnType<T>`, `Parameters<T>`, and `ConstructorParameters<T>` utilities all use `infer` internally. It's the primary mechanism for deconstructing types in advanced TypeScript — extracting return types, promise values, array elements, or tuple members.

---

**Q36: What are discriminated unions and why are they powerful?**

> A discriminated union is a union of types that share a common literal property (the "discriminant") which TypeScript can use for narrowing.

```typescript
type Result =
  | { status: 'success'; data: string }
  | { status: 'error'; error: Error }
  | { status: 'loading' };

function handle(result: Result) {
  switch (result.status) {
    case 'success': return result.data;   // TS knows: { status: 'success'; data: string }
    case 'error':   throw result.error;   // TS knows: { status: 'error'; error: Error }
    case 'loading': return 'Please wait';
  }
}
```

> Inside each branch, TypeScript automatically narrows the type based on the discriminant value — no type assertions needed. This is the foundation for modeling state machines, API responses, Redux actions, and NgRx actions. Add a `default: never` check to make the switch exhaustive — the compiler will error if you forget a case.

---

**Q37: What does `satisfies` do and how is it different from type annotation?**

> `satisfies` (TypeScript 4.9+) validates that an expression matches a type *without widening the inferred type*. With a type annotation (`const x: Type = ...`), the variable's type becomes exactly `Type` and you lose specific literal types. With `satisfies`, you keep the narrow inferred type while still getting validation.

```typescript
type Theme = Record<string, string | number>;

// Type annotation — widened
const a: Theme = { color: 'red', size: 12 };
a.color; // string | number ← lost specificity

// satisfies — validated but narrow
const b = { color: 'red', size: 12 } satisfies Theme;
b.color; // string ← preserved!
b.size;  // number ← preserved!
```

> Use `satisfies` for configuration objects, route tables, and lookup maps where you want both compile-time validation *and* precise autocomplete on the specific values.

---

**Q38: What are branded types and when would you use them?**

> Branded types use intersection with a unique symbol to create nominally distinct types from structurally identical primitives. TypeScript is structurally typed, so `string` is `string` regardless of meaning — branded types fix this.

```typescript
type UserId = string & { readonly __brand: unique symbol };
type OrderId = string & { readonly __brand: unique symbol };

function createUserId(id: string): UserId {
  return id as UserId;
}

function getUser(id: UserId) { /* ... */ }

const uid = createUserId('u-123');
const oid = 'o-456' as OrderId;

getUser(uid); // ✅
getUser(oid); // ❌ Compile error — OrderId is not UserId
```

> Branded types prevent accidentally passing an `OrderId` where a `UserId` is expected, even though both are strings at runtime. They're used in financial systems (cents vs dollars), APIs (validated vs raw input), and anywhere semantic types matter. There's zero runtime cost — the brand exists only at compile time.

---

## Memory & Performance

**Q39: Name 4 common causes of memory leaks in JavaScript and how to fix each.**

> **(1) Forgotten event listeners** — `addEventListener` without a corresponding `removeEventListener` or `AbortController`. Fix: always clean up in `ngOnDestroy` or use `{ signal }` option. **(2) Closures holding large scope** — a closure references a large outer variable that's no longer needed. Fix: null out references or restructure scope. **(3) Detached DOM nodes** — removed from the DOM but still referenced by JS variables. Fix: set references to `null` after removal. **(4) Uncleared timers/intervals** — `setInterval` callbacks keep running and keep their closure alive. Fix: `clearInterval` in cleanup. Use Chrome DevTools' Memory tab (heap snapshots, allocation timeline) to diagnose leaks.

---

**Q40: What is `WeakMap` and what are its practical use cases?**

> `WeakMap` holds key-value pairs where **keys must be objects** and are held *weakly* — if no other reference to the key exists, the entry is garbage collected automatically. Unlike `Map`, `WeakMap` is not iterable and has no `size` property. **Use cases:** **(1)** Private data storage — associate metadata with objects without modifying them (the "private fields before `#`" pattern). **(2)** Caching computed results keyed by object identity without preventing GC. **(3)** Tracking DOM elements — cache layout computations keyed by elements; when elements are removed, cache entries vanish. `WeakSet` is the same concept for "membership tracking" — e.g., tracking which objects have already been processed.

---

**Q41: How does garbage collection work in V8 (generational GC)?**

> V8 uses a **generational** garbage collector with two main regions: **Young Generation** (small, fast, collected frequently) and **Old Generation** (large, collected less often). New objects are allocated in Young Gen. A **Scavenge** (minor GC) copies surviving objects to a second semi-space; objects that survive two scavenges are "promoted" to Old Gen. Old Gen uses **Mark-Sweep-Compact** (major GC): mark reachable objects from roots (stack, globals), sweep unmarked ones, and compact memory to reduce fragmentation. The **Orinoco** project made much of this concurrent/parallel, reducing pause times. Understanding this helps explain why short-lived objects are cheap and long-lived unnecessary allocations are expensive.

---

**Q42: When would you use Web Workers and what are their limitations?**

> Web Workers run JavaScript on a **separate OS thread**, keeping the main thread (and UI) responsive. Use them for CPU-intensive tasks: image/video processing, large dataset parsing, cryptographic operations, complex calculations. Communication happens via `postMessage()` / `onmessage` with structured cloning (or `Transferable` objects for zero-copy). **Limitations:** Workers cannot access the DOM, `window`, or any UI APIs. Shared state requires `SharedArrayBuffer` + `Atomics`. Each Worker has overhead (memory, startup time), so don't spawn hundreds. For Angular apps, `@angular/platform-webworker` was removed — use the native `Worker` API or libraries like Comlink for ergonomic RPC-style communication.

---

## Quick-Reference Cheat Table

| Concept | One-Liner |
|---|---|
| Execution Context | Environment where code runs — creation + execution phases |
| Closure | Function + reference to its lexical scope |
| `this` | Determined by **call site**, not definition (except arrows) |
| Prototype Chain | Objects delegate property access to `[[Prototype]]` |
| Event Loop | Stack empty → drain microtasks → next macrotask → repeat |
| `unknown` | Type-safe `any` — must narrow before use |
| `never` | Bottom type — represents impossible values |
| `satisfies` | Validate type without widening inference |
| Branded Types | Nominal typing via phantom intersection |
| `WeakMap` | GC-friendly cache keyed by objects |
| `structuredClone` | Deep copy with circular reference support |
| `using` | Auto-dispose resources when scope exits |

---

## Parting Advice

> In architect-level interviews, **the "why" matters more than the "what"**. Anyone can memorize that `let` is block-scoped — but explaining *why* the TDZ exists (to enforce safe initialization order) or *why* microtasks drain before macrotasks (to preserve Promise ordering guarantees) shows genuine depth. Use these answers as a foundation, then practice explaining them without looking — that's when you truly own the knowledge.

---

[← 15 — Error Handling & Debugging](15-error-handling-debugging.md) · [Back to README →](README.md)
