---
mode: agent
description: "Validate test cases against context document business rules and generate a discrepancy report."
---

# Validate Test Context

Validate test cases in `test-management/manual/` against the generated context documents in the workspace to identify discrepancies between documented business rules and test expectations.

This prompt is **application-agnostic** — it dynamically discovers context documents, business rules, and test cases from any workspace.

## Pre-flight Check: Multi-Repository Workspace

> ⚠️ **CRITICAL**: The workspace root is NOT a git repository. Git repositories are located in subdirectories within the workspace.
>
> **DO NOT** run `git` commands at the workspace root level — they will fail.
>
> This workflow reads files from the workspace but does NOT require git operations. Locate the docs repository containing `knowledge-base/` and `test-management/` directories.

## Purpose

Cross-reference test cases with context documents to find mismatches. This validation:
- Identifies where test case values differ from documented business rules
- Highlights discrepancies for team review (either tests OR context may need updating)
- Finds gaps where documented functionality lacks test coverage
- Ensures test data aligns with data models

**Important**: This validation identifies DIFFERENCES — the team decides whether to update tests or update context based on what the actual system behavior is.

## Consistency Requirements

This validation MUST produce **deterministic, reproducible results**. Follow these rules strictly:

1. **Fixed output file**: ALWAYS write the report to `{docs-repo}/implementation-artifacts/test-validation-report.md` — overwrite if it already exists. NEVER create numbered variants (e.g., `test-validation-report_1.md`).
2. **Deterministic ordering**: Process test case files in **alphabetical order by filename**. Within each file, process test cases in the **order they appear** in the document.
3. **Deterministic rule matching**: When matching test values to business rules, use exact Rule ID matching first, then category + description matching. Document which rule was matched and why.
4. **Deterministic discrepancy IDs**: Number discrepancies sequentially (DISC-001, DISC-002...) in the order they are encountered during alphabetical file processing.
5. **Exhaustive comparison**: Compare ALL test case values against ALL relevant business rules — do not skip or sample. Every monetary value, every limit, every status must be checked.
6. **No subjective interpretation**: Report only factual differences between documented values. Do not infer, assume, or interpret beyond what is explicitly written in the source documents.
7. **Stable categorization**: Use these exact severity categories consistently — 🔴 Fee/Value Discrepancies, 🟡 Calculation Mismatches, 🔵 Coverage Gaps, ✅ Matching Test Cases.

## Process

### 0. Locate Docs Repository

Search the workspace for the docs repository by finding `knowledge-base/README.md`. The docs repo is the directory containing this file (typically `*-docs*/`).

**BAIL** if not found:
```
⛔ Cannot locate docs repository.
   Searched for knowledge-base/README.md in the workspace.
   Ensure the docs repo is cloned into this workspace.
```

All subsequent relative paths (e.g., `business/`, `shared/`, `test-management/`) are relative to the docs repository root.

### 1. Pre-flight Checks

#### 1.1 Discover & Verify Context Documents

Scan the docs repository for context documents. Look in these standard locations (check each, use what exists):

**Business Context** (look in `business/` folder):
- `business/business-rules-catalog.md` — Business rules, fees, validations
- `business/process-flows.md` — Workflow/process definitions
- `business/business-glossary.md` — Domain terminology
- `business/business-functionalities.md` — Feature descriptions
- Any other `.md` files in `business/`

**Shared/Technical Context** (look in `shared/` folder):
- `shared/data-models.md` — Domain data models
- `shared/database-schema.md` — Database structure
- `shared/system-architecture.md` — System design
- `shared/integration-architecture.md` — External integrations
- Any other `.md` files in `shared/`

**API Specs** (look in `api/` folder):
- `api/*.yaml` or `api/*.json` — OpenAPI/Swagger specs

**BAIL** if NO context documents are found at all. At minimum, one of the business or shared documents must exist.

List all discovered context documents for the report.

#### 1.2 Verify Test Cases Exist
- **Required:** `test-management/manual/` directory → BAIL if missing
- Scan for all `.md` files containing test cases (commonly prefixed `TC-*` but discover any convention used)
- BAIL if no test case files found
- List all discovered test case files

---

### 2. Load & Analyze Context Documents

Read ALL discovered context documents and dynamically extract reference data.

#### 2.1 Business Rules Extraction

From business rules documents, extract ALL rules including but not limited to:
- **Fee/Pricing Rules**: Any documented fees, prices, rates, costs, charges
- **Validation Rules**: Limits, constraints, required fields, allowed values
- **Calculation Rules**: Formulas, pricing models (flat-rate, tiered, first+additional, volume-based, percentage-based, etc.)
- **Status/State Rules**: Valid statuses, transitions, conditions
- **Business Logic Rules**: Conditional logic, eligibility, access control

