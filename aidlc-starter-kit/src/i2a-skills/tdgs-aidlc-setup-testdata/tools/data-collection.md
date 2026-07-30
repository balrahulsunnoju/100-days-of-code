# Setup Test Data — Data Collection

## Step 2 — Ask for test data ONLY when needed

> 🛑 **STOP — THIS STEP IS INTERACTIVE AND BLOCKING. DO NOT SKIP.**
>
> MUST issue one user-facing prompt per qualifying pool and wait for reply before any further step runs. A summary table / banner / "here is what is needed" rollup is NOT a substitute for issuing the prompt blocks below — those silent assumptions violate G3.
>
> Failure mode this guard prevents: agent renders a summary, treats absence of immediate user reply as `skip`, writes `records: []` for every external-required pool, advances to Step 3, ships an empty catalog. **That is a defect.** User has flagged this regression. Do not repeat.
>
> Ask **only** for pools where: `class == external-required` AND zero records (or user re-runs and answers `update`). For `upstream-generated` and `derivable-from-ui`: never prompt — write `records: []` with a one-line "how this is provided" hint on the dashboard.

For each `external-required` pool with zero records, prompt (verbatim format — do not collapse, do not table-ify, do not merge into a single message body):

```
══════════════════════════════════════════════════════════════
📋 TEST DATA NEEDED — Pool: {poolType}
══════════════════════════════════════════════════════════════

Required because: {one-line reason — e.g. "verified by external identity service"}

Fields:  {field1}, {field2}, {field3}
Used by: {endpoint or screen}

Paste rows (one per line; tab/comma/space separated). Or type:
  • `file <absolute-path>` — import from a workbook (xlsx/xlsm/csv/tsv); multi-sheet
                              files scanned across all sheets, filtered to current app (Step 2a)
  • `placeholder`           — fill with PLACEHOLDER_* values (will fail until replaced)
  • `skip`                  — leave empty (dependent tests will be skipped, not failed)

> _
══════════════════════════════════════════════════════════════
```

**Rules:**

1. **Never ask for a pool that is not `external-required`.**
2. **User input wins, verbatim.** For pasted rows: detect delimiter (tab → comma → multiple spaces). For `file <path>` imports: read cell values exactly as stored (preserve leading zeros, date strings, casing — see Step 2a). Show the parsed rows back and ask the user to label each column. Never guess column meaning silently.
3. **Partial fields**: ask once for missing fields. If declined, fill ONLY the missing ones with `PLACEHOLDER_<FIELD>` and tag the row `placeholder: true`.
4. **`skip`** writes `records: []` for that pool. The dashboard shows `0 records — paste needed` for `external-required` pools only.
5. **Re-run path**: when invoked again, list each `external-required` pool with its current count and ONE prompt: `Pool {x}: {N} records. [enter]=keep / update=add more / release=release quarantined records / file <path>=import from workbook`. No other interactive question runs.

PII reminder: this is **non-prod local data only**. The catalog and dashboard live in the docs repo (project-internal). Do not commit dashboards to public repos.

### Step 2 Exit Gate (BLOCKING — must be satisfied before Step 3)

Before advancing to Step 3, ALL of the following must be true. If any is false, halt and resolve before proceeding.

1. **Per-pool prompt issued.** For every `external-required` pool with zero records (first run) — or every `external-required` pool listed under the re-run path — the corresponding `📋 TEST DATA NEEDED` banner (or the re-run one-liner) was sent to the user as a discrete prompt block. A combined summary table or single-message rollup of multiple pools does NOT satisfy this gate.
2. **User reply received per pool.** For each prompt issued, the user's reply is one of: pasted rows, `file <absolute-path>`, `placeholder`, `skip`, or (re-run only) `[enter]=keep` / `update` / `release`. Silence is NOT consent — do not infer `skip` from a missing reply. If the user reply addressed only some pools, re-issue the unanswered ones.
3. **Reply recorded.** The chosen disposition for each pool is captured in memory (and reflected in the catalog snapshot to be written in Step 3): pasted/imported rows → `records[]` populated; `placeholder` → one row of `PLACEHOLDER_*` values with `placeholder: true`; `skip` → `records: []` with the dashboard's `0 records — paste needed` row.
4. **Mass-skip confirmation.** If the user's net response would leave 100% of `external-required` pools with `records: []`, surface ONE final confirmation: `⚠️ All {N} external-required pools will be empty. Every dependent test will be skipped. Type 'confirm' to continue, or paste/file/placeholder for any pool.` Only `confirm` (case-insensitive, exact word) advances. Anything else re-opens Step 2 for the named pool(s).

