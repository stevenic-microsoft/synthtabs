# pitfalls

## purpose

Non-obvious Rust gotchas, surprising behavior, and common mistakes that trip up developers — including those coming from garbage-collected languages.

## rules

1. Never use `.unwrap()` or `.expect()` in library code — return `Result` and let the caller decide how to handle failure.
2. Never hold a `MutexGuard` (or any lock guard) across an `.await` point — this blocks the executor and can deadlock.
3. Always prefer borrowing (`&str`, `&[T]`) in function parameters over owned types (`String`, `Vec<T>`) unless the function must take ownership.
4. Never compare floats with `==`; use an epsilon check or the `approx` crate for approximate equality.
5. Always annotate integer literal types in generic contexts to avoid ambiguous type inference — write `0_u32` not just `0`.
6. Never rely on integer wrapping behavior in logic — use `checked_add`, `saturating_add`, or `wrapping_add` to make intent explicit.
7. Prefer `Arc<T>` over `Rc<T>` when there is any chance the value will cross a thread boundary — `Rc` is not `Send`.
8. Always use `Cow<'_, str>` when a function sometimes borrows and sometimes allocates, to avoid unnecessary cloning.
9. Never implement a foreign trait for a foreign type directly — use the newtype pattern to satisfy the orphan rule.

## patterns

### Avoiding lock-across-await with scoped guards

```rust
use std::sync::Mutex;

struct State {
    data: Mutex<Vec<String>>,
}

impl State {
    // WRONG: guard lives across await
    // async fn bad(&self) {
    //     let mut lock = self.data.lock().unwrap();
    //     lock.push(fetch().await);  // guard held across await!
    // }

    // CORRECT: clone data out, release lock, then await
    async fn good(&self, value: String) {
        {
            let mut lock = self.data.lock().unwrap();
            lock.push(value);
        } // lock dropped here, before any .await
    }
}
```

### Orphan rule workaround with newtype

```rust
use std::fmt;

// Cannot impl Display for Vec<T> directly (foreign trait + foreign type).
// Wrap it in a newtype.
pub struct CommaSeparated<T>(pub Vec<T>);

impl<T: fmt::Display> fmt::Display for CommaSeparated<T> {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let s: Vec<String> = self.0.iter().map(|v| v.to_string()).collect();
        write!(f, "{}", s.join(", "))
    }
}
```

## pitfalls

1. **Integer overflow panics in debug, wraps in release** -- `let x: u8 = 255; let y = x + 1;` panics in debug but silently produces `0` in release. Always use `checked_add` when overflow is possible.
2. **`clone()` hides ownership problems** -- sprinkling `.clone()` silences the borrow checker but introduces hidden allocations. Audit every `.clone()` to determine if a borrow or `Cow` would work.
3. **`String` and `&str` are not the only string types** -- `OsString`/`OsStr` for OS paths, `CString`/`CStr` for FFI. Converting between them can fail on non-UTF-8 data. Use `Path`/`PathBuf` for filesystem paths, not `String`.
4. **Self-referential structs do not compile** -- a struct that holds a reference to its own field cannot satisfy Rust's lifetime rules. Use `Pin<Box<T>>` with unsafe, or restructure to use indices or `Rc`.
5. **`impl Trait` in return position is a single concrete type** -- `fn foo(flag: bool) -> impl Display` cannot return `String` in one branch and `i32` in another. Use `Box<dyn Display>` for true polymorphic returns.
6. **Implicit `Deref` coercion makes `&String` behave like `&str`** -- this is usually helpful, but it means passing `&&String` can silently double-deref. If a function takes `&str`, pass the borrow explicitly to avoid confusion.
7. **`Eq` is not auto-derivable for `f64`** -- deriving `Eq` on a struct with `f64` fields will fail because `f64` only implements `PartialEq`. Use `ordered_float::OrderedFloat` if you need `Eq`/`Hash`.

## references

- https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html
- https://doc.rust-lang.org/nomicon/
- https://doc.rust-lang.org/std/sync/struct.Mutex.html
- https://rust-lang.github.io/rust-clippy/master/index.html
- https://doc.rust-lang.org/std/borrow/enum.Cow.html
- https://doc.rust-lang.org/reference/items/implementations.html#orphan-rules

## instructions

Use this expert when a developer reports unexpected Rust behavior, asks "why doesn't this compile?", or needs help with borrow checker errors. Pair with `idioms.md` for the positive conventions and `ownership.md` for ownership-specific patterns.

## research

Deep Research prompt:

"Write a micro expert on Rust pitfalls and gotchas. Cover: borrow checker fights (common patterns that trigger E0502/E0505, workarounds), lifetime annotation confusion (when elision fails, 'static misconceptions), clone() overuse (performance cost, when cloning is actually fine), unwrap()/expect() in production code (prefer ? operator), String vs &str (when to use each, ownership implications), Vec<T> vs &[T] (slice borrowing), Rc vs Arc (single-threaded vs multi-threaded, Rc is not Send), Send/Sync bounds (what they mean, common types that aren't Send), orphan rules (impl foreign trait for foreign type), deref coercion surprises (automatic &String to &str), integer overflow (debug panic vs release wrap), turbofish ambiguity (::<>), macro hygiene, and Pin<T> misunderstanding (when you actually need it). Include safe alternative patterns for each."
