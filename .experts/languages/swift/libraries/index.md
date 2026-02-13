# swift-libraries-router

## purpose

Route Swift framework and library questions to project-specific experts. These experts cover opinionated frameworks, SDKs, and packages used in Swift projects — knowledge that goes beyond the core language.

## task clusters

<!-- No library experts yet. Run the analyzer to scan the codebase and recommend library experts to create. Common candidates: SwiftUI, UIKit, Vapor, Alamofire, Combine, SwiftData, Core Data, Swift Argument Parser, Swift NIO, The Composable Architecture (TCA). -->

## combining rule

If a request touches multiple library experts, load all that match. Let the more specific expert lead (e.g., SwiftUI over Combine for view-layer questions).

## ambiguity fallback

If signals match this domain but no library expert exists yet, suggest running the analyzer:

> "No Swift library experts exist yet. Want me to analyze the codebase and recommend library experts to create?"

## cross-domain note

Library experts pair with `../idioms.md` for Swift style, `../patterns.md` for design patterns, `../protocols.md` for protocol-oriented library usage, and `../../tools/prompt-engineer.md` when the library is used for LLM prompt construction. If a question is purely about Swift language features, route to the parent language experts instead.

## file inventory

<!-- empty — populated by analyzer.md + builder.md -->
