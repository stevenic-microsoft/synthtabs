# swift-router

## purpose

Route Swift language questions to the right expert. Covers writing idiomatic Swift — style, patterns, pitfalls, and protocol-oriented programming.

## task clusters

### Idioms & style
When: Swift naming conventions (camelCase, API design guidelines), `guard` vs `if let`, value types vs reference types, `struct` vs `class`, optionals, `enum` with associated values, Swift formatting, documentation comments (`///`), access control (`public`, `internal`, `private`)
Read:
- `idioms.md`

### Design patterns & composition
When: protocol extensions, generic constraints, `Result` type, `Codable`, property wrappers (`@Published`, `@State`), dependency injection, `async`/`await` (Swift), `actor`, `TaskGroup`, testing with XCTest, builder pattern
Read:
- `patterns.md`
Depends on: `idioms.md` (naming context)

### Gotchas & common mistakes
When: retain cycles, `weak`/`unowned` misuse, optional force-unwrap crashes, `struct` mutation in closures, `Equatable`/`Hashable` pitfalls, `AnyObject` vs `Any`, value type copying overhead, `@escaping` confusion, `Sendable` violations, actor reentrancy
Read:
- `pitfalls.md`

### Protocol-oriented programming
When: protocol composition, associated types, existential types (`any Protocol`), opaque types (`some Protocol`), protocol witnesses, conditional conformance, protocol extensions with default implementations, `Self` requirements, type erasure
Read:
- `protocols.md`
Depends on: `idioms.md` (base conventions)

### Libraries & frameworks
When: SwiftUI, UIKit, Vapor, Alamofire, Combine, SwiftData, Core Data,
  Swift Argument Parser, Swift NIO, TCA, or any Swift framework/library question
→ Read `libraries/index.md`

### Composite: Full Swift guidance
When: comprehensive Swift review, new Swift project setup, "teach me idiomatic Swift"
Read:
- `idioms.md`
- `patterns.md`
- `pitfalls.md`
- `protocols.md`

## file inventory

`idioms.md` | `patterns.md` | `pitfalls.md` | `protocols.md` | `libraries/index.md`
