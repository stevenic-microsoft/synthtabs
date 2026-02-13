# idioms

## purpose

Idiomatic Ruby naming conventions, code organization, data modeling, and style decisions that follow the Ruby community's established conventions.

## rules

1. Always use `snake_case` for methods and local variables, `CamelCase` for classes and modules, `UPPER_SNAKE_CASE` for constants.
2. Always suffix predicate methods with `?` and reserve `!` for methods that mutate the receiver or raise on failure.
3. Prefer symbols over strings for hash keys, method names, and identifiers that do not change at runtime.
4. Prefer `do...end` for multi-line blocks and `{ }` for single-line blocks.
5. Always use string interpolation (`"Hello #{name}"`) instead of concatenation (`"Hello " + name`).
6. Prefer guard clauses (early `return`/`raise`) over deeply nested conditionals.
7. Always freeze mutable constants (`DEFAULTS = { timeout: 30 }.freeze`) and enable `# frozen_string_literal: true` at the top of every file.
8. Prefer `Enumerable` methods (`map`, `select`, `reject`, `reduce`) over manual loops with `each` and accumulators.
9. Use `Struct` or `Data` (Ruby 3.2+) for simple value objects instead of full class definitions.
10. Prefer `attr_reader` with manual writers over `attr_accessor` when you need validation on assignment.

## patterns

### Naming conventions

```ruby
# frozen_string_literal: true

module PaymentProcessing      # CamelCase module
  MAX_RETRIES = 3             # UPPER_SNAKE constant

  class CreditCardCharge      # CamelCase class
    attr_reader :amount, :currency

    def initialize(amount, currency: "USD")
      @amount = amount
      @currency = currency
    end

    def valid?                # ? predicate — returns boolean
      amount.positive?
    end

    def apply_discount!(pct)  # ! mutates receiver
      @amount = amount * (1 - pct / 100.0)
      self
    end
  end
end
```

### Blocks, Procs, and Lambdas

```ruby
# Block — use for one-off iteration / callbacks
[1, 2, 3].select { |n| n.odd? }

# Proc — use when you need a stored callable with flexible arity
handler = Proc.new { |x, y| x.to_i + y.to_i }  # missing args become nil
handler.call(1)  # => 1 (y is nil, nil.to_i => 0)

# Lambda — use when you need strict arity and local return
validator = ->(val) { val.is_a?(Numeric) && val.positive? }
validator.call(5)    # => true
validator.call("x")  # => false

# Rule of thumb: lambdas for most stored callables, blocks for DSL / iteration,
# Proc.new only when you deliberately want flexible arity or non-local return.
```

### Enumerable pipeline

```ruby
# frozen_string_literal: true

Order = Struct.new(:customer, :total, :status, keyword_init: true)

orders = [
  Order.new(customer: "Alice", total: 250, status: :shipped),
  Order.new(customer: "Bob",   total: 50,  status: :pending),
  Order.new(customer: "Carol", total: 120, status: :shipped),
]

# Pipeline: filter -> transform -> accumulate
high_value_shipped = orders
  .select { |o| o.status == :shipped }
  .reject { |o| o.total < 100 }
  .map    { |o| { name: o.customer, total: o.total } }

# each_with_object for building a hash without reduce boilerplate
totals = orders.each_with_object(Hash.new(0)) do |o, acc|
  acc[o.status] += o.total
end
# => { shipped: 370, pending: 50 }
```

### Guard clauses and postfix conditionals

```ruby
def process(user)
  return unless user          # guard: nil check
  raise ArgumentError, "inactive" unless user.active?  # guard: validation

  send_welcome_email(user) if user.new?   # postfix conditional
  user.update!(processed_at: Time.now)
end
```

## pitfalls

1. **`!` does not always mean mutation** — some gems use `!` for "raises on failure" (e.g., `save!`). Read docs, do not assume in-place change.
2. **Symbols are not garbage-collected the same as strings** — in Ruby < 2.2 dynamic symbol creation (`"user_#{id}".to_sym`) caused memory leaks. Modern Ruby GC's dynamic symbols, but static symbols live forever. Avoid mass-converting untrusted input to symbols.
3. **`each_with_object` vs `reduce`** — `reduce` requires you to return the accumulator every iteration; forgetting the return is a silent bug. Prefer `each_with_object` when building a mutable collection.
4. **Open classes are not free** — reopening core classes (`class String; def blank?; end; end`) pollutes every string in the process. Use Refinements (`using`) to scope changes.

## references

- https://docs.ruby-lang.org/en/master/
- https://rubystyle.guide/
- https://docs.ruby-lang.org/en/master/Enumerable.html
- https://docs.ruby-lang.org/en/master/Struct.html
- https://docs.ruby-lang.org/en/master/Proc.html

## instructions

Use this expert when a developer asks about Ruby naming, style, code organization, or "how should I write this in Ruby." Pair with `patterns.md` for design-level guidance.

## research

Deep Research prompt:

"Write a micro expert on idiomatic Ruby style and conventions. Cover: naming conventions (snake_case methods/variables, CamelCase classes/modules, SCREAMING_SNAKE constants, ? for predicates, ! for mutating/dangerous), attr_accessor/attr_reader/attr_writer, blocks vs procs vs lambdas (when to use each), symbol usage (vs strings), string interpolation and heredocs, do..end vs {} convention (multi-line vs single-line), freeze and frozen_string_literal pragma, Enumerable methods (map/select/reject/reduce/each_with_object), Struct and Data classes, RuboCop style enforcement, YARD documentation, require/require_relative organization, Bundler/Gemfile conventions, and nil handling (safe navigation &., nil?, blank?, present?). Reference Ruby Style Guide (rubocop), Ruby documentation, and community conventions."
