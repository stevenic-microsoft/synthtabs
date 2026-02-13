# kotlin-libraries-router

## purpose

Route Kotlin framework and library questions to project-specific experts. These experts cover opinionated frameworks, SDKs, and libraries used in Kotlin projects — knowledge that goes beyond the core language.

## task clusters

<!-- No library experts yet. Run the analyzer to scan the codebase and recommend library experts to create. Common candidates: Ktor, Spring Boot (Kotlin), Jetpack Compose, Exposed, Koin, Hilt, Kotest, MockK, Arrow, Kotlinx.serialization. -->

## combining rule

If a request touches multiple library experts, load all that match. Let the more specific expert lead (e.g., Jetpack Compose over Kotlin coroutines for UI state questions).

## ambiguity fallback

If signals match this domain but no library expert exists yet, suggest running the analyzer:

> "No Kotlin library experts exist yet. Want me to analyze the codebase and recommend library experts to create?"

## cross-domain note

Library experts pair with `../idioms.md` for Kotlin style, `../patterns.md` for design patterns, and `../../tools/prompt-engineer.md` when the library is used for LLM prompt construction. If a question is purely about Kotlin language features, route to the parent language experts instead.

## file inventory

<!-- empty — populated by analyzer.md + builder.md -->
