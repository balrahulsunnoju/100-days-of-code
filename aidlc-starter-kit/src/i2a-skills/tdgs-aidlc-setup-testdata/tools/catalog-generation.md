# Setup Test Data — Catalog Generation

## Step 3 — Write the catalog

> **Pre-condition (MANDATORY).** Step 3 MUST NOT run until the Step 2 Exit Gate is satisfied. The Step 2 audit-trail line (`✅ Step 2 complete: ...`) is the only acceptable evidence. Discovered pool list from Step 1 does NOT authorize writing `records: []` for `external-required` pools.

Write `{docs-repo}/test-data/test-data-catalog.yaml`. **Do not invent extra sections.**

> **OVERWRITE-IN-PLACE — single document, never append (MANDATORY).** The catalog is a SINGLE YAML document. Every run completely OVERWRITES with the freshly-derived snapshot. Never append a new `version:` block (produces malformed multi-doc file, breaks `yaml.load`). If a prior file has multiple `^version:` headers, parse the LAST chunk as prior state, merge any `records[]` with `consumedCount > 0` or `status === 'quarantined'` into matching pools (by `poolType`), then write as single document.
>
> **POOL NAMING STABILITY — preserve `poolType` across runs (MANDATORY).** `poolType` is a public contract referenced via `{{catalog.identityPool.<poolType>.<field>}}`. When fresh discovery would produce a renamed equivalent, KEEP the prior `poolType`. Apply renames only via an explicit `poolRenames` confirmation step that gives the user an abort option.

```yaml
version: "1.0"
application: "{from project-context.md}"
# All ISO-8601 timestamps in this file and every sibling artifact MUST be UTC with literal `Z` suffix
# (e.g. `2026-05-04T13:45:22Z`). Local-offset (`...-05:00`) is FORBIDDEN — `runId` sorts lexicographically
# across services and mixed offsets break the latest-run rule.
generatedAt: "{ISO-8601-UTC-Z}"
lastRefreshed: "{ISO-8601-UTC-Z}"

# Sequenced API call chains — derived from .then() / await order in UI handlers.
# Endpoint versions limited to what the UI actively imports. `via[]` and `transformsAt` OPTIONAL
# (declare when calls go through Apigee/Lambda/middleware that may rewrite the envelope; discovered
# from `knowledge-base/apigee/`, `knowledge-base/common-services/`, `apigee-exports/`). When omitted,
# runner assumes `direct`.
apiChain:
  - chainId: "{kebab-case}"
    steps:
      - endpoint: "POST /{path}"
        target: "backend|external|apigee-proxy|lambda"
        via: ["apigee:{proxyName}", "lambda:{functionName}"]   # OPTIONAL — ordered intermediaries
        transformsAt: "apigee|lambda|backend|none"             # OPTIONAL — where the envelope is rewritten
    capture:
      - { fromStep: 0, field: "{response-field}", as: "{token-name}" }

# Per-screen actively-consumed API calls (deduped across the workspace).
# Each endpoint entry MUST include `target`. Screens with no API calls MUST be omitted.
# Use generic screen names when multiple screen components share an identical call list.
uiScreens:
  - screen: "{GenericScreenName}"
    route: "/{ui-route-path}"
    endpoints:
      - { endpoint: "POST /{path}", target: "backend|external" }

# Identity pools — finite test data. Records are REUSABLE in non-prod.
identityPools:
  - poolType: "{type}"
    class: "external-required | upstream-generated | derivable-from-ui"
    description: "{what this represents}"
    providedBy: "{user-paste | upstream:<endpoint> | ui-form:<screen>}"
    dataSources: ["{user-paste | spreadsheet | upstream:<endpoint>}"]   # REQUIRED by schema — how records were/will be sourced
    fields: ["{field1}", "{field2}"]
    usedIn: ["{endpoint or screen}"]
    quarantineThreshold: 5
    records:
      - fields: { field1: "value", field2: "value" }
        status: "available"          # available | reserved | quarantined  (NEVER 'consumed' — records stay 'available' on pass; see Status semantics)
        placeholder: false           # true if any field is PLACEHOLDER_*
        consumedCount: 0
        failureCount: 0              # total failures (displayed on dashboard)
        consecutiveFailureCount: 0   # resets on PASS; drives quarantine
        lastUsedAt: null             # ISO-8601
        lastUsedRunId: null
        lastFailedReason: null

# Optional cross-service stub overrides — un-skips consumer tests that would otherwise be classified
# `cross-service-dependency` per G7. Keys = camelCase consumer-endpoint slugs; values map required
# field names to static values. Consumed by /tdgs-aidlc-generate-api-tests and by the test-runner.
# OMIT the entire `stubs:` block when no stubs are needed.
# stubs:
#   sendNotification:
#     transactionId: "STUB-12345"
```

**Status semantics (runner contract):**

| Outcome on this record | `consumedCount` | `failureCount` | `consecutiveFailureCount` | `status` after |
|---|---|---|---|---|
| Test PASS | +1 | unchanged | reset to 0 | `available` |
| Test FAIL | +1 | +1 | +1 | `available` UNLESS counter ≥ 5, then `quarantined` |
| Run completes, record unused | unchanged | unchanged | unchanged | unchanged |

> In non-prod, records are reusable indefinitely. They only stop being picked when they have failed **5 consecutive times**. A user releases a quarantined record by re-running this prompt and choosing `release` for the pool.

If a pool has zero `available` records when a test needs one, mark only those tests `data-issue` and skip them. Never block other tests.

---
