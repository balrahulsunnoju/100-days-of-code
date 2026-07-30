# Guardrails (Non-Negotiable, Read First)

### G1 — Application-agnostic
No specific class/module/service names hard-coded as examples in generated tests. The illustrative class names used in this prompt's body (e.g. `OrderService`, `UserController`) are EXAMPLES ONLY — replace with classes actually discovered in the target repo.

### G2 — Discover-before-generate
Discover testable units from: (a) source files in the repo (b) public API surface from build manifests (c) existing test files (do not duplicate). Skip generated code, vendored libraries, and DTOs without behavior.

### G3 — Ask-don't-assume
If coverage threshold, scope (full/changed-files), or mocking framework is ambiguous, ASK.

### G4 — Hermeticity is absolute (NON-NEGOTIABLE)
Unit tests MUST NOT:
- Import or read `test-data-catalog.yaml`, `ledger.yaml`, or any test-data file
- Make real network calls
- Connect to a real DB outside the JVM/process (TestContainers excluded — see below)
- Read filesystem outside the repo's `src/test/resources/` or equivalent

**Allowed gray-area:** `@DataJpaTest` / TestContainers / H2-in-memory / SQLite-in-memory ARE allowed and still count as unit tests for coverage purposes. The hermeticity rule prohibits NETWORK and EXTERNAL state, not embedded process-local DBs.

### G5 — Prerequisite check
If the per-repo unit test framework (config + runner + coverage gate) is not scaffolded, STOP with `❌ Run /tdgs-aidlc-setup-unit-tests first`.

### G8 — Pre-Write Output Contract
Before writing test files, emit per-repo: list of source units to be covered, target threshold, expected number of test files, mocking strategy per collaborator.

### G9 — Idempotency
Do not overwrite existing tests; add new tests for uncovered units; flag tests that are stale (target source removed).

### G10 — Sync rule
Mirror this file between starter-kit (canonical) and `.github/prompts/`.

### G11 — Shared contracts
- **No `caseType` enum** in unit tests — unit tests are `pass | fail | disabled` only.
- **`passRate` formula:** `passed / (passed + failed)` — disabled tests excluded. `0.0` when denominator is 0.
- **No catalog read** — unit tests are independent of `/tdgs-aidlc-setup-testdata`.

### G12 — Exception path coverage (HARD GATE)
> For EVERY `try/catch` block in the source class under test, the generated tests MUST include at least one case that forces the caught exception. For every `throws` declaration (Java) or thrown error (JS/TS), generate a test that triggers that throw path.

- **Scan method:** Read the source → find all catch clauses / throw statements → generate a dedicated negative test per catch/throw.
- **Naming convention:** `should throw <ExceptionType> when <condition>` / `rejects with <Error> when <condition>`.
- **Mock strategy:** Force the dependency to throw (e.g., `when(repo.save(any())).thenThrow(new RuntimeException("DB down"))` for Java; `jest.spyOn(...).mockRejectedValue(...)` for JS/TS).
- If a catch block re-throws or wraps exceptions, test BOTH the wrapper type and the cause.

### G13 — Defect-revealing tests (STRICT — HARD GATE)
> When a test reveals a **production code defect** (NPE on null input, validator accepting invalid data, missing null guard, silent $0 for unknown input, swallowed exception, off-by-one, etc.), the test MUST assert **correct** behavior and MUST remain enabled. The test will fail, the build will fail, and the dev team owns the fix. **NEVER adapt the test to match buggy behavior** (that locks the bug in as "expected"). **NEVER use `@Disabled` / `test.skip` / `@pytest.mark.skip` / `[Fact(Skip=...)]` / `xfail` to hide a production defect.**

- **Rationale (industry standard — brownfield strict TDD):** A unit test is an executable specification of correct behavior. Skipping a defect test removes the regression guard, suppresses build feedback, and risks the bug becoming permanent. Per Beck (TDD), Feathers (*Working Effectively with Legacy Code*), and Google Engineering Practices, defect tests stay red until production is fixed. Continue-on-fail deployment and notification routing are **DevOps pipeline concerns**, NOT the test author's concern — do not weaken the test to keep the build green.
- **Naming:** `should <correct behavior> when <condition>`. The failing assertion message MUST identify class + method + bug nature so on-call can triage from the surefire/jest/pytest output alone (e.g., `assertEquals("FOO12345", actual, "VitalRecordReceiptUtility.getRemittanceNumber(null) should return null or throw — currently returns literal 'Fnull'")`).
- **Forbidden patterns (each a HARD FAILURE):**
  - `assertThrows(NullPointerException.class, ...)` to "pass" a missing null guard
  - Adjust expected values to match wrong output (e.g., `assertEquals("Fnull", ...)`, `assertEquals(BigDecimal.ZERO, fee)` for an unknown record format)
  - Remove a boundary / null / empty-collection test case because production code doesn't handle it
  - ANY `@Disabled("DEFECT: ...")` / `test.skip("DEFECT: ...")` / `@pytest.mark.skip(reason="DEFECT: ...")` / `[Fact(Skip="DEFECT: ...")]` / `@pytest.mark.xfail` annotation
