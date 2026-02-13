# pitfalls

## purpose

Non-obvious C# gotchas, surprising behavior, and common mistakes that trip up developers — including those moving to modern C# from older .NET Framework codebases.

## rules

1. Never use `async void` except for event handlers; always return `Task` or `ValueTask` so callers can observe exceptions.
2. Always call `ConfigureAwait(false)` in library/framework code that does not depend on the synchronization context.
3. Never call `.Result` or `.Wait()` on a `Task` from a thread with a synchronization context; use `await` instead to avoid deadlocks.
4. Always materialize an `IEnumerable<T>` with `.ToList()` or `.ToArray()` before iterating it multiple times; never rely on deferred execution being side-effect-free.
5. Never mutate a struct through a copy; always assign the result back or use a class instead.
6. Always use `DateTimeOffset` instead of `DateTime` when timezone information matters; `DateTime.Kind` is easily lost during serialization.
7. Always use `StringBuilder` for string concatenation in loops; never use `+=` with `string` in a hot path.
8. Never capture a loop variable by reference in a closure; copy it to a local variable first (pre-C# 5 `foreach` issue, still relevant for `for` loops).
9. Always validate nullability at public API boundaries even with nullable reference types enabled; annotations are compile-time only and not enforced at runtime.
10. Never compare strings with `==` when culture matters; always use `string.Equals(a, b, StringComparison.Ordinal)` or the appropriate `StringComparison` overload.

## patterns

### async void — unhandled exception crashes the process

```csharp
// BROKEN: Exception silently crashes the process
async void SendEmailBroken(string to)
{
    await emailClient.SendAsync(to, "Hello"); // unobserved exception
}

// SAFE: Return Task so the caller can await and catch
async Task SendEmailSafe(string to)
{
    await emailClient.SendAsync(to, "Hello");
}
```

### Deadlock with sync-over-async (.Result / .Wait())

```csharp
// BROKEN: Deadlocks on UI or legacy ASP.NET threads (SynchronizationContext)
public string GetData()
{
    // .Result blocks the thread that the continuation needs
    return httpClient.GetStringAsync("https://example.com").Result;
}

// SAFE: Use async all the way up
public async Task<string> GetDataAsync()
{
    return await httpClient.GetStringAsync("https://example.com");
}
```

### IEnumerable multiple enumeration

```csharp
// BROKEN: Database query executes TWICE
IEnumerable<Order> orders = db.Orders.Where(o => o.IsActive);
var count = orders.Count();    // query 1
var list  = orders.ToList();   // query 2

// SAFE: Materialize once
var orders = db.Orders.Where(o => o.IsActive).ToList();
var count = orders.Count;  // in-memory, no re-query
```

### Captured loop variable in closures

```csharp
// BROKEN: All actions print 5 (captured variable i, not the value)
var actions = new List<Action>();
for (var i = 0; i < 5; i++)
{
    actions.Add(() => Console.WriteLine(i));
}
actions.ForEach(a => a()); // prints 5, 5, 5, 5, 5

// SAFE: Copy to a local inside the loop body
for (var i = 0; i < 5; i++)
{
    var captured = i;
    actions.Add(() => Console.WriteLine(captured));
}
```

## pitfalls

1. **Struct boxing through interface casting.** Casting a `struct` to an interface (e.g., `IComparable`) allocates a heap copy. Use generic constraints (`where T : IComparable<T>`) to avoid boxing.
2. **Mutable struct copying.** `var copy = myStruct; copy.Value = 10;` does NOT modify the original. Property accessors on readonly struct fields return copies silently. Prefer `readonly record struct` for value types.
3. **DateTime vs DateTimeOffset.** `DateTime.Now` discards timezone offset; serialization round-trips lose `Kind`. `DateTimeOffset` preserves the offset and is unambiguous across timezones.
4. **Nullable reference types are compile-time only.** Third-party code or reflection can still pass `null` for a non-nullable parameter. The `!` (null-forgiving operator) silences warnings but does not add runtime checks.
5. **String concatenation in loops allocates O(n^2) memory.** Each `+=` creates a new string. Use `StringBuilder` or `string.Join` for sequences.
6. **Record equality breaks with inheritance.** A `DerivedRecord` and `BaseRecord` with the same property values are NOT equal because the hidden `EqualityContract` property differs. Avoid deep record hierarchies.
7. **`Task.Run` inside ASP.NET Core.** Offloading CPU work to the thread pool via `Task.Run` in a web request wastes a thread while the original request thread is idle. Call the CPU work directly and let the framework manage threads.

## references

- https://learn.microsoft.com/en-us/dotnet/csharp/asynchronous-programming/async-return-types
- https://learn.microsoft.com/en-us/archive/msdn-magazine/2015/july/async-programming-brownfield-async-development
- https://learn.microsoft.com/en-us/dotnet/standard/base-types/best-practices-strings
- https://learn.microsoft.com/en-us/dotnet/csharp/nullable-references
- https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/struct

## instructions

Use this expert when a developer reports unexpected C# behavior, asks "why doesn't this work?", or needs help debugging. Pair with `idioms.md` for the positive conventions.

## research

Deep Research prompt:

"Write a micro expert on C# pitfalls and gotchas. Cover: async void (fire-and-forget exceptions, only valid for event handlers), ConfigureAwait(false) (when needed, when not in ASP.NET Core), == vs Equals for value types (struct boxing), struct copying (unexpected mutation of copies), IEnumerable multiple enumeration (LINQ queries re-execute), LINQ deferred execution (side effects in queries, captured variables), nullable reference type warnings (null-forgiving !, pragmatic annotation), string comparison culture (ordinal vs current culture, StringComparison), Task.Run vs Task.Factory.StartNew (unwrapped Task<Task>), lock on wrong object (this, Type, string), closure capture in loops (captured variable, not value), async lazy initialization (AsyncLazy<T>), record equality (value semantics but reference type, Equals with inheritance), disposal ordering (reverse of allocation), and CA2000/IDisposable leaks in constructors. Include safe alternative patterns for each."
