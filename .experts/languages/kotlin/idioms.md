# idioms

## purpose

Idiomatic Kotlin naming conventions, code organization, data modeling, and style decisions for modern Kotlin codebases.

## rules

1. Always use `camelCase` for function and property names, `PascalCase` for classes and interfaces, `UPPER_SNAKE_CASE` for compile-time constants (`const val`).
2. Prefer `val` over `var` — default to immutable and only use `var` when mutation is genuinely required.
3. Always use data classes for types whose primary role is holding data; never add complex business logic to them.
4. Prefer sealed classes or sealed interfaces over enums when subtypes carry different data shapes.
5. Always use `?.` (safe call) and `?:` (Elvis) instead of explicit null checks; reserve `!!` for cases where null is provably impossible.
6. Use scope functions consistently: `apply` for object configuration, `also` for side effects, `let` for null-safe transforms, `run` for scoped computation, `with` for calling multiple methods on an object.
7. Prefer expression-body (`= expr`) for single-expression functions; use block body when logic requires multiple statements.
8. Always use string templates (`"Hello, $name"` or `"size: ${list.size}"`) instead of string concatenation.
9. Never nest more than one scope function — extract a named variable or function instead.
10. Prefer `when` over if-else chains when comparing a value against multiple alternatives; always make `when` exhaustive on sealed types (no `else` branch).

## patterns

### Data class with destructuring
```kotlin
data class User(val name: String, val email: String, val age: Int)

fun main() {
    val user = User("Alice", "alice@example.com", 30)
    val (name, email) = user          // destructuring declaration
    val updated = user.copy(age = 31) // copy with modification
    println("$name — $email")         // string template
}
```

### Sealed class hierarchy with exhaustive when
```kotlin
sealed interface Result<out T> {
    data class Success<T>(val data: T) : Result<T>
    data class Failure(val error: Throwable) : Result<Nothing>
    data object Loading : Result<Nothing>
}

fun <T> render(result: Result<T>): String = when (result) {
    is Result.Success -> "Data: ${result.data}"
    is Result.Failure -> "Error: ${result.error.message}"
    Result.Loading    -> "Loading..."
    // no else — compiler enforces exhaustiveness
}
```

### Scope functions — each role
```kotlin
data class Request(var url: String = "", var method: String = "GET")

fun buildRequest(): Request =
    Request().apply {            // configure object — returns receiver
        url = "https://api.example.com/users"
        method = "POST"
    }

fun process(input: String?) {
    input?.let { value ->        // null-safe transform — returns lambda result
        println("Received: $value")
    }

    val length = input?.run {    // scoped computation — returns lambda result
        trim().length
    } ?: 0
}
```

### Extension function and companion factory
```kotlin
fun String.initials(): String =
    split(" ").mapNotNull { it.firstOrNull()?.uppercase() }.joinToString("")

class Logger private constructor(val tag: String) {
    companion object {
        fun create(tag: String): Logger = Logger(tag)
    }
}
```

## pitfalls

1. **`!!` hides intent** — `!!` converts a type-safety guarantee into a runtime crash. Use `?: error("reason")` to provide context when a non-null assertion is truly needed.
2. **Scope function nesting** — `user?.let { it.address?.let { ... } }` is unreadable. Flatten with a single `?.` chain or extract a named variable.
3. **Data class `copy()` is shallow** — if a data class holds a `MutableList`, the copy shares the same list instance. Use immutable collections or deep-copy manually.
4. **`val` does not mean immutable** — `val list: MutableList<Int>` is still mutable. Prefer `List<Int>` (read-only interface) for true immutability at the type level.
5. **Exhaustive `when` with `else`** — adding an `else` branch to a `when` on a sealed type silently swallows new subtypes. Omit `else` so the compiler flags missing branches.

## references

- https://kotlinlang.org/docs/coding-conventions.html
- https://kotlinlang.org/docs/data-classes.html
- https://kotlinlang.org/docs/sealed-classes.html
- https://kotlinlang.org/docs/null-safety.html
- https://kotlinlang.org/docs/scope-functions.html
- https://kotlinlang.org/docs/extensions.html

## instructions

Use this expert when a developer asks about Kotlin naming, style, code organization, or "how should I write this in Kotlin." Pair with `patterns.md` for design-level guidance.

## research

Deep Research prompt:

"Write a micro expert on idiomatic Kotlin style and conventions. Cover: naming conventions (camelCase functions/properties, PascalCase classes, UPPER_SNAKE constants), data class (when to use, destructuring, copy), sealed class/interface hierarchies, object declarations (singletons, companion objects), extension functions (when appropriate, discovery), null-safety operators (?., !!, ?:, let for null checks), when expressions (exhaustive matching, no-argument when), string templates, scope functions (let/run/apply/also/with — when to use each), collection operations (map/filter/flatMap/associate/groupBy), type aliases, inline functions and reified type parameters, KDoc documentation, import organization, and property delegation (by lazy, Delegates.observable). Reference Kotlin coding conventions, Kotlin in Action, and JetBrains Kotlin documentation."
