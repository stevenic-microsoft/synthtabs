# patterns

## purpose

Design patterns, composition strategies, and architectural idioms for modern Java — builder pattern, sealed hierarchies, stream pipelines, and testing patterns.

## rules

1. Prefer static factory methods (`of`, `from`, `create`) over public constructors to control instance creation and improve readability.
2. Always use constructor injection for dependencies; never use field injection — it breaks testability and hides requirements.
3. Use the builder pattern when a constructor would take more than three parameters or has multiple optional fields.
4. Model algebraic data types with sealed interfaces and records; use exhaustive switch expressions to eliminate the visitor pattern.
5. Prefer `CompletableFuture.thenCompose` over `thenApply` when the mapping function itself returns a `CompletableFuture`, to avoid nested futures.
6. Always attach `exceptionally` or `handle` to `CompletableFuture` chains; unhandled async exceptions silently disappear.
7. Favor `Collectors.toUnmodifiableList()` or `Stream.toList()` over `Collectors.toList()` to enforce immutability of pipeline results.
8. Write JUnit 5 tests with `@Nested` classes to group related scenarios and `@DisplayName` for human-readable output.
9. Use Mockito `verify` sparingly — assert on outcomes, not on internal call sequences.
10. Design repository interfaces around domain operations, not CRUD; keep persistence details out of the interface contract.

## patterns

### Builder pattern (inner static class)

```java
package com.example.config;

public final class ServerConfig {
    private final String host;
    private final int port;
    private final boolean useTls;

    private ServerConfig(Builder b) {
        this.host = b.host;
        this.port = b.port;
        this.useTls = b.useTls;
    }

    public static Builder builder() { return new Builder(); }

    public static final class Builder {
        private String host = "localhost";
        private int port = 8080;
        private boolean useTls = false;

        public Builder host(String host) { this.host = host; return this; }
        public Builder port(int port)    { this.port = port; return this; }
        public Builder useTls(boolean v) { this.useTls = v;  return this; }
        public ServerConfig build()      { return new ServerConfig(this); }
    }
}
```

### Sealed hierarchy as algebraic data type

```java
package com.example.expr;

public sealed interface Expr permits Literal, Add, Mul {}
public record Literal(double value) implements Expr {}
public record Add(Expr left, Expr right) implements Expr {}
public record Mul(Expr left, Expr right) implements Expr {}

class Evaluator {
    static double eval(Expr e) {
        return switch (e) {
            case Literal l -> l.value();
            case Add a     -> eval(a.left()) + eval(a.right());
            case Mul m     -> eval(m.left()) * eval(m.right());
        };
    }
}
```

### CompletableFuture composition

```java
import java.util.concurrent.CompletableFuture;

class OrderService {
    CompletableFuture<String> placeOrder(long userId) {
        return fetchUser(userId)
                .thenCompose(user -> validateCredit(user))
                .thenApply(user -> createOrder(user))
                .exceptionally(ex -> "FAILED: " + ex.getMessage());
    }

    private CompletableFuture<String> fetchUser(long id)        { return CompletableFuture.completedFuture("user-" + id); }
    private CompletableFuture<String> validateCredit(String u)  { return CompletableFuture.completedFuture(u); }
    private String createOrder(String user)                     { return "order-for-" + user; }
}
```

### Strategy pattern with functional interfaces

```java
import java.util.function.UnaryOperator;

class TextProcessor {
    private final UnaryOperator<String> strategy;

    TextProcessor(UnaryOperator<String> strategy) { this.strategy = strategy; }

    String process(String input) { return strategy.apply(input); }

    public static void main(String[] args) {
        var upper = new TextProcessor(String::toUpperCase);
        var trimmed = new TextProcessor(String::trim);
        System.out.println(upper.process("hello"));    // HELLO
        System.out.println(trimmed.process("  hi  "));  // hi
    }
}
```

### JUnit 5 + Mockito test

```java
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

class OrderServiceTest {

    @Nested @DisplayName("placeOrder")
    class PlaceOrder {
        @Test @DisplayName("returns order id for valid user")
        void happyPath() {
            var repo = mock(UserRepository.class);
            when(repo.findById(1L)).thenReturn(java.util.Optional.of("Alice"));
            // ... assert on result
            assertThat("order-Alice").startsWith("order-");
        }

        @Test @DisplayName("throws when user not found")
        void missingUser() {
            var repo = mock(UserRepository.class);
            when(repo.findById(99L)).thenReturn(java.util.Optional.empty());
            assertThatThrownBy(() -> repo.findById(99L).orElseThrow())
                    .isInstanceOf(java.util.NoSuchElementException.class);
        }
    }

    interface UserRepository { java.util.Optional<String> findById(long id); }
}
```

## pitfalls

1. **Lombok `@Builder` on mutable classes** — Lombok generates a builder but does not make the target class immutable. Combine `@Builder` with `@Value` (not `@Data`) to get both a builder and immutability.
2. **`CompletableFuture.allOf` returns `Void`** — You still need to call `.join()` on each individual future to collect results after `allOf` completes.
3. **Mockito `when/then` on final classes** — Mockito cannot mock final classes by default. Add `org.mockito.extensions/MockitoExtension` or use `mockito-inline` to enable it.

## references

- https://docs.oracle.com/en/java/javase/21/language/sealed-classes-and-interfaces.html
- https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/CompletableFuture.html
- https://junit.org/junit5/docs/current/user-guide/
- https://site.mockito.org/
- https://projectlombok.org/features/Builder

## instructions

Use this expert for design-level Java questions: how to structure code, which patterns to apply, and how to compose functionality. Pair with `idioms.md` for naming/style.

## research

Deep Research prompt:

"Write a micro expert on modern Java (17+) design patterns and composition. Cover: builder pattern (manual, Lombok @Builder, record-based builders), factory methods (static factory, EnumMap-based), strategy pattern (functional interfaces, method references), dependency injection (Spring @Autowired, manual constructor injection), record-based DTOs (vs POJOs, when to use), sealed class hierarchies (exhaustive switch, visitor pattern replacement), stream pipelines (collectors, groupingBy, partitioning, flatMap, reduce), CompletableFuture composition (thenApply, thenCompose, allOf, exceptionally), try-with-resources (AutoCloseable, custom resources), testing with JUnit 5 (parameterized tests, nested tests, extensions) and Mockito (when/then, verify, argument captors), and the Optional pipeline pattern. Include self-contained code patterns for each."
