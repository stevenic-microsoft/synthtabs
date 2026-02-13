# patterns

## purpose

Design patterns, composition strategies, and architectural idioms for Python — decorators, metaclasses, functional composition, and testing patterns.

## rules

1. Always apply `@functools.wraps(func)` inside every decorator to preserve the wrapped function's `__name__`, `__doc__`, and `__module__`.
2. Prefer `__init_subclass__` over metaclasses for simple class-registration or validation hooks.
3. Prefer `typing.Protocol` (structural subtyping) over `ABC` when the consumer does not control the implementation hierarchy.
4. Always expose alternative constructors as `@classmethod` factory methods (e.g., `Config.from_toml(path)`) rather than overloading `__init__` with multiple argument shapes.
5. Never pass a class where a callable will do — accept `Callable[..., T]` or a `Protocol` to keep strategies pluggable.
6. Always use `contextlib.contextmanager` for simple setup/teardown context managers instead of writing a full `__enter__`/`__exit__` class.
7. Prefer explicit dependency injection via constructor arguments over module-level global state or import-time side effects.
8. Always use `pytest.fixture` for shared test setup; prefer `monkeypatch` over `unittest.mock.patch` for attribute and environment replacement.
9. Prefer `functools.partial` over lambdas for fixing arguments in callbacks and composition.
10. Never use bare `except:` or `except Exception:` in resource management — let `contextlib.suppress` or specific exception types handle expected errors.

## patterns

### Decorator factory with functools.wraps
```python
import functools
import time
from typing import Callable, TypeVar

F = TypeVar("F", bound=Callable)

def retry(max_attempts: int = 3, delay: float = 1.0):
    """Retry a function up to max_attempts times on exception."""
    def decorator(func: F) -> F:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            last_exc: Exception | None = None
            for attempt in range(max_attempts):
                try:
                    return func(*args, **kwargs)
                except Exception as exc:
                    last_exc = exc
                    time.sleep(delay)
            raise last_exc  # type: ignore[misc]
        return wrapper  # type: ignore[return-value]
    return decorator
```

### Protocol for structural subtyping (PEP 544)
```python
from typing import Protocol, runtime_checkable

@runtime_checkable
class Serializable(Protocol):
    def to_dict(self) -> dict: ...

def save(obj: Serializable) -> None:
    data = obj.to_dict()
    # persist data ...
```

### Class method factory constructor
```python
from __future__ import annotations
import json
from dataclasses import dataclass
from pathlib import Path

@dataclass
class Config:
    host: str
    port: int

    @classmethod
    def from_json(cls, path: Path) -> Config:
        raw = json.loads(path.read_text(encoding="utf-8"))
        return cls(host=raw["host"], port=raw["port"])
```

### pytest fixture and parametrize
```python
import pytest

@pytest.fixture
def db_connection():
    conn = create_connection()
    yield conn
    conn.close()

@pytest.mark.parametrize("input_val, expected", [
    ("hello", 5),
    ("", 0),
    ("  spaces  ", 10),
])
def test_length(input_val: str, expected: int) -> None:
    assert len(input_val) == expected
```

## pitfalls

1. **Missing `@functools.wraps`** — Without it, the decorated function loses its original name and docstring, breaking introspection, Sphinx docs, and `pytest` node IDs.
2. **Overusing metaclasses** — Metaclasses complicate MRO resolution and confuse type checkers. Reach for `__init_subclass__`, class decorators, or `Protocol` first; use metaclasses only when you truly need to intercept class body creation.
3. **Mocking the wrong target** — `unittest.mock.patch` patches the *name where an object is looked up*, not where it is defined. If module `a` does `from b import func`, you must patch `a.func`, not `b.func`.
4. **Fixture scope mismatch** — A `session`-scoped fixture that depends on a `function`-scoped fixture raises a `ScopeMismatch` error. Always ensure fixture dependencies have equal or wider scope.

## references

- https://docs.python.org/3/library/functools.html
- https://docs.python.org/3/library/contextlib.html
- https://peps.python.org/pep-0544/
- https://docs.python.org/3/library/abc.html
- https://docs.pytest.org/en/stable/how-to/fixtures.html
- https://docs.python.org/3/reference/datamodel.html#customizing-class-creation

## instructions

Use this expert for design-level Python questions: how to structure code, which patterns to apply, and how to compose functionality. Pair with `idioms.md` for naming/style and `async.md` for asyncio-specific patterns.

## research

Deep Research prompt:

"Write a micro expert on Python design patterns and composition. Cover: decorator pattern (function decorators, class decorators, decorator factories, functools.wraps), metaclasses (when to use, __init_subclass__ as lighter alternative), abstract base classes (ABC, abstractmethod), Protocol classes (structural subtyping, PEP 544), factory functions and class methods as constructors, strategy pattern (callable objects, protocols), dependency injection (manual, inject libraries), functional composition (functools.partial, operator module, itertools recipes, toolz/funcy), context managers (contextlib.contextmanager, async context managers), testing patterns (pytest fixtures, parametrize, monkeypatch, mock/patch, property-based testing with hypothesis), and resource management. Include self-contained code patterns for each."
