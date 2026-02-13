# idioms

## purpose

Idiomatic Swift naming conventions, code organization, data modeling, and style decisions that follow Apple's API Design Guidelines.

## rules

1. Always name methods and functions for clarity at the point of use; read the call site aloud to verify it forms a grammatical English phrase.
2. Omit needless words that repeat type information already present in the signature (`func remove(_ member: Element)` not `func removeElement(_ member: Element)`).
3. Prefer `guard` for early exits and precondition checks; use `if let` only when both branches contain meaningful work.
4. Default to `struct` for new data types; use `class` only when you need reference identity, inheritance, or Objective-C interoperability.
5. Never force-unwrap (`!`) in production code; use `if let`, `guard let`, or nil coalescing (`??`) instead.
6. Keep the tightest access control possible: mark implementation details `private`, file-scoped helpers `fileprivate`, and only expose `public` API deliberately.
7. Organize type conformances and logical groups into separate `extension` blocks, one conformance per extension.
8. Always use trailing closure syntax when the last parameter is a closure, and use labeled closures when there are multiple closure parameters.
9. Prefer `@StateObject` for owning an observable object's lifecycle and `@ObservedObject` for receiving one from a parent; never swap them.
10. Write `///` documentation comments on every public symbol, including parameter and return descriptions.

## patterns

### Guard for early exit
```swift
func process(name: String?) -> String {
    guard let name, !name.isEmpty else {
        return "unknown"
    }
    return name.uppercased()
}
```

### Enum with associated values for state modeling
```swift
enum LoadingState<T> {
    case idle
    case loading
    case loaded(T)
    case failed(Error)
}

struct ContentView: View {
    @State private var state: LoadingState<[String]> = .idle

    var body: some View {
        switch state {
        case .idle:            Text("Tap to load")
        case .loading:         ProgressView()
        case .loaded(let items): List(items, id: \.self) { Text($0) }
        case .failed(let err): Text(err.localizedDescription)
        }
    }
}
```

### Extensions for conformance organization
```swift
struct User {
    let id: UUID
    var name: String
    var email: String
}

extension User: Codable {}

extension User: CustomStringConvertible {
    var description: String { "\(name) <\(email)>" }
}
```

### SwiftUI property wrappers
```swift
import SwiftUI

struct ParentView: View {
    @StateObject private var viewModel = ItemViewModel()

    var body: some View {
        ChildView(items: $viewModel.items)
            .environment(\.refresh, viewModel.refresh)
    }
}

struct ChildView: View {
    @Binding var items: [String]
    @Environment(\.refresh) private var refresh
}
```

## pitfalls

1. Using `@ObservedObject` to create an instance causes it to be re-created on every view re-evaluation; use `@StateObject` for owned instances.
2. Omitting `guard` in favor of deeply nested `if let` chains makes error paths invisible and control flow hard to follow.
3. Marking everything `public` or `open` by default leaks implementation details and prevents future refactoring without API breaks.
4. Using `class` when a `struct` would suffice introduces unintended shared mutable state across call sites.

## references

- https://www.swift.org/documentation/api-design-guidelines/
- https://docs.swift.org/swift-book/documentation/the-swift-programming-language/
- https://developer.apple.com/documentation/swiftui/managing-model-data-in-your-app

## instructions

Use this expert when a developer asks about Swift naming, style, code organization, or "how should I write this in Swift." Pair with `patterns.md` for design-level guidance and `protocols.md` for protocol-oriented programming.

## research

Deep Research prompt:

"Write a micro expert on idiomatic Swift style and conventions. Cover: API Design Guidelines naming (clarity at the point of use, camelCase, omit needless words, fluent usage), guard vs if let (early return preference), value types vs reference types (struct default, class for identity/inheritance), optionals (Optional binding, nil coalescing, optional chaining, never force-unwrap in production), enum with associated values (state modeling), access control (public/internal/fileprivate/private, default internal), documentation comments (/// and /** */), Swift formatting conventions, Result type usage, Codable (Encodable/Decodable), property wrappers, @MainActor, import organization, and type inference (when to annotate, when to infer). Reference Swift API Design Guidelines, The Swift Programming Language book, and Apple developer documentation."
