# pitfalls

## purpose

Non-obvious Go gotchas, surprising behavior, and common mistakes that trip up developers — including those coming from other languages.

## rules

1. Never compare an interface value to `nil` when the concrete type might itself be a nil pointer -- check the concrete value instead.
2. Always use a `sync.Mutex` or `sync.Map` when multiple goroutines access the same map; concurrent map read/write is a fatal crash, not a data race.
3. Never capture a range loop variable in a goroutine without rebinding it (required before Go 1.22; safe from Go 1.22+ which scopes per-iteration).
4. Always copy a slice with `copy` or full-slice expression (`s[:len(s):len(s)]`) before appending if the caller must not see mutations.
5. Never defer inside a loop body -- the deferred call only runs when the enclosing function returns, not when the loop iteration ends.
6. Always check `:=` declarations for accidental shadowing of outer variables, especially `err`.
7. Never write to a nil map -- initialize with `make(map[K]V)` or a literal before any write.
8. Always iterate strings with `for i, r := range s` to get runes; indexing `s[i]` gives bytes, not characters.
9. Prefer `errors.Is`/`errors.As` over `==` or type assertions when errors may be wrapped.
10. Never rely on struct equality (`==`) when the struct contains slices, maps, or functions -- it will not compile.

## patterns

### Nil interface trap -- detection and safe check

```go
package main

import "fmt"

type MyError struct{ Msg string }

func (e *MyError) Error() string { return e.Msg }

func mayFail(fail bool) error {
	var err *MyError // nil pointer
	if fail {
		err = &MyError{"boom"}
	}
	// BUG: returns non-nil interface holding nil pointer
	// return err

	// SAFE: return nil explicitly when there is no error
	if err != nil {
		return err
	}
	return nil
}

func main() {
	err := mayFail(false)
	fmt.Println(err == nil) // true with safe version
}
```

### Slice append shared-array gotcha

```go
package main

import "fmt"

func main() {
	base := make([]int, 3, 5) // len=3, cap=5
	base[0], base[1], base[2] = 1, 2, 3

	// Both slices share the backing array because cap has room
	a := append(base, 4)
	b := append(base, 5) // overwrites a[3]!

	fmt.Println(a) // [1 2 3 5] -- NOT [1 2 3 4]
	fmt.Println(b) // [1 2 3 5]

	// SAFE: clip capacity before branching
	safe := base[:len(base):len(base)]
	x := append(safe, 4)
	y := append(safe, 5)
	fmt.Println(x) // [1 2 3 4]
	fmt.Println(y) // [1 2 3 5]
}
```

### Defer in loops -- resource leak

```go
package main

import (
	"fmt"
	"os"
)

func processFiles(paths []string) error {
	for _, p := range paths {
		// BUG: all files stay open until function returns
		// f, _ := os.Open(p); defer f.Close()

		// SAFE: wrap in a closure so defer runs each iteration
		if err := func() error {
			f, err := os.Open(p)
			if err != nil {
				return err
			}
			defer f.Close()
			fmt.Println("processing", f.Name())
			return nil
		}(); err != nil {
			return err
		}
	}
	return nil
}

func main() {
	processFiles([]string{os.Args[0]})
}
```

## pitfalls

1. **Nil interface vs nil pointer**: An interface holding a nil concrete pointer is itself non-nil. Functions returning an interface error type must return a bare `nil`, not a typed nil pointer.
2. **Range variable capture (pre-Go 1.22)**: All goroutines launched in a `for` loop share the same loop variable address. Rebind with `v := v` or pass as a goroutine argument.
3. **Shared slice backing array**: `append` does not always allocate. When capacity remains, two appends from the same base overwrite each other.
4. **Defer timing in loops**: `defer` is function-scoped, not block-scoped. In a loop this leaks resources until the function exits.
5. **Variable shadowing with `:=`**: A `:=` in an inner scope creates a new variable; the outer `err` stays unchanged, silently swallowing errors.
6. **Concurrent map writes**: Two goroutines writing to the same `map` cause a non-recoverable `fatal error`, not a panic you can catch.
7. **String indexing returns bytes**: `s[0]` on a multibyte UTF-8 string gives a single byte, not the first character. Use `[]rune(s)` or `range` for code points.
8. **Struct comparison**: Structs containing slices, maps, or function fields cannot be compared with `==`; use `reflect.DeepEqual` or write a custom `Equal` method.

## references

- https://go.dev/doc/faq#nil_error
- https://go.dev/blog/loopvar-preview
- https://go.dev/ref/spec#Appending_and_copying_slices
- https://go.dev/ref/spec#Defer_statements
- https://go.dev/doc/articles/race_detector

## instructions

Use this expert when a developer reports unexpected Go behavior, asks "why doesn't this work?", or needs help debugging. Pair with `idioms.md` for the positive conventions and `concurrency.md` for concurrency-specific gotchas.

## research

Deep Research prompt:

"Write a micro expert on Go pitfalls and gotchas. Cover: nil interface comparison (interface with nil concrete value is not nil), goroutine leaks (unbuffered channels, forgotten context cancellation), range variable capture in goroutines (loop variable sharing before Go 1.22), slice append gotchas (shared backing array, append may or may not allocate), map concurrent read/write (fatal error, not race condition), defer evaluation timing (arguments evaluated immediately, not at defer time), named return value shadowing, unkeyed struct literals (positional fragility), short variable declaration shadowing (:= in inner scope), nil map write (panic), string iteration (bytes vs runes), interface pollution (too many methods), error string conventions (lowercase, no punctuation), and init() function ordering. Include safe alternative patterns for each."
