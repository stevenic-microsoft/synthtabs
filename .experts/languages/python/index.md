# python-router

## purpose

Route Python language questions to the right expert. Covers writing idiomatic Python — style, patterns, pitfalls, and asyncio.

## task clusters

### Idioms & style
When: Pythonic style, naming conventions (snake_case, PEP 8), list comprehensions, generators, context managers, `with` statements, f-strings, type hints, dataclasses, dunder methods, import organization
Read:
- `idioms.md`

### Design patterns & composition
When: decorator patterns, metaclasses, abstract base classes, protocol classes, factory functions, strategy pattern, dependency injection, testing patterns (pytest fixtures), functional composition, itertools recipes
Read:
- `patterns.md`
Depends on: `idioms.md` (naming context)

### Gotchas & common mistakes
When: mutable default arguments, late binding closures, GIL, import cycles, `is` vs `==`, integer caching, shallow copy, `__all__` exports, relative imports, LEGB scoping
Read:
- `pitfalls.md`

### Asyncio & concurrency
When: asyncio event loop, `async`/`await`, `asyncio.gather`, `asyncio.TaskGroup`, generators, `yield`, `async for`, `async with`, `aiohttp`, concurrency vs parallelism, `multiprocessing`
Read:
- `async.md`
Depends on: `patterns.md` (base async patterns)

### Libraries & frameworks
When: Django, FastAPI, Flask, SQLAlchemy, Pydantic, Celery, LangChain,
  Pandas, NumPy, Scrapy, Airflow, or any Python framework/library question
→ Read `libraries/index.md`

### Composite: Full Python guidance
When: comprehensive Python review, new Python project setup, "teach me Pythonic code"
Read:
- `idioms.md`
- `patterns.md`
- `pitfalls.md`
- `async.md`

## file inventory

`async.md` | `idioms.md` | `patterns.md` | `pitfalls.md` | `libraries/index.md`
