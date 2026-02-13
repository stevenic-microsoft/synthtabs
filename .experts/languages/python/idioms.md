# idioms

## purpose

Pythonic naming conventions, code organization, data modeling idioms, and style decisions that make code immediately recognizable as idiomatic Python.

## rules

1. Always use `snake_case` for functions, methods, and variables; `CamelCase` for classes; `UPPER_SNAKE` for module-level constants.
2. Always write docstrings for public modules, classes, and functions following PEP 257 (triple double-quotes, imperative mood, one-line summary first).
3. Always add type hints to function signatures; prefer `X | None` (PEP 604) over `Optional[X]` on Python 3.10+.
4. Prefer `dataclasses.dataclass` for mutable data holders, `typing.NamedTuple` for immutable records, and `TypedDict` for typed dictionary shapes.
5. Prefer comprehensions over `map`/`filter` with lambdas; switch to a generator expression or a `for` loop when the logic exceeds one condition.
6. Always use `with` statements for resource management (files, locks, database connections) instead of manual open/close.
7. Always use f-strings for string formatting; avoid `%` formatting and `str.format` in new code.
8. Always organize imports in three groups separated by blank lines: standard library, third-party, local — and sort alphabetically within each group.
9. Prefer `pathlib.Path` over `os.path` for all filesystem operations.
10. Always define `__repr__` on domain classes; define `__eq__` and `__hash__` together or not at all.
11. Never use `None` as a sentinel when `None` is a valid value; create an explicit sentinel with `_MISSING = object()`.
12. Prefer `enum.Enum` (or `enum.StrEnum` on 3.11+) over bare string or integer constants for fixed sets of values.

## patterns

### Dataclass with slots and type hints
```python
from dataclasses import dataclass, field

@dataclass(slots=True)
class User:
    """A registered user."""
    name: str
    email: str
    tags: list[str] = field(default_factory=list)

    def __repr__(self) -> str:
        return f"User(name={self.name!r}, email={self.email!r})"
```

### Comprehension, walrus operator, and generator expression
```python
# List comprehension with filter
names = [u.name for u in users if u.is_active]

# Walrus operator — compute once, filter, and use
results = [
    cleaned
    for raw in inputs
    if (cleaned := raw.strip().lower())
]

# Generator expression for lazy evaluation
total = sum(order.amount for order in orders)
```

### Context manager and pathlib
```python
from pathlib import Path

config_path = Path("settings") / "app.toml"
text = config_path.read_text(encoding="utf-8")
```

### Enum for fixed value sets
```python
from enum import Enum, auto

class Status(Enum):
    PENDING = auto()
    ACTIVE = auto()
    ARCHIVED = auto()
```

## pitfalls

1. **`is` vs `==` for comparisons** — Use `is` only for `None`, `True`, `False`, and sentinel objects. Never use `is` to compare strings or numbers; CPython interns small integers (-5 to 256) and some strings, making `is` appear to work until it silently doesn't.
2. **Mutable default in dataclass fields** — `@dataclass` with a bare `list` or `dict` as a default raises `ValueError`. Always use `field(default_factory=list)`.
3. **Comprehension variable leaking** — In Python 2, list comprehensions leaked their loop variable into the enclosing scope. Python 3 fixed this for list comprehensions, but `for` loops still leak. Be aware when migrating old code.
4. **`__eq__` makes the class unhashable** — Defining `__eq__` without `__hash__` silently sets `__hash__` to `None`, so instances cannot be put in sets or used as dict keys. Define both or use `@dataclass(frozen=True)`.

## references

- https://peps.python.org/pep-0008/
- https://peps.python.org/pep-0257/
- https://peps.python.org/pep-0484/
- https://peps.python.org/pep-0604/
- https://docs.python.org/3/library/dataclasses.html
- https://docs.python.org/3/library/pathlib.html
- https://docs.python.org/3/library/enum.html

## instructions

Use this expert when a developer asks about Python naming, style, code organization, or "how should I write this in Python." Pair with `patterns.md` for design-level guidance and `async.md` for asyncio patterns.

## research

Deep Research prompt:

"Write a micro expert on idiomatic Python style and conventions. Cover: PEP 8 naming (snake_case functions/variables, CamelCase classes, UPPER_SNAKE constants), PEP 257 docstrings, type hints (PEP 484/604), dataclasses vs namedtuples vs TypedDict, list/dict/set comprehensions, generator expressions, context managers (with statement), f-strings, walrus operator (:=), structural pattern matching (match/case), import organization (stdlib/third-party/local), __all__ exports, __slots__, dunder methods (__repr__, __eq__, __hash__), pathlib over os.path, enum.Enum usage, and absence handling (None, Optional, sentinel objects). Reference PEP 8, PEP 257, and the Python standard library documentation."
