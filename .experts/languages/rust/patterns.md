# patterns

## purpose

Design patterns, composition strategies, and architectural idioms for Rust — builder pattern, newtype, trait composition, error handling, and testing patterns.

## rules

1. Prefer the newtype pattern over raw type aliases when you need distinct semantics for the same underlying type.
2. Always use `thiserror` for library error types and `anyhow` for application-level error handling — never mix them in the same crate.
3. Prefer generics (`impl Trait` / `<T: Trait>`) for hot paths; use trait objects (`dyn Trait`) only when you need heterogeneous collections or dynamic dispatch.
4. Always implement `Drop` for RAII types that own external resources (file handles, network connections, locks).
5. Prefer closures over trait objects for the strategy pattern when there is a single method and no shared state.
6. Always put unit tests in a `#[cfg(test)] mod tests` block inside the same file as the code under test.
7. Never expose `RefCell` or `Cell` in a public API — wrap interior mutability behind a safe method interface.
8. Prefer `Arc<T>` over `Rc<T>` only when the value must cross thread boundaries — `Rc` has lower overhead for single-threaded use.
9. Always use typed-state builders when invalid intermediate states must be a compile-time error, not a runtime one.

## patterns

### Newtype for type safety

```rust
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct UserId(u64);

impl UserId {
    pub fn new(id: u64) -> Self {
        Self(id)
    }
    pub fn inner(&self) -> u64 {
        self.0
    }
}

// Prevents accidentally passing an OrderId where a UserId is expected
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct OrderId(u64);
```

### Typestate builder (compile-time state machine)

```rust
pub struct NoHost;
pub struct HasHost(String);

pub struct ServerBuilder<H> {
    host: H,
    port: u16,
}

impl ServerBuilder<NoHost> {
    pub fn new() -> Self {
        Self { host: NoHost, port: 8080 }
    }
    pub fn host(self, h: impl Into<String>) -> ServerBuilder<HasHost> {
        ServerBuilder { host: HasHost(h.into()), port: self.port }
    }
}

impl ServerBuilder<HasHost> {
    pub fn port(mut self, p: u16) -> Self {
        self.port = p;
        self
    }
    pub fn build(self) -> String {
        format!("{}:{}", self.host.0, self.port)
    }
}

// ServerBuilder::new().build()          -- compile error: no `build` on NoHost
// ServerBuilder::new().host("x").build() -- OK
```

### Error handling: thiserror for libraries

```rust
use std::num::ParseIntError;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum ParseError {
    #[error("missing field: {0}")]
    MissingField(&'static str),
    #[error("bad integer: {0}")]
    InvalidInt(#[from] ParseIntError),
}

pub fn parse_age(input: &str) -> Result<u8, ParseError> {
    if input.is_empty() {
        return Err(ParseError::MissingField("age"));
    }
    let age: u8 = input.parse()?;
    Ok(age)
}
```

### Testing pattern with module and helper

```rust
pub fn add(a: i32, b: i32) -> i32 {
    a + b
}

#[cfg(test)]
mod tests {
    use super::*;

    fn fixture_pair() -> (i32, i32) {
        (2, 3)
    }

    #[test]
    fn test_add_positive() {
        let (a, b) = fixture_pair();
        assert_eq!(add(a, b), 5);
    }

    #[test]
    fn test_add_negative() {
        assert_eq!(add(-1, -1), -2);
    }
}
```

## pitfalls

1. **Trait objects require object safety** -- a trait with generic methods or methods returning `Self` cannot be used as `dyn Trait`. Extract the generic into an associated type or use an enum instead.
2. **`Rc<RefCell<T>>` is not `Send`** -- wrapping interior mutability in `Rc` silently prevents moving the value across threads. Use `Arc<Mutex<T>>` for concurrent access.
3. **Builder `.build()` returning `Result` hides type-state violations at runtime** -- if you can encode required fields in the type system, prefer a typestate builder so the compiler catches missing fields.
4. **`Box<dyn Trait>` does not auto-implement the trait** -- you cannot pass a `Box<dyn Read>` to a function expecting `impl Read` without an explicit blanket impl or deref pattern.

## references

- https://doc.rust-lang.org/book/ch17-02-trait-objects.html
- https://rust-unofficial.github.io/patterns/
- https://docs.rs/thiserror/latest/thiserror/
- https://docs.rs/anyhow/latest/anyhow/
- https://doc.rust-lang.org/std/cell/index.html
- https://doc.rust-lang.org/book/ch15-00-smart-pointers.html

## instructions

Use this expert for design-level Rust questions: how to structure code, which patterns to apply, and how to compose functionality. Pair with `idioms.md` for naming/style and `ownership.md` for ownership/borrowing patterns.

## research

Deep Research prompt:

"Write a micro expert on Rust design patterns and composition. Cover: builder pattern (consuming vs borrowing, derive_builder), newtype pattern (wrapper types for type safety), typestate pattern (encoding state in the type system), trait objects vs generics (dyn Trait vs impl Trait, when to use each), From/Into conversions (implementing From for error types), error handling (thiserror for library errors, anyhow for application errors, custom error enums, ? operator chaining), iterator chains and combinators (map/filter/flat_map/collect, custom iterators), impl Trait in argument and return position, trait composition (supertraits, blanket implementations), testing patterns (#[test], #[cfg(test)], test modules, assert macros, proptest/quickcheck), and the Deref/AsRef patterns. Include self-contained code patterns for each."
