# java-libraries-router

## purpose

Route Java framework and library questions to project-specific experts. These experts cover opinionated frameworks, SDKs, and libraries used in Java projects — knowledge that goes beyond the core language.

## task clusters

<!-- No library experts yet. Run the analyzer to scan the codebase and recommend library experts to create. Common candidates: Spring Boot, Quarkus, Micronaut, Hibernate, Jackson, Lombok, JUnit 5, Mockito, Kafka Client, gRPC-Java. -->

## combining rule

If a request touches multiple library experts, load all that match. Let the more specific expert lead (e.g., Spring Boot over Spring Core for auto-configuration questions).

## ambiguity fallback

If signals match this domain but no library expert exists yet, suggest running the analyzer:

> "No Java library experts exist yet. Want me to analyze the codebase and recommend library experts to create?"

## cross-domain note

Library experts pair with `../idioms.md` for Java style, `../patterns.md` for design patterns, and `../../tools/prompt-engineer.md` when the library is used for LLM prompt construction. If a question is purely about Java language features, route to the parent language experts instead.

## file inventory

<!-- empty — populated by analyzer.md + builder.md -->
