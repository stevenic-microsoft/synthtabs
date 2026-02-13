# languages-router

## purpose

Route programming-language requests to the correct language domain. Each subfolder contains experts on writing **idiomatic code in** that language — naming conventions, canonical patterns, style, and pitfalls.

## language detection

Scan the developer's message for language signals. Pick the **first matching language**; if multiple languages appear, prefer the one that is the explicit subject of the question (not just mentioned as context).

### TypeScript
Signals: TypeScript, TS, `.ts`, `.tsx`, tsconfig, strict mode, type narrowing, discriminated union, branded type, mapped type, conditional type, template literal type, declaration file, `.d.ts`
→ Read `.experts/languages/typescript/index.md`

### Python
Signals: Python, Pythonic, `.py`, pip, poetry, venv, virtualenv, `__init__`, dunder, list comprehension, generator, decorator, asyncio, `type:` hints, mypy, pydantic, dataclass
→ Read `.experts/languages/python/index.md`

### Go
Signals: Go, Golang, Gopher, `.go`, goroutine, channel, `go func`, `select`, `defer`, `go mod`, `go build`, interface satisfaction, error wrapping, `context.Context`
→ Read `.experts/languages/go/index.md`

### Rust
Signals: Rust, Rustacean, `.rs`, cargo, crate, ownership, borrowing, lifetime, `'a`, `Box<>`, `Rc<>`, `Arc<>`, `impl`, trait, `match`, `Result<>`, `Option<>`, `unwrap`, borrow checker
→ Read `.experts/languages/rust/index.md`

### Java
Signals: Java, `.java`, JVM, Maven, Gradle, Spring, `@Override`, `@Autowired`, `Optional<>`, `Stream<>`, checked exception, `final class`, record, sealed, `var` (Java)
→ Read `.experts/languages/java/index.md`

### C\#
Signals: C#, CSharp, `.cs`, dotnet, .NET, NuGet, LINQ, `async`/`await` (C#), `IEnumerable`, `IDisposable`, `using`, `var` (C#), nullable reference types, `record`, `span`, `ValueTask`
→ Read `.experts/languages/csharp/index.md`

### Ruby
Signals: Ruby, Rubyist, `.rb`, gem, Bundler, Rails, `attr_accessor`, `do..end`, block, proc, lambda, mixin, `include`, `extend`, monkey-patch, `method_missing`, `respond_to?`
→ Read `.experts/languages/ruby/index.md`

### Swift
Signals: Swift, `.swift`, SwiftUI, UIKit, Xcode, `guard`, `let`/`var` (Swift), protocol, extension, `@escaping`, `async`/`await` (Swift), actor, Sendable, Codable, `Result<>`
→ Read `.experts/languages/swift/index.md`

### Kotlin
Signals: Kotlin, `.kt`, Kotlin/JVM, coroutine, `suspend`, `sealed class`, `data class`, `companion object`, `when` (Kotlin), extension function, null-safety, `?.`, `!!`, `?:` (Elvis), `Flow<>`, Jetpack Compose
→ Read `.experts/languages/kotlin/index.md`

## scope

This domain covers **writing idiomatic code in** a language and **using frameworks/libraries** in that language. Each language subfolder contains:
- Core experts: idioms, patterns, pitfalls, and language-specific deep dives
- `libraries/` subfolder: framework and library experts specific to that language (populated by the analyzer + builder workflow)

## ambiguity fallback

If the language cannot be determined from the message, ask **one** clarifying question:

> "Which programming language are you asking about?"

Offer the 9 supported languages plus "Other" as options.

## cross-domain note

If a request spans both language idioms and tool concerns (e.g., "parse YAML idiomatically in Python"), load the language expert here for style guidance and the relevant tool expert from `../tools/` for format/workflow rules.
