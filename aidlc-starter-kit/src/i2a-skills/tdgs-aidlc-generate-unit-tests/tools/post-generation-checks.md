# Post-Generation Validation Gate (MANDATORY)

> ⚠️ **BEFORE proceeding to coverage enforcement**, perform these automated checks on all generated test files. Fix ALL violations before proceeding.

## Check 1 — No catalog references (HARD FAILURE)

Grep ALL generated test files for `test-data-catalog`, `test-data/ledger`, `identityPool`, `catalogRecord`, or any import path referencing the workspace `test-data/` directory. Any match is a HARD FAILURE — unit tests MUST NOT reference the catalog (see Constraints). Remove the import and replace with an inline mock or builder.

## Check 2 — RTL query pattern matches installed version (React/JS only)

If `@testing-library/react` < 11, grep for `screen.getBy`, `screen.findBy`, `screen.queryBy`. Any match is a HARD ERROR — the `screen` export does not exist before v11. Replace with destructured queries from `render()`.
If `@testing-library/react` >= 11, destructured queries are allowed but `screen.*` is preferred.

## Check 3 — user-event API matches installed version (React/JS only)

If `@testing-library/user-event` < 14, grep for `userEvent.setup()` or `await user.click`. Any match is a HARD ERROR — the async setup API does not exist before v14. Replace with synchronous `userEvent.click(element)` calls.
If `@testing-library/user-event` >= 14, synchronous calls are allowed but the async `setup()` API is preferred.

## Check 4 — MSW API matches installed version (React/JS only)

If `msw` v1.x is installed, grep for `http.get(`, `http.post(`. Any match is a HARD ERROR — MSW v1 uses `rest.get(`, `rest.post(`. Replace accordingly.
If `msw` v2.x is installed, grep for `rest.get(`, `rest.post(`. Any match is a HARD ERROR — MSW v2 uses `http.get(`, `http.post(`.

## Check 5 — Coverage target decimal computation (Java only)

Grep all generated/modified `pom.xml` JaCoCo `<minimum>` values for the literal string `{coverage_target/100}` or `coverage_target`. If found, it is a HARD ERROR — JaCoCo's XML parser does not evaluate expressions. The value must be the pre-computed decimal (e.g., `0.80` for 80%).

## Check 6 — No leftover `{{...}}` tokens (HARD FAILURE — applies to ALL stacks)

Grep ALL generated test files for the regex `\{\{[^}]+\}\}`. Any match is a HARD FAILURE — unit tests are hermetic by design and MUST NOT contain ANY token references. Catalog tokens (`{{catalog.identityPool.*}}`), captured tokens (`{{captured.*}}`), faker tokens (`{{$random*}}`), runner builtins (`{{$timestamp}}`), and even templating placeholders are forbidden — these are runtime constructs from API/functional tests that have leaked into hermetic unit-test code (most often by copy-pasting from a `data/valid-payloads.json` or an API collection example).
Replace with inline literal values inside the test (e.g., `const email = "noreply@example.com";`) or with mock builders (`UserBuilder.aValidUser().withEmail("…").build()`). The unit test must be deterministic, self-contained, and runnable without a network or filesystem catalog.

## Check 7 — No HTTP client / network imports (HARD FAILURE — applies to ALL stacks)

Grep ALL generated test files for live HTTP client imports/usage that would make a real network call:
- Java: `import org.springframework.web.client.RestTemplate;`, `import java.net.http.HttpClient;`, `import okhttp3.OkHttpClient;`, `WebClient.builder()`
- JS/TS: `import axios from 'axios'` (without an `axios-mock-adapter`/`msw` companion), `fetch(` (without a `global.fetch = jest.fn()` mock), `import { request } from 'undici'`
- Python: `import requests`, `import httpx`, `from urllib.request import urlopen` (without `responses`/`pytest-httpx`/`respx`)
- C#: `new HttpClient()` (without `Mock<HttpMessageHandler>`)
Any unmocked HTTP usage = HARD FAILURE. Unit tests MUST stub HTTP at the seam (mock the client, the message handler, or the dependency injected into the SUT). If the test genuinely needs an HTTP round-trip, it is an integration test and belongs in a different suite — move it out of the unit test directory.

