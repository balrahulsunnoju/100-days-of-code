# Ops Runbook Create Mode — Post-Generation Checks

## Verification Checklist

Run ALL checks against the generated runbook before reporting completion. Every check must PASS or have documented justification.

---

### 1. Template Completeness

**Method:** Compare section headings in output vs template

```bash
grep '^#' {output_file} | wc -l
grep '^#' templates/runbook-md.template.md | wc -l
```

**Pass:** Every template section heading exists in the output (order preserved).

**Fix:** If a section is missing, add it back with `[VERIFY]` content.

---

### 2. VERIFY Tag Audit

**Method:** Count and categorize all `[VERIFY]` tags

```bash
grep -n '\[VERIFY' {output_file}
```

**Pass:** Count reported. Each tag has specific guidance (not generic "needs info").

**Fix:** Replace vague tags like `[VERIFY: TBD]` with specific guidance: `[VERIFY: ops team should provide the Splunk index name — check with M&O group]`.

---

### 3. Diagram Reference Integrity

**Method:** Every `![...](...svg)` link resolves to an existing file

```bash
grep -oE '\]\(diagrams/[^)]+' {output_file} | sed 's/^\](//' | while read f; do
  [ -f "{output_dir}/$f" ] || echo "BROKEN: $f"
done
```

**Pass:** Zero broken diagram links.

**Fix:** Either generate the missing diagram or remove the embed and add `[VERIFY: diagram not generated — {reason}]`.

---

### 4. App-Agnostic Compliance (G1)

**Method:** Scan for hardcoded application-specific patterns

```bash
grep -ciE '({discovered_app_name}|{discovered_acronym})' {output_file}
```

**Pass:** Zero matches for the discovered app name/acronym that should have been replaced with dynamic references. Substitute the actual values discovered in Phase 1.

**Fix:** Replace hardcoded values with the discovered `{app_name}` variable from evidence.

---

### 5. Operational Voice (G26)

**Method:** Spot-check description paragraphs for internal class names

```bash
grep -nE '(Impl|Controller|ServiceImpl|Repository|Dao)\b' {output_file} | grep -v '^[[:space:]]*|' | grep -v 'Source File'
```

**Pass:** Internal class names appear ONLY in tables (Source Files columns, API endpoint paths, config property keys). Never in description prose.

**Fix:** Rewrite description to use operational language. Move class name to a Source Files reference.

---

### 6. Evidence Coverage

**Method:** Count evidence table rows vs runbook assertions

**Pass:** Every factual assertion (port numbers, endpoints, error codes, integration names) has a corresponding evidence table row.

**Fix:** For ungrounded assertions, either add evidence or convert to `[VERIFY]`.

---

### 7. No Fabricated Endpoints

**Method:** Cross-reference every endpoint path listed in the runbook against controller scan results

**Pass:** Every listed endpoint exists in discovered source code.

**Fix:** Remove fabricated endpoints. Only list what the controller scan found.

---

### 8. No Fabricated Error Codes

**Method:** Cross-reference error codes against exception handlers and constants

**Pass:** Every error code in the runbook exists in source code.

**Fix:** Remove fabricated codes. Only list discovered ones.

---

### 9. Diagram Node Coverage

**Method:** Cross-reference C4/sequence diagram nodes against repo scan

**Pass:** Every node traces to a real discovered component (repo, service, external system).

**Fix:** Remove speculative nodes. Add `[VERIFY]` note if a likely component wasn't confirmable.

---

### 10. Diagram Manifest Completeness (G28)

**Method:** Every `.mmd` file in the versioned diagrams directory has a row in `diagram-manifest.md`

```bash
ls diagrams/v*/*.mmd | wc -l
grep -c '\.mmd' diagrams/v*/diagram-manifest.md
```

**Pass:** Counts match. Every `.mmd` has a corresponding `.svg`.

**Fix:** Add missing entries to manifest. Re-render missing `.svg` files.

---

