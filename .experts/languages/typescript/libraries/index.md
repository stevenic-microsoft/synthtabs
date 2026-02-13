# typescript-libraries-router

## purpose

Route TypeScript framework and library questions to project-specific experts. These experts cover opinionated frameworks, SDKs, and libraries used in TypeScript projects — knowledge that goes beyond the core language.

## task clusters

<!-- No library experts yet. Run the analyzer to scan the codebase and recommend library experts to create. Common candidates: Next.js, React, Express, NestJS, Prisma, tRPC, Zod, Vitest, Playwright. -->

## combining rule

If a request touches multiple library experts, load all that match. Let the more specific expert lead (e.g., Next.js over React for App Router questions).

## ambiguity fallback

If signals match this domain but no library expert exists yet, suggest running the analyzer:

> "No TypeScript library experts exist yet. Want me to analyze the codebase and recommend library experts to create?"

## cross-domain note

Library experts pair with `../idioms.md` for TypeScript style, `../patterns.md` for design patterns, and `../../tools/prompt-engineer.md` when the library is used for LLM prompt construction. If a question is purely about TypeScript language features, route to the parent language experts instead.

## file inventory

<!-- empty — populated by analyzer.md + builder.md -->