## Check 8 — Test de-duplication (HARD FAILURE — applies to ALL stacks)

Two tests are duplicates if they assert the SAME boundary on the SAME input on the SAME unit (class/function). Duplicates inflate test counts and waste CI budget without adding signal.

Detection algorithm:
1. For every test (`@Test` method, `it(`, `def test_*`, `[Fact]`), derive a fingerprint: `sha1({fully-qualified-unit}|{input-boundary-class}|{expected-outcome})` where boundary-class is `min`, `max`, `null`, `empty`, `pattern-violation`, `throws-X`, etc.
2. **Scope the de-dup ONLY to tests authored in THIS generation run.** Pre-existing user-authored tests on disk (anything that existed before this prompt invocation) are EXEMPT from removal even if they fingerprint-match newly generated tests — G9 (idempotency) forbids overwriting or deleting existing tests. If a newly generated test fingerprints against a pre-existing test, drop the NEWLY GENERATED one (not the existing one).
3. If ≥2 newly generated tests share a fingerprint, ALL but the FIRST are duplicates.
4. **Action:** auto-remove the duplicates (newly generated only) and report:
   ```
   ❌ N duplicate tests removed (newly generated batch only — pre-existing tests untouched):
      - OrderServiceTest.shouldRejectNullCustomerId (kept: OrderServiceTest.validateCustomerIdRequired)
   ```
5. If duplicates >5% of total per repo: log a WARNING that discovery may be over-expanding boundaries — review the Test Count Budget Reconciliation block.

## G14/G15/G16/G17 Enforcement Checks

In addition to Checks 1–8, validate:

- **Thread-safety tests (G14, Java):** Grep source for `static.*DecimalFormat\|static.*SimpleDateFormat\|static.*DateFormat\|static.*NumberFormat`. Each hit MUST have a corresponding concurrent test.
- **Null-collection tests (G15):** Every List/Set/Map/Collection METHOD PARAMETER gets both null-param and empty-param tests.
- **Exact assertions (G16):** Grep for `assertTrue.*> 0\|assertNotEquals.*0.00\|assertTrue.*!= 0`. Each hit needs justification or replacement.
- **@Tag annotations (G17, Java):** Every test class has appropriate @Tag annotation.

## Validation Results Display

```
══════════════════════════════════════════════════════════════
POST-GENERATION VALIDATION
══════════════════════════════════════════════════════════════

  Check                                   Result
  ───────────────────────────────────────   ───────────────────────
  No catalog references                   {✅ Pass | ❌ N violations fixed}
  RTL query pattern (React only)          {✅ Pass | ❌ N violations fixed | ⏭ Skipped}
  user-event API (React only)             {✅ Pass | ❌ N violations fixed | ⏭ Skipped}
  MSW API (React only)                    {✅ Pass | ❌ N violations fixed | ⏭ Skipped}
  Coverage target decimal (Java only)     {✅ Pass | ❌ N violations fixed | ⏭ Skipped}
  No leftover {{...}} tokens (all stacks) {✅ Pass | ❌ N tokens removed}
  No live HTTP client usage (all stacks)  {✅ Pass | ❌ N unmocked clients fixed}
  Test de-duplication                     {✅ Pass | ❌ N duplicates removed}
  Thread-safety tests (G14, Java)         {✅ N static mutable fields covered | ⏭ None found | ❌ N uncovered}
  Null-collection tests (G15)             {✅ N collection params covered | ❌ N missing null/empty tests}
  Exact assertions (G16)                  {✅ Pass | ❌ N lazy assertions found}
  @Tag annotations (G17, Java)            {✅ All test classes tagged | ❌ N untagged classes}

══════════════════════════════════════════════════════════════
```