- **`@Disabled` / `skip` is allowed ONLY for non-defect reasons** with a reason string that MUST NOT begin with `DEFECT:`:
  - TDD red-phase for a not-yet-implemented feature (reason MUST include target completion date)
  - Environment-dependent test that cannot run in CI (reason MUST document the required env)
  - Flaky test under active triage (reason MUST reference a tracking ticket)
- **Post-generation check (MUST run, MUST return zero matches):**
  ```bash
  grep -rEn '(@Disabled|\.skip|@pytest\.mark\.skip|Skip\s*=|@pytest\.mark\.xfail)[^)]*"DEFECT' <test-source-root>
  ```
  Any match = HARD FAILURE. The generator must either (a) surface the failing test for human review and leave it enabled, or (b) rewrite the test to use the legitimate-skip categories above with a non-`DEFECT:` reason. Generator MUST NOT delete the test.

### G14 — Thread-safety defect detection (HARD GATE)
> For EVERY `static` field in the source class under test that holds a **mutable, non-thread-safe** object (e.g., `SimpleDateFormat`, `DecimalFormat`, `StringBuilder`, `HashMap`, `ArrayList`, mutable singletons), the generated tests MUST include a concurrent-access test that demonstrates the race condition.

- **Scan method:** `grep -n 'private static\|static final' <SourceFile>.java` → for each hit, classify the type:
  - Thread-safe (immutable): `String`, `int`, `long`, `Pattern`, `ImmutableList`, atomic types → SKIP
  - NOT thread-safe: `DecimalFormat`, `SimpleDateFormat`, `DateFormat`, `StringBuilder`, `HashMap`, `ArrayList`, `NumberFormat`, `MessageFormat`, `Calendar` → MUST generate concurrent test
- **Test pattern (Java):**
  ```java
  @Test
  @DisplayName("should produce consistent results under concurrent access [THREAD-SAFETY]")
  void testConcurrentAccess() throws Exception {
      int threads = 10;
      ExecutorService executor = Executors.newFixedThreadPool(threads);
      CountDownLatch latch = new CountDownLatch(threads);
      List<String> results = Collections.synchronizedList(new ArrayList<>());
      for (int i = 0; i < threads; i++) {
          executor.submit(() -> {
              try { results.add(service.methodUnderTest(input)); }
              finally { latch.countDown(); }
          });
      }
      latch.await(5, TimeUnit.SECONDS);
      executor.shutdown();
      // All results should be identical if thread-safe
      assertEquals(1, results.stream().distinct().count(),
          "DEFECT: static DecimalFormat/SimpleDateFormat is not thread-safe — concurrent access corrupts output");
  }
  ```
- **If the concurrent test FAILS** (results differ): leave the test **enabled** (per G13 — defect-revealing tests MUST remain active). The failing assertion message already documents the defect: `"DEFECT: static {Type} is not thread-safe — concurrent access corrupts output"`. The build will fail, surfacing the production defect to the dev team. Do NOT add `@Disabled("DEFECT: ...")` — this contradicts G13's hard gate.
- **Known defect classes:** `private static final DecimalFormat` (Java), `private static final SimpleDateFormat` (Java), module-level `formatter = ...` (Python), shared mutable singleton in JS/TS.

### G15 — Null-at-collection-level tests (HARD GATE)
> For EVERY public method that accepts a `Collection`, `List`, `Set`, `Map`, or array parameter, the generated tests MUST include tests for BOTH:
> 1. The collection parameter itself being `null`
> 2. The collection being empty (`Collections.emptyList()`, `[]`, `{}`)
>
> This is DISTINCT from testing null elements INSIDE a collection. Both levels must be tested.

- **Scan method:** `grep -n 'List<\|Set<\|Map<\|Collection<\|\[\]' <SourceFile>.java` on method signatures → for each collection parameter, generate null + empty tests.
- **Common defect pattern:** `items.size()` or `items.stream()` called without null check → NPE when parameter is null.
- **Test pattern:**
  ```java
  @Test
  @DisplayName("should handle null {paramName} without NPE")
  void testNull{ParamName}() {
      // If production code NPEs, the test fails — this is a defect-revealing test per G13.
      // Do NOT disable it. The assertion message documents the defect for triage.
      assertDoesNotThrow(() -> service.method(null));
  }

  @Test
  @DisplayName("should handle empty {paramName} gracefully")
  void testEmpty{ParamName}() {
      var result = service.method(Collections.emptyList());
      assertNotNull(result); // or appropriate assertion for empty input
  }
  ```

