# idioms

## purpose

Idiomatic modern C# naming conventions, code organization, data modeling, and style decisions for C# 10+ / .NET 6+ codebases.

## rules

1. Always use PascalCase for public methods, properties, types, and namespaces; camelCase for parameters and locals; _camelCase for private fields; UPPER_SNAKE for compile-time constants.
2. Always prefix interface names with `I` (e.g., `IRepository`, `ILogger`).
3. Always enable nullable reference types project-wide via `<Nullable>enable</Nullable>` in the csproj; annotate nullable parameters and return types with `?`.
4. Prefer file-scoped namespaces (`namespace Foo;`) over block-scoped namespaces to reduce nesting.
5. Prefer `var` for local variables when the type is obvious from the right-hand side; use explicit types when the type is not evident.
6. Prefer LINQ method syntax for simple chains; use query syntax only for complex joins or multiple `from` clauses.
7. Prefer `using` declarations (`using var stream = ...;`) over `using` blocks unless you need to limit scope precisely.
8. Always use records (`record class` or `record struct`) for immutable data transfer objects; prefer positional records for concise DTOs.
9. Prefer collection expressions (`[1, 2, 3]`) in C# 12+ over explicit `new List<int> { ... }` or array initializers.
10. Always add `/// <summary>` XML documentation comments on public APIs; use `<param>`, `<returns>`, and `<exception>` tags.
11. Prefer raw string literals (`"""..."""`) for multi-line strings and strings containing quotes or backslashes.
12. Always declare global usings in a single `GlobalUsings.cs` file or via `<Using>` in csproj rather than scattering them across files.

## patterns

### Naming conventions and file-scoped namespace

```csharp
namespace MyApp.Domain;

public interface IOrderService
{
    Task<OrderResult> PlaceOrderAsync(OrderRequest request, CancellationToken ct = default);
}

public class OrderService : IOrderService
{
    private readonly ILogger<OrderService> _logger;
    private const int MAX_RETRY_COUNT = 3;

    public OrderService(ILogger<OrderService> logger) => _logger = logger;

    public async Task<OrderResult> PlaceOrderAsync(OrderRequest request, CancellationToken ct = default)
    {
        var orderId = Guid.NewGuid();
        _logger.LogInformation("Placing order {OrderId}", orderId);
        // ...
        return new OrderResult(orderId);
    }
}
```

### Records, nullable types, and pattern matching

```csharp
namespace MyApp.Models;

// Positional record class — immutable, value equality
public record OrderRequest(string ProductId, int Quantity, string? CouponCode = null);

// Record struct for small, stack-allocated data
public readonly record struct Coordinate(double Lat, double Lon);

// Pattern matching with switch expression
public static class OrderExtensions
{
    public static string Describe(this OrderRequest order) => order switch
    {
        { Quantity: <= 0 }                => "Invalid order",
        { CouponCode: not null } req      => $"Discounted order of {req.Quantity}x {req.ProductId}",
        _                                 => $"Order of {order.Quantity}x {order.ProductId}",
    };
}
```

### Primary constructors and collection expressions (C# 12)

```csharp
namespace MyApp.Services;

public class NotificationService(ILogger<NotificationService> logger, IEmailSender sender)
{
    private readonly List<string> _history = [];

    public async Task NotifyAsync(string[] recipients)
    {
        List<string> validRecipients = [.. recipients.Where(r => r.Contains('@'))];
        foreach (var email in validRecipients)
        {
            await sender.SendAsync(email, "Hello");
            _history.Add(email);
        }
        logger.LogInformation("Sent {Count} notifications", validRecipients.Count);
    }
}
```

## pitfalls

1. **Nullable annotations are advisory, not enforced at runtime.** Code can still pass `null` where a non-nullable parameter is declared. Always validate at public API boundaries.
2. **`var` hides type changes.** If a method return type changes from `List<T>` to `IEnumerable<T>`, `var` silently accepts it and downstream code breaks at the call site, not the declaration.
3. **Record class equality uses value semantics but is a reference type.** Two records with the same values are `Equal` but not `ReferenceEquals`. Mixing records and classes in inheritance hierarchies breaks the equality contract.
4. **File-scoped namespaces apply to the entire file.** You cannot declare two namespaces in one file with this syntax; split into separate files instead.

## references

- https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/coding-style/coding-conventions
- https://learn.microsoft.com/en-us/dotnet/standard/design-guidelines/naming-guidelines
- https://learn.microsoft.com/en-us/dotnet/csharp/nullable-references
- https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/record
- https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/csharp-12

## instructions

Use this expert when a developer asks about C# naming, style, code organization, or "how should I write this in C#." Pair with `patterns.md` for design-level guidance.

## research

Deep Research prompt:

"Write a micro expert on idiomatic modern C# (10+/.NET 6+) style and conventions. Cover: naming conventions (PascalCase methods/properties, camelCase locals/parameters, _camelCase private fields, I-prefix interfaces), namespace organization (file-scoped namespaces), record types (record vs record struct, positional vs nominal), nullable reference types (enable globally, annotation patterns), var usage (when type is obvious from RHS), LINQ style (method syntax vs query syntax, when to prefer each), using declarations (vs using blocks), XML doc comments, init-only setters, primary constructors (C# 12), collection expressions ([]), top-level statements, global usings, pattern matching (is, switch expressions, property patterns), and string interpolation. Reference Microsoft C# coding conventions, .NET API design guidelines, and C# language reference."
