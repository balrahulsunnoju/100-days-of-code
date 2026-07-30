# Unit test code patterns

**Test code uses Insomnia's test API — NOT Postman's `pm.*` scripting.** Reference patterns (all go in `unit_test.code` field; ALWAYS start with `const resp = await insomnia.send();`):

```javascript
// ✅ Status: expect(resp.status).to.equal({expected});
// ✅ Body shape: const body = JSON.parse(resp.data); expect(body).to.have.property('id'); expect(body.id).to.be.a('number');
// ✅ Response time: expect(resp.elapsedTime).to.be.below(2000);
// ✅ Business rule: expect(body.{field}).to.equal({expected}); // BR-{id}: {description}
// ✅ Content-Type: expect(resp.headers['content-type']).to.contain('application/json');
//
// ✅ Non-JSON response (PDF / binary / file download — endpoints flagged non-JSON during discovery):
//      expect(resp.status).to.equal(200);
//      expect(resp.headers['content-type']).to.contain('application/pdf');  // or application/octet-stream
//      expect(resp.headers['content-disposition']).to.exist;
//      expect(resp.bytesRead).to.be.above(0);  // do NOT JSON.parse non-JSON
//
// ❌ WRONG (Postman scripting — will NOT work with inso CLI):
//      pm.test(...); pm.response.to.have.status(200); pm.expect(...);
```

**Every `unit_test` resource must:**
- Reference a `requestId` pointing to a `request` resource in the collection
- Have a `code` field that calls `await insomnia.send()` to execute the request
- Use chai assertions (`expect()`) on the response
- Be parented to a `unit_test_suite` resource
- Have a descriptive `name` field (used in test output reporting)
- Emit `metadata.tags` (string[]) per the v3 slice taxonomy: `tags = [tier, ...extInt]` where `tier = 'smoke'` for the FIRST positive `unit_test` per `(folder=Positive, endpoint)` and `'regression'` for every other `unit_test` (negative, edge-case, workflow, additional positives). Append `'external-integration'` when the endpoint's controller class (basename, no `.java`) appears in `api-tests/config/audit-config.json` → `externalCallers[]` (real third-party dependency, e.g., payment gateway, identity verification). The runner `--tag <name>` flag filters on these tags; `'external-integration'` runs are real-mode-only.

### Response Body Assertions Are MANDATORY for Positive Tests

> ⚠️ **Status-code-only assertions are INSUFFICIENT.** A positive test that only checks `expect(resp.status).to.equal(200)` proves nothing about the response content — the endpoint could return an empty body, wrong data, or garbage and still pass.
>
> **For EVERY positive test (expectedStatus 2xx), the `unit_test.code` MUST include AT LEAST ONE of these body assertions in addition to the status code check:**
> 1. **Property existence** — `expect(body).to.have.property('{key}')` for key response fields
> 2. **Property type** — `expect(body.{key}).to.be.a('string')` or `.to.be.a('number')`
> 3. **Value assertion** — `expect(body.{key}).to.equal({expected})` for known/constant values
> 4. **Content-type header** — `expect(resp.headers['content-type']).to.contain('application/json')` (or `application/pdf` for non-JSON)
> 5. **Response time SLA** — `expect(resp.elapsedTime).to.be.below(2000)` (2s default cap; adjust per-endpoint if KB documents a higher SLA)
>
> **For chained endpoints that produce values** (endpoints with `capture` metadata), the body assertion MUST verify the captured field exists:
> ```javascript
> const resp = await insomnia.send();
> expect(resp.status).to.equal(200);
> const body = JSON.parse(resp.data);
> expect(body).to.have.property('{capturedField}');  // MANDATORY — this is the value downstream tests depend on
> ```
>
> **For negative tests (expectedStatus 4xx/5xx):** status code assertion is sufficient; body assertions for error message/code are encouraged. Supported assertion patterns (use the narrowest that fits intent): `expect(resp.status).to.equal(400)` (exact, preferred when OpenAPI declares specific code); `expect(resp.status).to.be.within(400, 499)` (any 4xx); `expect(resp.status).to.not.equal(500)` (guard); `expect(resp.status).to.be.oneOf([400, 422])` (membership). All four supported by mini-chai fallback runner. Do NOT use `.to.match()`, `.to.deep.equal()`, or any method not in the supported mini-chai list.
>
> **🛑 ASSERTION STRICTNESS BY CATEGORY — STATUS CODE assertions only (HARD GATE — from production audit 2026-05-16):**
> These rules apply to `expect(resp.status).*` assertions. Body/header/elapsedTime assertions are NOT restricted by this table.
>
> | Category | ALLOWED status assertion patterns | FORBIDDEN status assertion patterns |
> |----------|--------------------------|-------------------|
> | **Positive** | `to.equal(200)` or `to.equal(201)` ONLY | `to.be.oneOf(...)`, `to.be.within(...)`, `to.not.equal(...)` — a positive test that accepts multiple status codes provides ZERO confidence |
> | **Negative-validation** | `to.equal(400)` (preferred) or `to.be.within(400, 499)` | `to.be.oneOf([200, 400])` — a negative test that accepts 200 PROVES NOTHING |
> | **Security/Injection** | `to.not.equal(200)` AND `to.be.within(400, 499)` (both required) | `to.be.oneOf([200, 400])` — accepting 200 for injection = payload may have been PROCESSED |
> | **Edge-case/Boundary** | `to.equal(200)` or `to.equal(400)` depending on whether input is valid or invalid | `to.be.oneOf(...)` with mixed success/failure codes |
>
> **Documented failure mode (F1):** Generated tests used `expect(resp.status).to.be.oneOf([200, 400, 404, 500])` for POSITIVE tests — this assertion can NEVER FAIL regardless of backend behavior. A broken endpoint returning 500 still passes. Tests provide FALSE CONFIDENCE.
>
> **Security assertion enhancement (F6):** For EVERY injection test (XSS, SQLi, NoSQLi, path traversal, command injection), assertions MUST include ALL of:
> 1. `expect(resp.status).to.not.equal(200)` — injection payload must NOT be accepted
> 2. `expect(resp.status).to.be.within(400, 499)` — must be a client error (not server error — 500 may mean injection hit but crashed)
> 3. Response body MUST NOT contain: database error strings (`ORA-`, `SQLSTATE`, `syntax error`, `mysql_`), stack traces, or the injected payload reflected back
>
> **Post-generation check enforcement:** After writing all collections, grep every `unit_test.code` in Positive folders for `resp.status).to.be.oneOf` — ANY match = HARD FAILURE. Grep Security folder assertions for `resp.status).to.equal(200)` — ANY match = HARD FAILURE.
