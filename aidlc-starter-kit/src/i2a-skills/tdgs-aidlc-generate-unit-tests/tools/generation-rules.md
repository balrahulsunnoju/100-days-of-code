# Generation Rules — Per-Module Test Generation

Process modules **one at a time** with per-module coverage gates:

## For each module/package:

1. **Analyze** the production code thoroughly — understand all branches, edge cases, error paths
2. **Generate test file(s)** in the standard location:
   - Java: `src/test/java/{same-package}/{ClassName}Test.java`
   - JS/TS: `src/__tests__/{mirror-path}/{filename}.test.{ext}` (mirrored directory structure under `__tests__/`)
   - Python: `tests/{same-structure}/test_{filename}.py`
   - C#/.NET: `{test-project}/{same-namespace}/{ClassName}Tests.cs`
3. **Run tests** for just that module
4. **Check coverage** for that module against `{coverage_target}`
5. **If below target:** analyze uncovered lines, add more tests, re-run
6. **If at or above target:** mark module as complete, move to next

```
Module: {module-name}
  Attempt 1: Generated {N} tests → Coverage: {X}%
  Attempt 2: Added {M} more tests → Coverage: {Y}%  ✅ Target met
```

**DO NOT proceed to the next module until the current module meets the coverage target.** This ensures incremental, verifiable progress.

## Test Generation Rules

**Every test file must:**
- Test **happy paths** — normal inputs produce expected outputs
- Test **edge cases** — boundary values, empty inputs, null/undefined, maximum values
- Test **error handling** — exceptions thrown, error responses returned, invalid inputs rejected
- Use **mocks/fakes for all external dependencies** — no network calls, no filesystem access, no database access, no clock dependencies
- Use **test data builders or factories** — no hardcoded literal values scattered through tests
- Have **descriptive test names** following the pattern: `should {expected behavior} when {condition}`. If a KB rule ID applies, append it: `should {behavior} when {condition} [{rule-id}]`
- Be **hermetic** — each test is independent, no shared mutable state, no test ordering dependencies

## Java-Specific Rules

- Use `@ExtendWith(MockitoExtension.class)` for mocking
- Use `@Mock` and `@InjectMocks` annotations
- Use `@ParameterizedTest` with `@CsvSource` or `@MethodSource` for data-driven tests
- Use `assertThrows` for exception testing
- **REST client mocking (MANDATORY pattern):** When the class under test uses `RestTemplate`, mock it with `@Mock RestTemplate restTemplate` and `when(restTemplate.exchange(...)).thenReturn(...)` to test BOTH success and error paths. Do NOT use `assertThrows(RestClientException)` as a substitute for actually mocking the response — that tests the mock setup, not the production logic. For `WebClient`, use `MockWebServer` or a mock builder chain. For raw `HttpClient` (java.net.http), mock the `HttpResponse`.
- Use `@DataJpaTest` for repository tests (with H2)
- **DTO/Model testing (MANDATORY when DTOs have behavior or are used in collections):**
  - **Jackson serialization roundtrip:** `new ObjectMapper().readValue(objectMapper.writeValueAsString(dto), DtoClass.class)` → assert all fields survive the roundtrip. Catches `@JsonProperty` mismatches, missing no-arg constructors, and transient field loss.
  - **equals/hashCode contract** (MANDATORY when DTO is used in `Set`, `Map`, or compared with `.equals()`): (1) reflexive: `a.equals(a)`, (2) symmetric: `a.equals(b) && b.equals(a)`, (3) consistent hashCode: `a.equals(b) → a.hashCode() == b.hashCode()`, (4) not-equal case: change one field → `!a.equals(b)`.
  - **Do NOT test only getters/setters** — getter/setter-only tests provide zero confidence for serialization, equality, or collection behavior.

## React/JS-Specific Rules

- Use `render()` from `@testing-library/react` (NOT `ReactDOM.render` or `enzyme`)
- **Query strategy** (auto-detect RTL version from `package.json`): RTL <11 → destructure queries from `render()` (e.g., `const { getByText } = render(<Comp />)`), `screen.*` does NOT exist; RTL >=11 → prefer `screen.getByRole()` / `screen.getByLabelText()` / `screen.getByText()` (avoid `getByTestId` unless necessary).
- **User interaction API** (auto-detect `@testing-library/user-event` version): v7–v13 → synchronous `userEvent.click(element)` / `userEvent.type(element, 'text')` (no `await`, no `setup()`); v14+ → `const user = userEvent.setup()` then `await user.click(element)` / `await user.type(element, 'text')`. Fallback if version unclear: use `fireEvent` from `@testing-library/react`.
- Use `renderHook()` for custom hooks — from `@testing-library/react-hooks` (RTL <13) or `@testing-library/react` (RTL >=13).
- Wrap state-changing operations in `act()` or `waitFor()`.
- Mock API calls with `jest.mock()` or MSW (auto-detect MSW version: v1.x uses `rest.get()` / `rest.post()`; v2.x uses `http.get()` / `http.post()`). If MSW not installed, use `jest.mock()` exclusively.
- Wrap components with necessary providers (Router, i18n, app's actual state management — `use-global-hook` store, Redux `Provider`, or Context) via a custom render utility.
- Test both rendering AND behavior (click, type, submit).
- For `react-router`, wrap with `MemoryRouter` (v5) or `RouterProvider` (v6) per detected version.
- For `use-global-hook` / mutable stores, reset to known initial state in `beforeEach` for hermetic execution.
- **`project-context.md` overrides:** if present in the workspace docs repo, its React testing conventions (RTL version, query patterns, mock patterns) are the definitive source.

## General Rules (All Stacks)

- **No `console.log` in tests** — use assertions
- **No `setTimeout`/`sleep` in tests** — use `waitFor`, `findBy*`, or mock timers
- **No test interdependencies** — each test must pass in isolation and in any order
