# rust-router

## purpose

Route Rust language questions to the right expert. Covers writing idiomatic Rust — style, patterns, pitfalls, and ownership/borrowing.

## task clusters

### Idioms & style
When: Rust naming conventions (snake_case, CamelCase), module organization, `use` imports, `pub` visibility, `#[derive]`, enum-based modeling, `Result`/`Option` conventions, `clippy` lints, rustfmt, documentation comments (`///`)
Read:
- `idioms.md`

### Design patterns & composition
When: builder pattern, newtype pattern, typestate, trait objects vs generics, `From`/`Into` conversions, error handling (`thiserror`, `anyhow`), iterator chains, `impl Trait`, trait composition, testing patterns
Read:
- `patterns.md`
Depends on: `idioms.md` (naming context)

### Gotchas & common mistakes
When: borrow checker fights, lifetime annotation confusion, `clone()` overuse, `unwrap()` in production, `String` vs `&str`, `Vec` vs slice, `Rc` vs `Arc`, `Send`/`Sync` bounds, orphan rules, deref coercion surprises
Read:
- `pitfalls.md`

### Ownership, borrowing & lifetimes
When: ownership model, move semantics, borrowing rules, lifetime annotations, `'static`, lifetime elision, self-referential structs, `Pin`, `Box`, `Rc`, `Arc`, `Cell`, `RefCell`, interior mutability
Read:
- `ownership.md`
Depends on: `idioms.md` (base conventions)

### Libraries & crates
When: Actix-web, Axum, Tokio, Serde, Diesel, SQLx, Clap, Reqwest,
  Tonic, Bevy, Rocket, Warp, or any Rust crate/framework question
→ Read `libraries/index.md`

### Composite: Full Rust guidance
When: comprehensive Rust review, new Rust project setup, "teach me Rustacean code"
Read:
- `idioms.md`
- `patterns.md`
- `pitfalls.md`
- `ownership.md`

## file inventory

`idioms.md` | `ownership.md` | `patterns.md` | `pitfalls.md` | `libraries/index.md`