Build a dynamic reference table of ALL discovered business rules:

| Rule ID | Category | Description | Documented Value |
|---------|----------|-------------|------------------|
| {discovered} | {category} | {description} | {value} |

#### 2.2 Data Model Extraction

From data model / database schema documents, extract:
- Entity/field definitions (names, types, required status)
- Relationships between entities
- Enum/allowed values for fields

#### 2.3 Workflow Extraction

From process flow documents, extract:
- Step sequences for each process/workflow
- Required vs optional steps
- Decision points and branches

#### 2.4 API Contract Extraction (if available)

From OpenAPI/Swagger specs, extract:
- Endpoint request/response schemas
- Required fields and validation rules
- Status codes and error definitions

---

### 3. Parse Test Cases

For each test case file in `test-management/manual/`, extract:

- **Test Case ID** — the identifier (e.g., TC-XXX-001 or whatever convention is used)
- **Test Case Title/Description** — what is being tested
- **Test Data Section** — all input values, quantities, parameters
- **Payment/Calculation Section** — any monetary values, fees, totals, amounts (look for tables with amounts, prices, fees, costs)
- **Expected Results** — expected outcomes, status codes, messages
- **Test Steps** — sequence of actions

**Key data to extract from each test case:**
- Any monetary amounts (fees, prices, costs, totals, subtotals, charges)
- Quantities or counts
- Field values that can be compared against data models
- Process/workflow steps that can be compared against process flows
- Status values or expected outcomes
- Validation scenarios (boundary values, error cases)

---

### 4. Perform Validation Comparisons

#### 4.1 Fee/Price Validation

For each test case containing monetary values:
1. Identify what the fee/price represents (map to a business rule by matching the record type, category, or description)
2. Look up the corresponding rule in the extracted business rules
3. Compare the test case value against the documented value
4. For multi-quantity scenarios, determine and verify the calculation model used:
   - **Flat-rate**: `Total = Quantity × Unit Price`
   - **First+Additional**: `Total = First Price + ((Qty - 1) × Additional Price)`
   - **Tiered/Volume**: Apply the documented tier brackets
   - **Percentage-based**: Apply the documented percentage
   - **Any other model**: Apply exactly as documented
5. Record match (✅) or discrepancy (❌) with details

#### 4.2 Total/Calculation Validation

After validating individual fees, verify calculated totals:
- Recalculate expected totals from all component values found in the test case
- Compare calculated total with test case stated total
- Flag any arithmetic mismatches

#### 4.3 Limit/Constraint Validation

Check test case values against documented validation rules:
- Maximum/minimum limits (quantities, amounts, lengths, etc.)
- Required field presence
- Allowed value enumerations
- Flag test cases that violate documented constraints
- Flag missing negative/boundary test cases for documented limits

#### 4.4 Data Model Field Validation

Compare test data field names against data model definitions:
- Flag if test uses a field name not in the model
- Flag if required fields are missing from test data
- Flag type mismatches (e.g., string vs number)

#### 4.5 Workflow Step Validation

Compare test step sequences against documented process flows:
- Flag missing critical steps
- Flag incorrect step order
- Flag undocumented steps in tests

---

### 5. Generate Validation Report

Create (or **overwrite** if it already exists) `{docs-repo}/implementation-artifacts/test-validation-report.md` using the format below. NEVER create a new file with a numeric suffix — always use the exact filename `test-validation-report.md`.

**CRITICAL**: Dynamically populate ALL sections based on what was actually discovered and compared. Do NOT hardcode any application-specific values. Every discrepancy, match, and gap must come from the actual comparison performed.

The report format:

---

# Test Context Validation Report

**Generated**: {YYYY-MM-DD}
**Application**: {Application name — infer from workspace README.md or root docs}
**Purpose**: Identify discrepancies between test cases and context documents

---

## Executive Summary

| Metric | Count |
|--------|-------|
| Test Case Files Analyzed | {count} |
| Individual Test Cases | {count} |
| 🔴 Fee/Value Discrepancies | {count} |
| 🟡 Calculation Mismatches | {count} |
| 🔵 Coverage Gaps | {count} |
| ✅ Matching Test Cases | {count} |

---

## 🔴 Fee/Value Discrepancies

These test cases have values that differ from documented business rules.

_For each discrepancy group, generate a section:_

### DISC-{NNN}: {Test Case ID(s)} - {Brief Description of Difference}

