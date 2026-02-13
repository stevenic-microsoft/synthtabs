# type-system

## purpose

Advanced TypeScript type-level programming — mapped types, conditional types, template literal types, `infer`, and other techniques for building precise, expressive type APIs.

## rules

1. **Use mapped types to transform object shapes systematically.** `{ [K in keyof T]: ... }` creates a new type by transforming each property of `T`. Combine with modifiers (`readonly`, `?`, `-readonly`, `-?`) to add or remove attributes.
2. **Use conditional types for type-level branching.** `T extends U ? A : B` checks assignability at the type level. This is the foundation of most advanced type utilities.
3. **Use `infer` inside conditional types to extract sub-types.** `T extends Promise<infer U> ? U : T` extracts the resolved type from a Promise. `infer` can appear in return types, parameter types, template literal positions, and tuple elements.
4. **Understand distributive conditional types.** When `T` is a naked type parameter in `T extends U ? A : B`, the conditional distributes over unions: `(A | B) extends U ? ...` becomes `(A extends U ? ...) | (B extends U ? ...)`. Wrap in `[T] extends [U]` to prevent distribution.
5. **Use template literal types for string pattern enforcement.** `` type EventName = `on${Capitalize<string>}` `` constrains strings to match a pattern. Combine with mapped types for type-safe event systems.
6. **Use `satisfies` to validate without widening.** `expr satisfies Type` checks assignability while preserving the expression's narrow type. Use this instead of `: Type` annotation when you need both validation and literal inference.
7. **Use `const` type parameters (TS 5.0+) to infer literals without `as const`.** `function fn<const T>(x: T)` infers `T` as the literal type of the argument, not the widened type.
8. **Use recursive conditional types cautiously.** TypeScript supports recursive types (`type Deep<T> = T extends object ? { [K in keyof T]: Deep<T[K]> } : T`) but has a recursion depth limit (~50 levels). Use tail-recursive patterns when possible.
9. **Prefer built-in utility types before writing custom ones.** `Partial<T>`, `Required<T>`, `Pick<T, K>`, `Omit<T, K>`, `Record<K, V>`, `Exclude<T, U>`, `Extract<T, U>`, `ReturnType<T>`, `Parameters<T>`, `Awaited<T>` cover most needs.
10. **Use type predicates (`x is T`) for custom type guards.** A function returning `x is T` narrows the type in the calling scope. The predicate must be accurate — TypeScript trusts your assertion.
11. **Use `NoInfer<T>` (TS 5.4+) to control inference sites.** `NoInfer<T>` prevents a type parameter position from contributing to inference, forcing inference from other sites. Useful for default values and overloaded generics.
12. **Use variance annotations (`in`, `out`) for interface type parameters.** `interface Consumer<in T>` (contravariant) and `interface Producer<out T>` (covariant) let TypeScript check variance correctness and improve performance.

## patterns

### Mapped type with conditional transformation

```typescript
// Make all properties of T nullable except those in K
type NullableExcept<T, K extends keyof T> = {
  [P in keyof T]: P extends K ? T[P] : T[P] | null;
};

interface User {
  id: string;
  name: string;
  email: string;
  bio: string;
}

// id and name are required; email and bio can be null
type UserDraft = NullableExcept<User, 'id' | 'name'>;
```

### Extract and infer with conditional types

```typescript
// Extract the element type from an array or the value type from a Promise
type Unwrap<T> =
  T extends Promise<infer U> ? Unwrap<U> :
  T extends Array<infer U> ? U :
  T;

type A = Unwrap<Promise<string>>;           // string
type B = Unwrap<Promise<Promise<number>>>;   // number (recursive)
type C = Unwrap<string[]>;                   // string
type D = Unwrap<boolean>;                    // boolean
```

### Type-safe event emitter with template literals

```typescript
type EventMap = {
  click: { x: number; y: number };
  focus: { target: string };
  blur: { target: string };
};

type EventHandler<T> = (payload: T) => void;

class TypedEmitter<Events extends Record<string, unknown>> {
  private handlers = new Map<string, Set<Function>>();

  on<K extends keyof Events & string>(
    event: K,
    handler: EventHandler<Events[K]>,
  ): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
  }

  emit<K extends keyof Events & string>(
    event: K,
    payload: Events[K],
  ): void {
    this.handlers.get(event)?.forEach((fn) => fn(payload));
  }
}

const emitter = new TypedEmitter<EventMap>();
emitter.on('click', ({ x, y }) => console.log(x, y)); // fully typed
// emitter.on('click', ({ target }) => ...); // ← Type error: no 'target' on click
```

### Distributive vs non-distributive conditional types

```typescript
type IsString<T> = T extends string ? true : false;

// Distributive — distributes over union members
type A = IsString<string | number>;  // true | false = boolean

// Non-distributive — wrapping prevents distribution
type IsStringStrict<T> = [T] extends [string] ? true : false;
type B = IsStringStrict<string | number>;  // false (union doesn't extend string)
```

### Const type parameters (TS 5.0+)

```typescript
// Without const — infers wide types
function createRoutes<T extends Record<string, string>>(routes: T): T {
  return routes;
}
const r1 = createRoutes({ home: '/', about: '/about' });
// T = { home: string; about: string }

// With const — infers literal types
function createRoutesConst<const T extends Record<string, string>>(routes: T): T {
  return routes;
}
const r2 = createRoutesConst({ home: '/', about: '/about' });
// T = { readonly home: '/'; readonly about: '/about' }
```

## pitfalls

- **Distributive conditional types are the default.** Naked type parameters always distribute over unions. If you don't want distribution, wrap both sides: `[T] extends [U] ? A : B`.
- **`infer` only works inside `extends` clauses.** You can't use `infer` in mapped type bodies or arbitrary positions — only within `T extends ... infer U ... ? ...`.
- **Recursive types hit depth limits.** TypeScript limits recursion to ~50 levels (100 for tail-recursive). Deep JSON types or path utilities may need an explicit depth counter type parameter.
- **`keyof` returns `string | number | symbol`, not just `string`.** If you need string keys only, use `keyof T & string` or `Extract<keyof T, string>`.
- **Mapped types lose methods.** `{ [K in keyof T]: T[K] }` copies properties but may change method types due to homomorphic mapping. Test mapped types with classes carefully.
- **`satisfies` doesn't create a type annotation.** It validates but doesn't constrain — the variable can still be reassigned to a different shape if declared with `let`.

## references

- https://www.typescriptlang.org/docs/handbook/2/mapped-types.html — mapped types
- https://www.typescriptlang.org/docs/handbook/2/conditional-types.html — conditional types
- https://www.typescriptlang.org/docs/handbook/2/template-literal-types.html — template literal types
- https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-0.html — const type parameters
- https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-4.html — NoInfer

## instructions

Use this expert when a developer needs help with advanced type-level programming: building utility types, understanding conditional/mapped type behavior, debugging complex type errors, or designing type-safe APIs. Pair with `idioms.md` for base type conventions and `patterns.md` for how these type techniques support design patterns (branded types, Result types, builders).

## research

Deep Research prompt:

"Write a micro expert on advanced TypeScript type-level programming. Cover: mapped types (modifiers, key remapping), conditional types (distributive vs non-distributive), infer keyword (all positions), template literal types (pattern enforcement, mapped key transformation), satisfies operator, const type parameters (TS 5.0), recursive conditional types (depth limits, tail recursion), built-in utility types (full list), type predicates and assertion functions, NoInfer (TS 5.4), variance annotations (in/out). Include self-contained code patterns showing each technique."
