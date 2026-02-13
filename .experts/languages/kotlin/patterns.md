# patterns

## purpose

Design patterns, composition strategies, and architectural idioms for Kotlin — DSL builders, coroutine patterns, delegation, and testing patterns.

## rules

1. Always use `@DslMarker` annotations on DSL builder scopes to prevent accidental access to outer receivers.
2. Never use `GlobalScope.launch` — always launch coroutines from a well-defined `CoroutineScope` tied to a lifecycle.
3. Prefer `Flow` for reactive streams; use `StateFlow` for observable state and `SharedFlow` for event broadcasting.
4. Always use `withContext(Dispatchers.IO)` for blocking I/O inside a suspend function instead of switching dispatchers at the call site.
5. Prefer property delegation (`by lazy`, `by Delegates.observable`) over manual backing-field boilerplate.
6. Always use `runTest` (from `kotlinx-coroutines-test`) to test suspend functions — never use `runBlocking` in tests.
7. Prefer sealed class hierarchies over stringly-typed state; let the compiler enforce exhaustive handling.
8. Use `inline` functions with `reified` type parameters when you need to access the type at runtime (e.g., JSON deserialization); never mark a function `inline` without lambda parameters or reified types.
9. Prefer constructor injection over service locators; use Hilt `@Inject` or Koin `single { }` / `factory { }` to wire dependencies.
10. Always cancel structured coroutine scopes when the owning lifecycle ends to prevent leaks.

## patterns

### Type-safe DSL builder with @DslMarker
```kotlin
@DslMarker
annotation class HtmlDsl

@HtmlDsl
class HTML {
    private val children = mutableListOf<String>()
    fun body(init: Body.() -> Unit) { children += Body().apply(init).render() }
    fun render(): String = "<html>${children.joinToString("")}</html>"
}

@HtmlDsl
class Body {
    private val children = mutableListOf<String>()
    fun p(text: String) { children += "<p>$text</p>" }
    fun render(): String = "<body>${children.joinToString("")}</body>"
}

fun html(init: HTML.() -> Unit): HTML = HTML().apply(init)

// Usage:
// val page = html { body { p("Hello, world!") } }
```

### Coroutines — structured concurrency with async
```kotlin
import kotlinx.coroutines.*

suspend fun fetchUserProfile(userId: String): Profile = coroutineScope {
    val user = async { userService.getUser(userId) }
    val prefs = async { prefService.getPreferences(userId) }
    Profile(user.await(), prefs.await()) // both run concurrently
}

// Cancellation propagates: if getUser fails, getPreferences is cancelled.
```

### Flow — cold stream with operators
```kotlin
import kotlinx.coroutines.flow.*

fun searchResults(query: Flow<String>): Flow<List<Item>> =
    query
        .debounce(300)
        .distinctUntilChanged()
        .filter { it.length >= 2 }
        .flatMapLatest { term -> repository.search(term) }

// Collecting in a ViewModel (Android example):
// searchResults(queryFlow).stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())
```

### Property delegation — lazy and observable
```kotlin
import kotlin.properties.Delegates

class Settings {
    val config: Map<String, String> by lazy {
        loadConfigFromDisk() // computed once on first access
    }

    var theme: String by Delegates.observable("light") { _, old, new ->
        println("Theme changed from $old to $new")
    }
}
```

### Sealed state machine
```kotlin
sealed interface DownloadState {
    data object Idle : DownloadState
    data class Downloading(val progress: Int) : DownloadState
    data class Completed(val filePath: String) : DownloadState
    data class Failed(val error: Throwable) : DownloadState
}

fun DownloadState.reduce(event: DownloadEvent): DownloadState = when (this) {
    is DownloadState.Idle -> when (event) {
        is DownloadEvent.Start -> DownloadState.Downloading(0)
        else -> this
    }
    is DownloadState.Downloading -> when (event) {
        is DownloadEvent.Progress -> copy(progress = event.percent)
        is DownloadEvent.Done     -> DownloadState.Completed(event.path)
        is DownloadEvent.Error    -> DownloadState.Failed(event.cause)
        else -> this
    }
    is DownloadState.Completed, is DownloadState.Failed -> this
}
```

### Testing with MockK and runTest
```kotlin
import io.mockk.*
import kotlinx.coroutines.test.runTest
import org.junit.jupiter.api.Test
import kotlin.test.assertEquals

class UserServiceTest {
    private val repo = mockk<UserRepository>()
    private val service = UserService(repo)

    @Test
    fun `returns user by id`() = runTest {
        coEvery { repo.findById("42") } returns User("42", "Alice")

        val result = service.getUser("42")

        assertEquals("Alice", result.name)
        coVerify(exactly = 1) { repo.findById("42") }
    }
}
```

### Inline function with reified type
```kotlin
import com.google.gson.Gson

inline fun <reified T> Gson.fromJson(json: String): T =
    fromJson(json, T::class.java)

// Usage — no Class<T> parameter needed:
// val user: User = gson.fromJson("""{"name":"Alice"}""")
```

## pitfalls

1. **Missing `@DslMarker`** — without it, inner lambdas can accidentally call methods on an outer receiver, producing confusing results. Always annotate DSL scopes.
2. **`runBlocking` in tests** — it does not advance virtual time and can deadlock on `Dispatchers.Main`. Use `runTest` instead.
3. **`stateIn` without a timeout** — using `SharingStarted.Eagerly` keeps the upstream alive forever. Prefer `WhileSubscribed(5000)` to release resources when there are no collectors.
4. **Overusing `lazy`** — `by lazy` is synchronized by default, adding lock overhead. Use `LazyThreadSafetyMode.NONE` when the property is only accessed from a single thread.

## references

- https://kotlinlang.org/docs/type-safe-builders.html
- https://kotlinlang.org/docs/coroutines-guide.html
- https://kotlinlang.org/docs/flow.html
- https://kotlinlang.org/docs/delegated-properties.html
- https://kotlinlang.org/docs/inline-functions.html
- https://mockk.io/
- https://kotest.io/

## instructions

Use this expert for design-level Kotlin questions: how to structure code, which patterns to apply, and how to compose functionality. Pair with `idioms.md` for naming/style.

## research

Deep Research prompt:

"Write a micro expert on Kotlin design patterns and composition. Cover: builder via DSL (type-safe builders, @DslMarker, receiver lambdas), delegation (by keyword, Delegates.observable, Delegates.vetoable, custom delegates), sealed class/interface hierarchies (exhaustive when, state machines), coroutine patterns (suspend functions, CoroutineScope, structured concurrency, SupervisorJob), Flow composition (map/filter/combine/flatMapMerge, StateFlow, SharedFlow, cold vs hot), inline functions with reified type parameters, functional composition (higher-order functions, function references, partial application), dependency injection (Koin modules, Hilt with @Inject/@Module, manual DI), testing with JUnit 5/Kotest (BehaviorSpec, should, test containers), MockK (every/verify, coEvery for coroutines), and the extension function pattern (enhancing existing types). Include self-contained code patterns for each."
