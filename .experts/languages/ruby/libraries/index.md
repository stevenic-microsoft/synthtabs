# ruby-libraries-router

## purpose

Route Ruby framework and gem questions to project-specific experts. These experts cover opinionated frameworks, SDKs, and gems used in Ruby projects — knowledge that goes beyond the core language.

## task clusters

<!-- No library experts yet. Run the analyzer to scan the codebase and recommend library experts to create. Common candidates: Rails, Sinatra, Sidekiq, RSpec, Devise, Pundit, ActiveRecord (standalone), Dry-rb, Hanami, Sorbet. -->

## combining rule

If a request touches multiple library experts, load all that match. Let the more specific expert lead (e.g., Rails over ActiveRecord for routing questions).

## ambiguity fallback

If signals match this domain but no library expert exists yet, suggest running the analyzer:

> "No Ruby library experts exist yet. Want me to analyze the codebase and recommend library experts to create?"

## cross-domain note

Library experts pair with `../idioms.md` for Ruby style, `../patterns.md` for design patterns, and `../../tools/prompt-engineer.md` when the gem is used for LLM prompt construction. If a question is purely about Ruby language features, route to the parent language experts instead.

## file inventory

<!-- empty — populated by analyzer.md + builder.md -->
