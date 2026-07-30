# Discovery — Testable Unit Extraction

Use a **two-phase discovery** approach: knowledge base first (canonical rules and expected values), then source code (implementation detail).

## Phase 1: From Knowledge Base (Canonical Rules & Expected Values)

Before scanning source code, check if the workspace contains a knowledge base (`*-docs/knowledge-base/` or similar). If found, read these files **first**:

1. **Business Rules Catalog** — `knowledge-base/business/business-rules-catalog.md`. Extract rules with canonical IDs from the catalog. **Validation rules** provide exact constraints to assert (field lengths, formats, limits); **calculation rules** provide exact expected values for service-layer assertions. Rule IDs become **test name anchors**: `should {expected behavior} when {condition} [{rule-id}]`.
2. **Data Models** — `knowledge-base/shared/data-models.md`. Field-level details (types, constraints, relationships) for accurate test data builders/factories.
3. **Service Architecture Docs** — `knowledge-base/repos/{service-name}/architecture.md`. Service responsibilities, external dependencies to mock, error handling patterns.
4. **OpenAPI Specs** — `knowledge-base/api/{service-name}-openapi.yaml`. Request/response schemas for controller-layer assertions.

**If no knowledge base is found:** Skip this phase and proceed with code-only discovery.

## Phase 2: From Source Code (Augment & Validate)

For each repo, scan all production source files and classify testable units. Cross-reference code findings against KB rules — flag any discrepancies.

### Java / Spring Boot:
- **Controllers** — `@RestController`, `@Controller` → test request mapping, parameter binding, response formatting
- **Services** — `@Service` → test business logic, calculations, transformations
- **Repositories** — `@Repository` → test custom queries (with `@DataJpaTest`)
- **DTOs/Models** — Validation annotations, equals/hashCode, builders
- **Configuration** — `@Configuration`, `@Bean` → test bean creation conditions
- **Utilities** — Helper/utility classes → test all public methods
- **Exception handlers** — `@ControllerAdvice` → test error response mapping
- **Mappers** — MapStruct/ModelMapper → test mapping correctness
- **Validators** — Custom validators → test validation logic

### React / JS / TS:
- **Components** — Functional and class components → test rendering, props, state, events
- **Custom hooks** — `use*` hooks → test with `renderHook`
- **Utility functions** — Pure functions → test inputs/outputs
- **API service modules** — `fetch`/`axios` wrappers → test with MSW or jest.mock
- **State management** — Redux (actions, reducers, selectors, thunks/sagas), Context providers, **`use-global-hook`** and similar mutable-store libraries → test state transitions
  - **`use-global-hook` / mutable store testing:** these libraries use module-level shared state (no Provider). Mock the store module via `jest.mock()` to return `[mockState, mockActions]` (state = copy of `initialState` from store source; actions = `jest.fn()` per action). MUST reset between tests with `jest.clearAllMocks()` + fresh `mockState` copy in `beforeEach` (singleton state leaks otherwise). To assert action invocation: render → trigger interaction → verify `mockActions.<name>` called with expected args. To assert state-dependent rendering: set `mockState.<key>` BEFORE rendering. Same pattern applies to Zustand (`create()`), Jotai (atoms), and any provider-less store.
- **Form validation** — Yup/Zod schemas → test validation rules. **Detect if multiple form libraries coexist** (e.g., react-hook-form AND formik) — generate tests for validation schemas used by each library
- **Route guards/middleware** — Auth checks, redirects → test navigation behavior
- **Context providers** — React Context → test provider values and consumer behavior
- **i18n** — Translation key usage → test key existence and rendering

### Angular / TS:
- **Components** — `@Component` → test with `TestBed.configureTestingModule()`, verify template rendering, input/output bindings, event emissions
- **Services** — `@Injectable` → test with `TestBed.inject()` or mock dependencies with `jasmine.createSpyObj()` / `jest.fn()`
- **Pipes** — `@Pipe` → test `transform()` method (pure function — no TestBed needed for pure pipes)
- **Directives** — `@Directive` → test with a host component that uses the directive
- **Guards** — `CanActivate` / `CanDeactivate` → test route activation logic with mocked `ActivatedRouteSnapshot`
- **Interceptors** — `HttpInterceptor` → test with `HttpClientTestingModule` and `HttpTestingController`
- **Resolvers** — `Resolve` → test data fetching with mocked services
- **NgRx** (if present) — actions, reducers, selectors, effects → test state transitions and side effects

