# idioms

## purpose

Idiomatic Rust naming conventions, module organization, error handling style, and code patterns that align with the Rust community's established conventions.

## rules

1. Always use `snake_case` for functions, methods, variables, and modules; `CamelCase` for types, traits, and enum variants; `SCREAMING_SNAKE_CASE` for constants and statics.
2. Always run `cargo clippy` before committing and resolve all warnings — treat clippy as the style authority.
3. Prefer iterator chains (`.map()`, `.filter()`, `.collect()`) over imperative `for` loops when transforming data.
4. Always use the `?` operator for error propagation instead of manual `match` on `Result`/`Option`.
5. Prefer `if let` or `matches!` for single-variant pattern checks instead of a full `match` block.
6. Always derive `Debug` on public types; derive `Clone`, `PartialEq`, and `Default` where semantically correct.
7. Never use `use super::*` or `use crate::*` — import specific items to keep dependencies explicit.
8. Always write doc comments (`///`) on every public function, struct, enum, and trait with a single-sentence summary line.
9. Prefer `impl From<SourceType> for TargetType` over ad-hoc conversion methods to enable `.into()` ergonomics.
10. Always implement `Display` for error types and user-facing types instead of relying solely on `Debug` output.

## patterns

### Error handling with thiserror and the ? operator

```rust
use std::io;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("IO failure: {0}")]
    Io(#[from] io::Error),
    #[error("invalid config key: {key}")]
    BadConfig { key: String },
}

fn load_config(path: &str) -> Result<String, AppError> {
    let content = std::fs::read_to_string(path)?; // auto-converts io::Error
    if content.is_empty() {
        return Err(AppError::BadConfig { key: path.into() });
    }
    Ok(content)
}
```

### Iterator chains instead of for loops

```rust
fn active_usernames(users: &[(String, bool)]) -> Vec<String> {
    users
        .iter()
        .filter(|(_, active)| *active)
        .map(|(name, _)| name.to_uppercase())
        .collect()
}
```

### Builder pattern with Default

```rust
#[derive(Debug, Clone, Default)]
pub struct ServerConfig {
    pub host: String,
    pub port: u16,
    pub max_connections: usize,
}

impl ServerConfig {
    pub fn host(mut self, host: impl Into<String>) -> Self {
        self.host = host.into();
        self
    }
    pub fn port(mut self, port: u16) -> Self {
        self.port = port;
        self
    }
    pub fn max_connections(mut self, n: usize) -> Self {
        self.max_connections = n;
        self
    }
}

// Usage: ServerConfig::default().host("0.0.0.0").port(8080)
```

## pitfalls

1. **`to_string()` on `&str` allocates** -- use `String::from()` or `.into()` for clarity; avoid repeated `to_string()` in hot paths when you can borrow instead.
2. **`collect()` without a turbofish or type annotation won't compile** -- the compiler cannot infer the target collection. Write `collect::<Vec<_>>()` or annotate the binding.
3. **Deriving `PartialEq` on types containing `f64`** will compile but `NaN != NaN` semantics can cause silent logic bugs in comparisons and hash maps.
4. **`matches!` returns `bool`, not `Option`** -- do not chain `.unwrap()` on it; use `if let` when you need to extract a value.

## references

- https://doc.rust-lang.org/book/
- https://rust-lang.github.io/api-guidelines/
- https://doc.rust-lang.org/clippy/
- https://doc.rust-lang.org/std/fmt/trait.Display.html
- https://docs.rs/thiserror/latest/thiserror/
- https://docs.rs/anyhow/latest/anyhow/

## instructions

Use this expert when a developer asks about Rust naming, style, code organization, or "how should I write this in Rust." Pair with `patterns.md` for design-level guidance and `ownership.md` for ownership/borrowing patterns.

## research

Deep Research prompt:

"Write a micro expert on idiomatic Rust style and conventions. Cover: naming conventions (snake_case functions/variables, CamelCase types/traits, SCREAMING_SNAKE constants), module organization (mod.rs vs file-per-module, pub/pub(crate)/pub(super) visibility), use/import organization, #[derive] usage (Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize), enum-based data modeling (Option, Result, custom enums with data), error handling (? operator, From/Into for error conversion, thiserror for libraries, anyhow for applications), iterator chains (.map/.filter/.collect), pattern matching (match, if let, while let), documentation comments (/// and //!), clippy lint compliance, rustfmt, and cfg attributes. Reference The Rust Programming Language book, Rust API Guidelines, and clippy documentation."
