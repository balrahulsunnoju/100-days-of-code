# Constraints, Anti-Hallucination, Phase-5 Mandates

## Constraints

- **All test files go into `{service-repo}/api-tests/`** — nowhere else. Each service owns its own tests.
- **All reports go into `{service-repo}/api-tests/test-results/`** — per service, not aggregated at root.
- **Do NOT modify production source code.** Do not change controllers, services, models, configs, or any `src/main/` files.
- **Do NOT create test files at the workspace root.** No root-level `api-tests/` directory.
- **Do NOT auto-start backend services (G7).** Probe health endpoints (`/actuator/health`, `/health`, `/api/health`, `/`) and fail-loud with per-stack manual-start commands if unreachable. Never start `mvn spring-boot:run`, `npm start`, `dotnet run`, or any server process.
- **Collections must use Insomnia v4 export format** with `unit_test_suite` + `unit_test` resources. Without these, `inso run test` will fail with "no test suites found".
- **Test code must use `insomnia.send()` + chai `expect()`** — do NOT use Postman's `pm.test()`, `pm.response`, `pm.expect()` scripting API. These are incompatible with `inso` CLI.
- **Collections must remain Insomnia Desktop importable** — valid Insomnia v4 format.
- **Clearly distinguish API defects from infrastructure issues from DB-down issues** in all reports.
- **Environment files must NOT contain secrets.** Use `${VARIABLE}` placeholders.
- Every test must reference a discovered business rule or validation annotation. **Use KB rule IDs** in test titles when available, rather than auto-generated identifiers.
- **Generated test assertions MUST be compatible with BOTH `inso` CLI (full chai) AND the Node.js fallback (mini-chai).** The Node.js fallback implements a minimal chai subset enforced at runner startup by the mini-chai self-test (see `/tdgs-aidlc-setup-api-tests` MANDATORY Mini-chai startup self-test). The CANONICAL allow-list (must match the runner's `REQUIRED_PATHS` exactly): `.to.equal()`, `.to.not.equal()`, `.to.contain()` / `.to.include()`, `.to.not.contain()`, `.to.have.property()`, `.to.have.lengthOf()`, `.to.be.oneOf()`, `.to.be.a()` / `.to.be.an()`, `.to.be.above()` / `.to.be.greaterThan()`, `.to.be.below()` / `.to.be.lessThan()`, `.to.be.within()`, `.to.be.true`, `.to.be.false`, `.to.be.null`, `.to.be.ok`, `.to.exist`. Do NOT use other chai methods (e.g., `.to.deep.equal()`, `.to.match()`, `.to.have.nested.property()`, `.to.throw()`) — they are NOT in `REQUIRED_PATHS` and the runner's startup self-test will fail-fast (exit 2) if `buildAssertionFn` ever drifts to include them without updating the contract. This list MUST stay in lock-step with the setup prompt's `REQUIRED_PATHS` array — any addition here requires the same addition there, in the same edit pass.
- **Field types must be consistent across collections.** If a shared field (e.g., an ID or reference number) is a string in one endpoint, it must be the same type everywhere. Cross-reference the catalog's `pattern` and `type` definitions to verify consistency across all collections.
- **NEVER hardcode application-specific values** (app names, agency IDs, business constants, city/state values) in collections, payloads, or reports. All values must come from the test-data catalog, reference data files, or workspace scanning. These prompts are an enterprise-level common framework used across multiple applications.

## Anti-Hallucination Guardrails

> ⚠️ **These guardrails apply to every generated collection and test. Violation is a HARD FAILURE.**

1. **NEVER generate a request payload field that does not exist in the `@RequestBody` model class** (or equivalent DTO). Check the model class, its parent classes, and `@JsonProperty` annotations to determine the correct JSON wire names.
2. **NEVER generate a response body assertion for a field that does not exist in the response model class.** Read the controller's return type, open the response DTO, and verify each asserted field.
3. **NEVER generate a test for an endpoint that does not exist in a controller/route.** Every request in the collection must trace back to a real controller method with the exact HTTP method and path.
4. **NEVER generate hardcoded identity values** (SSN, DL numbers, DOB, credentials, API keys) in request payloads. ALL identity data MUST use `{{catalog.identityPool.*}}` tokens. Even if real values exist in the catalog, tokens enable pool rotation and consumption tracking.
5. **NEVER generate hardcoded chained values** (order numbers, transaction IDs, reference numbers produced by upstream endpoints). ALL chained values MUST use `{{captured.*}}` tokens with proper `capture`/`inject` metadata.
6. **NEVER generate report files with static counts.** Reports are ALWAYS generated programmatically from `results.json` by `generate-report.js`.
7. **NEVER assume a field is required or optional without checking the model's validation annotations** (`@NotNull`, `@NotBlank`, `@Size`, Pydantic `Field(...)`, etc.).
8. **NEVER copy business constants from backend Constants classes without verifying against UI API source code.** Backend constants are often DB-internal values not used in API payloads. The UI is the authoritative source for payload values.
9. **NEVER use `@JsonIgnore`-annotated fields in request payloads.** These fields are excluded from JSON serialization.
10. **Test data is REUSABLE in non-prod environments.** If one identity record fails, the system should try the next available record — NOT hard-stop the entire test suite. Pool exhaustion skips affected tests but continues with unaffected tests.

### Post-Generation Validation Gate

> **Read on demand:** `tools/post-generation-checks.md` (Checks 1–20). Run `node .github/i2a-skills/tdgs-aidlc-generate-api-tests/scripts/post-generation-gate.mjs {service}/api-tests/collections/*.json` for mechanical greps (covers Checks 11, 15, 17, 20 + rule #5 `elapsedTime` + Postman `pm.*`). Documented overrides: `SKIP_AJV=1` (no KB OpenAPI / non-JSON response), `SKIP_ELAPSED_TIME=1` (async endpoint, SLA upstream) — record carve-out reason in generation report. Then complete the remaining semantic checks from the tool doc. **Do not proceed to Step 6 until all checks pass.**



## Phase-5 Augmentations — Generation Mandates

### G5-1 — Cross-service / external dependency = stub token + runner `data-issue` (G7)

When required inputs cannot be resolved from (a) `apiChain[].capture[]` within this service, (b) `identityPools[]`, or (c) prior responses in the same collection, emit a **runnable** consumer request whose cross-service fields use `{{catalog.stubs.<currentSvcShortName>.<field>}}`. If the catalog has no value, write `TODO-PROVIDE-VALUE` under `stubs.<svc>.<field>` and append `requiredStubs:` to `catalog-gaps.yaml`. The runner classifies the test `data-issue` when the stub is still TODO (not `pass`/`fail`). **Do NOT** use collection-level `skip` metadata or `_skipReason` (LINT-6 rejects). Supply real stub values via `/tdgs-aidlc-setup-testdata` or env `CATALOG_STUB_*` before re-running.

### G5-2 — Multipart/form-data endpoints are not skipped

Do NOT skip endpoints that accept multipart input. Generate a test using `api-tests/fixtures/sample.<ext>` matching the endpoint's declared `accept` types. The Node fallback runner handles multipart per A5-2.

### G5-3 — Negative variant cap

Generate at most 5 negative variants per endpoint by default (per G4) for **shared/parent-level fields**. Each negative variant must declare its targeted invariant (e.g. `"invariant": "required-field-missing: {fieldName}"`) so the dashboard can group them. To exceed 5, the user must explicitly opt-in via parameter `max_negatives_per_endpoint=<N>`.

**Polymorphic endpoint exception:** For endpoints with multiple variant types (per G12), the cap of 5 applies SEPARATELY to: (a) shared parent-level negative tests (common to all variants), and (b) per-variant negative tests (targeting variant-specific fields). This means a polymorphic endpoint with N variants may have up to `5 shared + (1–2 × N variant-specific)` negative tests total. The per-variant negatives are capped at 2 per variant (1 missing-required + 1 invalid-format) unless the user opts in for more.

### G5-4 — Field-pinning regex

The `kbFieldValueMap` mining (Phase 1.6) MUST use the strict regex from G4:

```
/(?:field|attribute|column)\s+`?(\w+)`?\s+(?:is|must be|always equals)\s+`?([\w\d-]+)`?/i
```

Reject all other prose matches. If a field needs a pinned value but no strict-regex match exists, do NOT pin — ASK the user.

---
