# ownership

## purpose

Rust ownership model, borrowing rules, lifetimes, and smart pointer patterns — the core concepts that make Rust unique.

## rules

1. Always remember the three ownership rules: each value has exactly one owner, there is only one owner at a time, and the value is dropped when its owner goes out of scope.
2. Never hold a mutable borrow (`&mut T`) and a shared borrow (`&T`) to the same value simultaneously — the compiler enforces exclusivity.
3. Prefer borrowing (`&T`) in function parameters over taking ownership unless the function needs to store or consume the value.
4. Always add explicit lifetime annotations when the compiler's three elision rules are insufficient — do not fight the compiler with `'static` as a workaround.
5. Use `Box<T>` for heap allocation of single values, recursive types, and owned trait objects — not for general-purpose indirection.
6. Use `Rc<T>` for shared ownership within a single thread and `Arc<T>` when shared ownership must cross thread boundaries.
7. Always pair `Rc`/`Arc` cycles with `Weak<T>` to prevent memory leaks from reference cycles.
8. Never use `RefCell<T>` as a way to bypass the borrow checker everywhere — restrict interior mutability to the smallest possible scope behind a safe API.
9. Prefer `Copy` types (integers, bools, small structs of `Copy` fields) over `Clone` when the type is trivially copyable — derive `Copy` alongside `Clone`.
10. Always use the `move` keyword on closures that must own captured variables, especially when sending closures across threads.

## patterns

### Borrowing: shared vs exclusive

```rust
fn print_len(data: &[i32]) {
    // Shared borrow: can read, cannot mutate
    println!("length = {}", data.len());
}

fn push_value(data: &mut Vec<i32>, val: i32) {
    // Exclusive borrow: can mutate, no other borrows allowed
    data.push(val);
}

fn main() {
    let mut nums = vec![1, 2, 3];
    print_len(&nums);         // shared borrow
    push_value(&mut nums, 4); // exclusive borrow
    print_len(&nums);         // shared borrow again — previous &mut is gone
}
```

### Lifetime annotations on structs

```rust
#[derive(Debug)]
struct Excerpt<'a> {
    text: &'a str,
}

impl<'a> Excerpt<'a> {
    fn new(source: &'a str) -> Self {
        Self { text: source }
    }
}

fn main() {
    let novel = String::from("Call me Ishmael. Some years ago...");
    let first_sentence = novel.split('.').next().unwrap();
    let excerpt = Excerpt::new(first_sentence);
    println!("{:?}", excerpt); // excerpt cannot outlive `novel`
}
```

### Smart pointers: Rc and Weak for shared ownership

```rust
use std::cell::RefCell;
use std::rc::{Rc, Weak};

#[derive(Debug)]
struct Node {
    value: i32,
    children: RefCell<Vec<Rc<Node>>>,
    parent: RefCell<Weak<Node>>,
}

fn main() {
    let root = Rc::new(Node {
        value: 0,
        children: RefCell::new(vec![]),
        parent: RefCell::new(Weak::new()),
    });

    let child = Rc::new(Node {
        value: 1,
        children: RefCell::new(vec![]),
        parent: RefCell::new(Rc::downgrade(&root)), // Weak avoids cycle
    });

    root.children.borrow_mut().push(Rc::clone(&child));
}
```

### Move semantics in closures

```rust
use std::thread;

fn main() {
    let name = String::from("worker-1");

    // `move` transfers ownership of `name` into the closure
    let handle = thread::spawn(move || {
        println!("Hello from {name}");
    });

    // `name` is no longer accessible here — it was moved
    handle.join().unwrap();
}
```

## pitfalls

1. **Returning a reference to a local variable is a compile error** -- the value is dropped at the end of the function, so any reference to it would dangle. Return an owned type instead.
2. **`'static` does not mean "lives forever at runtime"** -- it means the reference *could* live for the entire program. Owned types like `String` satisfy `'static` bounds because they carry no borrowed data.
3. **`Rc::clone` is cheap (reference count bump), but cloning the inner `T` is not** -- use `Rc::clone(&x)` style to make it clear you are cloning the pointer, not the data.
4. **Multiple `&mut` borrows of different struct fields are allowed, but not through methods** -- the compiler sees `self` as a single borrow. Split the struct or use helper methods that borrow individual fields.

## references

- https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html
- https://doc.rust-lang.org/book/ch10-03-lifetime-syntax.html
- https://doc.rust-lang.org/book/ch15-00-smart-pointers.html
- https://doc.rust-lang.org/nomicon/ownership.html
- https://doc.rust-lang.org/std/cell/index.html
- https://doc.rust-lang.org/std/rc/struct.Rc.html
- https://doc.rust-lang.org/std/sync/struct.Arc.html

## instructions

Use this expert when a developer asks about ownership, borrowing, lifetimes, or smart pointers in Rust. Pair with `idioms.md` for base conventions and `pitfalls.md` for common ownership mistakes.

## research

Deep Research prompt:

"Write a micro expert on Rust ownership, borrowing, and lifetimes. Cover: ownership rules (each value has one owner, drop when owner goes out of scope), move semantics (vs copy for Copy types, when moves happen), borrowing rules (one mutable OR any number of immutable, no dangling references), lifetime annotations ('a syntax, function signatures, struct lifetimes), lifetime elision rules (three rules the compiler applies), 'static lifetime (string literals, owned data, misconceptions), self-referential structs (why they're hard, Pin as solution), Box<T> (heap allocation, recursive types, trait objects), Rc<T>/Arc<T> (shared ownership, Weak<T> for cycles, Arc for concurrency), Cell<T>/RefCell<T> (interior mutability, runtime borrow checking), Pin<T>/Unpin (preventing moves, async/Future, self-referential), Cow<T> (clone-on-write, avoiding unnecessary allocation), and common patterns for satisfying the borrow checker. Include self-contained code patterns for each."
