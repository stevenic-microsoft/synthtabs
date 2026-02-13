# pitfalls

## purpose

Non-obvious Ruby gotchas, surprising behavior, and common mistakes that trip up developers — including those coming from statically-typed languages.

## rules

1. Always rescue `StandardError`, never bare `rescue` or `rescue Exception` — the latter catches `SignalException`, `SystemExit`, and `NoMemoryError`.
2. Never mutate a default argument (`def foo(list = [])`) — the same array instance is shared across calls. Use `nil` and create inside the method.
3. Always enable `# frozen_string_literal: true` at the top of every file to prevent accidental string mutation and reduce allocations.
4. Never create symbols from untrusted input without validation — even though Ruby 2.2+ GC's dynamic symbols, unbounded symbol creation wastes memory and hashes.
5. Prefer `require_relative` for files within your project and `require` for gems and standard library — mixing them up causes double-loading or load failures.
6. Always define `respond_to_missing?` when overriding `method_missing` — omitting it silently breaks `respond_to?`, `method(:name)`, and delegation.
7. Never rely on `==` for identity checks — use `equal?` for object identity, `==` for value equality, and `eql?` for hash-key equality.
8. Prefer `&.` (safe navigation) over `try` but do not chain it blindly — `user&.address&.city` hides `nil` at every level and makes debugging harder.
9. Never use class variables (`@@var`) in an inheritance hierarchy — they are shared across all subclasses and the parent, causing unexpected overwrites.
10. Always use Zeitwerk for autoloading in modern Ruby projects — classic autoload has load-order and thread-safety issues.

## patterns

### Mutable default argument

```ruby
# frozen_string_literal: true

# BAD — the same array is reused across calls
def append_bad(value, list = [])
  list << value
end

append_bad(1)  # => [1]
append_bad(2)  # => [1, 2]  (surprise! same array)

# SAFE — create a new array each call
def append_good(value, list = nil)
  list = list || []
  list << value
end

append_good(1)  # => [1]
append_good(2)  # => [2]  (independent array)
```

### Exception hierarchy

```ruby
# frozen_string_literal: true

# BAD — catches Interrupt (Ctrl-C), SystemExit, and fatal errors
begin
  do_work
rescue Exception => e   # DO NOT DO THIS
  log(e)
end

# SAFE — catches application errors only
begin
  do_work
rescue StandardError => e
  log(e)
  retry if retryable?(e)
end

# Custom exceptions should inherit from StandardError
class PaymentDeclined < StandardError; end
```

### == vs eql? vs equal?

```ruby
# frozen_string_literal: true

a = "hello"
b = "hello"

a == b       # => true   (value equality — most common)
a.eql?(b)    # => true   (hash-key equality — same value, same type)
a.equal?(b)  # => false  (identity — different object_id)

# Numeric surprise:
1 == 1.0     # => true   (== coerces across Numeric types)
1.eql?(1.0)  # => false  (eql? does NOT coerce — Integer vs Float)

# Consequence: Hash keys use eql?, so { 1 => "int" }[1.0] returns nil.
```

### Thread safety and the GVL

```ruby
# frozen_string_literal: true

# The GVL prevents parallel Ruby execution but does NOT prevent data races.
# Context switches happen between Ruby instructions, not between lines.

counter = 0

threads = 10.times.map do
  Thread.new { 1000.times { counter += 1 } }
end
threads.each(&:join)

# counter is NOT guaranteed to be 10_000 — += is not atomic.

# SAFE — use a Mutex
mutex   = Mutex.new
counter = 0

threads = 10.times.map do
  Thread.new { 1000.times { mutex.synchronize { counter += 1 } } }
end
threads.each(&:join)
# counter == 10_000 guaranteed
```

### Circular require

```ruby
# frozen_string_literal: true

# -- file: a.rb --
# require_relative "b"
# class A
#   B_CONST = B::NAME   # NameError! B is only partially loaded
# end

# -- file: b.rb --
# require_relative "a"
# class B
#   NAME = "B"
# end

# FIX: Break the cycle by extracting shared constants into a third file,
# or use autoloading (Zeitwerk) which handles circular references via
# lazy constant resolution.
```

### Safe navigation (&.) limitations

```ruby
# frozen_string_literal: true

user = nil

# &. short-circuits to nil — useful for simple chains
user&.profile&.avatar_url  # => nil

# Pitfall: &. only guards against nil, NOT against NoMethodError on
# a non-nil object that lacks the method.
user = OpenStruct.new(profile: 42)
user&.profile&.avatar_url  # => NoMethodError (42 has no #avatar_url)

# Pitfall: &. hides WHICH link in the chain was nil.
# Prefer explicit checks when you need to distinguish the failure point.
def avatar_url(user)
  return unless user
  profile = user.profile or return
  profile.avatar_url
end
```

## pitfalls

1. **Implicit return of last expression** — `def status; if active?; "on"; end; end` returns `nil` when `active?` is false because `if` without `else` evaluates to `nil`. Always provide an explicit `else` or a final return value.
2. **`super` vs `super()`** — bare `super` forwards ALL original arguments; `super()` forwards none. Mixing them up silently passes wrong arguments to the parent method.
3. **Refinements are lexically scoped** — `using MyRefinement` only affects the file or block where it appears. Code in other files, even within the same class, will not see the refinement.
4. **`private` in Ruby is method-level, not class-level** — `private` methods CAN be called by other instances of the same class in Ruby 2.7+, and cannot be called with an explicit receiver (except `self` in 2.7+). This is different from Java/C# `private`.
5. **Frozen string does not freeze interpolated parts** — `"hello #{mutable_var}".freeze` freezes the result string, but `mutable_var` itself remains mutable. Freezing is shallow.
6. **`Hash.new([])` shares one default array** — `h = Hash.new([]); h[:a] << 1` mutates the shared default, so `h[:b]` also shows `[1]`. Use `Hash.new { |h, k| h[k] = [] }` instead.

## references

- https://docs.ruby-lang.org/en/master/doc/syntax/exceptions_rdoc.html
- https://docs.ruby-lang.org/en/master/Thread.html
- https://docs.ruby-lang.org/en/master/doc/syntax/refinements_rdoc.html
- https://github.com/fxn/zeitwerk
- https://docs.ruby-lang.org/en/master/Object.html#method-i-equal-3F
- https://ruby-doc.org/core/Exception.html

## instructions

Use this expert when a developer reports unexpected Ruby behavior, asks "why doesn't this work?", or needs help debugging. Pair with `idioms.md` for the positive conventions.

## research

Deep Research prompt:

"Write a micro expert on Ruby pitfalls and gotchas. Cover: monkey-patching dangers (overriding core methods, refinements as alternative), ==/eql?/equal? confusion (value vs hash vs identity), mutable string defaults (frozen_string_literal), nil propagation (NoMethodError chains, safe navigation &.), load path issues ($LOAD_PATH, require vs require_relative), circular requires (partial loading), super without parens (super vs super(), argument forwarding), Proc.new vs proc vs lambda (arity checking, return behavior), thread safety with GVL (GVL doesn't protect data structures), hash symbol vs string keys (indifferent access pitfall), class variable (@@) sharing across hierarchy, method visibility (private/protected semantic difference from other languages), autoload timing, Enumerable#each returns original (not mapped), and Comparable#<=> returning nil (incomparable types). Include safe alternative patterns for each."
