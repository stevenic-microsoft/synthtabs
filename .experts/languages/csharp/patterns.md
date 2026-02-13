# patterns

## purpose

Design patterns, composition strategies, and architectural idioms for modern C# — builder pattern, DI, async patterns, and testing patterns.

## rules

1. Always use constructor injection for required dependencies; never resolve services from `IServiceProvider` inside business logic (service locator anti-pattern).
2. Always register services with the narrowest lifetime: `Transient` for stateless, `Scoped` for per-request, `Singleton` only for thread-safe shared state.
3. Always return `Task` or `ValueTask` from async methods; never use `async void` except for event handlers.
4. Prefer `ValueTask<T>` over `Task<T>` when the result is frequently available synchronously (e.g., cached values).
5. Always pass `CancellationToken` through the entire async call chain; never silently ignore it.
6. Always implement `IAsyncDisposable` alongside `IDisposable` when the type holds async resources; use `await using` at call sites.
7. Prefer the Result pattern (returning success/failure) over throwing exceptions for expected error conditions in domain logic.
8. Always make builder methods return `this` (or a new instance for immutable builders) to enable fluent chaining.
9. Prefer `IAsyncEnumerable<T>` over `Task<List<T>>` when streaming data to avoid buffering entire result sets in memory.
10. Always use `ConfigureAwait(false)` in library code that does not need the synchronization context; omit it in application code (ASP.NET Core has no SynchronizationContext).

## patterns

### Builder pattern with fluent API

```csharp
namespace MyApp.Builders;

public class QueryBuilder
{
    private string _table = "";
    private readonly List<string> _conditions = [];
    private int? _limit;

    public QueryBuilder From(string table) { _table = table; return this; }
    public QueryBuilder Where(string condition) { _conditions.Add(condition); return this; }
    public QueryBuilder Limit(int limit) { _limit = limit; return this; }

    public string Build()
    {
        var sql = $"SELECT * FROM {_table}";
        if (_conditions.Count > 0)
            sql += " WHERE " + string.Join(" AND ", _conditions);
        if (_limit.HasValue)
            sql += $" LIMIT {_limit.Value}";
        return sql;
    }
}

// Usage: var sql = new QueryBuilder().From("orders").Where("status = 'open'").Limit(10).Build();
```

### Dependency injection with IServiceCollection

```csharp
using Microsoft.Extensions.DependencyInjection;

var services = new ServiceCollection();
services.AddSingleton<ICacheService, RedisCacheService>();
services.AddScoped<IOrderRepository, SqlOrderRepository>();
services.AddTransient<IEmailSender, SmtpEmailSender>();

// Constructor injection — the runtime resolves dependencies automatically
public class OrderService(IOrderRepository repo, IEmailSender sender, ILogger<OrderService> logger)
{
    public async Task<bool> ProcessAsync(int orderId, CancellationToken ct)
    {
        var order = await repo.GetByIdAsync(orderId, ct);
        if (order is null) return false;
        await sender.SendAsync(order.CustomerEmail, "Order processed", ct);
        logger.LogInformation("Processed order {Id}", orderId);
        return true;
    }
}
```

### Async patterns — IAsyncEnumerable and CancellationToken

```csharp
using System.Runtime.CompilerServices;

public class DataStream
{
    public async IAsyncEnumerable<int> GenerateAsync(
        int count,
        [EnumeratorCancellation] CancellationToken ct = default)
    {
        for (var i = 0; i < count; i++)
        {
            ct.ThrowIfCancellationRequested();
            await Task.Delay(100, ct);
            yield return i;
        }
    }
}

// Consumption:
// await foreach (var item in stream.GenerateAsync(50, ct)) { ... }
```

### Result pattern (no exceptions for expected failures)

```csharp
namespace MyApp.Core;

public record Result<T>
{
    public T? Value { get; }
    public string? Error { get; }
    public bool IsSuccess => Error is null;

    private Result(T value) { Value = value; }
    private Result(string error) { Error = error; }

    public static Result<T> Ok(T value) => new(value);
    public static Result<T> Fail(string error) => new(error);

    public TOut Match<TOut>(Func<T, TOut> onSuccess, Func<string, TOut> onError) =>
        IsSuccess ? onSuccess(Value!) : onError(Error!);
}

// Usage: Result<Order> result = await service.GetOrderAsync(id);
// var message = result.Match(o => $"Found {o.Id}", err => $"Error: {err}");
```

### Testing with xUnit and NSubstitute

```csharp
using NSubstitute;
using FluentAssertions;
using Xunit;

public class OrderServiceTests
{
    private readonly IOrderRepository _repo = Substitute.For<IOrderRepository>();
    private readonly IEmailSender _sender = Substitute.For<IEmailSender>();
    private readonly ILogger<OrderService> _logger = Substitute.For<ILogger<OrderService>>();

    [Fact]
    public async Task ProcessAsync_WithValidOrder_ReturnsTrue()
    {
        _repo.GetByIdAsync(1, Arg.Any<CancellationToken>())
             .Returns(new Order { Id = 1, CustomerEmail = "a@b.com" });

        var sut = new OrderService(_repo, _sender, _logger);

        var result = await sut.ProcessAsync(1, CancellationToken.None);

        result.Should().BeTrue();
        await _sender.Received(1).SendAsync("a@b.com", "Order processed", Arg.Any<CancellationToken>());
    }
}
```

## pitfalls

1. **Captive dependency — singleton holding a scoped service.** The scoped service is created once and reused forever, leaking resources. Validate lifetimes with `ServiceProviderOptions.ValidateScopes = true` in development.
2. **Forgetting `ConfigureAwait(false)` in library code** causes deadlocks when callers block with `.Result` on a UI or legacy ASP.NET thread. Always add it in shared libraries.
3. **Disposing a service resolved from DI manually** causes double-dispose when the container disposes it again at scope end. Let the DI container manage lifetimes.

## references

- https://learn.microsoft.com/en-us/dotnet/core/extensions/dependency-injection
- https://learn.microsoft.com/en-us/dotnet/csharp/asynchronous-programming/
- https://learn.microsoft.com/en-us/dotnet/standard/garbage-collection/implementing-dispose
- https://learn.microsoft.com/en-us/aspnet/core/fundamentals/dependency-injection
- https://xunit.net/docs/getting-started/netcore/cmdline

## instructions

Use this expert for design-level C# questions: how to structure code, which patterns to apply, and how to compose functionality. Pair with `idioms.md` for naming/style.

## research

Deep Research prompt:

"Write a micro expert on modern C# (10+/.NET 6+) design patterns and composition. Cover: builder pattern (fluent API, immutable builders with records), dependency injection (Microsoft.Extensions.DependencyInjection, service lifetimes, IServiceCollection, IOptions<T>), IDisposable/IAsyncDisposable (dispose pattern, using declarations, SafeHandle), async/await patterns (ValueTask vs Task, ConfigureAwait, IAsyncEnumerable, Channel<T> producer-consumer), Result pattern (discriminated union via OneOf or custom), extension methods (design guidelines, discoverability), source generators (incremental generators, interceptors), LINQ composition (query composition, expression trees, deferred execution), testing with xUnit (Theory/InlineData, IClassFixture, IAsyncLifetime) and NSubstitute/Moq, MediatR/CQRS pattern, and the options pattern (IOptions, IOptionsSnapshot, IOptionsMonitor). Include self-contained code patterns for each."
