# Flow Descriptors

## Step 6b — Establish Flow Descriptor Convention (MANDATORY when flow docs exist)

> Functional tests must cover **complete end-to-end business flows**, not just isolated screens. Without an explicit per-flow descriptor file, the generator has no machine-readable target list — it falls back to per-screen specs and `ledger.yaml.runs[].perFlowRollup[]` is empty (CI tooling and per-service `test-report.md` flow rollup both go blank). This step establishes the convention so `/tdgs-aidlc-generate-functional-tests` Phase 0a (flow enumeration) and the ledger's per-flow rollup share one source of truth.

### When to Execute

Execute when `knowledge-base/business/process-flows.md` OR equivalent flow documentation exists. Skip entirely when no such KB doc exists — in that case the generate prompt's Phase 0a will discover flows from the UI route graph alone, write descriptors, and ask the user to confirm.

### Create Flow Directory + README

Create the directory `{ui-repo}/functional-tests/tests/flows/` (empty at scaffold time — the generate prompt populates it) and write a single `README.md` inside it with this exact contract:

```
# Flow Descriptors

Every file in this directory matches `*.flow.json` and describes ONE end-to-end business flow.
`/tdgs-aidlc-generate-functional-tests` Phase 0a writes one descriptor per flow it discovers from
the knowledge base + UI route graph; reviewers may edit, add, or remove descriptors before the
generator's main pass writes the spec files.

Schema (every REQUIRED field is mandatory — the generator's AJV gate rejects malformed descriptors; OPTIONAL fields below MAY be added by reviewers without tripping the gate):

  {
    // ===== REQUIRED =====
    "flowId": "<kebab-case unique id, runtime-discovered>",
    "name": "<human-readable name, runtime-discovered>",
    "sourceRef": "<kb-path or code-path that defined this flow>",
    "entryRoute": "<literal route from UI router — the FIRST screen of the flow>" | null,   // R10-B6: NULLABLE — backend-only flows discovered from controller scans (no UI entry point) MUST set entryRoute = null. Generator emits API-only assertions for these.
    "steps": [
      { "screen": "<screen name from uiScreens[]>", "action": "<one-line user action>", "emitsApi": ["METHOD /path", ...] }
    ],
    "executionSteps": [
      // Low-level runtime steps consumed by flow-runner.js (Step 7d).
      // Each entry has "kind" ∈ {navigate, fill, click, select, datepicker, assert, wait-api, capture, cross-service-skip, upload-file, download-file, verify-notification, custom}
      // plus per-kind fields: route, selector, value, valueFromCatalog, apiPattern, assertText, fixture, expectedExtension, recipient, subjectMatch, etc.
      // CASE-TYPE VALUE VARIANTS (MUST be declared in schema — used by flow-runner caseType dispatch):
      //   negativeValidationValue — format-violating literal for the field (used when caseType=negative-validation)
      //   boundaryValue — min/max constraint literal (used when caseType=boundary)
      //   negativeBusinessRuleValue — business-rule-violating literal that passes format validation (used when caseType=negative-business-rule)
      // Phase 0a writes a SKELETON (one navigate + one assert per high-level step); the generator's
      // main pass EXPANDS each skeleton entry into the full action sequence by reading UI source.
      // The flow-runner reads ONLY executionSteps[], never steps[].
    ],
    "successCriteria": "<one-line observable outcome>",
    "requiredPools": ["<identityPool poolType>", ...],
    "crossServiceDependencies": ["<upstream-service-id>", ...],
    // ===== OPTIONAL (R10-B1: declared so additionalProperties:false does NOT AJV-reject reviewer edits) =====
    "personas": ["<persona-id>", ...],
    "variantAxes": [
      // { "name": "<axisName>", "values": ["<v1>", "<v2>", ...] }
    ],
    "acknowledgedMissingAxes": false,
    "axisAcknowledgmentReason": "<one-line>",
    "skipCases": ["negative-validation", ...],
    "skipPersonas": ["<persona-id>", ...],
    "deferred": ["<flowId>:<persona>:<case>", ...],
    "prerequisiteFlows": ["<flowId>", ...],
    "preferredMode": "real" | "mock" | "both"
  }

The schema MUST set `additionalProperties: false` at every object level (top-level + steps[] items + executionSteps[] items) — unknown properties are HARD failures, but the OPTIONAL fields above are explicitly declared so reviewers can use them safely.

Naming: the file basename MUST equal `flowId` (e.g. `<flowId>.flow.json`).

Readers: `/tdgs-aidlc-generate-functional-tests` (Phase 0a + Section 3d Coverage Matrix),
         `/tdgs-aidlc-setup-testdata` (writes `perFlowRollup[]` into `ledger.yaml`),
         `/tdgs-aidlc-run-tests` (per-flow result aggregation).
```

### Create JSON Schema

Write `{ui-repo}/functional-tests/tests/flows/flow-descriptor.schema.json` (draft-2020-12) that enforces the contract above with `additionalProperties: false`. The generator AJV-validates every `*.flow.json` against this schema before consuming it; malformed descriptors fail loud with a JSON-pointer error.

The schema MUST include all OPTIONAL fields listed above (`personas`, `variantAxes`, `acknowledgedMissingAxes`, `axisAcknowledgmentReason`, `skipCases`, `skipPersonas`, `deferred`, `prerequisiteFlows`, `preferredMode`).

#### variantAxes Schema Fragment

```json
"variantAxes": {
  "type": "array",
  "items": {
    "type": "object",
    "additionalProperties": false,
    "required": ["name", "values"],
    "properties": {
      "name":   { "type": "string", "pattern": "^[a-z][a-zA-Z0-9]*$" },
      "values": { "type": "array", "minItems": 1, "items": { "type": "string", "minLength": 1 } }
    }
  }
}
```

#### Cross-Field Constraint

When `acknowledgedMissingAxes === true`, `axisAcknowledgmentReason` MUST be non-empty (`if`/`then` JSON-Schema). Without this, the completeness gate's escape hatch silently opens.

### preferredMode Behavior

- `"real"` / `"mock"` → flow-runner skips with structured `data-issue` if mode mismatches (no silent stub substitution).
- `"both"` → registered TWICE, dashboard tags each row with Mode badge, both feed same flowId rollup but count as separate executions.
- **Real-priority default (run-tests Step A2b):** when ≥1 flow declares `preferredMode:"real"`, run-tests defaults to `real` and surfaces `ℹ️ {N} flow(s) prefer real mode — defaulting to real. Pass --mode=mock to override.` Silent fallback to mock is FORBIDDEN — fail with missing-prereq.
