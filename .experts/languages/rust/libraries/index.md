# rust-libraries-router

## purpose

Route Rust framework and library (crate) questions to project-specific experts. These experts cover opinionated frameworks, SDKs, and crates used in Rust projects — knowledge that goes beyond the core language and standard library.

## task clusters

<!-- No library experts yet. Run the analyzer to scan the codebase and recommend library experts to create. Common candidates: Actix-web, Axum, Tokio, Serde, Diesel, SQLx, Clap, Reqwest, Tonic (gRPC), Bevy. -->

## combining rule

If a request touches multiple library experts, load all that match. Let the more specific expert lead (e.g., Axum over Tokio for HTTP handler questions).

## ambiguity fallback

If signals match this domain but no library expert exists yet, suggest running the analyzer:

> "No Rust library experts exist yet. Want me to analyze the codebase and recommend library experts to create?"

## cross-domain note

Library experts pair with `../idioms.md` for Rust style, `../patterns.md` for design patterns, `../ownership.md` for ownership questions in library contexts, and `../../tools/prompt-engineer.md` when the crate is used for LLM prompt construction. If a question is purely about Rust language features, route to the parent language experts instead.

## file inventory

<!-- empty — populated by analyzer.md + builder.md -->
