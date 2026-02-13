# patterns

## purpose

Design patterns, error handling strategies, async composition, and architectural idioms for TypeScript — how to structure non-trivial code beyond basic syntax.

## rules

1. **Model errors as values, not exceptions, for expected failures.** Use a `Result<T, E>` union type (`{ ok: true; value: T } | { ok: false; error: E }`) for operations that can fail in predictable ways (validation, parsing, network). Reserve `throw` for truly exceptional/unrecoverable situations.
2. **Use branded types to prevent primitive obsession.** Wrap semantically distinct values (UserId, Email, Milliseconds) with `type UserId = string & { readonly __brand: unique symbol }`. This prevents accidentally passing a `string` where a `UserId` is expected.
3. **Prefer composition over inheritance.** TypeScript supports class inheritance but idiomatic TS favors function composition, interfaces, and generics. Compose behaviors via mixins or utility functions rather than deep class hierarchies.
4. **Use the builder pattern for complex object construction.** When an object has many optional fields and construction order matters, a fluent builder with method chaining produces readable, type-safe construction.
5. **Handle async errors with try/catch at the boundary, not at every call site.** Wrap top-level handlers (route handlers, event listeners, CLI entry points) in try/catch. Internal async functions should propagate errors naturally — avoid `try/catch` around every `await`.
6. **Use `Promise.allSettled` over `Promise.all` when partial failure is acceptable.** `Promise.all` rejects on the first failure; `Promise.allSettled` returns all results. Use `allSettled` for batch operations where individual failures shouldn't abort the batch.
7. **Implement dependency injection via constructor parameters or factory functions, not a DI container.** TypeScript's type system makes manual DI straightforward. Pass dependencies explicitly rather than relying on runtime reflection (which TS doesn't support natively).
8. **Use the Dispose pattern (`using` / `Symbol.dispose`) for resource cleanup.** TypeScript 5.2+ supports explicit resource management. Implement `[Symbol.dispose]()` for resources that need cleanup (connections, file handles, locks).
9. **Prefer `Map<K, V>` and `Set<T>` over plain objects for dynamic key collections.** `Map` preserves insertion order, supports non-string keys, and has cleaner semantics than `Record<string, V>` for dynamic data. Use `Record` only for static-key lookup objects.
10. **Test with behavior-driven assertions, not implementation snapshots.** Assert on observable behavior (`expect(result).toBe(...)`) rather than internal structure. Use dependency injection to provide test doubles instead of mocking module internals.
11. **Use `satisfies` to validate types without widening.** `const x = { ... } satisfies Config` checks the shape at compile time while preserving the narrow literal types of the value — unlike `: Config` which widens.

## patterns

### Result type for expected failures

```typescript
type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

function parseAge(input: string): Result<number, string> {
  const n = Number(input);
  if (Number.isNaN(n) || n < 0 || n > 150) {
    return { ok: false, error: `Invalid age: "${input}"` };
  }
  return { ok: true, value: n };
}

// Usage — caller is forced to handle both branches
const result = parseAge(userInput);
if (!result.ok) {
  console.error(result.error);
  return;
}
console.log(`Age: ${result.value}`);
```

### Branded types

```typescript
declare const __brand: unique symbol;
type Brand<T, B> = T & { readonly [__brand]: B };

type UserId = Brand<string, 'UserId'>;
type OrderId = Brand<string, 'OrderId'>;

function createUserId(id: string): UserId {
  // Validation could go here
  return id as UserId;
}

function getUser(id: UserId): Promise<User> { /* ... */ }

// Compile error: OrderId is not assignable to UserId
const orderId = 'ord_123' as OrderId;
// getUser(orderId); // ← Type error
```

### Builder pattern with fluent chaining

```typescript
interface QueryOptions {
  table: string;
  columns: string[];
  where?: string;
  orderBy?: string;
  limit?: number;
}

class QueryBuilder {
  private options: Partial<QueryOptions> = {};

  from(table: string): this {
    this.options.table = table;
    return this;
  }

  select(...columns: string[]): this {
    this.options.columns = columns;
    return this;
  }

  where(condition: string): this {
    this.options.where = condition;
    return this;
  }

  orderBy(column: string): this {
    this.options.orderBy = column;
    return this;
  }

  limit(n: number): this {
    this.options.limit = n;
    return this;
  }

  build(): QueryOptions {
    if (!this.options.table || !this.options.columns?.length) {
      throw new Error('table and columns are required');
    }
    return this.options as QueryOptions;
  }
}

const query = new QueryBuilder()
  .from('users')
  .select('id', 'name', 'email')
  .where('active = true')
  .orderBy('name')
  .limit(50)
  .build();
```

### Explicit resource management (Dispose)

```typescript
class DatabaseConnection implements Disposable {
  private handle: ConnectionHandle;

  constructor(url: string) {
    this.handle = connect(url);
  }

  query(sql: string): Result[] {
    return this.handle.execute(sql);
  }

  [Symbol.dispose](): void {
    this.handle.close();
  }
}

// Automatically closed when scope exits
async function getUsers(): Promise<User[]> {
  using db = new DatabaseConnection(DB_URL);
  return db.query('SELECT * FROM users');
  // db.[Symbol.dispose]() called automatically here
}
```

## pitfalls

- **Result types require discipline.** If half the codebase uses `Result` and half throws, you get the worst of both worlds. Adopt consistently or not at all.
- **Branded types break serialization.** `JSON.parse` returns plain strings — you need a validation/parsing layer to re-brand after deserialization.
- **`this` in builder methods.** Return `this` (not a new instance) for chaining, and use `this` as the return type annotation for subclass compatibility.
- **`Promise.allSettled` results require checking `status`.** Each result is `{ status: 'fulfilled'; value: T }` or `{ status: 'rejected'; reason: unknown }` — you must narrow before accessing `.value`.
- **`using` requires TypeScript 5.2+ and a polyfill for `Symbol.dispose` in older runtimes.** Check your target before adopting.

## references

- https://www.typescriptlang.org/docs/handbook/2/narrowing.html — type narrowing
- https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-2.html — explicit resource management
- https://github.com/tc39/proposal-explicit-resource-management — TC39 Dispose proposal
- https://www.typescriptlang.org/docs/handbook/2/generics.html — generics

## instructions

Use this expert for design-level TypeScript questions: how to structure error handling, which patterns to apply, how to compose async workflows, and how to set up dependency injection. Pair with `idioms.md` for naming/style and `type-system.md` for advanced type techniques that support these patterns (e.g., branded types, conditional types for builder inference).

## research

Deep Research prompt:

"Write a micro expert on TypeScript design patterns and composition. Cover: Result/Either types for error handling, branded/nominal types, builder pattern with fluent chaining, composition over inheritance, async error boundaries (try/catch placement), Promise.allSettled vs Promise.all, manual dependency injection, explicit resource management (using/Symbol.dispose), Map/Set vs plain objects, behavior-driven testing, and satisfies operator. Include self-contained code patterns for each."
