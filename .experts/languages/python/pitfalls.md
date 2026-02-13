# pitfalls

## purpose

Non-obvious Python gotchas, surprising behavior, and common mistakes that trip up developers — including those coming from other languages.

## rules

1. Never use a mutable object (`list`, `dict`, `set`) as a default argument; use `None` and assign inside the function body.
2. Never use `is` to compare values; reserve `is` for `None`, `True`, `False`, and sentinel objects only.
3. Always use `copy.deepcopy` when you need a fully independent clone of nested mutable structures; never rely on `list()` or `dict()` for deep copies.
4. Never read and modify the same variable in a closure without `nonlocal`; augmented assignment (`x += 1`) without `nonlocal` triggers `UnboundLocalError`.
5. Always define `__hash__` alongside `__eq__`, or explicitly set `__hash__ = None` to document unhashability.
6. Never catch exceptions with bare `except:` — always catch specific exception types or at minimum `except Exception:`.
7. Always consume a generator into a list if you need to iterate it more than once; generators are single-use.
8. Never compare floats with `==`; use `math.isclose` with appropriate tolerances.
9. Avoid circular imports by moving imports inside functions or restructuring modules to share a common dependency.
10. Never mutate a class variable (list or dict) through an instance attribute and expect per-instance state — assign a new object in `__init__` instead.

## patterns

### Mutable default argument — the bug and the fix
```python
# BUG: shared list across all calls
def append_bad(item, target=[]):
    target.append(item)
    return target

# FIX: None sentinel with per-call creation
def append_good(item, target=None):
    if target is None:
        target = []
    target.append(item)
    return target
```

### Late binding closures in loops
```python
# BUG: all lambdas capture the same variable i
funcs_bad = [lambda: i for i in range(5)]
# funcs_bad[0]() == 4, not 0

# FIX: bind i as a default argument at creation time
funcs_good = [lambda i=i: i for i in range(5)]
# funcs_good[0]() == 0
```

### LEGB scoping — UnboundLocalError
```python
count = 0

def increment():
    # BUG: augmented assignment makes count local, but it is read before assignment
    # count += 1  # raises UnboundLocalError

    # FIX: declare nonlocal
    nonlocal count
    count += 1
```

## pitfalls

1. **Integer caching (`is` with ints)** — CPython caches integers from -5 to 256. `a = 257; b = 257; a is b` may be `True` or `False` depending on context (REPL vs script, same line vs different lines). Always use `==` for value comparison.
2. **Tuple containing mutable objects** — A tuple is immutable, but if it holds a list, `t = ([],); t[0].append(1)` succeeds. Using such a tuple as a dict key raises `TypeError` because the hash changes.
3. **`except` clause variable deletion** — In `except ValueError as e:`, the name `e` is deleted when the block exits. Referencing `e` after the block raises `NameError`. Assign to a different name inside the block if you need it later.
4. **Shallow copy surprises** — `list(nested)` and `nested.copy()` create a new outer list but share inner references. Mutating an inner list affects both copies.
5. **Float precision** — `0.1 + 0.2 == 0.3` is `False`. Use `math.isclose(0.1 + 0.2, 0.3)` or `decimal.Decimal` for exact arithmetic.
6. **Class variable mutation** — A mutable class variable (e.g., `shared: list = []`) is shared across all instances. Appending via one instance mutates it for every instance. Always initialize mutable state in `__init__`.
7. **Generator exhaustion** — Iterating a generator a second time silently yields nothing. If a function returns a generator and two consumers iterate it, the second sees an empty sequence.
8. **Dict ordering** — Dicts preserve insertion order as of Python 3.7 (CPython 3.6), but `**kwargs` ordering is guaranteed only from 3.7. Never rely on order in code targeting older runtimes.

## references

- https://docs.python.org/3/reference/executionmodel.html
- https://docs.python.org/3/library/copy.html
- https://docs.python.org/3/library/math.html#math.isclose
- https://docs.python.org/3/faq/programming.html#why-are-default-values-shared-between-objects
- https://docs.python.org/3/reference/compound_stmts.html#except-clause

## instructions

Use this expert when a developer reports unexpected Python behavior, asks "why doesn't this work?", or needs help debugging. Pair with `idioms.md` for the positive conventions and `async.md` for asyncio-specific gotchas.

## research

Deep Research prompt:

"Write a micro expert on Python pitfalls and gotchas. Cover: mutable default arguments (def f(x=[])), late binding closures in loops, GIL and threading limitations, import cycles (circular imports), is vs == (identity vs equality, integer caching -5 to 256), shallow copy vs deep copy (list.copy, copy.deepcopy), LEGB scoping (UnboundLocalError with augmented assignment), __all__ and wildcard imports, relative vs absolute imports, mutable class variables shared across instances, tuple mutability (tuple containing mutable objects), string interning surprises, float precision (0.1 + 0.2), dict ordering guarantees (3.7+), except clause variable scoping (deleted after block), generator exhaustion (single-use iteration), __eq__ without __hash__, and the walrus operator scoping. Include safe alternative patterns for each."