| Attribute | Test Case | Context ({source document name}) |
|-----------|-----------|-------------------------------------|
| **Category** | {what is being tested} | {what is documented} |
| **Quantity** | {if applicable} | — |
| **Test Value** | {value from test} | {value from context} ({Rule ID}) |
| **Source Rule** | — | {Rule ID}: {Rule Description} |
| **Difference** | {+/- amount or description} | — |

**Affected Test Cases:**

| Test Case | Qty | Test Value | Context Value | Difference |
|-----------|-----|------------|---------------|------------|
| {TC-ID} | {qty} | {test val} | {context val} | {diff} |

**If context is correct**, test case(s) should be updated:
- {field}: {test value} → {context value}
- {recalculated totals if applicable}

**If test case is correct**, context should be updated:
- {Rule ID}: {context value} → {test value}

---

## 🟡 Calculation Mismatches

Test cases where individual values may be correct but totals/calculations don't add up.

_For each mismatch:_

### CALC-{NNN}: {Test Case ID} - {Description}

| Attribute | Test Case | Recalculated |
|-----------|-----------|--------------|
| {Component 1} | {value} | {value} |
| {Component 2} | {value} | {value} |
| **Stated Total** | {test total} | — |
| **Calculated Total** | — | {recalculated} |
| **Difference** | {amount} | — |

---

## ✅ Matching Test Cases

These test cases align with context documents.

| Test Case | Category | Qty | Value Comparison | Status |
|-----------|----------|-----|------------------|--------|
| {TC-ID} | {type} | {qty} | {test val} = {context val} | ✅ Match |

---

## 🔵 Coverage Gaps

Documented features/rules without adequate test coverage.

| Feature/Rule | Context Document | Rule ID | Test Coverage | Gap |
|--------------|-----------------|---------|---------------|-----|
| {feature} | {document} | {rule id} | {status} | {description} |

---

## Detailed Comparison Table

_Group by category/record type as discovered dynamically:_

### {Category Name}

| Test Case | Type/Variant | Qty | Test Value | Context Value | Formula | Match |
|-----------|-------------|-----|------------|---------------|---------|-------|
| {TC-ID} | {type} | {qty} | {test val} | {context val} | {formula} | ✅/❌ |

---

## Resolution Required

The following discrepancies need team review to determine source of truth:

### Priority 1: Major Discrepancies

{Numbered list of significant value differences with affected test cases and impact}

### Priority 2: Model/Formula Discrepancies

{Numbered list of pricing model or calculation logic differences}

### Priority 3: Minor Discrepancies

{Numbered list of minor issues}

---

## Action Items

| # | Priority | Action | Owner | Due |
|---|----------|--------|-------|-----|
| {n} | 🔴/🟡/🔵 | {action description} | Team | - |

---

## Context Documents Referenced

| Document | Status |
|----------|--------|
| {path} | Loaded / Not Found |

---

## Test Case Files Analyzed

| File | Test Cases | Discrepancies |
|------|------------|---------------|
| {filename} | {count} | {count} |

---

**Report Generated By**: QA Validation Agent
**Next Review**: After team determines source of truth for discrepancies

---

### 6. Output Summary

After generating the report, display a summary to the user:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Test Context Validation Complete
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Application: {app name}
Test Cases Analyzed: {count}

Context Documents Referenced:
  {✓/✗ for each discovered document}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Validation Results:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🔴 Fee/Value Discrepancies:   {count}
  🟡 Calculation Mismatches:    {count}
  🔵 Coverage Gaps:             {count}
  ✅ Matching Cases:            {count}

Report saved to: {docs-repo}/implementation-artifacts/test-validation-report.md
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{If discrepancies found:}
⚠️  DISCREPANCIES FOUND

The following need team review to determine which is correct:

{Numbered summary of top discrepancies with affected test cases}

ACTION: Verify actual system behavior and update either tests or context.
```

---

## Notes

- This prompt works with **ANY application** — it discovers context and test cases dynamically
- All business rules, fees, and validation rules are extracted at runtime from workspace documents
- No application-specific values are hardcoded in this prompt
- Test case naming conventions are auto-detected from the workspace
- This validation identifies DISCREPANCIES — it does not assume which source is correct
- The team must verify actual system behavior to determine source of truth
- After resolution, update either test cases OR context documents accordingly
- Re-run validation after updates to confirm alignment
- **Consistency**: Running this prompt multiple times against the same unchanged workspace MUST produce the same report. If results differ between runs, the prompt is being applied incorrectly.
- **Output file**: Always `{docs-repo}/implementation-artifacts/test-validation-report.md` — overwrite, never create numbered copies