## Verification Report Format

Display results as:

```
══════════════════════════════════════════════════════════════
POST-GENERATION VERIFICATION
══════════════════════════════════════════════════════════════

  Check 1  — Template Completeness:    ✅ {N}/{total} sections
  Check 2  — [VERIFY] Tags:            ⚠️ {count} tags (acceptable)
  Check 3  — Diagram Links:            ✅ All resolve
  Check 4  — App-Agnostic (G1):        ✅ 0 hardcoded names
  Check 5  — Operational Voice (G26):  ✅ No class names in prose
  Check 6  — Evidence Coverage:        ✅ {N} assertions grounded
  Check 7  — Endpoint Validity:        ✅ {N}/{N} confirmed
  Check 8  — Error Code Validity:      ✅ {N}/{N} confirmed
  Check 9  — Diagram Nodes:            ✅ All traced to source
  Check 10 — Diagram Manifest (G28):   ✅ {N} diagrams registered
  Check 11 — Microservices Req/Res:    ✅ {N}/{N} endpoints have samples
  Check 12 — Identity Verification:    ✅ All code paths documented
  Check 13 — reCAPTCHA Detail:         ✅ Version + mode specified
  Check 14 — Batch Processing:         ✅ Documented (or no extract tables)
  Check 15 — Apigee Security:          ✅ Security layers documented
  Check 16 — Common Services:          ✅ Cross-referenced per integration
  Check 17 — JSON Format:              ✅ All beautified, no inline
  Check 18 — Author Field:             ✅ System username, not auto-generated

══════════════════════════════════════════════════════════════
```

Any ❌ result = generation is INCOMPLETE. Fix before handoff.

---

### 11. Microservices Request/Response Coverage (HARD GATE)

**Method:** Count discovered non-/ping endpoints vs `<details>` sample blocks in the Integration sections (Section 6) and API endpoint tables

```bash
# Count endpoints from controller scan (exclude /ping)
controller_count=$(grep -rnE '@(Get|Post|Put|Delete|Request)Mapping' {service_repos}/**/src/**/*Controller.java | grep -vi '/ping' | wc -l)

# Count samples in runbook
sample_count=$(grep -c '<details>' {output_file})

echo "Endpoints: $controller_count | Samples: $sample_count"
```

**Pass:** Every non-`/ping` endpoint has at least one `<details>` block with request + response JSON. Endpoints with multiple behavior paths (found/not-found, different record types) must have one sample per path.

**Fail conditions (HARD FAILURE — generation incomplete):**
- ANY non-/ping endpoint has no sample → list missing endpoints
- Sample JSON uses field names not in the actual DTO class → incorrect (read the Java model)
- Response is inline backtick JSON instead of fenced code block → format violation

**Fix:** Read the `@RequestBody` DTO class for each missing endpoint. Build realistic JSON from field names, types, and validation annotations. Add `<details>` block per endpoint.

---

### 12. Identity Verification Deep-Scan

**Method:** Check if all verification paths in code are documented

```bash
find {frontend_repo}/src -name '*erifyIdentity*' | wc -l
```

**Pass:** If multiple identity verification components exist in source, the runbook documents each path separately with its provider, input fields, and lockout thresholds.

**Fix:** Read each verification component to identify provider, input fields, and lockout behavior. Add separate subsections per path.

---

### 13. reCAPTCHA Deep-Scan

**Method:** Check version discovery

```bash
grep -rnE 'grecaptcha\.(enterprise|ready|execute|render)' {frontend_repo}/src/ | wc -l
```

**Pass:** If `grecaptcha.enterprise` found, runbook specifies "Enterprise" version + invisible/checkbox mode + score threshold (from Apigee KB).

**Fix:** Read reCAPTCHA components and `buildIndexes.env.js` for site keys. Specify Enterprise, invisible mode, and per-environment keys.

---

### 14. Batch Processing Deep-Scan

**Method:** Check for extract/batch tables

