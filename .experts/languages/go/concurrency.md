# concurrency

## purpose

Go concurrency patterns — goroutines, channels, select, context, and synchronization primitives for safe concurrent programming.

## rules

1. Always pass `context.Context` as the first parameter to any function that may block or spawn goroutines.
2. Never launch a goroutine without a clear plan for how it will stop -- use context cancellation, a done channel, or a `sync.WaitGroup`.
3. Always call `wg.Add` before launching the goroutine, never inside it.
4. Always close a channel from the sender side, never from the receiver; closing a closed channel panics.
5. Prefer `sync.Mutex` with `defer mu.Unlock()` immediately after `mu.Lock()` to guarantee unlock on all paths.
6. Use buffered channels as semaphores to limit concurrency; use unbuffered channels for synchronization signals.
7. Always `select` on `ctx.Done()` alongside channel operations to avoid goroutine leaks on cancellation.
8. Prefer `errgroup.Group` over bare `sync.WaitGroup` when goroutines can return errors.
9. Never pass mutable data to a goroutine by sharing a pointer without synchronization -- pass by value or protect with a mutex.
10. Use `sync.Once` for lazy initialization of expensive resources; never use `init()` or double-checked locking.

## patterns

### Worker pool with errgroup

```go
package main

import (
	"context"
	"fmt"

	"golang.org/x/sync/errgroup"
)

func main() {
	g, ctx := errgroup.WithContext(context.Background())
	g.SetLimit(3) // max 3 concurrent workers

	jobs := []int{1, 2, 3, 4, 5}
	for _, id := range jobs {
		g.Go(func() error {
			select {
			case <-ctx.Done():
				return ctx.Err()
			default:
				fmt.Printf("processing job %d\n", id)
				return nil
			}
		})
	}
	if err := g.Wait(); err != nil {
		fmt.Println("error:", err)
	}
}
```

### Fan-out / fan-in with channels

```go
package main

import (
	"fmt"
	"sync"
)

func produce(nums ...int) <-chan int {
	out := make(chan int)
	go func() {
		for _, n := range nums {
			out <- n
		}
		close(out)
	}()
	return out
}

func square(in <-chan int) <-chan int {
	out := make(chan int)
	go func() {
		for n := range in {
			out <- n * n
		}
		close(out)
	}()
	return out
}

func merge(channels ...<-chan int) <-chan int {
	out := make(chan int)
	var wg sync.WaitGroup
	for _, ch := range channels {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for v := range ch {
				out <- v
			}
		}()
	}
	go func() { wg.Wait(); close(out) }()
	return out
}

func main() {
	in := produce(1, 2, 3, 4)
	// Fan-out: two workers reading from the same channel
	c1 := square(in)
	c2 := square(in)
	// Fan-in: merge results
	for v := range merge(c1, c2) {
		fmt.Println(v)
	}
}
```

### Select with timeout and context cancellation

```go
package main

import (
	"context"
	"fmt"
	"time"
)

func slowOperation(ctx context.Context) (string, error) {
	result := make(chan string, 1)
	go func() {
		time.Sleep(2 * time.Second)
		result <- "done"
	}()

	select {
	case r := <-result:
		return r, nil
	case <-ctx.Done():
		return "", ctx.Err()
	case <-time.After(1 * time.Second):
		return "", fmt.Errorf("operation timed out")
	}
}

func main() {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	r, err := slowOperation(ctx)
	if err != nil {
		fmt.Println("error:", err)
		return
	}
	fmt.Println(r)
}
```

### sync.Once for lazy initialization

```go
package main

import (
	"fmt"
	"sync"
)

var (
	instance map[string]string
	once     sync.Once
)

func getConfig() map[string]string {
	once.Do(func() {
		fmt.Println("initializing config")
		instance = map[string]string{"env": "prod"}
	})
	return instance
}

func main() {
	// Safe to call from many goroutines; init runs exactly once
	fmt.Println(getConfig()["env"])
	fmt.Println(getConfig()["env"]) // no "initializing" printed
}
```

## pitfalls

1. Sending on a closed channel panics at runtime -- only the producer that owns the channel should close it.
2. A goroutine blocked on a channel with no reader and no context check leaks forever; always select on `ctx.Done()`.
3. `sync.WaitGroup.Add` called inside the goroutine races with `Wait` -- always call `Add` before `go func()`.
4. `time.After` in a `select` loop allocates a new timer every iteration; use `time.NewTimer` and `Reset` for hot loops.

## references

- https://go.dev/doc/effective_go#concurrency
- https://go.dev/blog/pipelines
- https://pkg.go.dev/context
- https://pkg.go.dev/sync
- https://pkg.go.dev/golang.org/x/sync/errgroup

## instructions

Use this expert when a developer asks about goroutines, channels, sync primitives, or concurrent Go patterns. Pair with `patterns.md` for general design patterns and `pitfalls.md` for common concurrency mistakes.

## research

Deep Research prompt:

"Write a micro expert on Go concurrency patterns. Cover: goroutines (launching, lifecycle, stack growth), channels (buffered vs unbuffered, directional types chan<-/`<-chan`, closing, range over channel), select statement (default case, timeout with time.After, context.Done), context.Context (WithCancel, WithTimeout, WithDeadline, WithValue, propagation), sync.WaitGroup (Add/Done/Wait, common mistakes), sync.Mutex/RWMutex (critical sections, defer Unlock), errgroup (golang.org/x/sync/errgroup, SetLimit), worker pools (fixed pool with semaphore channel), fan-out/fan-in (distributing work, merging results), pipeline patterns (stage functions connected by channels), sync.Once (lazy initialization), sync.Map (vs mutex-protected map, when to use), atomic operations (sync/atomic, atomic.Value), and channel patterns (done channel, or-done, tee, bridge). Include self-contained code patterns for each."
