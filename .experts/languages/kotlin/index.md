# kotlin-router

## purpose

Route Kotlin language questions to the right expert. Covers writing idiomatic Kotlin — style, patterns, and pitfalls.

## task clusters

### Idioms & style
When: Kotlin naming conventions (camelCase, PascalCase), `data class`, `sealed class`, `object`, `companion object`, extension functions, null-safety operators (`?.`, `!!`, `?:`), `when` expressions, string templates, scope functions (`let`, `run`, `apply`, `also`, `with`), KDoc
Read:
- `idioms.md`

### Design patterns & composition
When: builder via DSL, delegation (`by`), sealed hierarchies, coroutine-based patterns, `Flow` composition, `suspend` functions, testing with JUnit5/MockK/Kotest, dependency injection (Koin/Hilt), functional composition, inline functions/reified types
Read:
- `patterns.md`
Depends on: `idioms.md` (naming context)

### Gotchas & common mistakes
When: platform types from Java interop, `!!` assertion crashes, `lateinit` pitfalls, `data class` `copy()` with mutable fields, `==` vs `===`, coroutine cancellation, `runBlocking` deadlocks, scope function overuse, `companion object` initialization, SAM conversion ambiguity
Read:
- `pitfalls.md`

### Libraries & frameworks
When: Ktor, Spring Boot (Kotlin), Jetpack Compose, Exposed, Koin, Hilt,
  Kotest, MockK, Arrow, Kotlinx.serialization, or any Kotlin framework/library question
→ Read `libraries/index.md`

### Composite: Full Kotlin guidance
When: comprehensive Kotlin review, new Kotlin project setup, "teach me idiomatic Kotlin"
Read:
- `idioms.md`
- `patterns.md`
- `pitfalls.md`

## file inventory

`idioms.md` | `patterns.md` | `pitfalls.md` | `libraries/index.md`
