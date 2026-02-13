# pitfalls

## purpose

Non-obvious TypeScript gotchas, surprising behavior, and common mistakes that trip up developers — including those coming from other languages.

## rules

1. **`any` is viral — one `any` silently disables type checking across call chains.** A function returning `any` makes every downstream consumer untyped. Use `unknown` instead and narrow explicitly. Lint with `@typescript-eslint/no-explicit-any`.
2. **`==` performs type coercion; always use `===` and `!==`.** `0 == ''` is `true`, `null == undefined` is `true`. The only exception is `x == null` as a deliberate shorthand for `x === null || x === undefined`.
3. **Enums have surprising runtime behavior — prefer string literal unions.** Numeric enums create reverse mappings (`Status[0] === 'Active'`), `const enum` gets inlined and breaks across libraries, and enums aren't structurally compatible with their base type. Use `type Status = 'active' | 'inactive'` instead.
4. **`this` is determined by call site, not definition site.** Passing a method as a callback (`setTimeout(obj.method, 100)`) loses `this` binding. Fix with arrow functions in class fields, `.bind(this)`, or an arrow wrapper at the call site.
5. **Structural typing means unexpected assignability.** An object with extra properties is assignable to a type with fewer properties: `{ a: 1, b: 2 }` satisfies `{ a: number }`. This is by design but surprises developers from nominally-typed languages (Java, C#).
6. **Optional chaining (`?.`) short-circuits to `undefined`, not `null`.** `obj?.prop` returns `undefined` if `obj` is `null` or `undefined`. If your code distinguishes between `null` and `undefined`, optional chaining may mask the difference.
7. **`Array.prototype.sort()` mutates in place and sorts as strings by default.** `[10, 2, 1].sort()` yields `[1, 10, 2]`. Always provide a comparator: `.sort((a, b) => a - b)`. Use `toSorted()` (ES2023) for immutable sorting.
8. **`typeof null === 'object'` is a JavaScript legacy bug.** A `typeof` check for object won't exclude `null`. Always check `x !== null && typeof x === 'object'` or use a type guard.
9. **Type assertions (`as`) bypass type checking — they don't validate at runtime.** `JSON.parse(data) as User` does NOT verify the shape. Use a validation library (Zod, io-ts) or write a type guard. `as` should be a last resort, not a first instinct.
10. **Index signatures return `T`, not `T | undefined`, by default.** `Record<string, number>` claims every key exists. Enable `noUncheckedIndexedAccess` in tsconfig to make index access return `T | undefined`, forcing null checks.
11. **`Promise` constructor callback is synchronous.** `new Promise(resolve => { ... })` runs the executor immediately, not asynchronously. Errors thrown in the executor are caught, but errors in nested callbacks are not.
12. **`Object.keys()` returns `string[]`, not `(keyof T)[]`.** TypeScript widens the return type because objects can have more keys at runtime than their type declares. Use `Object.keys(obj) as (keyof typeof obj)[]` only when you're certain, or iterate with `for...in` with a type guard.
13. **Template literal types can cause combinatorial explosion.** `type Route = \`/${A}/${B}/${C}\`` where `A`, `B`, `C` are large unions creates `|A| × |B| × |C|` members, potentially crashing the compiler. Limit union sizes in template literal compositions.

## patterns

### Safe type guard instead of `as` assertion

```typescript
// ❌ Unsafe — no runtime check
const user = JSON.parse(data) as User;

// ✅ Safe — validates shape at runtime
import { z } from 'zod';

const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
});

type User = z.infer<typeof UserSchema>;

function parseUser(data: unknown): User {
  return UserSchema.parse(data); // throws ZodError if invalid
}
```

### Preserving `this` in class methods

```typescript
class Counter {
  count = 0;

  // ❌ Loses `this` when passed as callback
  increment() {
    this.count++;
  }

  // ✅ Arrow function property preserves `this`
  incrementSafe = () => {
    this.count++;
  };
}

const counter = new Counter();
const fn = counter.incrementSafe;
fn(); // works — `this` is bound to the Counter instance
```

### Safe object key iteration

```typescript
const scores: Record<string, number> = { alice: 95, bob: 87 };

// ❌ Object.keys returns string[], not (keyof typeof scores)[]
for (const key of Object.keys(scores)) {
  // key is string — this is correct but verbose
  const score = scores[key]; // number | undefined with noUncheckedIndexedAccess
}

// ✅ Use Object.entries for typed key-value pairs
for (const [name, score] of Object.entries(scores)) {
  console.log(`${name}: ${score}`);
}
```

## pitfalls

- **`readonly` arrays still allow `indexOf`, `includes`, `find`.** `readonly` prevents `.push()` and `.splice()` but all read methods still work. This is correct behavior, not a bug.
- **Excess property checking only works on direct object literals.** `fn({ a: 1, b: 2 })` errors if `b` is extra, but `const obj = { a: 1, b: 2 }; fn(obj)` does NOT. The compiler only checks "freshness" of literal objects.
- **`in` operator narrows but doesn't verify property type.** `if ('name' in obj)` narrows to `obj` having `name`, but the value type is `unknown`. You still need a runtime check on the value.
- **`!!` double-bang coerces falsy values.** `!!0`, `!!''`, `!!NaN`, `!!null`, `!!undefined` are all `false`. If `0` or `''` are valid values in your domain, use explicit `!== undefined` or `!== null` checks instead.

## references

- https://www.typescriptlang.org/docs/handbook/2/narrowing.html — type narrowing and guards
- https://www.typescriptlang.org/docs/handbook/2/types-from-types.html — type manipulation
- https://www.typescriptlang.org/tsconfig/#noUncheckedIndexedAccess — index signature safety
- https://github.com/typescript-eslint/typescript-eslint — ESLint rules for TS

## instructions

Use this expert when a developer asks "why doesn't this work?", reports unexpected TypeScript behavior, or needs help debugging type errors. Also useful proactively when reviewing code for potential issues. Pair with `idioms.md` for the positive conventions and `type-system.md` for advanced type-level gotchas.

## research

Deep Research prompt:

"Write a micro expert on TypeScript pitfalls and gotchas. Cover: any leaks, == vs ===, enum runtime behavior, this binding loss, structural typing surprises, optional chaining vs null, Array.sort mutation, typeof null, type assertions vs validation, index signature unsafety (noUncheckedIndexedAccess), Promise executor timing, Object.keys widening, template literal type explosion, excess property checking, double-bang coercion, readonly shallowness. Include safe alternative patterns for each."
