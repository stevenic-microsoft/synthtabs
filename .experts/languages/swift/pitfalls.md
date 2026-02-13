# pitfalls

## purpose

Non-obvious Swift gotchas, surprising behavior, and common mistakes that trip up developers — including those coming from Objective-C or other languages.

## rules

1. Always capture `[weak self]` in escaping closures stored by long-lived objects; use `guard let self` at the top of the closure body.
2. Never force-unwrap (`!`) outside of tests or `fatalError`-guarded programmer errors; use `if let`, `guard let`, or `??` instead.
3. Always verify that all stored properties participate in synthesized `Equatable`/`Hashable`; add explicit conformance when a property is excluded or a class is involved.
4. Never assume actor-isolated state is unchanged after an `await`; re-check preconditions after every suspension point.
5. Mark all types shared across concurrency domains as `Sendable`; use `@unchecked Sendable` only with an internal lock protecting mutable state.
6. Always dispatch UI updates on `@MainActor`; never rely on implicit main-thread inheritance from a non-isolated context.
7. Never mutate a captured `struct` value inside an `@escaping` closure; copy it to a local `var` or switch to a reference type.
8. Prefer `weak` over `unowned` unless you can prove the referenced object always outlives the closure; `unowned` crashes on access after deallocation.
9. Avoid subscripting `String` with `Int` ranges; use `String.Index`-based APIs or convert to `Array<Character>` when random access is needed.

## patterns

### Weak self capture to break retain cycle
```swift
import Foundation

class DataLoader {
    var onComplete: (() -> Void)?

    func start() {
        // BAD: strong capture creates retain cycle
        // onComplete = { self.finish() }

        // GOOD: weak capture breaks the cycle
        onComplete = { [weak self] in
            guard let self else { return }
            self.finish()
        }
    }

    func finish() { }
}
```

### Safe unwrapping instead of force-unwrap
```swift
// BAD: crashes at runtime if nil
// let name: String = optionalName!

// GOOD: guard let with early exit
func greet(_ optionalName: String?) -> String {
    guard let name = optionalName else {
        return "Hello, stranger"
    }
    return "Hello, \(name)"
}
```

### Actor reentrancy: re-check state after await
```swift
actor BankAccount {
    private var balance: Int = 100

    func withdraw(_ amount: Int) async throws {
        guard balance >= amount else { throw BankError.insufficientFunds }

        // Suspension point -- another caller may withdraw concurrently
        let approved = await authService.approve(amount)

        // Re-check: balance may have changed during await
        guard approved, balance >= amount else {
            throw BankError.insufficientFunds
        }
        balance -= amount
    }
}
```

## pitfalls

1. **Retain cycles in closures.** A closure stored as a property on `self` that also captures `self` creates a cycle. Neither object is deallocated. Fix: capture `[weak self]` or `[unowned self]`.

2. **Optional chaining returns Optional.** `user?.address?.city` returns `String?` even if `city` is non-optional. Chaining multiple levels produces a single-level `Optional`, but assigning it without unwrapping hides nil propagation.

3. **Synthesized Hashable ignores class inheritance.** A subclass inherits the superclass's synthesized `Hashable` implementation and does not add its own properties. Two objects that differ only in subclass fields appear equal. Fix: implement `hash(into:)` manually.

4. **Struct mutation inside escaping closures.** An `@escaping` closure captures a struct by immutable copy. Attempting `self.count += 1` inside it produces a compiler error. This is confusing when refactoring from a synchronous to an asynchronous context.

5. **`@MainActor` does not propagate to nested closures automatically.** A closure inside a `@MainActor` function is not itself main-actor-isolated unless explicitly annotated or the closure type requires it. UI updates inside such closures may silently run off the main thread.

6. **`unowned` crashes without warning.** Unlike `weak` (which nils out safely), `unowned` triggers an immediate runtime crash if the object is already deallocated. Use it only when lifetime is strictly guaranteed by design.

7. **Copy-on-write is not free.** Swift's built-in collections use COW, but custom large structs do not automatically get COW. Passing a 10-property struct through many layers copies all fields on every mutation. Use a class-backed storage with `isKnownUniquelyReferenced` for large value types.

8. **`AnyObject` vs `Any`.** `AnyObject` is class-only; `Any` includes structs and enums. Accidentally using `Any` where `AnyObject` is needed bypasses reference-type constraints, and using `AnyObject` where `Any` is needed excludes value types from collections.

## references

- https://docs.swift.org/swift-book/documentation/the-swift-programming-language/automaticreferencecounting/
- https://docs.swift.org/swift-book/documentation/the-swift-programming-language/concurrency/
- https://developer.apple.com/documentation/swift/sendable
- https://docs.swift.org/swift-book/documentation/the-swift-programming-language/stringsandcharacters/

## instructions

Use this expert when a developer reports unexpected Swift behavior, asks "why doesn't this work?", or needs help debugging. Pair with `idioms.md` for the positive conventions and `protocols.md` for protocol-specific gotchas.

## research

Deep Research prompt:

"Write a micro expert on Swift pitfalls and gotchas. Cover: retain cycles (strong reference cycles in closures, delegate pattern, [weak self] vs [unowned self]), optional force-unwrap crashes (! operator, implicitly unwrapped optionals), struct mutation in closures (cannot mutate captured value type), Equatable/Hashable pitfalls (synthesized conformance with class inheritance), AnyObject vs Any (type erasure confusion), value type copying overhead (large structs, copy-on-write), @escaping confusion (closure lifetime, capturing semantics), Sendable violations (data races with non-Sendable types), actor reentrancy (await suspension points allow interleaving), protocol witness table dispatch vs static dispatch (performance), optional chaining returns Optional (nested optionals), String is not Random Access (Character-based indexing), and defer execution order (LIFO). Include safe alternative patterns for each."
