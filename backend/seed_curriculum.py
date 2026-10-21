"""
Curriculum and Gotcha Seeders for PyMastery Studio
Populates all 6 Tiers with comprehensive conceptual explanations, CPython internals,
starter visualization code, edge-case gotchas, and automated challenge test suites.
"""

import json
from sqlalchemy.orm import Session
from .models import Tier, TopicModule, GotchaChallenge, UserProgress
from .database import engine, Base


TIERS_DATA = [
    {
        "number": 1,
        "title": "Tier 1: Core Foundations & CPython Memory Model",
        "description": "Master variables as pointers/names, CPython small integer caching, string interning, identity vs equality, mutability rules, and control flow mechanics.",
        "modules": [
            {
                "slug": "variables-references-identity",
                "title": "Variables as References, id(), and is vs ==",
                "visualizer_mode": "memory",
                "order_index": 1,
                "theory_markdown": """# Variables are Names, Not Boxes

In C or C++, a variable is a named memory location where a value is physically stored. Assigning a new value overwrites that memory address.

**In Python (CPython), variables are references (pointers) bound to objects residing on the Heap.**

### The `PyObject` Structure
Every Python object in CPython is represented as a C structure containing at least:
```c
struct _object {
    _PyObject_HEAD_EXTRA
    Py_ssize_t ob_refcnt;   // Reference counter for garbage collection
    PyTypeObject *ob_type;  // Pointer to object's type descriptor
};
```

When you write:
```python
a = [1, 2, 3]
b = a
```
No new list is created. Both `a` and `b` hold pointers referencing the exact same `PyListObject` on the heap!

### Identity (`is`) vs Equality (`==`)
- `a == b` invokes `a.__eq__(b)` to evaluate if the contents/values are equivalent.
- `a is b` compares `id(a) == id(b)`, checking if both pointers refer to the exact same physical memory address in CPython.
""",
                "gotchas_markdown": """### The Integer Interning & Small Integer Caching Gotcha
CPython pre-allocates and caches an array of singleton integer objects for all numbers in the range **`[-5, 256]`** at interpreter startup (`_PyLong_GetSmallInt_Ans`).
```python
x = 256
y = 256
print(x is y)  # True! Both point to the pre-cached PyLongObject singleton.

x = 257
y = 257
print(x is y)  # Often False in interactive shells! Two distinct PyLongObjects.
```
*Note:* In modern CPython compiling code blocks, peephole constant folding can intern identical numeric constants within the same code object, but dynamic calculations will prove they are distinct objects.
""",
                "starter_code": """# Observe how 'a' and 'b' alias the same heap object
a = [10, 20, 30]
b = a

# Mutating 'b' directly affects 'a'
b.append(40)

# Check identities
same_identity = (a is b)
print("a is b:", same_identity)
print("Content of a:", a)

# Small integer caching vs dynamic numbers
num1 = 250
num2 = 250
print("Small int caching (250 is 250):", num1 is num2)

large1 = 1000 + 5
large2 = 1000 + 5
print("Dynamic larger ints (1005 is 1005):", large1 is large2)
""",
                "challenge_prompt": """### Challenge: Memory Aliasing Detector
Write a function `detect_aliasing(items_list)` that takes a list of lists.
Return a set (or list) of tuples `(i, j)` where `i < j` and `items_list[i]` is identical in memory (`is`) to `items_list[j]`.
If no two elements share the same identity, return an empty list or set.
""",
                "test_code": """# Verification tests
shared = [1, 2]
independent = [1, 2]
test_input = [shared, independent, shared, [3, 4]]
res = set(detect_aliasing(test_input))
assert (0, 2) in res, f"Expected (0, 2) in aliases, got {res}"
assert len(res) == 1, f"Expected exactly 1 alias pair, got {len(res)}"
assert detect_aliasing([[1], [1], [1]]) in ([], set()), "Distinct lists with equal values should not be reported as aliases"
"""
            },
            {
                "slug": "mutability-inplace-vs-rebinding",
                "title": "Mutability & The += In-Place Mutation Trap",
                "visualizer_mode": "memory",
                "order_index": 2,
                "theory_markdown": """# Mutability vs Immutability in CPython

Python objects fall strictly into two memory design categories:
1. **Immutable:** `int`, `float`, `str`, `tuple`, `frozenset`, `bytes`, `bool`. Once allocated, their memory payload cannot be altered. Any operation that modifies them creates a brand new `PyObject`.
2. **Mutable:** `list`, `dict`, `set`, `bytearray`, and user-defined class instances. Their internal buffer can be resized or altered in place without changing their heap `id()`.

### The Mechanism of `+=` (`__iadd__` vs `__add__`)
When evaluating `x += y`:
- If `x` defines `__iadd__` (like `list`), it mutates the object in place and returns `self`.
- If `x` does not define `__iadd__` (like `int` or `tuple`), Python falls back to `x = x + y`, which creates a new object and rebinds the name `x`.
""",
                "gotchas_markdown": """### The Classic Tuple-List Mutation & Error Trap
Consider a tuple containing a mutable list:
```python
t = (1, 2, [3, 4])
t[2] += [5]
```
What happens? **BOTH: It raises a `TypeError` AND the list is successfully modified!**

**Why?**
1. Bytecode executes `GET_ITEM` to fetch `t[2]` (the list).
2. It calls `INPLACE_ADD` (`__iadd__`), which appends `5` directly into the list buffer in memory.
3. It tries to execute `STORE_SUBSCR` to assign the result back to `t[2]`.
4. Because `t` is a tuple, `STORE_SUBSCR` raises `TypeError: 'tuple' object does not support item assignment`.
5. The mutation had already completed before the assignment failed!
""",
                "starter_code": """# List in-place mutation vs Rebinding
lst1 = [1, 2]
lst2 = lst1
print("Before +=, lst1 id:", id(lst1))
lst1 += [3]
print("After +=, lst1 id:", id(lst1))
print("Did lst2 mutate with lst1?", lst2)

# Now compare with immutable numbers
n1 = 50
n2 = n1
n1 += 1
print("n1 changed to:", n1, "while n2 remains:", n2)
""",
                "challenge_prompt": """### Challenge: Pure vs In-Place Transformer
Write a function `pure_and_inplace(nums)`:
- Create a new list `squared` containing each number in `nums` squared (do NOT mutate the original `nums`).
- Then, in-place, reverse the original `nums` list without reassigning the list reference (use `.reverse()` or slice assignment `nums[:] = ...`).
- Return `squared`.
""",
                "test_code": """orig = [1, 2, 3, 4]
orig_id = id(orig)
result = pure_and_inplace(orig)
assert result == [1, 4, 9, 16], f"Expected squared [1, 4, 9, 16], got {result}"
assert id(orig) == orig_id, "Original list reference must not be rebound"
assert orig == [4, 3, 2, 1], f"Original list must be reversed in place, got {orig}"
"""
            },
            {
                "slug": "control-flow-and-loop-else",
                "title": "Truthiness, Short-Circuiting & Loop 'else' Clauses",
                "visualizer_mode": "bytecode",
                "order_index": 3,
                "theory_markdown": """# Control Flow & Short-Circuit Bytecode

Python's `and` and `or` operators do NOT return booleans! They return **the operand that determined the outcome**.
- `x or y`: Evaluates `x`. If truthy, returns `x` immediately (short-circuits). Otherwise returns `y`.
- `x and y`: Evaluates `x`. If falsy, returns `x` immediately. Otherwise returns `y`.

### The `for ... else` and `while ... else` construct
In Python, loops can have an `else:` block:
```python
for item in collection:
    if condition(item):
        break
else:
    # Executes ONLY if the loop completed naturally WITHOUT hitting 'break'!
    print("Not found")
```
Think of `else` in loops as `"nobreak"`!
""",
                "gotchas_markdown": """### Falsy Objects vs None
Avoid `if not value:` when `0`, `""`, or `[]` are valid inputs. Use `if value is None:` when checking for absence of value.
```python
def calculate_discount(price, custom_discount=None):
    # Gotcha: if custom_discount is 0, (0 or 10) evaluates to 10!
    discount = 10 if custom_discount is None else custom_discount
    return price - discount
```
""",
                "starter_code": """# Short-circuit returns actual values
val1 = [] or "fallback_string"
val2 = "default" and [1, 2, 3]
print("val1:", val1)
print("val2:", val2)

# Loop else demonstration: Prime search
num = 13
for i in range(2, num):
    if num % i == 0:
        print(num, "is composite")
        break
else:
    print(num, "is a PRIME number (no break triggered)!")
""",
                "challenge_prompt": """### Challenge: Prime Search with Loop Else
Write a function `is_prime(n)` using a `for ... else` loop:
- If `n < 2`, return `False`.
- Check divisors from 2 up to `int(n**0.5) + 1`. If divisible, `break` and return `False`.
- In the `else:` clause of the loop, return `True`.
""",
                "test_code": """assert is_prime(2) is True, "2 is prime"
assert is_prime(3) is True, "3 is prime"
assert is_prime(4) is False, "4 is not prime"
assert is_prime(17) is True, "17 is prime"
assert is_prime(1) is False, "1 is not prime"
assert is_prime(97) is True, "97 is prime"
"""
            }
        ]
    },
    {
        "number": 2,
        "title": "Tier 2: Data Structures & Under-the-Hood Mechanics",
        "description": "Explore dynamic array over-allocation in lists, open-addressing hash collisions in dicts/sets, shallow vs deep copying, and generator memory consumption.",
        "modules": [
            {
                "slug": "list-tuples-memory-overallocation",
                "title": "Lists & Tuples: Over-Allocation & Amortized O(1)",
                "visualizer_mode": "memory",
                "order_index": 1,
                "theory_markdown": """# CPython List Internals (`PyListObject`)

A Python list is NOT a linked list. It is a **contiguous dynamic array of pointers (`PyObject** ob_item`)**.

### The Over-Allocation Growth Formula
When you append to a list that is full, CPython allocates extra memory space to achieve **amortized $O(1)$** insertion time:
In CPython (`listobject.c`):
```c
new_allocated = ((size_t)newsize + (newsize >> 3) + (newsize < 9 ? 3 : 6));
```
When growing from 0 elements:
- Size 1 -> Allocated 4
- Size 5 -> Allocated 8
- Size 9 -> Allocated 16

### Tuples: Fixed & Compact
A tuple (`PyTupleObject`) is fixed in size at allocation. It does not need over-allocation padding, making it more memory-efficient than a list of identical values.
""",
                "gotchas_markdown": """### Shallow Copy vs Deep Copy Gotcha
`list.copy()` or `lst[:]` creates a **shallow copy**: a new list container is allocated, but its items point to the exact same child objects!
```python
orig = [[1, 2], [3, 4]]
shallow = orig.copy()
shallow[0].append(99)
print(orig[0])  # [1, 2, 99]! The inner list was shared!
```
To create a fully independent hierarchy, use `copy.deepcopy()`.
""",
                "starter_code": """import sys

# Watch list buffer resizing & capacity
items = []
print(f"Empty list size: {sys.getsizeof(items)} bytes")

for i in range(10):
    items.append(i)
    # Notice memory jumps at specific thresholds!
    print(f"Len: {len(items)}, Object Size: {sys.getsizeof(items)} bytes")
""",
                "challenge_prompt": """### Challenge: Matrix Deep Cloner
Write a function `deep_clone_matrix(matrix)` that recursively duplicates a 2D nested list without using the built-in `copy.deepcopy`.
Ensure that mutating any cell in the clone does not affect the original matrix.
""",
                "test_code": """orig = [[1, 2], [3, 4, [5, 6]]]
clone = deep_clone_matrix(orig)
assert clone == orig, "Clone must have equal values"
assert clone is not orig, "Outer container must be a new object"
assert clone[0] is not orig[0], "Inner row must be a new object"
assert clone[1][2] is not orig[1][2], "Deeply nested list must be a new object"
clone[1][2].append(7)
assert len(orig[1][2]) == 2, "Original matrix must remain untouched after mutating clone"
"""
            },
            {
                "slug": "dict-set-hash-tables-and-collisions",
                "title": "Dicts & Sets: Hash Tables & Mutation During Iteration",
                "visualizer_mode": "memory",
                "order_index": 2,
                "theory_markdown": """# CPython Compact Hash Table Architecture

Since Python 3.6+, dictionaries use a compact array design:
1. **Hash Index Table:** A sparse array storing indices.
2. **Entries Array:** A dense array of `(hash, key_ptr, value_ptr)` in insertion order.

This preserves insertion order while reducing memory consumption by up to 25%!

### The `__hash__` & `__eq__` Contract
For an object to be usable as a dict key or set element:
1. It must be **hashable** (must implement `__hash__` and return a deterministic integer).
2. If `a == b` evaluates to `True`, then `hash(a) == hash(b)` **MUST** hold true.
""",
                "gotchas_markdown": """### Modifying Dict/Set While Iterating Trap
CPython checks a mutation counter (`ma_version`) during iteration. If a key is inserted or deleted while a loop or generator is active over it:
```python
d = {'a': 1, 'b': 2}
for k in d:
    if k == 'a':
        del d[k]  # RuntimeError: dictionary changed size during iteration!
```
**Fix:** Iterate over a copy of the keys: `for k in list(d.keys()):`.
""",
                "starter_code": """# Hash equality and dict key collisions
class CustomKey:
    def __init__(self, val):
        self.val = val
    def __hash__(self):
        return 42  # Intentionally constant to force collision!
    def __eq__(self, other):
        return isinstance(other, CustomKey) and self.val == other.val

k1 = CustomKey("first")
k2 = CustomKey("second")

lookup = {k1: 100, k2: 200}
print("Both keys hashed to 42, but separate entries kept:", len(lookup))
print("Lookup k1:", lookup[k1])
print("Lookup k2:", lookup[k2])
""",
                "challenge_prompt": """### Challenge: Safe Dictionary Cleaner
Write a function `clean_dict(d, predicate)` that removes all key-value pairs from dictionary `d` for which `predicate(key, value)` is `True`.
The modifications MUST happen **in-place** without raising `RuntimeError: dictionary changed size during iteration`.
Return the modified dictionary `d`.
""",
                "test_code": """data = {'a': 10, 'b': 25, 'c': 5, 'd': 40}
cleaned = clean_dict(data, lambda k, v: v < 20)
assert cleaned is data, "Must mutate and return the exact same dict instance"
assert 'a' not in cleaned and 'c' not in cleaned, "Keys 'a' and 'c' should have been removed"
assert cleaned == {'b': 25, 'd': 40}, f"Expected {{'b': 25, 'd': 40}}, got {cleaned}"
"""
            },
            {
                "slug": "comprehensions-and-generators",
                "title": "Comprehensions vs Generators: Scope & Memory Footprint",
                "visualizer_mode": "memory",
                "order_index": 3,
                "theory_markdown": """# Comprehension Scopes & Generator Laziness

In Python 3, list, set, and dict comprehensions execute in their own isolated function scope.
Variables inside `[x for x in data]` will **not leak** into the enclosing namespace.

### List Comprehension vs Generator Expression
- `[x * 2 for x in range(1_000_000)]` allocates a full `PyListObject` storing 1 million pointers immediately.
- `(x * 2 for x in range(1_000_000))` returns a lightweight generator object (`PyGenObject`) that computes values lazily on-demand via the iterator protocol!
""",
                "gotchas_markdown": """### Generator Exhaustion Gotcha
Generators are **single-pass**! Once exhausted, they yield no more values.
```python
gen = (x for x in [1, 2, 3])
print(list(gen))  # [1, 2, 3]
print(list(gen))  # []! The generator is already exhausted!
```
""",
                "starter_code": """import sys

# Memory comparison
list_comp = [x ** 2 for x in range(1000)]
gen_exp = (x ** 2 for x in range(1000))

print(f"List comp memory: {sys.getsizeof(list_comp)} bytes")
print(f"Generator memory: {sys.getsizeof(gen_exp)} bytes")

# Generator step-by-step
print("First item:", next(gen_exp))
print("Second item:", next(gen_exp))
""",
                "challenge_prompt": """### Challenge: Chunked Generator Streamer
Write a generator function `chunked_stream(iterable, chunk_size)` that yields consecutive sub-lists of length `chunk_size` from `iterable`. The last chunk can be shorter if the total length is not evenly divisible.
Do not load the entire iterable into memory at once.
""",
                "test_code": """gen = chunked_stream(range(10), 3)
chunks = list(gen)
assert chunks == [[0, 1, 2], [3, 4, 5], [6, 7, 8], [9]], f"Expected 4 chunks, got {chunks}"
assert list(chunked_stream([], 5)) == [], "Empty iterable yields no chunks"
"""
            }
        ]
    },
    {
        "number": 3,
        "title": "Tier 3: Functions, Scopes & Functional Programming",
        "description": "Understand the LEGB lookup rule, closures and __closure__ cell objects, late binding lambdas, mutable default arguments, and decorator wrappers.",
        "modules": [
            {
                "slug": "legb-scopes-and-closures",
                "title": "LEGB Scope Resolution & Closure Cell Objects",
                "visualizer_mode": "memory",
                "order_index": 1,
                "theory_markdown": """# The LEGB Scope Hierarchy

When looking up a variable name, CPython searches scopes in strict order:
1. **L**ocal: Defined inside the current function frame.
2. **E**nclosing: Defined in outer/nested function scopes (nonlocal).
3. **G**lobal: Module-level variables defined at the top level.
4. **B**uilt-in: Python built-in names (`len`, `range`, `Exception`).

### Closures & `PyCellObject`
When an inner function accesses a variable from an enclosing scope, CPython packages that variable into a special **Cell object** (`__closure__`).
Both the outer and inner functions share this cell pointer, allowing the variable to persist even after the outer function has returned and its frame popped!
""",
                "gotchas_markdown": """### UnboundLocalError: Local Variable Referenced Before Assignment
If you assign to a variable anywhere inside a function, Python marks that variable as **Local** for the entire function during compilation:
```python
counter = 0
def increment():
    print(counter)  # UnboundLocalError!
    counter += 1
```
Because `counter += 1` contains an assignment, `counter` is classified as local, shadowing the global variable from line 1 of the function!
Fix: add `global counter`.
""",
                "starter_code": """def make_multiplier(factor):
    # 'factor' will be stored in a closure cell
    def multiply(x):
        return x * factor
    return multiply

double = make_multiplier(2)
triple = make_multiplier(3)

print("Double 5:", double(5))
print("Triple 5:", triple(5))

# Inspect closure cell
cell = double.__closure__[0]
print("Cell content:", cell.cell_contents)
""",
                "challenge_prompt": """### Challenge: Stateful Running Average Closure
Write a function `make_running_averager()` that returns a closure `averager(val)`:
Each time `averager(val)` is called with a new numeric value, it returns the cumulative average of all numbers seen so far.
Use the `nonlocal` keyword to maintain state without defining global variables or classes.
""",
                "test_code": """avg = make_running_averager()
assert avg(10) == 10.0, f"Expected 10.0, got {avg(10)}"
assert avg(20) == 15.0, f"Expected 15.0, got {avg(20)}"
assert avg(30) == 20.0, f"Expected 20.0, got {avg(30)}"
avg2 = make_running_averager()
assert avg2(100) == 100.0, "Independent instances must have isolated state"
"""
            },
            {
                "slug": "mutable-default-args-and-late-binding",
                "title": "The Mutable Default Arg Trap & Late Binding Lambdas",
                "visualizer_mode": "memory",
                "order_index": 2,
                "theory_markdown": """# Function Definition Mechanics

In CPython, `def` is an executable statement. When Python compiles a function:
1. Default argument expressions are evaluated **EXACTLY ONCE at function definition time**, not when the function is called!
2. The evaluated defaults are stored as a tuple on the function object itself: `func.__defaults__`.

If a default argument is a mutable object (like a `list` or `dict`), every invocation of the function that relies on the default will share and mutate the **same physical object**!

### Late Binding in Closures
Python's closures bind to **variable names**, not the values they held when the closure was created!
```python
funcs = [lambda: i for i in range(3)]
# All return 2 because 'i' was looked up when called, at which point the loop had finished!
```
To fix this, force early binding by capturing `i` as a default parameter: `lambda i=i: i`.
""",
                "gotchas_markdown": """### The Mutable Default Pattern
```python
# The Trap:
def append_to(element, target=[]):
    target.append(element)
    return target

# The Idiomatic Fix:
def append_to(element, target=None):
    if target is None:
        target = []
    target.append(element)
    return target
```
""",
                "starter_code": """# Inspect the function's __defaults__ attribute
def buggy_accumulator(val, items=[]):
    items.append(val)
    return items

print("Call 1:", buggy_accumulator(1))
print("Call 2:", buggy_accumulator(2))
print("Call 3:", buggy_accumulator(3))
print("Actual __defaults__:", buggy_accumulator.__defaults__)

# Late binding closure gotcha
lambdas = [lambda: i for i in range(4)]
print("Late binding results:", [f() for f in lambdas])

# Early binding fix
fixed_lambdas = [lambda i=i: i for i in range(4)]
print("Fixed early binding results:", [f() for f in fixed_lambdas])
""",
                "challenge_prompt": """### Challenge: Dynamic Function Pipeline with Early Binding
Write a function `build_adder_pipeline(increments)`:
Given a list of numbers (e.g. `[1, 5, 10]`), return a list of single-argument functions where the $i$-th function adds `increments[i]` to its input.
Ensure you prevent the late-binding gotcha so each function retains its corresponding increment.
""",
                "test_code": """pipeline = build_adder_pipeline([1, 5, 10])
assert len(pipeline) == 3, "Should return 3 functions"
assert pipeline[0](10) == 11, f"Expected 11, got {pipeline[0](10)}"
assert pipeline[1](10) == 15, f"Expected 15, got {pipeline[1](10)}"
assert pipeline[2](10) == 20, f"Expected 20, got {pipeline[2](10)}"
"""
            },
            {
                "slug": "decorators-and-wraps",
                "title": "Decorators, functools.wraps & Parameterized Wrappers",
                "visualizer_mode": "memory",
                "order_index": 3,
                "theory_markdown": """# Decorator Anatomy & Meta-Preservation

A decorator is syntactic sugar for passing a function into a higher-order callable and rebinding the identifier:
```python
@my_decorator
def greet(): ...
# Exactly equivalent to:
greet = my_decorator(greet)
```

### Why `@functools.wraps` is Crucial
Without `functools.wraps`, the decorated function loses its introspection metadata:
- `__name__` becomes `"wrapper"`
- `__doc__` is erased or replaced by the wrapper's docstring
- `__annotations__` are lost
`@functools.wraps(func)` copies these vital attributes from `func` to `wrapper`.
""",
                "gotchas_markdown": """### Decorator with Arguments Needs 3 Levels of Nesting!
```python
def repeat(num_times):
    def decorator_repeat(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            for _ in range(num_times):
                result = func(*args, **kwargs)
            return result
        return wrapper
    return decorator_repeat
```
""",
                "starter_code": """import functools

def timing_decorator(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        print(f"Calling: {func.__name__} with args: {args}")
        result = func(*args, **kwargs)
        print(f"Finished: {func.__name__} -> {result}")
        return result
    return wrapper

@timing_decorator
def calculate_area(width, height):
    \"\"\"Calculates rectangle area.\"\"\"
    return width * height

print("Area:", calculate_area(5, 8))
print("Preserved __name__:", calculate_area.__name__)
print("Preserved __doc__:", calculate_area.__doc__)
""",
                "challenge_prompt": """### Challenge: Memoization Decorator with Cache Inspection
Write a decorator `memoize` that caches function results based on arguments:
- If the function is called with the same positional arguments, return the cached value without re-executing.
- Attach an attribute `call_count` to the decorated function, counting only real executions (cache misses).
- Attach a dictionary attribute `cache` to inspect cached entries.
Use `@functools.wraps`.
""",
                "test_code": """import functools

@memoize
def fib(n):
    return n if n <= 1 else fib(n-1) + fib(n-2)

val1 = fib(6)
assert val1 == 8, f"Expected fib(6) == 8, got {val1}"
misses = fib.call_count
val2 = fib(6)
assert val2 == 8, "Cache hit must return correct result"
assert fib.call_count == misses, "Cache hit must not increment call_count"
assert (6,) in fib.cache, "Arguments should be stored as keys in cache dict"
"""
            }
        ]
    },
    {
        "number": 4,
        "title": "Tier 4: Advanced OOP & The Python Data Model",
        "description": "Master object lifecycle (__new__ vs __init__), C3 Linearization MRO diamonds, descriptors (__get__, __set__), and __slots__ memory optimization.",
        "modules": [
            {
                "slug": "object-lifecycle-new-vs-init",
                "title": "Object Creation Lifecycle: __new__ vs __init__",
                "visualizer_mode": "memory",
                "order_index": 1,
                "theory_markdown": """# The Two-Phase Instantiation Protocol

When you instantiate a class with `obj = MyClass(*args, **kwargs)`, Python runs two distinct methods:
1. `__new__(cls, *args, **kwargs)`: The **Allocator**. A static method responsible for creating and returning a new instance on the heap. Usually delegates to `super().__new__(cls)`.
2. `__init__(self, *args, **kwargs)`: The **Initializer**. Receives the newly created instance as `self` and populates attributes.

### Key Rule:
`__init__` is **ONLY called** if `__new__` returns an instance of `cls` (or a subclass).
If `__new__` returns an existing instance (e.g. Singleton pattern) or an object of a different type, Python skips `__init__`!
""",
                "gotchas_markdown": """### Singleton Implementation via `__new__`
```python
class Singleton:
    _instance = None
    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
```
*Gotcha:* Even if `__new__` returns the existing `_instance`, Python will still call `__init__` on it every time `Singleton()` is invoked!
""",
                "starter_code": """class Point:
    def __new__(cls, x, y):
        print(f"1. __new__ allocating memory for {cls.__name__}")
        instance = super().__new__(cls)
        return instance

    def __init__(self, x, y):
        print(f"2. __init__ initializing state: x={x}, y={y}")
        self.x = x
        self.y = y

p = Point(10, 20)
print("Resulting object:", p.__dict__)
""",
                "challenge_prompt": """### Challenge: Thread-Safe Singleton Metaclass / Class
Implement a class `StrictSingleton` using `__new__` such that:
- Any number of calls to `StrictSingleton()` return the exact same object reference (`is`).
- An attribute `initialized` is set to `True` on the first instantiation and is not re-initialized on subsequent calls.
""",
                "test_code": """s1 = StrictSingleton()
s1.payload = "data_mastery"
s2 = StrictSingleton()
assert s1 is s2, "Both instances must have identical memory identity (s1 is s2)"
assert s2.payload == "data_mastery", "State must persist across singleton accesses"
"""
            },
            {
                "slug": "mro-and-c3-linearization",
                "title": "Cooperative super(), Diamonds & C3 Linearization MRO",
                "visualizer_mode": "memory",
                "order_index": 2,
                "theory_markdown": """# The Diamond Problem & C3 Linearization

In multiple inheritance, Python resolves attribute and method lookups using the **Method Resolution Order (MRO)** computed via the **C3 Linearization Algorithm**.

### The C3 Guarantees:
1. Subclasses appear before their parents.
2. Parent order listed in class definition `class Sub(A, B)` is preserved.
3. Monotonicity: if `A` precedes `B` in one MRO, it precedes `B` across all subclasses.

### Cooperative `super()`
`super()` does NOT call your parent class!
`super().method()` looks up the **next class in the MRO of the calling instance**, regardless of inheritance hierarchy.
""",
                "gotchas_markdown": """### Inconsistent Hierarchy (TypeError)
If your inheritance graph violates C3 linearization rules, Python raises `TypeError: Cannot create a consistent method resolution order (MRO) for bases ...` at class definition time!
""",
                "starter_code": """# Diamond Inheritance
class Root:
    def ping(self):
        return ["Root"]

class Left(Root):
    def ping(self):
        return ["Left"] + super().ping()

class Right(Root):
    def ping(self):
        return ["Right"] + super().ping()

class Diamond(Left, Right):
    def ping(self):
        return ["Diamond"] + super().ping()

d = Diamond()
print("Execution sequence:", d.ping())
print("Diamond MRO:", [cls.__name__ for cls in Diamond.__mro__])
""",
                "challenge_prompt": """### Challenge: Cooperative Logger Pipeline
Build a cooperative diamond hierarchy:
- Base class `DataHandler` with method `process(data)` returning `f"Raw: {data}"`.
- Subclass `Sanitizer(DataHandler)` calling `super().process(data.strip())` and prepending `"Cleaned -> "`.
- Subclass `UpperCaser(DataHandler)` calling `super().process(data.upper())` and prepending `"Uppercased -> "`.
- Final class `Pipeline(Sanitizer, UpperCaser)` inheriting both.
Verify the cooperative `super()` flow.
""",
                "test_code": """p = Pipeline()
out = p.process("  hello world  ")
assert "Cleaned" in out and "Uppercased" in out and "HELLO WORLD" in out, f"Unexpected pipeline result: {out}"
mro_names = [c.__name__ for c in Pipeline.__mro__]
assert mro_names == ['Pipeline', 'Sanitizer', 'UpperCaser', 'DataHandler', 'object'], f"Invalid MRO: {mro_names}"
"""
            },
            {
                "slug": "descriptors-and-slots",
                "title": "Descriptors (__get__, __set__) & __slots__ Optimization",
                "visualizer_mode": "memory",
                "order_index": 3,
                "theory_markdown": """# Descriptors: The Engine Behind Properties & Methods

A **descriptor** is any object that implements at least one of:
- `__get__(self, instance, owner=None)`
- `__set__(self, instance, value)`
- `__delete__(self, instance)`

Every Python `@property`, `@staticmethod`, `@classmethod`, and method function is implemented as a descriptor!
When you access `obj.attribute`, Python checks if the attribute on `type(obj)` is a descriptor and executes its `__get__`.

### `__slots__`: Stripping the `__dict__`
Normally, every instance has a dynamic dictionary `__dict__` to store attributes (costing ~150-200 bytes per instance).
Defining `__slots__ = ('x', 'y')`:
1. Replaces the instance `__dict__` with a fixed-size C array of struct pointers.
2. Saves substantial RAM when millions of instances are instantiated.
3. Prevents arbitrary attribute assignment.
""",
                "gotchas_markdown": """### Data vs Non-Data Descriptors
- **Data Descriptor:** Defines `__set__` or `__delete__`. Always takes precedence over instance `__dict__`.
- **Non-Data Descriptor:** Only defines `__get__` (like regular methods). Can be shadowed by writing directly to `obj.__dict__['name'] = val`.
""",
                "starter_code": """import sys

# Descriptors: Integer Type Validator
class ValidatedInteger:
    def __set_name__(self, owner, name):
        self.private_name = f"_{name}"

    def __get__(self, obj, objtype=None):
        if obj is None:
            return self
        return getattr(obj, self.private_name, 0)

    def __set__(self, obj, value):
        if not isinstance(value, int) or value < 0:
            raise ValueError(f"Value must be a positive integer, got {value}")
        setattr(obj, self.private_name, value)

class Product:
    price = ValidatedInteger()
    def __init__(self, price):
        self.price = price

p = Product(50)
print("Product price via descriptor:", p.price)
""",
                "challenge_prompt": """### Challenge: Memory-Optimized Slotted Point
Create a class `SlottedVector3D` that:
- Uses `__slots__ = ('x', 'y', 'z')` to avoid `__dict__`.
- Implements `__init__(self, x, y, z)`.
- Implements `magnitude(self)` returning `(x**2 + y**2 + z**2) ** 0.5`.
- Raises `AttributeError` when an undeclared attribute is assigned (inherent to `__slots__`).
""",
                "test_code": """v = SlottedVector3D(3, 4, 12)
assert v.magnitude() == 13.0, f"Expected magnitude 13.0, got {v.magnitude()}"
assert not hasattr(v, '__dict__'), "SlottedVector3D must not have a __dict__ attribute"
try:
    v.w = 99
    assert False, "Should raise AttributeError when setting unslotted attribute"
except AttributeError:
    pass
"""
            }
        ]
    },
    {
        "number": 5,
        "title": "Tier 5: Iterators, Generators, Context Managers & Concurrency",
        "description": "Master the iteration protocol, generator suspension states, context manager exceptions, and Python concurrency models (GIL, threading, asyncio).",
        "modules": [
            {
                "slug": "iteration-protocol-and-generators",
                "title": "The Iteration Protocol & Generator Frame Suspension",
                "visualizer_mode": "memory",
                "order_index": 1,
                "theory_markdown": """# The Iteration Protocol: `__iter__` & `__next__`

Python iteration is governed by two methods:
1. **Iterable:** An object implementing `__iter__()` that returns an **Iterator**.
2. **Iterator:** An object implementing `__next__()` that returns consecutive values, raising `StopIteration` when finished.

### Generator Frame Suspension
A regular function executes from start to return, destroying its stack frame upon completion.
A **Generator function** (containing `yield`) returns a `PyGenObject`. Calling `next(gen)` resumes execution of its suspended stack frame (`f_lasti` points to the last bytecode instruction offset), preserves all local variables, runs until the next `yield`, and pauses again!
""",
                "gotchas_markdown": """### Iterators are Exhaustible!
An iterator is its own iterable (`iter(it) is it`), but once it raises `StopIteration`, subsequent calls will continue to raise `StopIteration`.
```python
it = iter([1, 2, 3])
print(list(it))  # [1, 2, 3]
print(list(it))  # []!
```
""",
                "starter_code": """# Custom Fibonacci Iterator
class FibIterator:
    def __init__(self, limit):
        self.limit = limit
        self.count = 0
        self.a, self.b = 0, 1

    def __iter__(self):
        return self

    def __next__(self):
        if self.count >= self.limit:
            raise StopIteration
        val = self.a
        self.a, self.b = self.b, self.a + self.b
        self.count += 1
        return val

fibs = list(FibIterator(6))
print("First 6 Fibonacci numbers:", fibs)
""",
                "challenge_prompt": """### Challenge: Bidirectional Generator with .send()
Create a generator function `accumulator(initial=0)`:
- Maintain a running sum initialized to `initial`.
- In a loop, `yield` the current sum.
- If a value is sent into the generator via `.send(val)`, add `val` to the running sum.
""",
                "test_code": """gen = accumulator(10)
assert next(gen) == 10, "First next() should yield initial value"
assert gen.send(5) == 15, "send(5) should update total to 15"
assert gen.send(20) == 35, "send(20) should update total to 35"
assert next(gen) == 35, "next() should yield current total without adding anything"
"""
            },
            {
                "slug": "context-managers-and-with",
                "title": "Context Managers (__enter__, __exit__) & Exception Handling",
                "visualizer_mode": "memory",
                "order_index": 2,
                "theory_markdown": """# The Context Management Protocol

The `with` statement guarantees cleanup of resources (file handles, database locks, network sockets).
It relies on:
1. `__enter__(self)`: Executes setup logic and returns the value bound to the `as <var>` clause.
2. `__exit__(self, exc_type, exc_val, exc_tb)`: Always executes upon leaving the block.

### Suppressing Exceptions in `__exit__`:
If an exception occurred inside the `with` block:
- CPython passes `exc_type`, `exc_val`, and `exc_tb` to `__exit__`.
- If `__exit__` returns a truthy value (`True`), **the exception is completely suppressed**!
- If it returns `False` or `None`, the exception is re-raised.
""",
                "gotchas_markdown": """### `contextlib.contextmanager` Generator Mechanics
When using `@contextmanager`:
- The code before `yield` runs in `__enter__`.
- The `yield` expression produces the `as` target.
- The code after `yield` runs in `__exit__`.
- If an exception occurred inside the `with` block, it is raised at the `yield` statement! Wrap `yield` in `try ... finally` to guarantee cleanup!
""",
                "starter_code": """class SuppressExceptions:
    def __init__(self, *exceptions_to_catch):
        self.exceptions_to_catch = exceptions_to_catch

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type is not None and issubclass(exc_type, self.exceptions_to_catch):
            print(f"Caught and suppressed: {exc_type.__name__}: {exc_val}")
            return True  # Suppresses exception!
        return False

with SuppressExceptions(ZeroDivisionError):
    print("Doing division...")
    res = 1 / 0
    print("This line will not run")

print("Execution safely continued after with-block!")
""",
                "challenge_prompt": """### Challenge: Rollback State Context Manager
Write a context manager class `StateRollback(target_dict)`:
- On enter, take a snapshot of all keys and values in `target_dict`.
- If the `with` block completes without errors, keep the changes.
- If an exception occurs, restore `target_dict` back to its initial snapshot, and allow the exception to bubble up (return `False` from `__exit__`).
""",
                "test_code": """data = {'balance': 100, 'items': ['book']}
try:
    with StateRollback(data):
        data['balance'] += 50
        data['items'].append('pen')
        raise ValueError("Transaction failed midway!")
except ValueError:
    pass

assert data == {'balance': 100, 'items': ['book']}, f"Dict should have rolled back, got {data}"

with StateRollback(data):
    data['balance'] = 500
assert data['balance'] == 500, "Successful transaction should persist"
"""
            },
            {
                "slug": "concurrency-gil-and-asyncio",
                "title": "Concurrency Internals: GIL, Threading vs Asyncio",
                "visualizer_mode": "bytecode",
                "order_index": 3,
                "theory_markdown": """# Concurrency Internals in CPython

### The Global Interpreter Lock (GIL)
The GIL is a mutual exclusion lock held by CPython to prevent multiple native OS threads from executing Python bytecode simultaneously.
- **CPU-bound tasks** in `threading` do NOT run in parallel in standard CPython; threads fight over the GIL.
- **I/O-bound tasks** release the GIL while waiting for disk/network I/O, allowing other threads to run.
- For true CPU parallelism, use `multiprocessing` (multiple separate CPython interpreter processes).

### Asyncio Event Loop & Coroutines
`asyncio` is single-threaded, cooperative multitasking:
- Coroutines (`async def`) yield control voluntarily at `await` points.
- No OS thread context switching overhead.
- A single thread can manage thousands of concurrent network connections!
""",
                "gotchas_markdown": """### Blocking the Event Loop
Calling a blocking synchronous function (like `time.sleep()` or synchronous `requests.get()`) inside an `async def` function freezes the entire event loop, stopping all other concurrent tasks!
Use `asyncio.sleep()` or run blocking code in `loop.run_in_executor()`.
""",
                "starter_code": """import asyncio

async def fetch_data(task_id, delay):
    print(f"Task {task_id} starting...")
    await asyncio.sleep(delay)  # Yields control back to the event loop
    print(f"Task {task_id} finished after {delay}s!")
    return task_id * 10

async def main():
    results = await asyncio.gather(
        fetch_data(1, 0.05),
        fetch_data(2, 0.02),
        fetch_data(3, 0.01)
    )
    print("All tasks finished:", results)

asyncio.run(main())
""",
                "challenge_prompt": """### Challenge: Async Rate-Limited Task Worker
Write an asynchronous coroutine `async_batch_processor(tasks, processor_fn)`:
- Run all async tasks concurrently using `asyncio.gather`.
- Return a list of results in the order tasks were provided.
- If any individual task raises an exception, catch it and store the exception object in that position instead of failing the whole batch (hint: `return_exceptions=True` in `asyncio.gather`).
""",
                "test_code": """import asyncio

async def sample_task(x):
    if x < 0:
        raise ValueError("Negative value")
    return x * 2

async def runner():
    res = await async_batch_processor([-1, 2, 4], sample_task)
    assert isinstance(res[0], ValueError), "Negative input should yield caught ValueError"
    assert res[1] == 4 and res[2] == 8, f"Expected [ValueError, 4, 8], got {res}"

asyncio.run(runner())
"""
            }
        ]
    },
    {
        "number": 6,
        "title": "Tier 6: Metaprogramming, Internals & Algorithmic Logic Mastery",
        "description": "Master metaclasses, GC cyclic garbage collection, reference counting, and interactive algorithmic visual labs (Two Pointers, Recursion Call-Trees, DP).",
        "modules": [
            {
                "slug": "metaclasses-and-type",
                "title": "Everything is an Object: type & Custom Metaclasses",
                "visualizer_mode": "memory",
                "order_index": 1,
                "theory_markdown": """# Classes are Instances of `type`

In Python, classes themselves are runtime objects on the heap!
When you write `class Dog: pass`, Python executes `type('Dog', (object,), {})` to instantiate a class object.

### The Metaclass Hierarchy:
```
Instance  -->  Class  -->  Metaclass (type)
```
A **metaclass** is a class whose instances are classes.
By defining a custom metaclass inheriting from `type`, you can intercept, modify, register, or validate class creation before the class object even exists!

### Metaclass Hooks:
- `__prepare__(mcs, name, bases)`: Returns a mapping (e.g. `OrderedDict`) to hold namespace during class definition.
- `__new__(mcs, name, bases, namespace)`: Allocates the new class object.
- `__init__(cls, name, bases, namespace)`: Initializes the class object.
""",
                "gotchas_markdown": """### Metaclass Conflict
A class cannot inherit from multiple parent classes that have different metaclasses unless one metaclass is a subclass of all others!
""",
                "starter_code": """# Dynamic class creation with type()
def bark(self):
    return f"{self.name} says Woof!"

# type(name, bases, dict)
Dog = type('Dog', (object,), {'species': 'Canine', 'bark': bark, '__init__': lambda self, name: setattr(self, 'name', name)})

d = Dog("Rex")
print("Dog instance:", d.name, d.species)
print("Dog method:", d.bark())
print("Type of Dog class:", type(Dog))
""",
                "challenge_prompt": """### Challenge: Attribute Enforcer Metaclass
Create a metaclass `RequireAttributesMeta` that enforces child classes to define an attribute or method named `execute`.
If a class specifies `metaclass=RequireAttributesMeta` and does not define `execute`, raise a `TypeError("Missing required 'execute' method")`.
""",
                "test_code": """class ValidWorker(metaclass=RequireAttributesMeta):
    def execute(self):
        return "working"

assert hasattr(ValidWorker, 'execute'), "ValidWorker should compile and have execute"

try:
    class InvalidWorker(metaclass=RequireAttributesMeta):
        pass
    assert False, "Should raise TypeError for missing execute method"
except TypeError as te:
    assert "execute" in str(te), f"Expected 'execute' mentioned in error, got {te}"
"""
            },
            {
                "slug": "garbage-collection-and-refcycles",
                "title": "CPython Garbage Collection: Ref Counting & Cyclic GC",
                "visualizer_mode": "memory",
                "order_index": 2,
                "theory_markdown": """# The Two-Tiered CPython Garbage Collector

CPython uses two complementary memory management strategies:
1. **Reference Counting (Primary):**
   - Each object's `ob_refcnt` is incremented whenever a new pointer references it, and decremented when references drop.
   - When `ob_refcnt == 0`, the memory is **immediately freed**.

2. **Generational Cyclic Garbage Collector (Secondary):**
   - Reference counting alone cannot detect **isolated reference cycles** (e.g., `a.child = b; b.parent = a`).
   - The cyclic GC scans objects in 3 generations (Gen 0, Gen 1, Gen 2) using trial deletion algorithms to find unreachable islands of cycles and reclaim them!
""",
                "gotchas_markdown": """### `weakref` for Cycle Prevention
To avoid circular references without waiting for cyclic GC runs, use weak references (`import weakref`). A `weakref` points to an object without incrementing its `ob_refcnt`!
""",
                "starter_code": """import sys
import gc

class Node:
    def __init__(self, name):
        self.name = name
        self.partner = None

# Create circular reference
node_a = Node("A")
node_b = Node("B")
node_a.partner = node_b
node_b.partner = node_a

# Delete names from local frame
del node_a
del node_b

# The cycle is now orphaned on the heap!
unreachable = gc.collect()
print("Cyclic GC collected orphaned cycle objects:", unreachable)
""",
                "challenge_prompt": """### Challenge: Weak Reference Cache
Build a class `WeakCache` that stores objects using `weakref.ref`:
- `set(key, obj)`: Stores a weak reference to `obj` under `key`.
- `get(key)`: Returns the live object, or `None` if the object has been garbage-collected or key doesn't exist.
""",
                "test_code": """import gc

cache = WeakCache()
class Item: pass

item = Item()
cache.set("active", item)
assert cache.get("active") is item, "Should return live object"

del item
gc.collect()
assert cache.get("active") is None, "Should return None after object is collected"
"""
            },
            {
                "slug": "algorithmic-recursion-calltree",
                "title": "Algorithmic Logic: Recursion & Backtracking Call-Tree",
                "visualizer_mode": "recursion",
                "order_index": 3,
                "theory_markdown": """# Visualizing Call Stack Expansion & Backtracking

When a function invokes itself recursively, CPython creates a new execution stack frame for each call.
- The depth of the call stack grows linearly with recursion depth.
- In backtracking algorithms (like generating permutations, subsets, or solving Sudoku), the call stack represents a **depth-first search traversal of the state tree**.
- Understanding the return value propagation from leaf nodes back up to the root is the core of mastering recursive logic!
""",
                "gotchas_markdown": """### RecursionLimit Exceeded
CPython imposes a default recursion limit (typically 1000 frames via `sys.getrecursionlimit()`) to prevent C stack overflows:
```python
def infinite():
    return infinite()
# RecursionError: maximum recursion depth exceeded!
```
""",
                "starter_code": """# Watch the recursion call tree build in real-time!
def fibonacci(n):
    if n <= 0:
        return 0
    if n == 1:
        return 1
    left = fibonacci(n - 1)
    right = fibonacci(n - 2)
    return left + right

res = fibonacci(4)
print("fibonacci(4) =", res)
""",
                "challenge_prompt": """### Challenge: Subset Sum Path Backtracker
Write a recursive function `find_subset_sum(nums, target)`:
Given a list of positive integers `nums` and a `target`, return a list of numbers from `nums` that sum up to `target`.
If no such combination exists, return `None`.
""",
                "test_code": """res1 = find_subset_sum([2, 3, 7, 8], 10)
assert res1 is not None and sum(res1) == 10, f"Expected subset summing to 10, got {res1}"
assert all(x in [2, 3, 7, 8] for x in res1), "All elements must be from original list"
res2 = find_subset_sum([2, 4], 7)
assert res2 is None, "Should return None when impossible"
"""
            },
            {
                "slug": "algorithmic-two-pointers-and-sliding-window",
                "title": "Algorithmic Logic: Two Pointers & Sliding Window",
                "visualizer_mode": "algorithm",
                "order_index": 4,
                "theory_markdown": """# The Two Pointers & Sliding Window Paradigm

Two-pointer techniques transform brute-force $O(N^2)$ array/string problems into optimal $O(N)$ linear scans:
1. **Opposite Ends (Left & Right):** Ideal for sorted arrays (e.g., Two Sum II, Container With Most Water, Palindrome verification).
2. **Fast & Slow (Floyd's Cycle):** Used in linked lists and array duplicate detection.
3. **Sliding Window:** Expanding a `right` pointer until a condition is met, then contracting the `left` pointer to maintain the minimum/maximum valid window.
""",
                "gotchas_markdown": """### Off-By-One Boundary Errors
When contracting a sliding window, ensure the condition accurately updates the window state before moving the pointer!
""",
                "starter_code": """# Two Pointers: Trapping Water or Sorted Two Sum
nums = [2, 7, 11, 15, 19, 23]
target = 26

left = 0
right = len(nums) - 1
found_indices = None

while left < right:
    current_sum = nums[left] + nums[right]
    if current_sum == target:
        found_indices = (left, right)
        break
    elif current_sum < target:
        left += 1
    else:
        right -= 1

print(f"Target {target} found at indices {found_indices}: {nums[left]} + {nums[right]}")
""",
                "challenge_prompt": """### Challenge: Maximum Subarray of Size K (Sliding Window)
Write a function `max_sub_array_of_size_k(k, nums)`:
Find the maximum sum of any contiguous subarray of size `k`.
Return `0` if `len(nums) < k` or `k <= 0`.
Implement in $O(N)$ time complexity using a single pass sliding window.
""",
                "test_code": """assert max_sub_array_of_size_k(3, [2, 1, 5, 1, 3, 2]) == 9, "Subarray [5, 1, 3] sums to 9"
assert max_sub_array_of_size_k(2, [2, 3, 4, 1, 5]) == 7, "Subarray [3, 4] sums to 7"
assert max_sub_array_of_size_k(5, [1, 2]) == 0, "k > len(nums) returns 0"
"""
            }
        ]
    }
]


