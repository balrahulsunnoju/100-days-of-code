# Custom Rules for project-context.md

Paste these rules during `/bmad-generate-project-context` runs.
The agent auto-discovers tech stack rules but cannot discover team workflow conventions.

---

## Testing Rules (Paste at Category 4)

When the agent shows auto-discovered testing rules and offers A/P/C, paste this block before choosing C:

```text
Please also add these rules to the Testing section:

#### 🔴 CRITICAL: Every test file MUST appear as a task in the Implementation Plan Tasks section — not just in Testing Strategy. Test tasks ARE implementation tasks. The Testing Strategy section summarizes the approach; the Tasks section contains the actual work items with file paths.

#### 🔴 TEST ENFORCEMENT TABLE (NEVER SKIP — CHECK EVERY ISSUE)

Detect which layers the issue touches. The spec MUST include tasks for ALL required types — no exceptions.

| Layers Touched | Unit Tests | Functional (Playwright) | API Tests |
|---|---|---|---|
| Frontend only | React (Jest + RTL) | REQUIRED | Skip |
| Backend (any layer) | Java (JUnit 5 + Mockito) | Skip | REQUIRED |
| Full-stack (frontend + backend) | Java + React | REQUIRED | REQUIRED |

ENFORCEMENT RULES:
- "No existing tests" is NEVER a valid reason to omit a REQUIRED test type.
- API tests are REQUIRED for ANY backend change — service, DAO, model, mapper, utility — not just controllers.
- Functional (Playwright) tests are REQUIRED for ANY frontend change — component, route, form, validation, i18n, styling that affects user flows.
- If a required test type is missing from the spec → spec is NOT ready for dev.
- Before marking any type SKIP: attempt resolution first. Missing dependency/directory/config/plugin = resolvable → ADD/CREATE it, do NOT skip. Only non-resolvable blockers (runtime mismatch, OS incompatibility, network/firewall) may be SKIP'd with documented reason.

#### 🔴 TEST TASK REQUIREMENTS (Each test task in the spec MUST have ALL three)

1. **Full file path** from workspace root
2. **Given/When/Then scenarios** derived from knowledge-base + source code
3. **CREATE or UPDATE** — CREATE for new test files; UPDATE for modifying existing tests

Test file path conventions:

| Test Type | File Path Convention |
|---|---|
| Unit (Java) | `src/test/java/{package}/{ClassName}Test.java` |
| Unit (React) | `src/__tests__/{mirrored-path}/{FileName}.test.js` — check for legacy colocated `.test.js` first; update in place if found, create new in `src/__tests__/`. If node_modules unavailable, test yup schemas/utils/hooks in isolation — never skip entirely. |
| Functional (Playwright) | `functional-tests/tests/e2e/{positive,negative,edge-case}/{feature}.spec.js` — use existing page objects + fixtures from `functional-tests/support/` |
| API | `api-tests/collections/{service-name}.json` + `api-tests/data/` — include positive, negative, boundary, and security test data. Test patterns: status codes, response schema, validation errors, auth failures. |

Tests scoped to current issue ONLY. Do NOT regenerate/rewrite unrelated existing tests.

#### 🔴 TEST SCENARIO DISCOVERY (Scan BOTH sources — never one alone)

Before writing test tasks, discover scenarios from BOTH knowledge-base AND source code:

| Source | What to Scan |
|---|---|
| `knowledge-base/business/` | Business rules, process flows for files in scope |
| `knowledge-base/api/` | API contracts (OpenAPI specs) for endpoints being modified |
| `knowledge-base/common-services/` | Shared service contracts if touching Common Service dependencies |
| Source files being modified | Validation logic, conditionals, error handling, embedded rules |
| Existing test files | Patterns, helpers, fixtures, page objects to reuse |

Scenarios = UNION of KB + code. KB rule implemented in code → test MUST verify it. Code validation not in KB → test MUST still cover it.

#### TEST INFRASTRUCTURE PRE-CHECK (If missing → add as Task 0 in spec)

For each REQUIRED test type, verify infrastructure exists. If missing, add scaffolding as Task 0 (prerequisite before test-writing tasks). Only scaffold types marked REQUIRED. The spec is the complete blueprint — do not assume infrastructure will be set up separately.

| Test Type | Check Exists | If Missing → Add to Spec |
|---|---|---|
| Unit (Java) | `spring-boot-starter-test` in pom.xml | ADD dependency (scope: test) |
| Unit (Java) | `jacoco-maven-plugin` in pom.xml | ADD plugin (prepare-agent + report goals) |
| Unit (Java) | `src/test/java/{pkg}/` directory | CREATE directory structure |
| Unit (React) | `@testing-library/react` + jest in package.json | ADD to devDependencies |
| Unit (React) | `src/__tests__/` directory | CREATE mirroring src/ structure |
| Functional | `@playwright/test` in package.json | ADD @playwright/test + @faker-js/faker to devDeps; ADD e2e scripts to package.json |
| Functional | `functional-tests/` + `playwright.config.js` | CREATE playwright.config.js (testDir, reporters, webServer); CREATE dirs: tests/e2e/{positive,negative,edge-case}/, support/{fixtures,page-objects,helpers}/, config/, test-results/; CREATE base fixtures; ADD .gitignore for test-results/ |
| API | `{service}/api-tests/` + package.json | CREATE api-tests/ with collections/, environments/, data/, scripts/ |

Ref setup prompts: `/tdgs-aidlc-setup-unit-tests`, `/tdgs-aidlc-setup-functional-tests`, `/tdgs-aidlc-setup-api-tests`

#### 🔴 SPEC SELF-REVIEW GATE (Generate BOTH artifacts before presenting spec)

**Artifact A — Traceability Table:** Map every production file → corresponding test file:

| # | Production File Modified/Created | Test File (CREATE or UPDATE) | Test Type |
|---|---|---|---|
| 1 | source file path | test file path | Unit/Functional/API |

Rules: one row per production file. No production file may lack a test row. Non-logic files may say "Covered by [test]" with justification. If the issue touches UI → at least one row must show a Functional test. If backend → at least one row must show an API test.

**Artifact B — Enforcement Cross-Check:**

| Required Test Type | Required? | Task # in Spec | Pass/Fail |
|---|---|---|---|
| Unit (Java) | YES/NO | Task N / — | PASS/FAIL |
| Unit (React) | YES/NO | Task N / — | PASS/FAIL |
| Functional (Playwright) | YES/NO | Task N / — | PASS/FAIL |
| API Tests | YES/NO | Task N / — | PASS/FAIL |

If ANY row = FAIL → add missing tasks before presenting. Verify each test task has file path + Given/When/Then scenarios + CREATE/UPDATE.

#### 🔴 POST-IMPLEMENTATION VALIDATION

After implementation, run ONLY issue-scoped tests. ALL commands MUST include report/coverage flags:

| Test Type | Command | Report Output |
|---|---|---|
| Unit (Java) | `cd {service} && mvn test -Dtest={TestClass} -Plocal` | `target/site/jacoco/` |
| Unit (Jest) | `cd {ui} && npx react-scripts test --watchAll=false --coverage --testPathPattern="{path}"` | `coverage/lcov-report/` |
| Functional | `cd {ui} && npx playwright test {spec} --reporter=html,json` | `functional-tests/test-results/` |
| API | `cd {service}/api-tests && npm test -- --collection={file}` | `api-tests/test-results/` |

Prerequisites: Unit/Jest = no setup needed. Playwright = auto-starts UI via webServer config (uses mockAllAPIs fixture). API = needs backend running: `mvn spring-boot:run -Plocal`.
Run selective tests first → optionally full suite as regression check before PR.

#### 🔴 POST-TEST EXECUTION SUMMARY

After ALL tests complete, generate `{implementation_artifacts}/test-results-{issue-number}.md`:

| Test Type | Status | Tests | Pass | Fail | Skip | Coverage | Report Location |
|---|---|---|---|---|---|---|---|
| Unit (Java) | PASS/FAIL/SKIP | N | N | N | N | XX% | target/surefire-reports/ + target/site/jacoco/ |
| Unit (Jest) | PASS/FAIL/SKIP | N | N | N | N | XX% | coverage/lcov-report/ |
| Functional (PW) | PASS/FAIL/SKIP | N | N | N | N | — | functional-tests/test-results/ |
| API Tests | PASS/FAIL/SKIP | N | N | N | N | — | api-tests/test-results/ |

Rules: The agent MUST NOT silently skip any test type. Every type from enforcement table MUST appear (PASS, FAIL, or SKIP with documented reason). FAIL → include failure summary with test names. SKIP → document (1) what was attempted, (2) why unresolvable, (3) what would enable it. List files below 80% coverage threshold.
This file is the single source of truth for reviewing what was tested.
```

