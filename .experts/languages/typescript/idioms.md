# idioms

## purpose

Canonical TypeScript naming conventions, code organization, data modeling idioms, and style decisions that make code immediately recognizable as idiomatic TS.

## rules

1. **Use `camelCase` for variables, functions, and methods; `PascalCase` for types, interfaces, classes, and enums; `UPPER_SNAKE_CASE` for true constants.** This is the universal TS convention enforced by the compiler's own codebase and all major style guides.
2. **Prefer `interface` for object shapes; use `type` for unions, intersections, and mapped types.** Interfaces are open (augmentable via declaration merging) and produce clearer error messages. Types are needed for compositions that interfaces can't express.
3. **Enable `"strict": true` in tsconfig.json — never weaken it.** Strict mode enables `strictNullChecks`, `noImplicitAny`, `strictFunctionTypes`, and others. Disabling any of these creates categories of bugs that the compiler could have caught.
4. **Prefer `const` by default; use `let` only when reassignment is required; never use `var`.** This signals intent: `const` means the binding won't change, reducing cognitive load when reading code.
5. **Use discriminated unions instead of class hierarchies for variant data.** A `type Shape = Circle | Square` with a `kind` discriminant is more idiomatic and better supported by type narrowing than an abstract class with subclasses.
6. **Prefer `unknown` over `any` at trust boundaries.** External data (API responses, user input, `JSON.parse`) should be typed `unknown` and narrowed with type guards or a validation library (Zod, io-ts). `any` disables the type checker entirely.
7. **Use barrel exports (`index.ts`) sparingly.** Re-exporting from an `index.ts` is convenient but causes tree-shaking problems and circular dependency risks. Prefer direct imports for internal modules; use barrels only for public package APIs.
8. **Prefer named exports over default exports.** Named exports enable auto-import, consistent naming across files, and better refactoring support. Default exports cause rename drift and tooling friction.
9. **Use `readonly` for data that shouldn't be mutated.** Mark properties `readonly`, use `ReadonlyArray<T>` or `readonly T[]`, and `Readonly<T>` for entire objects. This catches accidental mutation at compile time.
10. **Organize imports in groups: external packages, then internal absolute paths, then relative paths.** Separate groups with a blank line. Let your formatter (Prettier, ESLint `import/order`) enforce this automatically.
11. **Use `as const` for literal tuples and configuration objects.** `const ROLES = ['admin', 'user'] as const` gives you `readonly ['admin', 'user']` instead of `string[]`, enabling type-safe lookups.
12. **Document public APIs with TSDoc (`/** ... */`), not inline comments.** TSDoc integrates with editors and doc generators. Use `@param`, `@returns`, `@throws`, `@example`. Skip documentation for self-evident code.
13. **Model absence with `T | undefined` for optional values and `null` for intentional emptiness.** Be consistent within a codebase: pick one convention for "no value" and stick with it. Many codebases use `undefined` throughout to align with optional properties.

## patterns

### Discriminated union with exhaustive switch

```typescript
interface Circle {
  kind: 'circle';
  radius: number;
}

interface Rectangle {
  kind: 'rectangle';
  width: number;
  height: number;
}

type Shape = Circle | Rectangle;

function area(shape: Shape): number {
  switch (shape.kind) {
    case 'circle':
      return Math.PI * shape.radius ** 2;
    case 'rectangle':
      return shape.width * shape.height;
    default:
      // Exhaustiveness check — compile error if a variant is unhandled
      const _exhaustive: never = shape;
      return _exhaustive;
  }
}
```

### Strict configuration object with `as const` + `satisfies`

```typescript
interface AppConfig {
  port: number;
  env: 'development' | 'production' | 'test';
  features: readonly string[];
}

const config = {
  port: 3000,
  env: 'development',
  features: ['auth', 'logging'] as const,
} as const satisfies AppConfig;

// config.env is narrowed to 'development', not string
// config.features is readonly ['auth', 'logging'], not readonly string[]
```

### Organized imports

```typescript
// External packages
import express from 'express';
import { z } from 'zod';

// Internal absolute imports
import { UserService } from '@/services/user-service';
import { logger } from '@/utils/logger';

// Relative imports
import { validateRequest } from './middleware';
import type { RequestContext } from './types';
```

## pitfalls

- **Barrel export cycles.** Re-exporting everything from `index.ts` across multiple directories creates circular dependency chains. Node.js resolves these as `undefined` at runtime with no compile-time warning.
- **`interface` vs `type` doesn't matter for most cases.** Don't bikeshed. The real rule is: be consistent within a codebase. The preference for `interface` is slight, not absolute.
- **`as const` doesn't freeze at runtime.** `as const` narrows types at compile time only. If you need runtime immutability, use `Object.freeze()` as well.
- **`readonly` is shallow.** `readonly` on a property of type `object` prevents reassigning the property but not mutating the object it points to. Use `Readonly<T>` recursively or a deep-readonly utility for nested structures.

## references

- https://www.typescriptlang.org/docs/handbook/2/everyday-types.html
- https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html
- https://google.github.io/styleguide/tsguide.html — Google TS style guide
- https://tsdoc.org/ — TSDoc specification

## instructions

Use this expert when a developer asks about TypeScript naming, style, code organization, or "how should I structure this in TS." Pair with `patterns.md` for design-level guidance and `type-system.md` for advanced type constructs.

## research

Deep Research prompt:

"Write a micro expert on idiomatic TypeScript style and conventions. Cover: naming conventions (camelCase, PascalCase, UPPER_SNAKE), interface vs type, strict mode, const/let/var, discriminated unions vs class hierarchies, unknown vs any, barrel exports, named vs default exports, readonly, import organization, as const + satisfies, TSDoc, and null/undefined conventions. Reference the TypeScript handbook, Google TS style guide, and TSDoc spec."
