# patterns

## purpose

Design patterns, composition strategies, and architectural idioms for Go — functional options, table-driven tests, middleware, and error handling patterns.

## rules

1. Use the functional options pattern for constructors with more than two optional configuration values.
2. Write table-driven tests with `t.Run` subtests for every function with distinct input/output cases.
3. Compose HTTP middleware by wrapping `http.Handler` -- each middleware does one thing and calls `next.ServeHTTP`.
4. Prefer dependency injection via interface parameters over global variables or service locators.
5. Define error sentinel values (`var ErrNotFound = errors.New(...)`) at package level; use custom error types only when callers need structured data.
6. Use `errors.Is` for sentinel comparison and `errors.As` for type extraction -- never use `==` or type assertions on wrapped errors.
7. Return structs from constructors, accept interfaces in functions -- this keeps the API concrete and the dependencies abstract.
8. Use `t.Helper()` in every test helper function so failure messages report the caller's line, not the helper's.
9. Prefer struct embedding for composing behavior, not for simulating inheritance -- embed only when you want to promote the full method set.
10. Always shut down HTTP servers with a context-aware `Shutdown` method, never `Close`, to allow in-flight requests to drain.

## patterns

### Functional options

```go
package main

import "fmt"

type Server struct {
	port    int
	timeout int
}

type Option func(*Server)

func WithPort(p int) Option    { return func(s *Server) { s.port = p } }
func WithTimeout(t int) Option { return func(s *Server) { s.timeout = t } }

func NewServer(opts ...Option) *Server {
	s := &Server{port: 8080, timeout: 30}
	for _, o := range opts {
		o(s)
	}
	return s
}

func main() {
	srv := NewServer(WithPort(9090), WithTimeout(60))
	fmt.Printf("port=%d timeout=%d\n", srv.port, srv.timeout)
}
```

### Table-driven tests

```go
package math

import "testing"

func Add(a, b int) int { return a + b }

func TestAdd(t *testing.T) {
	tests := []struct {
		name     string
		a, b     int
		expected int
	}{
		{"positive", 2, 3, 5},
		{"zero", 0, 0, 0},
		{"negative", -1, -2, -3},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			if got := Add(tc.a, tc.b); got != tc.expected {
				t.Errorf("Add(%d,%d) = %d, want %d", tc.a, tc.b, got, tc.expected)
			}
		})
	}
}
```

### HTTP middleware chain

```go
package main

import (
	"log"
	"net/http"
	"time"
)

func logging(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		next.ServeHTTP(w, r)
		log.Printf("%s %s %v", r.Method, r.URL.Path, time.Since(start))
	})
}

func hello(w http.ResponseWriter, r *http.Request) {
	w.Write([]byte("hello"))
}

func main() {
	mux := http.NewServeMux()
	mux.HandleFunc("/", hello)
	log.Fatal(http.ListenAndServe(":8080", logging(mux)))
}
```

### Graceful shutdown

```go
package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
)

func main() {
	srv := &http.Server{Addr: ":8080"}

	go func() {
		if err := srv.ListenAndServe(); err != http.ErrServerClosed {
			log.Fatalf("listen: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("shutdown: %v", err)
	}
	log.Println("server stopped")
}
```

## pitfalls

1. Functional options that mutate shared state after construction cause data races -- options should only be applied inside the constructor.
2. Using `==` to compare errors after wrapping silently fails; always use `errors.Is` which unwraps the chain.
3. Forgetting `t.Parallel()` in subtests means table-driven tests run sequentially, hiding race conditions that occur in production.

## references

- https://go.dev/doc/effective_go
- https://dave.cheney.net/2014/10/17/functional-options-for-friendly-apis
- https://go.dev/blog/subtests
- https://pkg.go.dev/net/http#Server.Shutdown
- https://pkg.go.dev/golang.org/x/sync/errgroup

## instructions

Use this expert for design-level Go questions: how to structure code, which patterns to apply, and how to compose functionality. Pair with `idioms.md` for naming/style and `concurrency.md` for concurrency-specific patterns.

## research

Deep Research prompt:

"Write a micro expert on Go design patterns and composition. Cover: functional options pattern (for configurable constructors), table-driven tests (subtests with t.Run), middleware chains (http.Handler wrapping), interface composition (small interfaces, embedding), struct embedding (for composition over inheritance), factory functions (New* constructors), error wrapping (fmt.Errorf with %w, errors.Is, errors.As), sentinel errors vs custom error types (when to use each), dependency injection (interface parameters, wire), io.Reader/io.Writer composition, testing patterns (testify, httptest, test fixtures, test helpers), and the accept interfaces/return structs principle. Include self-contained code patterns for each."