### G16 — Exact value assertions over range assertions (HARD GATE)
> When the expected output of a calculation is **deterministic and known** (fee amounts, formatted strings, computed totals), tests MUST assert the EXACT expected value — NOT a range or `> 0` check.

- **Prohibited patterns:**
  - `assertTrue(result > 0)` — when the exact fee amount is computable from constants
  - `assertNotEquals("0.00", result)` — when the exact formatted amount is known
  - `assertTrue(response.getFeeDetails().get(0).getAmount() > 0)` — lazy assertion that cannot detect wrong calculations
- **Required pattern:**
  ```java
  // Given: BIRTH_CERTIFICATE_TYPE1_UNIT_PRICE = 22.00, copies = 2
  assertEquals(44.00, fee, 0.001); // Exact expected value
  ```
- **Exception:** when the method under test depends on external state that varies (timestamps, random IDs, DB-generated sequences), use matchers (`assertThat(result, matchesPattern(...))`) — but document WHY exact assertion is impossible.
- **Scan method:** After generating all tests, grep for `assertTrue.*> 0\|assertNotEquals.*0.00\|assertTrue.*!= 0`. Each hit MUST be justified with a comment explaining why exact value cannot be asserted, OR replaced with an exact assertion.

### G17 — @Tag categorization (MANDATORY for Java)
> ALL generated Java unit tests MUST include `@Tag` annotations for tier-based selective execution (Axis A — test tier):

- `@Tag("smoke")` — the FIRST happy-path `@Test` per test class (exactly one per class; fastest PR-gate signal)
- `@Tag("regression")` — every other `@Test` in the class (full coverage suite)
- `@Tag("integration")` — OPTIONAL, orthogonal (Axis B — infra). Add when the class uses `@DataJpaTest`, `@SpringBootTest`, TestContainers, or real (non-mocked) infrastructure. Composes WITH smoke/regression — do NOT replace them.

This enables `mvn test -Dgroups=smoke` (PR gate, ~1 per class) and `mvn test -Dgroups=regression` (full suite). Surefire 3.x honors `-Dgroups=` natively — no `<groups>` pom block required; unset `-Dgroups` = run all.

> **Deprecated:** `@Tag("unit")` and `@Tag("slow")` are NO LONGER part of the mandate (drop them on regeneration). `@Tag("integration")` here is INTERNAL/Testcontainers infra — DISTINCT from the functional + API `@external-integration` tag, which marks real-external-caller flows (Apigee, payment, email).

### G18 — 🛑 DOCUMENTED FAILURE MODES (from production audit 2026-05-16)

These are defect patterns that were MISSED in a real generation run. The prompt MUST enforce detection of these patterns on EVERY generation:

#### FM-1: Static non-thread-safe formatters (DecimalFormat, SimpleDateFormat)
- **What was missed:** `OrderFeeCalculationServiceImpl` line 33: `private static final DecimalFormat amountFormatter` — no concurrent test generated.
- **Why it matters:** Under load, `DecimalFormat.format()` corrupts output (documented Java bug JDK-6231579). Financial calculation services WILL be called concurrently.
- **Enforcement:** G14 above. Grep ALL source for `static.*DecimalFormat\|static.*SimpleDateFormat\|static.*DateFormat\|static.*NumberFormat`. Each hit MUST produce a concurrent test.

#### FM-2: Null collection parameter vs null element confusion
- **What was missed:** `OrderReviewServiceImpl` line 34: `orderDetails.size()` — test existed for null `recordType` (element inside list) but NOT for the list itself being null.
- **Why it matters:** API receives `{"orderDetails": null}` from malformed client → immediate NPE at `.size()`.
- **Enforcement:** G15 above. Every List/Set/Map/Collection METHOD PARAMETER gets both null-param and empty-param tests.

#### FM-3: Lazy range assertions hide wrong calculations
- **What was missed:** Tests used `assertTrue(fee > 0)` for fee calculations where the EXACT amount is deterministic (constants × copies). A bug returning $1 instead of $44 would pass.
- **Why it matters:** Financial accuracy is a compliance requirement. "Greater than zero" is meaningless for a fee calculator.
- **Enforcement:** G16 above. Every fee/calculation test MUST assert exact expected values computed from known constants.

#### FM-4: Missing @Tag prevents selective CI execution
- **What was missed:** All 606 tests run in a single undifferentiated batch. Cannot run "fast unit only" (2s) vs "full including integration" (30s).
- **Enforcement:** G17 above. Every test class gets appropriate @Tag annotation.
