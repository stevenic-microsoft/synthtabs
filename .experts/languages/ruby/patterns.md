# patterns

## purpose

Design patterns, composition strategies, and architectural idioms for Ruby — duck typing, mixins, metaprogramming, and testing patterns.

## rules

1. Prefer duck typing (`respond_to?(:call)`) over type checking (`is_a?(Proc)`) — program to capabilities, not classes.
2. Use `include` to add shared instance behavior, `extend` to add class-level methods, and `prepend` to wrap or intercept existing methods.
3. Always define `respond_to_missing?` alongside `method_missing` — omitting it breaks `respond_to?`, `method(:name)`, and introspection.
4. Prefer `define_method` over `method_missing` when the set of dynamic methods is known at load time.
5. Keep metaprogramming behind a clear public API — consumers should never need to know that `define_method` or `class_eval` powers the feature.
6. Prefer composition (inject collaborators) over inheritance — use `include` for shared behavior, not deep class hierarchies.
7. Always call `super` in `method_missing` when the message is not handled, so the lookup chain and `NoMethodError` remain correct.
8. Keep service objects to a single public method (`#call`) so they are interchangeable with lambdas and procs.
9. In RSpec, prefer `let` (lazy) over `before` blocks for test data setup; use `let!` only when eager evaluation is required for side effects.
10. Isolate DSL internals with `instance_eval` or `instance_exec` so the DSL block runs in the builder's context, not the caller's.

## patterns

### Duck typing

```ruby
# frozen_string_literal: true

class MarkdownRenderer
  def render(content)
    "**#{content}**"
  end
end

class HtmlRenderer
  def render(content)
    "<strong>#{content}</strong>"
  end
end

def publish(renderer, content)
  raise ArgumentError, "renderer must respond to #render" unless renderer.respond_to?(:render)

  renderer.render(content)
end

publish(MarkdownRenderer.new, "hello")  # => "**hello**"
publish(HtmlRenderer.new, "hello")      # => "<strong>hello</strong>"
```

### Mixins — include, extend, prepend

```ruby
# frozen_string_literal: true

module Timestamps
  def created_at
    @created_at ||= Time.now
  end
end

module ClassFinder
  def find(id)
    # class-level method added via extend
    new(id: id)
  end
end

module Logging
  def save            # prepend wraps the original #save
    puts "before save"
    result = super
    puts "after save"
    result
  end
end

class Record
  include  Timestamps   # instance methods
  extend   ClassFinder  # class methods
  prepend  Logging      # method wrapping

  attr_reader :id

  def initialize(id: nil)
    @id = id
  end

  def save
    true
  end
end

r = Record.find(1)
r.save         # prints "before save" / "after save", returns true
r.created_at   # => Time instance
```

### Metaprogramming — define_method with respond_to_missing?

```ruby
# frozen_string_literal: true

class Config
  VALID_KEYS = %i[host port timeout].freeze

  VALID_KEYS.each do |key|
    define_method(key) { @data[key] }
    define_method(:"#{key}=") { |v| @data[key] = v }
  end

  def initialize(defaults = {})
    @data = defaults.dup
  end

  # For truly dynamic keys, fall back to method_missing
  def method_missing(name, *args)
    key = name.to_s.chomp("=").to_sym
    if name.to_s.end_with?("=")
      @data[key] = args.first
    elsif @data.key?(key)
      @data[key]
    else
      super
    end
  end

  def respond_to_missing?(name, include_private = false)
    key = name.to_s.chomp("=").to_sym
    @data.key?(key) || super
  end
end
```

### DSL construction with instance_eval

```ruby
# frozen_string_literal: true

class Router
  Route = Struct.new(:verb, :path, :handler, keyword_init: true)

  attr_reader :routes

  def initialize(&block)
    @routes = []
    instance_eval(&block) if block
  end

  def get(path, &handler)
    @routes << Route.new(verb: :get, path: path, handler: handler)
  end

  def post(path, &handler)
    @routes << Route.new(verb: :post, path: path, handler: handler)
  end
end

router = Router.new do
  get  "/users" do; "list users"; end
  post "/users" do; "create user"; end
end

router.routes.size  # => 2
```

### Service object

```ruby
# frozen_string_literal: true

class ChargeCustomer
  def initialize(gateway:, logger: Logger.new($stdout))
    @gateway = gateway
    @logger  = logger
  end

  def call(customer:, amount:)
    result = @gateway.charge(customer.payment_method, amount)
    @logger.info("Charged #{customer.id} $#{amount}: #{result.status}")
    result
  end
end

# Usage — interchangeable with any callable:
#   service = ChargeCustomer.new(gateway: Stripe::Gateway.new)
#   service.call(customer: user, amount: 49_99)
```

### RSpec testing structure

```ruby
# frozen_string_literal: true

RSpec.describe ChargeCustomer do
  subject(:service) { described_class.new(gateway: gateway, logger: logger) }

  let(:gateway) { instance_double("Gateway", charge: charge_result) }
  let(:logger)  { instance_double("Logger", info: nil) }
  let(:charge_result) { OpenStruct.new(status: "ok") }
  let(:customer) { OpenStruct.new(id: 1, payment_method: "tok_visa") }

  describe "#call" do
    it "delegates to the gateway" do
      service.call(customer: customer, amount: 1000)
      expect(gateway).to have_received(:charge).with("tok_visa", 1000)
    end

    context "when gateway raises" do
      before { allow(gateway).to receive(:charge).and_raise(RuntimeError) }

      it "propagates the error" do
        expect { service.call(customer: customer, amount: 1000) }.to raise_error(RuntimeError)
      end
    end
  end
end
```

## pitfalls

1. **`method_missing` without `respond_to_missing?`** — code that calls `respond_to?` or `method(:name)` will fail silently; always pair them.
2. **`instance_eval` changes `self`** — inside a DSL block, the caller loses access to its own methods. Use `instance_exec` and pass needed values as arguments if the caller needs its own context.
3. **Overusing metaprogramming hides the call graph** — IDEs and `grep` cannot find methods created by `define_method` or `method_missing`. Keep dynamism behind a small, well-documented surface.

## references

- https://docs.ruby-lang.org/en/master/Module.html
- https://docs.ruby-lang.org/en/master/BasicObject.html#method-i-method_missing
- https://rspec.info/documentation/
- https://docs.ruby-lang.org/en/master/doc/syntax/refinements_rdoc.html
- https://ruby-doc.org/core/Proc.html

## instructions

Use this expert for design-level Ruby questions: how to structure code, which patterns to apply, and how to compose functionality. Pair with `idioms.md` for naming/style.

## research

Deep Research prompt:

"Write a micro expert on Ruby design patterns and composition. Cover: duck typing (respond_to? over is_a?, interface-like patterns), mixin modules (include for instance methods, extend for class methods, prepend for method wrapping, concern pattern), metaprogramming (define_method, method_missing/respond_to_missing?, class_eval/instance_eval, open classes), DSL construction (block-based configuration, instance_exec), Struct and Data classes (immutable value objects), dependency injection (manual, dry-container), functional composition (Proc#>>, method chaining, Enumerable pipelines), context managers (ensure, block-based resource management), Rack middleware pattern, and testing patterns (RSpec describe/context/it, let/before, shared_examples, factories with FactoryBot, Minitest assertions). Include self-contained code patterns for each."