When the gate is satisfied, emit a one-line audit trail to the user before Step 3:
```
✅ Step 2 complete: {P} pool(s) populated, {F} via file import, {H} placeholder, {S} skipped, {U} unchanged.
```
The counts must sum to the total number of `external-required` pools.

---

## Step 2a — Import from a workbook (multi-sheet xlsx / xlsm / csv / tsv)

> Triggered when the user answers `file <absolute-path>` to any Step 2 prompt, OR up-front when the user wants to bulk-seed all `external-required` pools from one workbook. The prompt accepts a single file path; do NOT scan directories. Import is **additive** — new rows merge into existing `records[]` (deduped per Rule 7); no record is silently overwritten.

### 2a.1 — Ask for (or accept) the workbook location

If the user has not yet provided a path, prompt them with a `📂 IMPORT TEST DATA FROM A WORKBOOK` banner that requests an absolute path to a workbook (`xlsx`/`xlsm`/`csv`/`tsv`), notes that multi-sheet files are scanned across all sheets and filtered to THIS workspace's application, and provides a `Path: _` input prompt.

Validate the path: it MUST exist, MUST be a regular file, and the extension MUST be one of `.xlsx`, `.xlsm`, `.xls`, `.csv`, `.tsv`. On failure, surface the exact error and re-prompt; do not fall back to placeholder mode.

### 2a.2 — Read the workbook

Read using whatever workbook tooling is available at runtime (e.g. Python `openpyxl` / `pandas`, Node `xlsx`, or the equivalent built-in capability). The prompt does NOT scaffold a parser — Copilot reads the file directly each run. **Do NOT install new dependencies into any workspace package** to read the file; if no reader is available, surface that to the user and let them export the workbook to CSV/TSV instead.

For each sheet:

1. Treat the **first non-empty row** as the header. Trim whitespace, lower-case for matching, but keep the original casing as the displayed column label.
2. Skip fully-blank rows. Skip leading note/title rows above the header (rows where < 50% of cells are populated AND no cell matches a known field synonym — see 2a.4).
3. Preserve cell values **as strings** when the column maps to a String-typed model field per the YAML scalar typing rule (Pre-flight). For numeric columns, preserve the parsed number. For date cells, preserve the workbook's display string (do NOT silently re-format — formatting belongs to the per-service downstream consumer; see Field Format metadata).

### 2a.3 — Identify the application key (workspace-root → app match)

The workbook may carry test data for many applications. Filter down to THIS workspace's data using these signals, in order:

1. **Application key** = `catalog.application` (from `project-context.md`, Step 0). If absent, derive from the docs-repo folder name's stem (strip the leading `tx-` and trailing `-docs*` segments — e.g. `tx-{app}-docs-sim` → `{app}`). Also accept the user-supplied workspace root token — case-insensitive match. The literal value `{APP}` in the example display blocks below is a PLACEHOLDER for that runtime-discovered key; substitute it whenever shown.
2. **Suggest, then confirm.** Display the derived key and the list of sheet names + any obvious "App"/"Application"/"Module"/"Project" column values found in the workbook. Ask the user to confirm or override:

   ```
   Detected application key: "{APP}" (from project-context.md)
   Workbook sheets: [Sheet1, {APP}_Identity, {APP}_Payment, {OTHER_APP}_Identity, Lookup, README]

   Match these sheets/rows to "{APP}"? [enter]=yes / type a different key / list=show all keys found
   ```

3. **Filter rows by the confirmed key.** A row qualifies when ANY of the following is true (case-insensitive):
   - The sheet name contains the key as a token (e.g. `{APP}_Identity` matches `{APP}`).
   - A column whose header matches `^(app|application|module|project|product|tenant)$` has a cell value equal to (or containing) the key.
   - The workbook has only ONE applicable sheet AND no app/module column — accept all data rows in that sheet (single-app workbook).

   Rows that do NOT qualify are dropped silently (do NOT prompt per row). Surface a one-line count: `ℹ️ Filtered to {N} rows for "{APP}" (dropped {M} rows belonging to other applications).`

### 2a.4 — Map columns to pool fields

For each qualifying sheet, map its columns to `external-required` pool fields:

