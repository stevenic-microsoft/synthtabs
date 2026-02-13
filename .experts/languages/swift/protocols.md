# protocols

## purpose

Swift protocol-oriented programming — protocol composition, associated types, existential types, opaque types, and protocol extensions.

## rules

1. Prefer protocol composition (`Protocol1 & Protocol2`) over creating a combined protocol when the combination is used in only one or two places.
2. Use `some Protocol` (opaque type) for return types to hide concrete types while preserving generic performance and type identity.
3. Use `any Protocol` (existential) only when you need heterogeneous collections or runtime polymorphism; accept the boxing overhead consciously.
4. Always constrain associated types with `where` clauses to make generic code as specific as possible.
5. Provide default implementations in protocol extensions for methods that have a single sensible behavior; keep requirements minimal.
6. Never add a default implementation for a requirement that conformers are expected to customize -- it silently hides missing conformances.
7. Use conditional conformance (`extension Array: MyProtocol where Element: MyProtocol`) to propagate capability through generic containers.
8. Avoid protocols with `Self` or associated type requirements as existential types; prefer generics or opaque types for those cases.
9. Prefer primary associated types (Swift 5.7+) to simplify constrained existentials: `any Collection<Int>` instead of manual type erasure.
10. Keep protocol inheritance hierarchies shallow (two levels maximum) to avoid combinatorial conformance burdens.

## patterns

### Protocol composition for ad-hoc constraints
```swift
protocol Identifiable { var id: String { get } }
protocol Displayable { var displayName: String { get } }

func show(item: some Identifiable & Displayable) {
    print("\(item.id): \(item.displayName)")
}
```

### Associated type with where clause
```swift
protocol Repository {
    associatedtype Item: Codable & Identifiable

    func fetch(id: String) async throws -> Item
    func save(_ item: Item) async throws
}

struct UserRepo: Repository {
    typealias Item = User

    func fetch(id: String) async throws -> User { /* ... */ fatalError() }
    func save(_ user: User) async throws { /* ... */ }
}
```

### Opaque return type (some) vs existential (any)
```swift
// Opaque: caller gets a fixed concrete type, compiler optimizes
func makeSequence() -> some Sequence<Int> {
    [1, 2, 3]
}

// Existential: heterogeneous collection, boxed at runtime
func allShapes() -> [any Shape] {
    [Circle(radius: 1), Square(side: 2)]
}
```

### Conditional conformance
```swift
protocol Summable { var total: Int { get } }

extension Array: Summable where Element: Summable {
    var total: Int { reduce(0) { $0 + $1.total } }
}

struct Score: Summable { let total: Int }

let scores = [Score(total: 10), Score(total: 20)]
print(scores.total) // 30
```

### Type erasure with primary associated types (Swift 5.7+)
```swift
protocol DataStore<Item> {
    associatedtype Item: Codable
    func load() async throws -> [Item]
}

// No manual AnyDataStore wrapper needed:
func bind(store: any DataStore<User>) async throws {
    let users = try await store.load()
    print(users.count)
}
```

## pitfalls

1. **Adding a method to a protocol extension without a requirement** means it is dispatched statically. If a conformer provides its own implementation and the variable is typed as the protocol, the extension's version runs -- not the conformer's. Always declare the method in the protocol requirements if dynamic dispatch is needed.

2. **Retroactive conformance conflicts.** Adding `extension SomeType: SomeProtocol` in your module may collide with the same conformance in another library. The compiler cannot resolve the ambiguity. Only add conformance in the module that owns the type or the protocol.

3. **Existential types erase type identity.** Assigning two `any Equatable` values prevents calling `==` because the compiler cannot prove they are the same underlying type. Use `some Equatable` or a generic `<T: Equatable>` to preserve identity.

4. **Self requirements make existentials unusable.** A protocol containing `func copy() -> Self` cannot be used as `any MyProtocol` because the concrete return type is unknown. Prefer generics or opaque return types in these cases.

5. **Deep protocol hierarchies multiply conformance work.** Each level in a protocol inheritance chain adds requirements that every conformer must satisfy or inherit defaults for. Keep hierarchies flat and compose with `&` instead.

## references

- https://docs.swift.org/swift-book/documentation/the-swift-programming-language/protocols/
- https://docs.swift.org/swift-book/documentation/the-swift-programming-language/opaquetypes/
- https://docs.swift.org/swift-book/documentation/the-swift-programming-language/generics/
- https://developer.apple.com/videos/play/wwdc2022/110353/

## instructions

Use this expert when a developer asks about Swift protocols, protocol extensions, or protocol-oriented design. Pair with `idioms.md` for base conventions and `patterns.md` for broader design patterns.

## research

Deep Research prompt:

"Write a micro expert on Swift protocol-oriented programming. Cover: protocol composition (Protocol1 & Protocol2), associated types (associatedtype, constraining with where), existential types (any Protocol, boxing, performance cost), opaque types (some Protocol, return type inference, stable identity), protocol witnesses (witness tables, static vs dynamic dispatch), conditional conformance (extension Array: Equatable where Element: Equatable), protocol extensions with default implementations (customization points), Self requirements (protocols with Self or associated types), type erasure (AnyPublisher, AnySequence, manual type erasure pattern), protocol inheritance (protocol hierarchies), @objc protocols (optional requirements, ObjC interop), Sendable protocol (concurrency safety, @Sendable closures), and choosing between protocols, generics, and concrete types. Include self-contained code patterns for each."
