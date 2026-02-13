# java-router

## purpose

Route Java language questions to the right expert. Covers writing idiomatic modern Java — style, patterns, and pitfalls.

## task clusters

### Idioms & style
When: Java naming conventions, package organization, access modifiers, records, sealed classes, `Optional`, `var`, Javadoc, stream API style, immutable collections, text blocks, switch expressions
Read:
- `idioms.md`

### Design patterns & composition
When: builder pattern, factory methods, strategy, dependency injection (Spring, manual), record-based DTOs, sealed class hierarchies, stream pipelines, `CompletableFuture` composition, testing with JUnit/Mockito, `try-with-resources`
Read:
- `patterns.md`
Depends on: `idioms.md` (naming context)

### Gotchas & common mistakes
When: `==` vs `.equals()`, null reference errors, checked exception overuse, mutable date types, `hashCode`/`equals` contract, generic type erasure, autoboxing overhead, `ConcurrentModificationException`, raw types, `finalize()` misuse
Read:
- `pitfalls.md`

### Libraries & frameworks
When: Spring Boot, Quarkus, Micronaut, Hibernate, Jackson, Lombok,
  JUnit 5, Mockito, Kafka Client, gRPC-Java, or any Java framework/library question
→ Read `libraries/index.md`

### Composite: Full Java guidance
When: comprehensive Java review, new Java project setup, "teach me modern Java"
Read:
- `idioms.md`
- `patterns.md`
- `pitfalls.md`

## file inventory

`idioms.md` | `patterns.md` | `pitfalls.md` | `libraries/index.md`