1. Build a candidate-pool list — every `external-required` pool whose `fields[]` overlap (≥ 1 field) with the sheet's headers under the synonym map below.
2. **Synonym map (case-insensitive, generic; extend per project if needed):**
   - `firstname | first_name | fname | given name` → `firstName`
   - `lastname | last_name | lname | surname | family name` → `lastName`
   - `dob | date of birth | birthdate | birth date` → `dateOfBirth` (or `birthDate` — match whichever the pool declares)
   - `ssn | social | social security` → `ssn`
   - `ssnlast4 | last4 | last 4 ssn` → `ssnLast4`
   - `dl | driver license | drivers license | license number | dl number | dlnumber` → `driverLicense` / `licenseNumber`
   - `street | address | address1 | addr` → `street`
   - `city`, `state | st`, `zip | zipcode | postal | postal code` → `city` / `state` / `zip`
   - `email | email address | recipient email` → `email`
   - `card | card number | cc | cc number | pan` → `cardNumber`
   - `cvv | cvc | security code` → `cvv`
   - `exp | expiration | expiry | exp date` → `expiry`
   - `audit | audit number` → `auditNumber`
   - For any header NOT in the synonym map: leave unmapped and SHOW it to the user (next step).
3. **Show the mapping back to the user before importing** (mirrors the paste-path "label each column" rule — never guess silently). Render one block per (sheet → pool) listing each source column → mapped pool field with a `✓` (mapped) or `?` (unmapped — will drop). Footer must include action options: `[enter]=accept / edit=relabel any column / pool=move to a different pool / drop=skip this sheet`.

4. If no pool covers a sheet's headers, ask the user to (a) pick an existing pool, (b) declare a brand-new pool (`poolType`, `class: external-required`, `description`, `fields[]` derived from the mapped columns), or (c) drop the sheet.

### 2a.5 — Merge into the catalog

For each accepted (sheet → pool) mapping:

1. Build the `record.fields[]` object using the mapping. Apply YAML scalar typing rules from the Pre-flight (numeric ID stays unquoted ONLY if the consumer model declares numeric; otherwise quote to preserve leading zeros).
2. **Dedupe against existing records.** A new row is a DUPLICATE of an existing record when ALL non-PLACEHOLDER, non-empty mapped fields match exactly. Drop duplicates silently and surface a count.
3. Append surviving rows to the pool's `records[]` with: `status: "available"`, `placeholder: false` (or `true` if any required field is missing), `consumedCount/failureCount/consecutiveFailureCount: 0`, `lastUsedAt/lastUsedRunId/lastFailedReason: null`. NEVER mutate counters of pre-existing records during import.
4. Update / re-emit the pool's `fieldFormats` block by inferring the format from the FIRST imported row per field (per the Field format metadata rule). If a previously-stored format differs, KEEP the prior format and emit a one-line warning: `⚠️ identity-{pool}.{field}: workbook format ({new}) differs from stored ({old}) — kept stored. Re-run with 'release' if you intend to replace.`
5. **Provenance.** Set the pool's `providedBy` to `workbook:{filename}#{sheet}` (e.g. `workbook:{filename}#{APP}_Identity`). If the pool already had `providedBy: user-paste`, append the new source (`user-paste + workbook:...`) — do NOT overwrite.

### 2a.6 — Show import summary

Render a `WORKBOOK IMPORT SUMMARY — {filename}` banner block reporting: the confirmed application key, sheet count (matched / skipped with reason), per-pool import counts (`+N records` with duplicate-drop and placeholder-promotion notes), and the list of skipped sheets with reasons.

Do NOT proceed to Step 3 catalog write until the user accepts the summary (or accepts after edits). On reject, discard imported rows and re-enter the Step 2 prompt for that pool.

### 2a.7 — Hard rules for workbook import

- **Application-scoped only.** Rows belonging to other applications MUST be filtered out before mapping. Cross-app contamination is a defect.
- **No silent column guessing.** The mapping confirmation in 2a.4 step 3 is mandatory, identical in spirit to the paste-path "label each column" rule.
- **No format mutation.** Preserve cell values verbatim per the YAML scalar typing rule. Format conversion is the downstream consumer's responsibility.
- **Additive merge only.** Workbook import never deletes or rewrites pre-existing records and never resets counters.
- **PII / non-prod only.** Same banner and gating as the paste path. Do not import workbooks that the user identifies as production data; STOP and ask.

---
