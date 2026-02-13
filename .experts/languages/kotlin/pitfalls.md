# pitfalls

## purpose

Non-obvious Kotlin gotchas, surprising behavior, and common mistakes that trip up developers — including those coming from Java.

## rules

1. Never trust nullability of types coming from Java — treat every `T!` platform type as nullable until annotated with `@Nullable`/`@NotNull`.
2. Never use `!!` without a comment explaining why null is impossible at that point; prefer `?: error("reason")` for fail-fast with context.
3. Always check `::property.isInitialized` before accessing a `lateinit` property when initialization is conditional.
4. Always make coroutine loops cancellation-cooperative by checking `isActive` or calling a suspending function inside the loop body.
5. Never catch `CancellationException` — if you must catch `Exception`, always rethrow `CancellationException` to preserve structured concurrency.
6. Never nest more than one scope function; extract intermediate values into named variables instead.
7. Always use immutable collections in data classes to make `copy()` safe; if you must use mutable members, document the shallow-copy risk.
8. Prefer `==` (structural equality) by default; use `===` (referential equality) only when identity matters (e.g., singleton checks).
9. Always annotate public API meant for Java callers with `@JvmStatic`, `@JvmField`, or `@JvmOverloads` as appropriate.
10. Prefer `Sequence` over `List` for multi-step transformations on large collections; prefer `List` for small collections or single operations.

## patterns

### Platform types — silent null from Java
```kotlin
// Java source: public String getName() { return null; }
// Kotlin sees: String! (platform type — neither String nor String?)

// DANGEROUS — compiles but crashes at runtime:
// val length: Int = javaObject.name.length

// SAFE — declare the expected nullability explicitly:
val name: String? = javaObject.name
val length: Int = name?.length ?: 0
```

### Cooperative coroutine cancellation
```kotlin
import kotlinx.coroutines.*

suspend fun processItems(items: List<Item>) = coroutineScope {
    for (item in items) {
        ensureActive() // throws CancellationException if scope is cancelled
        process(item)
    }
}

// WRONG — swallows cancellation:
// try { doWork() } catch (e: Exception) { log(e) }

// CORRECT — rethrow CancellationException:
try {
    doWork()
} catch (e: CancellationException) {
    throw e
} catch (e: Exception) {
    log(e)
}
```

### Data class copy() shallow-copy trap
```kotlin
data class Order(val id: String, val items: MutableList<String>)

fun main() {
    val original = Order("1", mutableListOf("A", "B"))
    val copied = original.copy()

    copied.items.add("C")
    println(original.items) // [A, B, C] — original mutated!

    // SAFE: use immutable List instead
    // data class Order(val id: String, val items: List<String>)
}
```

## pitfalls

1. **Platform types (`T!`) from Java** — Kotlin does not enforce null checks on types from unannotated Java code. A `String!` can silently be `null`, causing an NPE on first access. Always assign Java return values to an explicitly nullable variable (`val x: String? = javaMethod()`).

2. **`lateinit` with primitives** — `lateinit` cannot be used with `Int`, `Boolean`, `Long`, etc. Use `by Delegates.notNull<Int>()` for non-null primitives that are initialized after construction. Accessing an uninitialized `lateinit` throws `UninitializedPropertyAccessException` with no null-check safety net.

3. **Coroutine cancellation is cooperative** — CPU-bound loops do not check for cancellation automatically. A `while (true) { compute() }` inside a coroutine will never cancel. Insert `ensureActive()` or `yield()` in tight loops.

4. **`CancellationException` swallowed by `catch (e: Exception)`** — catching broad `Exception` silently breaks structured concurrency. The coroutine appears to succeed but its parent scope cannot cancel it. Always rethrow `CancellationException`.

5. **Scope function overuse** — `user?.let { it.address?.let { addr -> addr.city?.let { ... } } }` is a readability nightmare. Flatten to `val city = user?.address?.city ?: return` or extract a named helper.

6. **`==` auto-boxing surprise** — for nullable boxed types, `val a: Int? = 128; val b: Int? = 128; a == b` is `true` (structural), but `a === b` may be `false` because the JVM only caches `Integer` values -128..127. Never use `===` for value comparisons.

7. **SAM conversion ambiguity** — when a Java method has multiple functional-interface parameters, Kotlin's SAM conversion can pick the wrong overload. Use named SAM constructors (`Runnable { ... }`, `Callable { ... }`) to make intent explicit.

8. **`companion object` initialization order** — companion objects are initialized when the enclosing class is loaded. If a companion references instance members or another companion that is not yet loaded, you get `null` or `ExceptionInInitializerError`. Keep companion init logic self-contained.

9. **Sequence vs List wrong default** — using `asSequence()` on a 5-element list adds overhead without benefit. Sequences pay off only when the collection is large or the pipeline has multiple intermediate operations that can short-circuit.

10. **Inline value class boxing** — `@JvmInline value class UserId(val id: String)` is unboxed in most cases, but gets boxed when used as a nullable type (`UserId?`), a generic type parameter, or stored in a collection. Avoid nullable value classes in hot paths.

11. **`Nothing` type misunderstanding** — functions returning `Nothing` (e.g., `error()`, `TODO()`) never return normally. Using `Nothing` as a generic parameter (`List<Nothing>`) creates an empty-only list type. Do not confuse it with `Unit` (which returns successfully with no value).

12. **`@JvmField` vs property** — without `@JvmField`, Kotlin properties generate getter/setter methods for Java callers. Public `val` with `@JvmField` exposes the field directly, which is needed for JUnit `@Rule` fields and framework annotations that expect fields.

## references

- https://kotlinlang.org/docs/java-interop.html#null-safety-and-platform-types
- https://kotlinlang.org/docs/properties.html#late-initialized-properties-and-variables
- https://kotlinlang.org/docs/cancellation-and-timeouts.html
- https://kotlinlang.org/docs/scope-functions.html
- https://kotlinlang.org/docs/data-classes.html#copying
- https://kotlinlang.org/docs/equality.html
- https://kotlinlang.org/docs/inline-classes.html
- https://kotlinlang.org/docs/sequences.html

## instructions

Use this expert when a developer reports unexpected Kotlin behavior, asks "why doesn't this work?", or needs help debugging. Pair with `idioms.md` for the positive conventions.

## research

Deep Research prompt:

"Write a micro expert on Kotlin pitfalls and gotchas. Cover: platform types from Java interop (T! types, nullability not enforced from Java), !! assertion crashes (NullPointerException, alternatives), lateinit pitfalls (UninitializedPropertyAccessException, ::property.isInitialized), data class copy() with mutable fields (shallow copy, shared mutable state), == vs === (structural vs referential, auto-boxing), coroutine cancellation (CancellationException, cooperative cancellation, isActive checks), runBlocking deadlocks (blocking main thread, Dispatchers.Main), scope function overuse (nested let/run chains, readability), companion object initialization (lazy, thread safety), SAM conversion ambiguity (multiple functional parameters), inline class vs data class (value classes, boxing), reified type erasure (only works with inline), sealed class exhaustive when (no else branch maintenance), Sequence vs Iterable (lazy vs eager evaluation), and suspend function coloring (cannot call suspend from non-suspend). Include safe alternative patterns for each."