GOTCHA_CHALLENGES = [
    {
        "title": "The Mutable Default Parameter Trap",
        "category": "Functions & Evaluation",
        "tricky_code": """def append_val(val, target=[]):
    target.append(val)
    return target

a = append_val(1)
b = append_val(2)
print(a)""",
        "options_json": json.dumps(["[1]", "[1, 2]", "[2]", "TypeError: target is immutable"]),
        "correct_output": "[1, 2]",
        "deep_explanation": "Default argument expressions are evaluated once when the function is defined, not when it is called. The list `target` is created once in memory and stored in `append_val.__defaults__`. Both calls share and mutate the exact same list object on the heap!"
    },
    {
        "title": "Late Binding Closures in List Comprehensions",
        "category": "Closures & Scopes",
        "tricky_code": """multipliers = [lambda x: x * i for i in range(4)]
print([m(2) for m in multipliers])""",
        "options_json": json.dumps(["[0, 2, 4, 6]", "[6, 6, 6, 6]", "[0, 0, 0, 0]", "IndexError"]),
        "correct_output": "[6, 6, 6, 6]",
        "deep_explanation": "Python closures bind variables by name, not by value at creation time. When the loop finishes, `i` equals 3 in the enclosing scope. When the lambdas are later called, they all look up `i`, which is 3, computing `2 * 3 = 6` for all four functions!"
    },
    {
        "title": "Small Integer Caching vs Dynamic Numbers",
        "category": "Memory & Internals",
        "tricky_code": """a = 256
b = 256
c = 257
d = int("257")
print(a is b, c is d)""",
        "options_json": json.dumps(["True True", "True False", "False False", "False True"]),
        "correct_output": "True False",
        "deep_explanation": "CPython pre-allocates small integer singletons for range [-5, 256]. Hence `256 is 256` is always True. For numbers outside that range like 257, dynamic creation creates distinct `PyLongObject` instances on the heap, so `c is d` evaluates to False."
    },
    {
        "title": "Tuple Mutation Error AND In-Place Mutation",
        "category": "Data Structures & Bytecode",
        "tricky_code": """t = (1, 2, [3, 4])
try:
    t[2] += [5]
except TypeError:
    pass
print(t[2])""",
        "options_json": json.dumps(["[3, 4]", "[3, 4, 5]", "TypeError", "(1, 2, [3, 4])"]),
        "correct_output": "[3, 4, 5]",
        "deep_explanation": "The `+=` operator executes `__iadd__` on the list at `t[2]`, mutating it in place to `[3, 4, 5]`. Then Python attempts `STORE_SUBSCR` to assign the result back to `t[2]`, which raises `TypeError` because tuples are immutable. The in-place mutation had already succeeded before the assignment failed!"
    },
    {
        "title": "Chained Comparison Operators",
        "category": "Syntax & Semantics",
        "tricky_code": """res = False == False in [False]
print(res)""",
        "options_json": json.dumps(["True", "False", "SyntaxError", "TypeError"]),
        "correct_output": "True",
        "deep_explanation": "Most developers assume this evaluates as `(False == False) in [False]`, which would be `True in [False]` -> `False`. But Python chains comparison operators! `A == B in C` is parsed as `(A == B) and (B in C)`. Thus, it evaluates `(False == False) and (False in [False])`, which is `True and True` -> `True`!"
    },
    {
        "title": "Class Variable vs Instance Shadowing",
        "category": "Object-Oriented Programming",
        "tricky_code": """class Dog:
    tricks = []

d1 = Dog()
d2 = Dog()
d1.tricks.append("roll")
d2.tricks = ["sit"]
print(d1.tricks, d2.tricks)""",
        "options_json": json.dumps(["['roll'] ['sit']", "['roll', 'sit'] ['sit']", "['roll'] ['roll', 'sit']", "['roll'] ['roll']"]),
        "correct_output": "['roll'] ['sit']",
        "deep_explanation": "`d1.tricks.append(...)` mutated the shared class attribute `Dog.tricks`. But `d2.tricks = ['sit']` performed an assignment on `d2`, creating a new instance attribute in `d2.__dict__` that shadows the class attribute without mutating it!"
    },
    {
        "title": "The `for ... else` Loop Clause",
        "category": "Control Flow",
        "tricky_code": """found = False
for i in [1, 2, 3]:
    if i == 5:
        found = True
        break
else:
    found = "Finished without break"
print(found)""",
        "options_json": json.dumps(["False", "True", "Finished without break", "None"]),
        "correct_output": "Finished without break",
        "deep_explanation": "In Python, a loop's `else` block executes when the loop finishes naturally without encountering a `break` statement. Since 5 was not in `[1, 2, 3]`, the loop never hit `break`, and the `else` block executed!"
    },
    {
        "title": "String Multiplication and List References",
        "category": "Memory & References",
        "tricky_code": """board = [[0] * 2] * 2
board[0][0] = 99
print(board)""",
        "options_json": json.dumps(["[[99, 0], [0, 0]]", "[[99, 0], [99, 0]]", "[[99, 99], [0, 0]]", "[[99, 99], [99, 99]]"]),
        "correct_output": "[[99, 0], [99, 0]]",
        "deep_explanation": "The multiplication `[[0] * 2] * 2` creates a list containing two references to the *exact same* inner list! Mutating `board[0][0]` changes the shared inner list, reflecting across both rows."
    }
]


