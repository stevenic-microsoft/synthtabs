# go-router

## purpose

Route Go language questions to the right expert. Covers writing idiomatic Go — style, patterns, pitfalls, and concurrency.

## task clusters

### Idioms & style
When: Go naming conventions (short names, MixedCaps), package organization, error return conventions, interface satisfaction, `init()`, blank identifier, go fmt, effective Go style, go doc comments
Read:
- `idioms.md`

### Design patterns & composition
When: functional options, table-driven tests, middleware chains, interface composition, embedding, factory functions, error wrapping (`%w`), sentinel errors, custom error types, dependency injection
Read:
- `patterns.md`
Depends on: `idioms.md` (naming context)

### Gotchas & common mistakes
When: nil interface comparison, goroutine leaks, range variable capture, slice append gotchas, map concurrent access, defer evaluation timing, named return shadowing, unkeyed struct literals
Read:
- `pitfalls.md`

### Concurrency patterns
When: goroutines, channels, `select`, `context.Context`, `sync.WaitGroup`, `sync.Mutex`, `errgroup`, worker pools, fan-out/fan-in, pipeline patterns, channel direction (`chan<-`, `<-chan`)
Read:
- `concurrency.md`
Depends on: `idioms.md` (error handling context)

### Libraries & frameworks
When: Gin, Echo, Chi, GORM, sqlx, cobra, viper, gRPC-Go,
  Terraform SDK, client-go, Fiber, or any Go framework/library question
→ Read `libraries/index.md`

### Composite: Full Go guidance
When: comprehensive Go review, new Go project setup, "teach me idiomatic Go"
Read:
- `idioms.md`
- `patterns.md`
- `pitfalls.md`
- `concurrency.md`

## file inventory

`concurrency.md` | `idioms.md` | `patterns.md` | `pitfalls.md` | `libraries/index.md`
