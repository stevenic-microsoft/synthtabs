# pitfalls

## purpose

Non-obvious Java gotchas, surprising behavior, and common mistakes that trip up developers — including those moving to modern Java from older codebases.

## rules

1. Always use `.equals()` for value comparison; reserve `==` exclusively for primitives and `null` checks.
2. Never call `Optional.get()` without first confirming presence; prefer `orElse`, `orElseThrow`, `map`, or `ifPresent` instead.
3. Never modify a collection while iterating over it with a for-each loop; use `Iterator.remove()`, `removeIf`, or collect into a new list.
4. Always override `hashCode()` when you override `equals()`; violating this contract corrupts `HashMap` and `HashSet` behavior.
5. Prefer `java.time` (`LocalDate`, `Instant`, `ZonedDateTime`) over `Date` and `Calendar` — the legacy classes are mutable and error-prone.
6. Prefer unchecked exceptions (`IllegalArgumentException`, `IllegalStateException`) for programming errors; use checked exceptions only for recoverable conditions the caller must handle.
7. Never rely on autoboxing in performance-critical loops; use primitive types (`int`, `long`, `double`) directly.
8. Always handle `null` explicitly before unboxing a wrapper type to avoid a silent `NullPointerException`.
9. Treat `Stream.toList()` (JDK 16+) results as unmodifiable; do not attempt to add or remove elements.
10. Never use generic type information at runtime (`instanceof List<String>` does not compile) — generics are erased.

## patterns

### == vs .equals() with Strings

```java
class EqualityTrap {
    public static void main(String[] args) {
        String a = new String("hello");
        String b = new String("hello");

        System.out.println(a == b);       // false — different references
        System.out.println(a.equals(b));  // true  — same value

        // String literals ARE interned, so == works by accident:
        String c = "hello";
        String d = "hello";
        System.out.println(c == d);       // true — same interned reference (fragile!)
    }
}
```

### Null unboxing NullPointerException

```java
class UnboxingTrap {
    static Integer fetchCount() { return null; }

    public static void main(String[] args) {
        // DANGEROUS: unboxing null throws NPE
        // int count = fetchCount(); // NullPointerException!

        // SAFE: use Optional or explicit null check
        int count = java.util.Optional.ofNullable(fetchCount()).orElse(0);
        System.out.println(count); // 0
    }
}
```

### ConcurrentModificationException

```java
import java.util.ArrayList;
import java.util.List;

class ConcurrentModTrap {
    public static void main(String[] args) {
        var names = new ArrayList<>(List.of("Alice", "Bob", "Charlie"));

        // WRONG: modifying during for-each throws ConcurrentModificationException
        // for (String n : names) { if (n.startsWith("B")) names.remove(n); }

        // SAFE: use removeIf
        names.removeIf(n -> n.startsWith("B"));
        System.out.println(names); // [Alice, Charlie]
    }
}
```

### hashCode/equals contract violation

```java
import java.util.HashSet;

class HashCodeTrap {
    // BROKEN: overrides equals but not hashCode
    static class Key {
        final String name;
        Key(String name) { this.name = name; }

        @Override public boolean equals(Object o) {
            return o instanceof Key k && k.name.equals(this.name);
        }
        // Missing hashCode! HashMap and HashSet will fail to locate matching keys.
    }

    public static void main(String[] args) {
        var set = new HashSet<Key>();
        set.add(new Key("x"));
        System.out.println(set.contains(new Key("x"))); // false — broken!
        // FIX: add @Override public int hashCode() { return name.hashCode(); }
    }
}
```

## pitfalls

1. **Integer cache boundary** — `Integer.valueOf(127) == Integer.valueOf(127)` is `true`, but `Integer.valueOf(128) == Integer.valueOf(128)` is `false`. The JVM caches only -128 to 127. Always use `.equals()` for wrapper comparisons.
2. **`Optional.of(null)` throws immediately** — Use `Optional.ofNullable()` when the value might be null. `Optional.of()` is only safe when you are certain the value is non-null.
3. **Type erasure breaks overloading** — You cannot declare both `void process(List<String> items)` and `void process(List<Integer> items)` in the same class; after erasure both have the same signature `process(List)`.
4. **`Stream.toList()` vs `Collectors.toList()`** — `Stream.toList()` (JDK 16+) returns an unmodifiable list; `Collectors.toList()` returns a mutable `ArrayList`. Code that adds elements to a `toList()` result gets an `UnsupportedOperationException`.
5. **Checked exceptions in lambdas** — Functional interfaces like `Function` and `Consumer` do not declare checked exceptions. Wrapping them in try/catch inside the lambda is required, or use a helper that converts to unchecked.
6. **Serialization with records** — Records are serializable if they implement `Serializable`, but adding or removing components between versions breaks deserialization. Prefer explicit DTOs for wire formats.
7. **`finalize()` is deprecated** — Never override `finalize()` for cleanup. Use `try-with-resources` with `AutoCloseable` or `java.lang.ref.Cleaner` for release of native resources.

## references

- https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Object.html#equals(java.lang.Object)
- https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/Optional.html
- https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/stream/Stream.html#toList()
- https://docs.oracle.com/en/java/javase/21/language/generics.html
- https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/time/package-summary.html

## instructions

Use this expert when a developer reports unexpected Java behavior, asks "why doesn't this work?", or needs help debugging. Pair with `idioms.md` for the positive conventions.

## research

Deep Research prompt:

"Write a micro expert on Java pitfalls and gotchas. Cover: == vs .equals() (reference equality vs value equality, String interning), NullPointerException sources (Optional misuse, unboxing null), checked exception overuse (when to use unchecked), mutable Date/Calendar (use java.time instead), hashCode/equals contract (breaking HashMap), generic type erasure (runtime type loss, bridge methods, cannot instantiate T), autoboxing overhead (Integer cache -128 to 127, unboxing NPE), ConcurrentModificationException (iterating and modifying), raw types (List vs List<?>), finalize() misuse (use try-with-resources, Cleaner), stream terminal operations (streams are single-use), Optional.get() without isPresent(), synchronized on wrong object (Integer, String), varargs heap pollution, and record limitations (no mutable fields, no inheritance). Include safe alternative patterns for each."
