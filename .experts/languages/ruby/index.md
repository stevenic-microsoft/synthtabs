# ruby-router

## purpose

Route Ruby language questions to the right expert. Covers writing idiomatic Ruby — style, patterns, and pitfalls.

## task clusters

### Idioms & style
When: Ruby naming conventions (snake_case, CamelCase classes), `attr_accessor`/`attr_reader`, blocks vs procs vs lambdas, symbol usage, string interpolation, `do..end` vs `{}`, `freeze`, `frozen_string_literal`, `Enumerable` methods, RuboCop style, YARD docs
Read:
- `idioms.md`

### Design patterns & composition
When: duck typing, mixin modules (`include`/`extend`/`prepend`), metaprogramming (`define_method`, `method_missing`, `respond_to_missing?`), DSL construction, Struct/Data classes, dependency injection, testing with RSpec/Minitest, Rack middleware
Read:
- `patterns.md`
Depends on: `idioms.md` (naming context)

### Gotchas & common mistakes
When: monkey-patching dangers, `==`/`eql?`/`equal?` confusion, mutable string defaults, `nil` propagation, load path issues, circular requires, `super` without parens, `Proc.new` vs `proc` vs `lambda` arity, thread safety with GVL
Read:
- `pitfalls.md`

### Libraries & gems
When: Rails, Sinatra, Sidekiq, RSpec, Devise, Pundit, Dry-rb,
  Hanami, Sorbet, ActiveRecord, or any Ruby gem/framework question
→ Read `libraries/index.md`

### Composite: Full Ruby guidance
When: comprehensive Ruby review, new Ruby project setup, "teach me idiomatic Ruby"
Read:
- `idioms.md`
- `patterns.md`
- `pitfalls.md`

## file inventory

`idioms.md` | `patterns.md` | `pitfalls.md` | `libraries/index.md`
