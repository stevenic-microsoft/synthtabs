# csharp-router

## purpose

Route C# language questions to the right expert. Covers writing idiomatic modern C# — style, patterns, and pitfalls.

## task clusters

### Idioms & style
When: C# naming conventions (PascalCase methods, camelCase locals), namespace organization, `record` types, nullable reference types (`?`), `var`, LINQ style, `using` declarations, XML doc comments, `init`-only setters, file-scoped namespaces, top-level statements
Read:
- `idioms.md`

### Design patterns & composition
When: builder pattern, dependency injection (Microsoft.Extensions.DI), `IDisposable`/`IAsyncDisposable`, `async`/`await` patterns, `Channel<T>`, `IAsyncEnumerable`, `Result` pattern, extension methods, source generators, testing with xUnit/NUnit/Moq
Read:
- `patterns.md`
Depends on: `idioms.md` (naming context)

### Gotchas & common mistakes
When: `async void`, `ConfigureAwait`, `==` vs `Equals` for value types, struct copying, `IEnumerable` multiple enumeration, LINQ deferred execution, nullable reference warnings, `string` comparison culture, `Task.Run` vs `Task.Factory.StartNew`, `lock` on wrong object
Read:
- `pitfalls.md`

### Libraries & frameworks
When: ASP.NET Core, Entity Framework Core, MediatR, AutoMapper, Serilog,
  xUnit, NSubstitute, Polly, MassTransit, Semantic Kernel, Blazor,
  or any C#/.NET framework/library question
→ Read `libraries/index.md`

### Composite: Full C# guidance
When: comprehensive C# review, new C# project setup, "teach me modern C#"
Read:
- `idioms.md`
- `patterns.md`
- `pitfalls.md`

## file inventory

`idioms.md` | `patterns.md` | `pitfalls.md` | `libraries/index.md`
