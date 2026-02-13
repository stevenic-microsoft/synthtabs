# csharp-libraries-router

## purpose

Route C# framework and library questions to project-specific experts. These experts cover opinionated frameworks, SDKs, and NuGet packages used in C# projects — knowledge that goes beyond the core language.

## task clusters

<!-- No library experts yet. Run the analyzer to scan the codebase and recommend library experts to create. Common candidates: ASP.NET Core, Entity Framework Core, MediatR, AutoMapper, Serilog, xUnit, NSubstitute, Polly, MassTransit, Semantic Kernel. -->

## combining rule

If a request touches multiple library experts, load all that match. Let the more specific expert lead (e.g., EF Core over ASP.NET Core for database migration questions).

## ambiguity fallback

If signals match this domain but no library expert exists yet, suggest running the analyzer:

> "No C# library experts exist yet. Want me to analyze the codebase and recommend library experts to create?"

## cross-domain note

Library experts pair with `../idioms.md` for C# style, `../patterns.md` for design patterns, and `../../tools/prompt-engineer.md` when the library is used for LLM prompt construction. If a question is purely about C# language features, route to the parent language experts instead.

## file inventory

<!-- empty — populated by analyzer.md + builder.md -->
