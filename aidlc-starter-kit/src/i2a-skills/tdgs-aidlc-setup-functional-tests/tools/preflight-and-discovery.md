# Pre-flight Checks + Discovery

## Pre-flight Check: Multi-Repository Workspace

> ⚠️ Workspace root is NOT a git repository — repos live in subdirectories. Do NOT run `git` at root. Do NOT create test files at workspace root. All Playwright files go inside the detected UI repository.

## Pre-flight Check: Ground-Truth Hierarchy (MANDATORY — Self-Sustained Spec)

> ⚠️ Single authoritative rule for any value placed in a Playwright form-fill, fixture, factory output, or assertion produced by this prompt's scaffolding or by `/tdgs-aidlc-generate-functional-tests`.

### Workspace Sources (scan in this order)

1. **project-context.md** — `*-docs*/project-context.md`
2. **Test data catalog** — `*-docs*/test-data/test-data-catalog.yaml`
3. **Knowledge base** (MANDATORY when `*-docs*/knowledge-base/` exists) — recursively index `knowledge-base/{api,business,common-services,repos,shared}/**/*.md`
4. **UI repository** — discover the UI API client directory (try in order: `*-ui*/src/api/`, `*-ui*/src/services/`, `*-ui*/src/client/`, `*-ui*/src/http/`, `*-ui*/src/lib/api/`; honor any explicit override in `project-context.md`). Then add screen components, Yup/Zod schemas, dropdown sources, date validators. Authoritative for FORM SHAPE: field labels, allowed enum literals, conditional visibility, validation regex
5. **Backend DTO/schema** — request/response classes. Authoritative for field NAMES the API will accept after the form submits
6. **DDL** — every `*.sql`. Authoritative for value constraints at persistence boundary
7. **DAO layer** — bind-statement format inference. Authoritative for format

### Field-Derivation Hierarchy P0–P6

> **Abbreviated version.** See `/tdgs-aidlc-generate-functional-tests` §Constraints for the full specification including P0 pool-class exclusion rules and per-field provenance requirements.

| Tier | Source | Use when |
|------|--------|----------|
| P0 | `{{catalog.identityPool.<pool>.<field>}}` | external-required pool exposes field AND format matches the UI input |
| P1 | `{{captured.<name>}}` | a prior screen step's API response provided it (e.g., `{businessId}` rendered into next page) |
| P2 | UI Yup/Zod schema example | UI source declares allowed values/shape |
| P3 | KB-documented value | `knowledge-base/**/*.md` declares it |
| P4 | DDL/DAO-derived literal | constraint or format dictates value |
| P5 | DTO annotation literal | `@Pattern` regex sample, first enum value |
| P6 | Typed placeholder | last resort — tagged `(typed-placeholder for <field> — <reject_reason>)` |

**No-skip rule:** record `reject_reason` and fall through. Skipping silently = generation bug.

### Per-Field Provenance Table (MANDATORY in Pre-Write Contract of consumer prompt)

Emit BEFORE writing every spec / factory:

```
| field path (form locator) | tier | source ref | value/token | reject_reason (P6 only) |
```

Un-explained P6s = contract rejected.

### Generation-Time Self-Validation Gate

(1) Parse spec/factory as valid TS/JS, (2) every form-fill value resolves to allowed set / valid literal, (3) every form field locator corresponds to a real selector found in the UI source, (4) every literal complies with the UI's Yup/Zod schema, (5) every persisted format field matches DAO format. Any failure → STOP.

### Catalog-Gaps Feedback Loop

When any form-fill value falls to P6, append to `*-docs*/test-data/catalog-gaps.yaml`:

```yaml
gaps:
  - poolType: "<pool|null>"
    field: "<suggested catalog field name>"
    requiredFormat: "<UI/DTO-required format>"
    requestedBy: ["<screen-or-spec path>"]
    reason: "<why P0 rejected>"
    suggestedValue: "<example>"
```

### Role of THIS prompt in the Hierarchy

**Scaffolds the framework consumed by `/tdgs-aidlc-generate-functional-tests`.** Generated fixtures + factory helpers under `functional-tests/support/factories/` MUST: (1) expose per-pool accessor `getIdentityPool('<poolType>')` returning `record.fields` from runtime fixture (never hardcoded), (2) format-aware coerce when UI form expects different format than catalog stores, (3) classify `data-issue` outcome when `external-required` pool exhausted, (4) APPEND to `*-docs*/test-data/catalog-gaps.yaml` when coercion impossible. Generated `playwright.config.js` MUST surface format-config for per-env coercion.

## Parameters

| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| `ui_repo` | No | Auto-detect | UI repo directory name. Auto-detected by scanning for `package.json` containing `react`, `angular`, or `vue` dependencies. |
| `coverage_target` | No | `80` | Minimum business-rule coverage percentage target. Stored in framework config for use by `/tdgs-aidlc-generate-functional-tests`. |

### Coverage Target Behavior

1. **If parameter provided:** Use it (e.g., `/tdgs-aidlc-setup-functional-tests 90`)
2. **If NOT provided:** Prompt the user:
   ```
   📊 Coverage target not specified.
   
   What minimum business-rule coverage percentage should functional tests target?
   Enter a number (e.g., 60, 80, 90) or press Enter for default (80%):
   > _
   ```
3. **If user presses Enter / skips:** Use default `80%`
4. **Coverage target is stored in** `{ui-repo}/functional-tests/config/coverage.json` for use by the generate prompt.

**If auto-detection finds multiple UI repos:** List them in a numbered table and ask the user to select one.
**If no UI repo found:** Display a warning and guidance:
```
⚠️ No frontend UI repository detected in this workspace.

Functional tests (Playwright) require a UI project. Options:
  a) If your app is backend-only (API / Lambda / CLI), skip this prompt — use /tdgs-aidlc-setup-api-tests and /tdgs-aidlc-setup-unit-tests instead.
  b) If the UI exists in a separate workspace, run this prompt from that workspace.
  c) If you want to test API responses via browser (e.g., Swagger UI), specify the repo manually: /tdgs-aidlc-setup-functional-tests ui_repo={repo-name}
```

---

## Step 1 — Auto-Detect UI Repository

Scan the workspace root for all subdirectories. For each, check if it contains a `package.json` with frontend framework dependencies (`react`, `angular`, `vue`, `next`, `nuxt`, `svelte`).

**Exclusions:** Skip folders named `node_modules`, `_bmad*`, `tdgs-aidlc-starter-kit`, `*-docs*`, `.github`, `scripts`, `_bmad-output`, `apigee-exports`.

Display detected UI repo:
```
══════════════════════════════════════════════════════════════
DETECTED UI REPOSITORY
══════════════════════════════════════════════════════════════

  UI Repo:    {ui-repo-name}/
  Framework:  {react|angular|vue} {version}
  Package Manager: {npm|yarn|pnpm}
  Existing Tests: {yes/no — check for jest/vitest config, *.test.* files}

══════════════════════════════════════════════════════════════
```

## Step 2 — Auto-Detect All Repositories (for Discovery Context)

Scan the workspace for ALL repos (frontend and backend) to understand the full application:
- **Frontend repos:** `package.json` with UI framework deps
- **Backend repos:** `pom.xml` (Java/Spring Boot), `requirements.txt` (Python), `*.csproj` (C#/.NET)

List ALL discovered repos in a numbered table with: name, type (frontend/backend), path, stack.