### Vue / JS / TS:
- **Components** — SFC (`.vue`) → test with `@vue/test-utils` `mount()` / `shallowMount()`, verify rendering, props, emitted events
- **Composables** — `use*` functions (Composition API) → test by calling directly or via a wrapper component
- **Vuex store** (Vue 2) — mutations, actions, getters → test state transitions
- **Pinia store** (Vue 3) — actions, getters → test with `createTestingPinia()` or direct instantiation
- **Directives** — custom directives → test with a host component
- **Mixins** (Vue 2 legacy) — test via a wrapper component that uses the mixin
- **Router guards** — `beforeEach` / `beforeRouteEnter` → test with mocked `to`/`from`/`next`

### Python:
- **Functions and classes** → test public methods
- **API endpoints** (Flask/FastAPI/Django views) → test with test client
- **Data models** (Pydantic, dataclasses) → test serialization/validation
- **Utilities** → test all public functions

### Lambda Handlers (Node.js / Python):
- **Handler functions** → test with mock event objects (API Gateway event, SQS event, S3 event, etc.)
- **Event parsing** → test event deserialization and input validation
- **Response formatting** → test correct status codes, headers, body structure
- **Error handling** → test error responses for invalid events, missing fields, downstream failures
- **Middleware/layers** (Powertools, Middy) → test middleware chain behavior

### C# / .NET:
- **Controllers** → test with `WebApplicationFactory` and `HttpClient`
- **Services** → test business logic with mocked dependencies (Moq/NSubstitute)
- **Models/DTOs** → test validation attributes, serialization
- **Middleware** → test request pipeline behavior
- **Repositories** → test with in-memory database (`UseInMemoryDatabase`)

### Discovery Summary Display

Display discovery summary per repo:
```
══════════════════════════════════════════════════════════════
TESTABLE UNIT DISCOVERY: {repo-name}
══════════════════════════════════════════════════════════════

  Source Files:     {count}
  Testable Units:   {count}
  Already Tested:   {count} ({existing_coverage}%)
  Need Tests:       {count}
  Skipped (resume): {count}

  By Category:
    Controllers/Routes:   {count}
    Services/Logic:       {count}
    Models/DTOs:          {count}
    Utilities:            {count}
    Components:           {count}
    Hooks/State:          {count}

══════════════════════════════════════════════════════════════
```

## 2c. Test Count Budget Reconciliation (MANDATORY — emit BEFORE Section 3 Pre-Write Output Contract)

> **Why this block exists:** users have observed the same workspace producing wildly different unit-test counts across runs (e.g., 200 vs 2000). The variance is real (production code grew, more branches added) but MUST be made visible and justifiable so it doesn't surprise reviewers or blow CI budgets.

The agent MUST emit this reconciliation in chat BEFORE the Pre-Write Output Contract (per repo):

```
═══════════════════════════════════════════════════════════════
TEST COUNT BUDGET RECONCILIATION — {repo-name}
═══════════════════════════════════════════════════════════════
  Driver                              | Count | Avg tests/unit | Subtotal
  ────────────────────────────────────  | ───── | ────────────── | ────────
  Testable units (classes / fns)        | 142   | 4              | 568
  Branches (if/else, switch, ternary)   | 318   | 1              | 318
  Boundary classes per parameter        | 87    | 2              | 174
  Error/exception paths                 | 56    | 1              | 56
  ────────────────────────────────────  | ───── | ────────────── | ────────
  RAW TOTAL                                                     | 1116
  De-duplicated (same boundary tested in multiple specs)        | 982
  Capped by max_tests_per_module={value or 'unlimited'}         | 982
  ────────────────────────────────────────────────────────────  | ────────
  FINAL PLANNED TEST COUNT                                      | 982
═══════════════════════════════════════════════════════════════
```

Compare to previous run (read from coverage report timestamp + line count delta in `{repo}/test-results/coverage.json` if it exists):

```
  Previous run total:  {N}    Delta: {±N}    Reason: {3 new services, 2 new components}
```

If `Delta > +50%` AND no production-code growth justifies it: **STOP** — investigate over-generation (likely a duplicate-detection bug, or branches counted twice). If `Delta < −50%` AND no production-code shrinkage: **STOP** — investigate under-generation (likely a discovery regression).
