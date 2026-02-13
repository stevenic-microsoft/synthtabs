# patterns

## purpose

Design patterns, composition strategies, and architectural idioms for Swift — protocol extensions, async/await, property wrappers, and testing patterns.

## rules

1. Prefer `async/await` over completion handlers for all new asynchronous code; reserve callbacks only for Objective-C interop.
2. Always mark protocol requirements as the minimal surface; provide richer behavior through default implementations in protocol extensions.
3. Use `TaskGroup` for structured fan-out concurrency instead of spawning unstructured `Task` instances.
4. Define dependencies as protocols and inject them, never reach for singletons or global state.
5. Keep `@Published` properties in `ObservableObject` classes; never put business logic directly in SwiftUI views.
6. Prefer typed `throws` (Swift 6+) or `Result<Success, Failure>` over untyped `throws` when callers need to exhaustively handle errors.
7. Always conform types crossing concurrency boundaries to `Sendable`; use `@Sendable` on closures passed to detached tasks.
8. Write one assertion per test method; separate setup from verification to keep tests readable.
9. Use custom `CodingKeys` enums only when JSON keys diverge from Swift property names; rely on automatic synthesis otherwise.
10. Prefer MVVM in SwiftUI apps: the View observes a ViewModel (`ObservableObject`), the ViewModel calls into Model/Service layers.

## patterns

### Async/await with TaskGroup
```swift
import Foundation

func fetchAllUsers(ids: [Int]) async throws -> [User] {
    try await withThrowingTaskGroup(of: User.self) { group in
        for id in ids {
            group.addTask { try await UserService.fetch(id: id) }
        }
        var users: [User] = []
        for try await user in group { users.append(user) }
        return users
    }
}
```

### Protocol-based dependency injection
```swift
protocol NetworkClient: Sendable {
    func data(from url: URL) async throws -> (Data, URLResponse)
}

extension URLSession: NetworkClient {}

struct MockClient: NetworkClient {
    var result: Result<(Data, URLResponse), Error>
    func data(from url: URL) async throws -> (Data, URLResponse) {
        try result.get()
    }
}

@MainActor
final class ItemViewModel: ObservableObject {
    @Published private(set) var items: [Item] = []
    private let client: NetworkClient

    init(client: NetworkClient = URLSession.shared) {
        self.client = client
    }
}
```

### Custom property wrapper
```swift
import Foundation

@propertyWrapper
struct Clamped<Value: Comparable> {
    private var value: Value
    let range: ClosedRange<Value>

    var wrappedValue: Value {
        get { value }
        set { value = min(max(newValue, range.lowerBound), range.upperBound) }
    }

    init(wrappedValue: Value, _ range: ClosedRange<Value>) {
        self.range = range
        self.value = min(max(wrappedValue, range.lowerBound), range.upperBound)
    }
}

struct Volume {
    @Clamped(0...100) var level: Int = 50
}
```

### Custom Codable with nested keys
```swift
import Foundation

struct Article: Codable {
    let title: String
    let authorName: String

    enum CodingKeys: String, CodingKey {
        case title
        case author
    }
    enum AuthorKeys: String, CodingKey {
        case name
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        title = try container.decode(String.self, forKey: .title)
        let author = try container.nestedContainer(keyedBy: AuthorKeys.self, forKey: .author)
        authorName = try author.decode(String.self, forKey: .name)
    }
}
```

### Async XCTest with mock
```swift
import XCTest

final class ItemViewModelTests: XCTestCase {
    func testFetchPopulatesItems() async throws {
        let json = try JSONEncoder().encode([Item(name: "A")])
        let response = HTTPURLResponse(url: URL(string: "https://x.co")!,
                                       statusCode: 200, httpVersion: nil, headerFields: nil)!
        let vm = ItemViewModel(client: MockClient(result: .success((json, response))))

        await vm.loadItems()

        XCTAssertEqual(vm.items.count, 1)
        XCTAssertEqual(vm.items.first?.name, "A")
    }
}
```

## pitfalls

1. Creating unstructured `Task { ... }` inside a loop leaks fire-and-forget work that cannot be cancelled; use `TaskGroup` to keep structured concurrency.
2. Putting `@Published` on a struct's property has no effect because structs are value types and lack `ObservableObject` conformance.
3. Decoding a `Date` without setting `JSONDecoder.dateDecodingStrategy` defaults to `Double` (seconds since 2001), silently misinterpreting ISO-8601 strings.
4. Injecting a concrete `URLSession` instead of a `NetworkClient` protocol makes the code untestable without hitting the network.

## references

- https://docs.swift.org/swift-book/documentation/the-swift-programming-language/concurrency/
- https://developer.apple.com/documentation/swift/codable
- https://developer.apple.com/documentation/xctest
- https://developer.apple.com/documentation/combine

## instructions

Use this expert for design-level Swift questions: how to structure code, which patterns to apply, and how to compose functionality. Pair with `idioms.md` for naming/style and `protocols.md` for protocol-oriented programming.

## research

Deep Research prompt:

"Write a micro expert on Swift design patterns and composition. Cover: protocol extensions (default implementations, constrained extensions), generic constraints (where clauses, associated type constraints), Result type (mapping, flatMapping, error handling), Codable patterns (custom CodingKeys, nested containers, date/data strategies), property wrappers (@Published, @AppStorage, @State, custom wrappers), dependency injection (protocol-based, environment values in SwiftUI), async/await patterns (structured concurrency, TaskGroup, AsyncSequence, AsyncStream, actors), actor model (isolation, nonisolated, MainActor), builder pattern (resultBuilder, function builders), testing with XCTest (async tests, expectations, UI testing), and MVVM/coordinator patterns for SwiftUI. Include self-contained code patterns for each."
