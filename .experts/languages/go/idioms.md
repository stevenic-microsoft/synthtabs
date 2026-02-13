# idioms

## purpose

Idiomatic Go naming conventions, package organization, error handling style, and code patterns that follow the Go community's established conventions.

## rules

1. Always use MixedCaps (exported) or mixedCaps (unexported) -- never snake_case or ALL_CAPS for names.
2. Keep variable names short in small scopes (`i`, `r`, `ctx`) and descriptive in larger scopes (`userCount`, `httpClient`).
3. Always return `error` as the last return value; never use panic for expected failure paths.
4. Wrap errors with context using `fmt.Errorf("doing X: %w", err)` -- lowercase, no trailing punctuation.
5. Prefer small interfaces (1-2 methods); accept interfaces, return concrete structs.
6. Name packages with short, lowercase, singular nouns -- no underscores, no camelCase (`http`, `json`, `user`).
7. Always use named fields in struct literals (`Point{X: 1, Y: 2}`, not `Point{1, 2}`).
8. Write godoc comments as complete sentences starting with the declared name (`// Server represents ...`).
9. Rely on zero values -- design structs so the zero value is immediately useful without constructors.
10. Avoid `init()` functions; prefer explicit initialization in `main()` or constructors.
11. Use the blank identifier `_` to discard values or prove interface satisfaction (`var _ io.Reader = (*MyType)(nil)`).
12. Run `gofmt` (or `goimports`) on every save -- canonical formatting is non-negotiable.

## patterns

### Error wrapping with context

```go
package main

import (
	"errors"
	"fmt"
)

var ErrNotFound = errors.New("not found")

func findUser(id int) (string, error) {
	return "", ErrNotFound
}

func handleRequest(id int) error {
	name, err := findUser(id)
	if err != nil {
		return fmt.Errorf("handleRequest user %d: %w", id, err)
	}
	fmt.Println(name)
	return nil
}

func main() {
	err := handleRequest(42)
	if errors.Is(err, ErrNotFound) {
		fmt.Println("user missing")
	}
}
```

### Interface satisfaction and small interfaces

```go
package main

import (
	"fmt"
	"io"
	"strings"
)

type Sizer interface {
	Size() int64
}

type FileInfo struct {
	Name    string
	Bytes   int64
}

func (f FileInfo) Size() int64  { return f.Bytes }
func (f FileInfo) Read(p []byte) (int, error) {
	return strings.NewReader(f.Name).Read(p)
}

// Accept interface, return struct
func summarize(r io.Reader, s Sizer) string {
	buf := make([]byte, 64)
	n, _ := r.Read(buf)
	return fmt.Sprintf("%s (%d bytes)", buf[:n], s.Size())
}

func main() {
	f := FileInfo{Name: "hello.txt", Bytes: 1024}
	fmt.Println(summarize(f, f))
}
```

### Const block with iota

```go
package main

import "fmt"

type Role int

const (
	RoleGuest Role = iota
	RoleUser
	RoleAdmin
)

func (r Role) String() string {
	return [...]string{"Guest", "User", "Admin"}[r]
}

func main() {
	fmt.Println(RoleAdmin) // "Admin"
}
```

## pitfalls

1. Unkeyed struct literals break silently when fields are reordered -- always use `Field: value` syntax.
2. Error strings should be lowercase with no trailing punctuation so they compose naturally when wrapped.
3. Naming a package `util`, `common`, or `base` is a code smell -- the package name should describe what it provides, not how it is used.
4. Calling `init()` across many packages creates hidden startup ordering and makes testing harder -- prefer explicit wiring.

## references

- https://go.dev/doc/effective_go
- https://github.com/golang/go/wiki/CodeReviewComments
- https://go.dev/blog/package-names
- https://pkg.go.dev/fmt#Errorf

## instructions

Use this expert when a developer asks about Go naming, style, code organization, or "how should I write this in Go." Pair with `patterns.md` for design-level guidance and `concurrency.md` for goroutine/channel patterns.

## research

Deep Research prompt:

"Write a micro expert on idiomatic Go style and conventions. Cover: naming conventions (short names, MixedCaps, exported vs unexported), package organization (one package per directory, package naming, internal/), error return conventions (error as last return, wrapping with fmt.Errorf %w, sentinel errors vs custom types), interface design (small interfaces, Accept interfaces return structs, implicit satisfaction), init() function usage, blank identifier (_), go fmt/gofmt as canonical formatter, godoc comment style, struct initialization (named fields, zero values), go build tags, embed directive, table-driven design, receiver naming (short single-letter), and const/iota patterns. Reference Effective Go, Go Code Review Comments, and the Go standard library."
