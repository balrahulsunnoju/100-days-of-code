# Pre-Write Output Contract

> ⚠️ **The unit-test analogue of the API/functional Pre-Write Contracts.** The unit-test version is intentionally short — hermeticity is the entire game. Without this contract, generated tests routinely import the catalog, call live HTTP endpoints, or skip mocking external collaborators — bugs that only surface as flaky CI runs.
>
> The agent MUST emit BOTH blocks below in chat with concrete data BEFORE writing the first unit test file. Skipping = STOP.

## Block U1 — Per-Module Hermeticity Plan

ONE row per module/class/file that will get tests:

```
═══════════════════════════════════════════════════════════════
HERMETICITY PLAN — {repo-name}
═══════════════════════════════════════════════════════════════
  Unit Under Test     | External Collaborators        | Mock Strategy                   | Test File To Write
  ─────────────────── | ─────────────────────────────  | ──────────────────────────────  | ─────────────────────────
  OrderService        | OrderRepository, EmailClient   | @MockBean both                  | OrderServiceTest.java
  ProductController   | ProductService, AuthGuard      | jest.mock(both)                 | ProductController.test.ts
  CalcUtils           | (pure function, no collabs)    | none needed                     | calc_utils_test.py
═══════════════════════════════════════════════════════════════
```

Every external collaborator MUST be listed. Pure functions with no collaborators MUST say `(pure function, no collabs)`. If "Mock Strategy" says `none needed` for a unit that DOES have collaborators, that is a HARD FAILURE.

## Block U2 — Forbidden Imports Pre-Scan

Before writing each test file, declare:

```
═══════════════════════════════════════════════════════════════
FORBIDDEN IMPORTS PRE-SCAN — {test-file-name}
═══════════════════════════════════════════════════════════════
  Catalog imports planned?      ❌ NO  (HARD FAILURE if YES)
  Live HTTP client imports?     ❌ NO  (mock the seam instead)
  Filesystem reads outside repo? ❌ NO
  {{...}} runtime tokens?       ❌ NO  (unit tests are hermetic)
═══════════════════════════════════════════════════════════════
```

All four MUST be ❌ NO. Any ✅ YES = STOP and replace with mocks/inline literals.

## Block U3 — Boundary Class Inventory (per public method/function)

> **Why this block exists:** Section 2c reconciliation lists `Boundary classes per parameter | 87 | 2 | 174` as a driver, but without an inventory the count `87` is fabricated and `Avg 2` understates true coverage. Skipping boundary tests is the documented root cause of "100% line coverage, 0% branch coverage on input validation".

For EVERY public method/function in the Hermeticity Plan (Block U1) that takes one or more parameters, emit ONE row per (method, parameter) pair listing the boundary classes that WILL be tested:

```
═══════════════════════════════════════════════════════════════
BOUNDARY CLASS INVENTORY — {repo-name}
═══════════════════════════════════════════════════════════════
  Unit              | Method               | Parameter      | Type / Constraint              | Boundary Classes Planned                                  | #
  ───────────────── | ──────────────────── | ────────────── | ─────────────────────────────  | ─────────────────────────────────────────────────────────  | ─
  OrderService      | placeOrder           | order          | @NotNull, @Valid Order         | null, empty-fields, valid, oversize-collection            | 4
  OrderService      | placeOrder           | userId         | @Pattern("^U\\d{6}$")          | null, empty, malformed, valid, exceeds-pattern-length     | 5
  CalcUtils         | percentage           | numerator      | double, finite                 | NaN, +Infinity, -Infinity, 0, negative, valid             | 6
  CalcUtils         | percentage           | denominator    | double, non-zero               | 0 (throws), NaN, valid, MAX_VALUE                         | 4
  ProductController | search               | query          | String, @Size(max=200)         | null, empty, 1-char, 200-char, 201-char (rejected), valid | 6
═══════════════════════════════════════════════════════════════
TOTAL boundary tests planned (sum of #): {N}  ← MUST be within ±10% of Section 2c "Boundary classes per parameter" Subtotal. (Section 2c is a coarse estimate; exact reconciliation is impossible because Block U3 enumerates the actual boundary classes per the closed-enum table below, while Section 2c uses an `Avg tests/unit` heuristic.)
```

## Closed-Enum Boundary Classes (the only allowed values in the "Boundary Classes Planned" column)

| Type / constraint family | Required boundary classes (MUST cover all that apply) |
|---|---|
| Object reference | `null`, `valid` |
| Collection / array | `null`, `empty`, `single-element`, `valid`, `oversize` (when `@Size`/`maxItems` declared) |
| String + `@Pattern` | `null`, `empty`, `malformed`, `valid`, `exceeds-pattern-length` |
| String + `@Size(min,max)` | `null`, `empty`, `min-length`, `max-length`, `max-plus-one` |
| Numeric + `@Min`/`@Max` | `min-1` (rejected), `min`, `mid`, `max`, `max+1` (rejected) |
| Numeric (unbounded) | `0`, `negative`, `positive`, `MAX_VALUE`, `MIN_VALUE`, `NaN`/`±Infinity` for floats |
| Date / temporal | `null`, `epoch`, `today`, `future`, `past`, `leap-day` (when applicable) |
| Enum | one test per enum constant + `null` + `unknown-string` (when deserialized from string) |
| Boolean | `true`, `false`, `null` (only when nullable) |

## HARD Rules

- Every parameter with a Bean Validation annotation (`@NotNull`, `@Pattern`, `@Size`, `@Min`, `@Max`, `@Email`, `@Past`, `@Future`) MUST contribute AT LEAST `(constraint-fail-case + valid-case)` boundary rows. Single-row entries for constrained parameters = HARD FAILURE.
- Pure-function units with no parameters are exempt — note them as `(no parameters)` in the Hermeticity Plan and skip in this inventory.
- The `TOTAL` MUST be within ±10% of Section 2c's `Boundary classes per parameter` subtotal. Larger drift = STOP and reconcile both numbers (most likely cause: Section 2c's `Avg tests/unit` heuristic is wrong for this repo, OR Block U3 missed a constrained parameter).
- Mock-only stubs (per Block U1 "Mock Strategy") that NEVER receive these parameters in production code paths are exempt — note `(mock-only path)` in the row's "Boundary Classes Planned" cell and exclude from `#`.

## Hard Rule — No File Creation Before Contract

> The agent MUST NOT call `create_file` against any unit test file until Blocks U1, U2, and U3 have been emitted in chat. Skipping this contract is the documented root cause of "unit test passes locally because catalog file exists, fails in CI because catalog directory is not in the repo" AND "100% line coverage but every Bean Validation annotation is untested".
