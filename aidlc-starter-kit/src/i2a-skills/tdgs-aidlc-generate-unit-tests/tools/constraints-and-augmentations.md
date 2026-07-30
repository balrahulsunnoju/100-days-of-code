# Constraints and Phase-6 Augmentations

## Constraints

- **Unit tests MUST NOT read, reference, import, or depend on `test-data/test-data-catalog.yaml`, `test-data/ledger.yaml`, or any identity pool / business constants from the workspace `test-data/` directory.** All external dependencies (DB, network, filesystem, clock, identity, auth, env) MUST be mocked or faked inline. Catalog is exclusively for **API tests** and **functional tests**. Violation = HARD FAILURE: remove the import, replace with inline mock or builder, rerun generation for the affected file.
- **Do NOT modify production source code.** Only create test files and update test configurations.
- **Preserve existing tests.** Build upon existing test files — do NOT delete or replace; add complementary tests to fill gaps.
- **All tests must be hermetic:** no network, no filesystem, no database, no clock dependencies without mocking.
- **Test data uses factories/builders** — no hardcoded literals scattered through test methods.
- **Per-module completion gates are mandatory** — do NOT skip ahead if a module is below target.
- **Unit tests stay in standard locations:** Java `{repo}/src/test/java/{package}/`; JS/TS `{repo}/src/__tests__/{mirror-path}/` (mirrors `src/` for easy tracking and selective commits); Python `{repo}/tests/`; C#/.NET `{repo}/{test-project}/{namespace}/`.
- **Coverage reports go in standard locations:** Java `{repo}/target/site/jacoco/`; JS `{repo}/coverage/`; Python `{repo}/htmlcov/`; C#/.NET `{repo}/TestResults/coverage/`.
- **`test-report.md`** goes in each repo's `test-results/` directory.

## Phase-6 Augmentations — Generation Mandates

### G6-1 — DataJpaTest allowed
`@DataJpaTest` / `@Repository` / `JpaRepository` MAY be tested with embedded DB (H2, TestContainers, SQLite). These count as unit tests for coverage; G4 prohibits NETWORK and EXTERNAL state, not process-local embedded DBs. Mock the DB only if testing mapping logic, not queries.

### G6-2 — Honor declared runner
For Python, use the runner declared in the repo (`pytest` / `unittest` / `nose2`); do NOT switch frameworks. If none declared, ASK.

### G6-3 — No catalog reads (G4 absolute)
If tempted to read `test-data-catalog.yaml` from a unit test, STOP — use an in-test fixture or factory.

## Execution Context

This prompt requires the unit test framework to be set up via `/tdgs-aidlc-setup-unit-tests`. If framework dependencies or coverage configuration are missing during pre-checks, this prompt **halts** and instructs the user to run the setup prompt first — it does NOT attempt to scaffold inline.