---

## Critical Don't-Miss Rules (Paste at Category 7)

When the agent shows auto-discovered critical rules and offers A/P/C, paste this block before choosing C:

```text
Please also add these rules to the Critical section:

#### Database Change Scripts
When the spec includes a database change (new table, alter column, seed data, etc.):
- MUST include forward migration script(s) AND matching rollback script(s)
- **Naming convention (Oracle 19c Database-as-Code):**
  - Forward: `V<major>.<minor>.<patch>_<seq>_<description>.sql` (e.g., `V1.0.1_002_add_order_tracking_number_to_birth_verifications.sql`)
  - Rollback: `U<major>.<minor>.<patch>_<seq>_<description>.sql` (e.g., `U1.0.1_002_remove_order_tracking_number_from_birth_verifications.sql`)
- **Legacy/Fallback naming** (for non-Oracle projects): `DBCR-TX-<APP_NAME>-<GITHUB_ISSUE>.sql` and `DBCR-TX-<APP_NAME>-<GITHUB_ISSUE>_ROLLBACK.sql`
- Scripts go in the database repository (e.g., `tdgs-ovra-database/db/migrations/` and `tdgs-ovra-database/db/rollbacks/`)
- Each DDL change to a distinct table SHOULD be its own script (enables independent rollback)
- All scripts MUST use the PL/SQL idempotency wrapper with `SCHEMA_VERSION_HISTORY` check
- Include all migration + rollback files as CREATE tasks in the spec's Tasks & Acceptance section
- `master_deploy.sql` manifest MUST be updated with new migration entries and dependency declarations
- **Baseline Sync:** Append the DDL changes to `db/baseline/OVRA_METADATA.sql` as a commented block with:
  - GHI issue reference and URL
  - Description of the change
  - Applied date
  - The equivalent ALTER TABLE / CREATE TABLE statements
  - This keeps the baseline file as the single source of truth for current schema state
  - **Only applies when the issue includes database changes** — skip for app-only issues

#### Knowledge-Base Scanning
When creating a spec, the agent MUST:
- Read ALL documentation within the knowledge-base/ directory, including subdirectories:
  api/, apigee/, business/, common-services/, project/, repos/, shared/, test-management/
- Pay special attention to knowledge-base/common-services/ for shared service contracts
  (generated by Document Project from symlinked common repos listed in `common_repos` config)
- Cross-reference API specifications in knowledge-base/api/ when modifying endpoints

#### Common Services Impact Assessment
If the spec involves changes that touch or depend on Common Services
(repos listed in `common_repos` in .github/i2a-config.yml — e.g., Notification Engine, PACS, Payment Integration, TCAS):
- MUST include a Common Services Impact Assessment section in the spec
- MUST clearly flag any required Common Services changes with a warning
- MUST note that changes to common repos may affect other applications
- If NO Common Services changes are needed, explicitly state that with rationale
```

---

## Post-Generation Validation Checklist

After generating `project-context.md`, verify ALL of these subsections exist:

### Testing Rules (Category 4)
- [ ] TEST ENFORCEMENT TABLE (layer detection matrix)
- [ ] TEST TASK REQUIREMENTS (file path + Given/When/Then + CREATE/UPDATE)
- [ ] TEST SCENARIO DISCOVERY (KB + source scanning)
- [ ] TEST INFRASTRUCTURE PRE-CHECK (scaffolding as Task 0)
- [ ] SPEC SELF-REVIEW GATE (traceability table + enforcement cross-check)
- [ ] POST-IMPLEMENTATION VALIDATION (run commands + report flags)
- [ ] POST-TEST EXECUTION SUMMARY (generate test-results-{issue}.md)

### Critical Don't-Miss Rules (Category 7)
- [ ] Database Change Scripts (forward + rollback)
- [ ] Knowledge-Base Scanning (all KB subdirectories)
- [ ] Common Services Impact Assessment

If any subsection is missing, manually add it from this template file.
