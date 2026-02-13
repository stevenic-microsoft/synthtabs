# idioms

## purpose

Idiomatic modern Java naming conventions, code organization, data modeling, and style decisions for Java 17+ codebases.

## rules

1. Always use camelCase for methods and local variables, PascalCase for classes and interfaces, UPPER_SNAKE_CASE for constants (`static final`).
2. Always use reverse-domain package names in all lowercase (`com.example.billing.invoices`), never underscores or mixed case.
3. Prefer records over classes for immutable data carriers; fall back to a class only when you need mutability or inheritance.
4. Never use `Optional` for fields, method parameters, or collection elements; reserve it exclusively for return types that may have no value.
5. Use `var` only when the type is obvious from the right-hand side (`var list = new ArrayList<String>()`); never use `var` when the inferred type is ambiguous.
6. Prefer Stream pipelines over imperative `for` loops for transformations, filtering, and aggregations; use `for` when you need early exit or index access.
7. Always use text blocks (`"""`) for multi-line strings such as JSON templates, SQL, or HTML fragments.
8. Prefer switch expressions (arrow syntax) over switch statements; let the compiler enforce exhaustiveness on sealed types and enums.
9. Use pattern matching for `instanceof` instead of explicit casts (`if (obj instanceof String s)`).
10. Treat fields as `private final` by default; widen access only when required by the design.
11. Organize imports as: `java.*`, blank line, `javax.*`, blank line, third-party, blank line, project; never use wildcard imports.
12. Write Javadoc on every public type and method; start with a verb in third-person ("Returns the …", "Computes the …").

## patterns

### Record as data carrier (JDK 16+)

```java
package com.example.billing;

// Records give you equals, hashCode, toString, and accessors for free.
public record Invoice(String id, double amount, java.time.LocalDate issued) {
    // Compact canonical constructor for validation
    public Invoice {
        if (amount < 0) throw new IllegalArgumentException("amount must be >= 0");
    }
}
```

### Switch expression with pattern matching (JDK 21+)

```java
package com.example.shapes;

public sealed interface Shape permits Circle, Rect {}
public record Circle(double radius) implements Shape {}
public record Rect(double w, double h) implements Shape {}

class Areas {
    static double area(Shape s) {
        return switch (s) {
            case Circle c -> Math.PI * c.radius() * c.radius();
            case Rect r   -> r.w() * r.h();
            // no default needed — compiler knows this is exhaustive
        };
    }
}
```

### Stream API transformation

```java
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

class OrderReport {
    record Order(String customer, double total) {}

    static Map<String, Double> revenueByCustomer(List<Order> orders) {
        return orders.stream()
                .collect(Collectors.groupingBy(
                        Order::customer,
                        Collectors.summingDouble(Order::total)));
    }
}
```

### Optional as return type

```java
import java.util.Optional;

class UserRepository {
    // Good: Optional return signals "may be absent"
    Optional<String> findEmailById(long id) {
        String email = lookupEmail(id);
        return Optional.ofNullable(email);
    }

    private String lookupEmail(long id) { return null; /* stub */ }
}
```

## pitfalls

1. **`var` hides generic types** — `var map = Map.of("a", 1)` infers `Map<String, Integer>` which is fine, but `var result = someMethod()` can hide an unexpected raw type or wildcard. When in doubt, spell out the type.
2. **Records are shallowly immutable** — A record field of type `List<String>` still exposes a mutable list via its accessor. Wrap with `List.copyOf()` in the compact constructor.
3. **Text block trailing whitespace** — The closing `"""` position controls indentation stripping. Placing it on its own line flush-left strips all common leading whitespace; misaligning it produces surprising leading spaces.
4. **Switch expression requires exhaustiveness** — A switch expression on a non-sealed type or plain `int` still requires a `default` branch, even if you think all cases are covered.

## references

- https://docs.oracle.com/en/java/javase/21/language/records.html
- https://docs.oracle.com/en/java/javase/21/language/sealed-classes-and-interfaces.html
- https://docs.oracle.com/en/java/javase/21/language/pattern-matching.html
- https://docs.oracle.com/en/java/javase/21/language/switch-expressions.html
- https://docs.oracle.com/en/java/javase/21/core/creating-immutable-lists-sets-and-maps.html

## instructions

Use this expert when a developer asks about Java naming, style, code organization, or "how should I write this in Java." Pair with `patterns.md` for design-level guidance.

## research

Deep Research prompt:

"Write a micro expert on idiomatic modern Java (17+) style and conventions. Cover: naming conventions (camelCase methods/variables, PascalCase classes, UPPER_SNAKE constants), package organization, access modifiers (private-first), records (when to use, limitations), sealed classes/interfaces, Optional usage (return types only, never fields/parameters), var (local variable type inference, when appropriate), Stream API style (vs for loops), immutable collections (List.of, Map.of, Collections.unmodifiable), text blocks, switch expressions (arrow syntax, pattern matching), Javadoc conventions, try-with-resources, static factory methods over constructors, and import organization. Reference Oracle Java style guide, Effective Java (Bloch), and JDK 17+ documentation."