```bash
grep -rni 'EXTRACT\|BATCH' {db_repo}/*.sql | head -5
```

**Pass:** If extract/batch tables exist in DDL, runbook has a populated batch section (not just `[VERIFY]`) describing the workflow, trigger, file format, and target system.

**Fix:** Read DDL for extract table definitions. Cross-reference KB `business/` and `project/` docs for batch workflow descriptions.

---

### 15. Apigee Security Deep-Scan

**Method:** Check if security layers documented

```bash
grep -l 'security-config' knowledge-base/apigee/ 2>/dev/null
```

**Pass:** If `apigee/security-config.md` exists, runbook documents: fingerprint token validation, spike arrest rate, CORS, KVM credential storage.

**Fix:** Read `apigee/security-config.md` and extract all security layers with their configuration values.

---

### 16. Common Services Cross-Reference

**Method:** Verify integration detail depth

```bash
ls knowledge-base/common-services/*.md | wc -l
```

**Pass:** Every file in `common-services/` that maps to a runbook integration has its lockout/error/retry policy reflected.

**Fix:** Read each common-services doc. Add lockout thresholds, error codes, and retry policies to the corresponding integration section.

---

### 17. JSON Format Consistency

**Method:** Check for inline JSON responses

```bash
grep -c 'Response.*`{' {output_file}
```

**Pass:** Count = 0. All JSON blocks must be beautified in fenced `json` code blocks.

**Fix:** Convert any inline backtick JSON to multi-line fenced code blocks with `json` language hint.

---

### 18. Author Field

**Method:** Verify no auto-generated language

```bash
grep -ci 'auto-gen\|ai-gen' {output_file}
```

**Pass:** Count = 0. Author fields use system username.

**Fix:** Replace any "Auto-generated" or "AI-generated" text with the system username from `whoami` or `git config user.name`.

---

### 19. Duplicate Content Detection

**Method:** Check for duplicated sections, repeated image references, and redundant prose

```bash
# Check for duplicate image references (same file referenced more than once)
grep -oE '!\[[^]]*\]\([^)]+\)' {output_file} | sort | uniq -d

# Check for duplicate section headings
grep '^## ' {output_file} | sort | uniq -d

# Check for content that appears in two adjacent sections as both
# a prose summary AND a structured list/table (application-agnostic)
# Manual review: scan for bullet lists that restate a nearby table's content
```

**Pass:**
- Zero duplicate image references (no screenshot or diagram embedded twice)
- Zero duplicate section headings
- No section contains a prose summary that restates facts already covered in a structured list or table in the same or adjacent section

**Fail conditions (MUST FIX before handoff):**
- Same screenshot file referenced more than once → remove duplicate
- Same heading appears twice → merge or remove
- Facts stated in both a summary bullet list AND a formal table/list in adjacent sections → keep the more structured version only
- Section 9.1 screenshots appear twice (script write + manual write) → keep one set only

**Fix:** Remove the duplicate content. Keep the more detailed/formal version. For screenshots, keep the set with descriptive captions (route + page name).

---

### 20. Cross-Section Redundancy Audit

**Method:** Verify repeated operational facts serve different audiences

**Acceptable repetition (NOT a violation):**
- Same KVM name appearing in Integrations (configuration reference) AND Triage Guide (what to check when broken) AND Daily Checklist (what to verify daily) — these serve different use cases
- Health endpoint mentioned in Service Inventory AND Daily Checklist — different contexts

**Unacceptable repetition (MUST FIX):**
- Same business constraint stated as both a prose paragraph AND a formal rule list in the same section or adjacent sections
- Same table duplicated between consecutive sections
- Architecture summary paragraph that fully repeats a detail table elsewhere

**Pass:** Every repeated fact serves a distinct operational purpose (reference vs checklist vs triage). No same-section or adjacent-section content duplication.

**Fix:** Remove the less formal/less actionable version. Keep the version that includes context for its section's audience.
