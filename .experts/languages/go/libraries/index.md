# go-libraries-router

## purpose

Route Go framework and library questions to project-specific experts. These experts cover opinionated frameworks, SDKs, and libraries used in Go projects — knowledge that goes beyond the core language and standard library.

## task clusters

<!-- No library experts yet. Run the analyzer to scan the codebase and recommend library experts to create. Common candidates: Gin, Echo, Chi, GORM, sqlx, cobra, viper, gRPC-Go, Terraform SDK, Kubernetes client-go. -->

## combining rule

If a request touches multiple library experts, load all that match. Let the more specific expert lead.

## ambiguity fallback

If signals match this domain but no library expert exists yet, suggest running the analyzer:

> "No Go library experts exist yet. Want me to analyze the codebase and recommend library experts to create?"

## cross-domain note

Library experts pair with `../idioms.md` for Go style, `../patterns.md` for design patterns, and `../../tools/prompt-engineer.md` when the library is used for LLM prompt construction. If a question is purely about Go language features, route to the parent language experts instead.

## file inventory

<!-- empty — populated by analyzer.md + builder.md -->
