# typescript-router

## purpose

Route TypeScript language questions to the right expert. Covers writing idiomatic TypeScript — style, patterns, pitfalls, and advanced type-level programming.

## task clusters

### Idioms & style
When: naming conventions, code organization, import style, `const` vs `let`, interface vs type, barrel exports, strict mode, documentation style, canonical TypeScript style
Read:
- `idioms.md`

### Design patterns & composition
When: builder pattern, factory, Result types, branded types, error handling, async patterns, composition, dependency injection, functional patterns, testing patterns, resource management
Read:
- `patterns.md`
Depends on: `idioms.md` (naming context)

### Gotchas & common mistakes
When: surprising behavior, `any` leaks, enum weirdness, `this` binding, structural typing surprises, `==` vs `===`, falsy values, optional chaining edge cases, coercion traps
Read:
- `pitfalls.md`

### Advanced type-level programming
When: mapped types, conditional types, template literal types, `infer`, recursive types, type predicates, const assertions, satisfies, variance, distributive conditional types, type-safe event emitters
Read:
- `type-system.md`
Depends on: `idioms.md` (base type conventions)

### Libraries & frameworks
When: Next.js, React, Express, NestJS, Prisma, tRPC, Zod, Vitest, Playwright,
  Angular, Vue, Svelte, Remix, Astro, Drizzle, or any TypeScript framework/library question
→ Read `libraries/index.md`

### Composite: Full TypeScript guidance
When: comprehensive TypeScript review, full codebase audit, new TypeScript project setup, "teach me TypeScript"
Read:
- `idioms.md`
- `patterns.md`
- `pitfalls.md`
- `type-system.md`

## file inventory

`idioms.md` | `patterns.md` | `pitfalls.md` | `type-system.md` | `libraries/index.md`