def seed_database(db: Session):
    """
    Seeds Tiers, TopicModules, and GotchaChallenges into the database if not already present.
    """
    # Ensure tables exist
    Base.metadata.create_all(bind=engine)

    # Check if already seeded
    existing_tiers_count = db.query(Tier).count()
    if existing_tiers_count >= len(TIERS_DATA):
        print(f"Database already contains {existing_tiers_count} tiers. Skipping curriculum seed.")
        return

    print("Seeding PyMastery curriculum and gotcha challenges into SQLite...")

    for t_data in TIERS_DATA:
        tier = db.query(Tier).filter(Tier.number == t_data["number"]).first()
        if not tier:
            tier = Tier(
                number=t_data["number"],
                title=t_data["title"],
                description=t_data["description"]
            )
            db.add(tier)
            db.flush()

        for m_data in t_data["modules"]:
            mod = db.query(TopicModule).filter(TopicModule.slug == m_data["slug"]).first()
            if not mod:
                mod = TopicModule(
                    tier_id=tier.id,
                    slug=m_data["slug"],
                    title=m_data["title"],
                    theory_markdown=m_data["theory_markdown"],
                    gotchas_markdown=m_data["gotchas_markdown"],
                    starter_code=m_data["starter_code"],
                    visualizer_mode=m_data["visualizer_mode"],
                    challenge_prompt=m_data["challenge_prompt"],
                    test_code=m_data["test_code"],
                    order_index=m_data["order_index"]
                )
                db.add(mod)

    # Seed Gotcha Challenges
    for g_data in GOTCHA_CHALLENGES:
        gotcha = db.query(GotchaChallenge).filter(GotchaChallenge.title == g_data["title"]).first()
        if not gotcha:
            gotcha = GotchaChallenge(
                title=g_data["title"],
                category=g_data["category"],
                tricky_code=g_data["tricky_code"],
                options_json=g_data["options_json"],
                correct_output=g_data["correct_output"],
                deep_explanation=g_data["deep_explanation"]
            )
            db.add(gotcha)

    db.commit()
    print("PyMastery database successfully seeded with all 6 tiers and gotcha challenges!")


if __name__ == "__main__":
    from .database import SessionLocal
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
