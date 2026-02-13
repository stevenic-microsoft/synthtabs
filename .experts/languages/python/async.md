# async

## purpose

Python asyncio, generators, coroutines, and event loop patterns — concurrent and asynchronous programming in Python.

## rules

1. Always use `asyncio.run()` as the single entry point to async code; never call `loop.run_until_complete()` directly in application code.
2. Prefer `asyncio.TaskGroup` (Python 3.11+) over `asyncio.gather` for structured concurrency — `TaskGroup` cancels all sibling tasks on first exception.
3. Never call blocking I/O (file reads, `time.sleep`, synchronous HTTP) inside a coroutine; offload to `asyncio.to_thread` or a `ProcessPoolExecutor`.
4. Always handle `asyncio.CancelledError` — let it propagate unless you need cleanup, then re-raise it after cleanup completes.
5. Never fire-and-forget tasks with bare `asyncio.create_task()`; always keep a reference and await it, or use a `TaskGroup`.
6. Always use `async with` for async context managers (database connections, HTTP sessions) to guarantee cleanup on cancellation.
7. Always use `asyncio.Semaphore` to rate-limit concurrent operations (HTTP requests, database queries) rather than spawning unbounded tasks.
8. Prefer `httpx.AsyncClient` over raw `aiohttp.ClientSession` for async HTTP when compatibility with `requests`-style API is wanted.
9. Always pass `debug=True` to `asyncio.run()` during development to surface accidentally unawaited coroutines and slow callbacks.
10. Never nest event loops; use `asyncio.run()` at the top level only. If you must call async code from sync code inside an already-running loop, restructure the code or use a dedicated thread with its own loop.

## patterns

### Basic asyncio.run with TaskGroup
```python
import asyncio

async def fetch(url: str) -> str:
    await asyncio.sleep(0.1)  # simulates async I/O
    return f"data from {url}"

async def main() -> None:
    results: list[str] = []
    async with asyncio.TaskGroup() as tg:
        for url in ["https://a.example", "https://b.example"]:
            tg.create_task(fetch(url))
    # All tasks complete or all cancelled on error

asyncio.run(main())
```

### Semaphore for rate limiting
```python
import asyncio

async def limited_fetch(sem: asyncio.Semaphore, url: str) -> str:
    async with sem:
        await asyncio.sleep(0.1)  # simulates async I/O
        return f"data from {url}"

async def main() -> None:
    sem = asyncio.Semaphore(10)  # max 10 concurrent requests
    urls = [f"https://example.com/{i}" for i in range(100)]
    async with asyncio.TaskGroup() as tg:
        tasks = [tg.create_task(limited_fetch(sem, u)) for u in urls]
    results = [t.result() for t in tasks]

asyncio.run(main())
```

### Producer-consumer with asyncio.Queue
```python
import asyncio

async def producer(queue: asyncio.Queue[int]) -> None:
    for i in range(5):
        await queue.put(i)
    await queue.put(-1)  # sentinel

async def consumer(queue: asyncio.Queue[int]) -> None:
    while (item := await queue.get()) != -1:
        print(f"processing {item}")
        queue.task_done()

async def main() -> None:
    queue: asyncio.Queue[int] = asyncio.Queue(maxsize=10)
    async with asyncio.TaskGroup() as tg:
        tg.create_task(producer(queue))
        tg.create_task(consumer(queue))

asyncio.run(main())
```

### Generator — yield, send, and close
```python
from typing import Generator

def accumulator() -> Generator[float, float, None]:
    """Yields running totals; accepts new values via send()."""
    total = 0.0
    while True:
        value = yield total
        if value is None:
            return
        total += value

gen = accumulator()
next(gen)          # prime the generator -> 0.0
gen.send(10.0)     # -> 10.0
gen.send(5.5)      # -> 15.5
gen.close()
```

## pitfalls

1. **Blocking the event loop** — A single `time.sleep(5)` or synchronous `requests.get()` inside a coroutine blocks every other task. Use `asyncio.to_thread(requests.get, url)` or an async HTTP library.
2. **Forgetting `await`** — Calling a coroutine without `await` returns a coroutine object and does nothing. Enable `asyncio.run(main(), debug=True)` to get warnings for unawaited coroutines.
3. **Fire-and-forget task garbage collection** — `asyncio.create_task(coro())` without storing the returned `Task` can lead to the task being garbage-collected before completion. Always hold a reference or use `TaskGroup`.
4. **`asyncio.gather` error handling** — By default, `gather` lets other tasks keep running when one raises. With `return_exceptions=True` exceptions become return values. `TaskGroup` is safer: it cancels siblings on first failure.
5. **Async generator cleanup** — Async generators require `async for` or explicit `aclose()`. If not properly closed (e.g., breaking out of `async for` without a `finally`), cleanup code after `yield` may never run.

## references

- https://docs.python.org/3/library/asyncio.html
- https://docs.python.org/3/library/asyncio-task.html
- https://docs.python.org/3/library/asyncio-sync.html
- https://docs.python.org/3/library/asyncio-queue.html
- https://peps.python.org/pep-0525/
- https://docs.python.org/3/reference/expressions.html#yield-expressions

## instructions

Use this expert when a developer asks about asyncio, async/await in Python, generators, or concurrency. Pair with `patterns.md` for general design patterns and `pitfalls.md` for common async mistakes.

## research

Deep Research prompt:

"Write a micro expert on Python asyncio and async programming. Cover: asyncio event loop (running, nesting, uvloop), async/await syntax (coroutine functions, awaitable objects), asyncio.gather vs asyncio.TaskGroup (error handling differences, structured concurrency), generators (yield, yield from, send, close, throw), async generators (async for, async yield), async context managers (async with, contextlib.asynccontextmanager), aiohttp/httpx for async HTTP, concurrency vs parallelism (asyncio vs threading vs multiprocessing), asyncio.Queue (producer-consumer), asyncio.Semaphore (rate limiting), asyncio.Lock, asyncio.Event, cancellation (Task.cancel, CancelledError), debugging async code (asyncio.run debug mode), and common async pitfalls (blocking the event loop, forgetting await, fire-and-forget tasks). Include self-contained code patterns for each."
