# Ops Runbook Create Workflow — Orchestrator

**Goal:** Generate a complete `.md` runbook from the Texas.gov Run Book Template by exhaustively scanning the workspace — knowledge base, source code, configuration, and deployment artifacts — then filling every template section with evidence-grounded content and Mermaid diagrams.

**Approach:** discover → diagram → fill → verify → capture. Every sentence traces to source code, KB, or configuration. Unverifiable facts get `[VERIFY: specific guidance]`.

---

## HALT CONDITIONS (checked at every phase transition)

| Condition | Action |
|-----------|--------|
| `mmdc` (Mermaid CLI) not installed | HALT — instruct: `npm i -g @mermaid-js/mermaid-cli` |
| No knowledge-base directory found (`*-docs*/knowledge-base/`) | HALT — run `/bmad-document-project` first to generate the KB (see [Knowledge Base Generation](../../../doc/knowledge-base-generation.md)) |
| Template not found at `templates/runbook-md.template.md` | HALT — template is required |
| No backend service repos detected in workspace | HALT — nothing to document |
| Docs repo not found (`*-docs*/` pattern) | HALT — no output location |
| Workspace root has no subdirectories | HALT — empty workspace |

---

## Checkpoint & Resume System

This workflow may run across multiple context windows. After completing each phase, save a checkpoint so the user knows exactly where to resume.

### After EACH phase completion:

1. **Save checkpoint to session memory** (`/memories/session/ops-runbook-checkpoint.md`) with:
   - Phase just completed (e.g., "Phase 1 — Discovery complete")
   - Key state: evidence table row count, repos discovered, diagrams generated
   - Next phase number and step to resume
   - Exact resume command for the user

2. **Display resume banner** to the user:

```
══════════════════════════════════════════════════════════════
✅ PHASE {N} COMPLETE — CHECKPOINT SAVED
══════════════════════════════════════════════════════════════

  Completed: Phase {N} — {Phase Name}
  Next:      Phase {N+1} — {Next Phase Name} (Step {X})

  To continue, open a FRESH Copilot Chat context and run:

    /tdgs-aidlc-ops-runbook create
    → When asked, say: "Resume from Phase {N+1}"

  The checkpoint file at /memories/session/ops-runbook-checkpoint.md
  has the full state to resume.
══════════════════════════════════════════════════════════════
```

3. **On resume:** When the user says "Resume from Phase {N}", read the checkpoint file and continue from the saved step. Do NOT re-run completed phases.

### Phase boundaries:

| Phase | Checkpoint after | Key state to save |
|-------|-----------------|-------------------|
| 1 | Step 5 (working variables resolved, evidence table at Step 4) | Repo list, evidence table, working variables |
| 2 | Step 8 (diagram manifest built, rendering at Step 7) | Diagram file list, manifest |
| 3 | Step 10b (sections filled) | Runbook file path, section completion status |
| 4 | Step 13 (verification done) | Final verification report |
| 5 | Step 16 (screenshots captured or skipped) | Screenshot count, output directory |

---

## Guardrails (Create Mode)

**Read on demand:** `tools/guardrails-create.md` — full guardrail definitions. Highlights:

| ID | Rule |
|----|------|
| G1 | Application-agnostic — discover ALL repo names, stacks, and endpoints from workspace patterns |
| G2 | Discover-before-generate — read KB + ALL source code FIRST, exhaustively |
| G3 | No fabrication — unverifiable facts → `[VERIFY: ...]` |
| G25 | Diagrams from evidence — every node traces to a discovered source file |
| G26 | Operational voice — internal class names in Source Files only, descriptions use plain language |
| G27 | Template fidelity — never remove template sections; unfilled sections get `[VERIFY: section not populated — no evidence found]` |
| G28 | Diagram manifest — every generated `.mmd` + `.svg` is registered in the manifest |
| G29 | Anti-hallucination — every sentence traces to evidence table |
| G30 | Write scope — READ workspace only, WRITE only to `{output_dir}/` (runbook + diagrams). Never modify source code, config, KB, or any existing file |

---

## Pipeline Position

```
[Knowledge base exists]
   → [/tdgs-aidlc-ops-runbook mode=Create ← you are here]
      → runbook.md + diagrams (.mmd + .svg) + diagram-manifest.md + screenshots (if captured)
```

> **Note:** This workflow creates a NEW `.md` runbook from scratch. To UPDATE an existing `.md` runbook for a release, use Update mode (`./workflow.md`) — it handles both `.docx` and `.md` files with implementation-plan-scoped edits.

---

## Phase 1 — Preflight & Workspace Discovery

### Step 0: Environment Validation

```
1. Verify mmdc is installed: which mmdc || HALT
2. Verify template exists: templates/runbook-md.template.md || HALT
3. Locate docs-repo: find workspace root for *-docs*/ pattern
4. Locate knowledge-base: {docs-repo}/knowledge-base/ || HALT
5. Create output directory: mkdir -p {docs_repo}/knowledge-base/runbook/diagrams/v{N}/
6. Resolve author name: whoami or git config user.name (use in Document Author field)
7. Locate devsecops-hub: find workspace for *devsecops-hub*/ pattern (if present, use for CI/CD section)
8. Load organization defaults: read config/org-defaults.yaml from skill directory
```

**ORGANIZATION DEFAULTS (HARD GATE):**
The file `config/org-defaults.yaml` contains constants that are the SAME across all applications:
- Contact list emails (Architecture, M&O, DevOps, DBA, Security)
- CI/CD infrastructure (GitHub Actions + devsecops-hub reusable workflow)
- Monitoring platform names (Splunk, AppDynamics, Google Analytics)
- Organization name and ServiceNow CI naming pattern

These values MUST be auto-populated in the runbook. NEVER mark them as `[VERIFY]`.

**NOT in org-defaults — these come from CODE SCAN:**
- Database technology, schemas, connection details (from pom.xml, application.properties, DDL files)
- Backend tech stack, packaging, framework (from pom.xml, package.json)
- Frontend framework, build tools (from package.json)
- API Gateway provider and proxy configs (from knowledge-base/apigee/)
- Service endpoints, ports, health checks (from controller scan)
- External integrations and URLs (from source code + KB)
- Deployment targets (from Dockerfile, WAR/JAR, CI workflow configs)

Only mark `[VERIFY]` for values that are: (a) NOT in org-defaults, AND (b) NOT discoverable from code/KB scan — i.e., infrastructure details like server IPs, Splunk instance URLs, backup configs.

### Step 1: Workspace Scan & Repository Classification

Scan workspace root for ALL subdirectories. Classify each:

| Pattern | Classification |
|---------|----------------|
| `pom.xml` with Spring Boot parent | Java backend service |
| `package.json` with `react`/`next`/`vue`/`angular` | Frontend application |
| `package.json` with `express`/`fastify`/`nestjs` | Node.js backend service |
| `*-docs*/` or `*-documentation*/` | Documentation repository |
| `*-database*/` or `*.sql` files at root | Database repository |
| `Dockerfile` or `docker-compose.yml` | Containerized service |
| None of the above | Other (note but skip) |

Display discovered repos:

```
══════════════════════════════════════════════════════════════
WORKSPACE REPOSITORY SCAN
══════════════════════════════════════════════════════════════

  #  Repository                       Type                 Stack
  ─  ──────────────────────────────   ──────────────────   ──────────────
  1  {repo-1}/                       Backend Service      Java / Spring Boot
  2  {repo-2}/                       Frontend App         React
  3  {repo-3}/                       Backend Service      Java / Spring Boot
  4  {repo-4}/                       Database             SQL
  5  {repo-5}/                       Documentation        Markdown

══════════════════════════════════════════════════════════════
```

### Step 1b: Resolve Working Variables

After scanning, resolve:

### Step 2: Exhaustive Knowledge Base Scan (MANDATORY)

Read ALL KB documents — no sampling, no shortcuts:

```
knowledge-base/master-index.md     → read FIRST (understand what exists)
knowledge-base/reading-order.md    → read SECOND (understand dependencies)
knowledge-base/shared/             → integration, deployment, architecture
knowledge-base/api/                → API specifications, OpenAPI
knowledge-base/apigee/             → API gateway proxies, policies, SECURITY CONFIG, target endpoints
knowledge-base/repos/              → per-service documentation
knowledge-base/business/           → business rules, workflows, BATCH PROCESSING
knowledge-base/common-services/    → CRITICAL: shared platform service docs — lockout policies, endpoints, error codes
knowledge-base/project/            → project-level context, environments
knowledge-base/test-management/    → test strategy, coverage
```

**MANDATORY DEEP-READ directories (HARD GATE — never skip):**
1. `knowledge-base/common-services/` — READ EVERY FILE. Each describes a shared platform service with endpoints, auth patterns, error codes, lockout policies. Cross-reference with frontend API calls.
2. `knowledge-base/apigee/` — READ EVERY FILE. Contains security layers, KVM credentials, proxy flows, rate limits. This is where operational security details live.
3. `knowledge-base/business/` — READ EVERY FILE. Contains business rules AND batch processing workflows that ops teams need.

**Read `project-context.md`** (typically in docs-repo root) — extract:
- Application name and description
- Environment topology (dev, staging, prod)
- Deployment mechanism
- External integrations
- Team contacts (if present)

### Step 3: Source Code Scan (ALL services — MANDATORY)

For EACH backend service repo, read:

| File/Pattern | What to extract |
|--------------|-----------------|
| Controller classes (`*Controller.java`, `routes/*.js`) | Endpoint paths, HTTP methods, request/response types |
| Service implementations (`*ServiceImpl.java`, `*Service.js`) | Business logic, validation rules, conditional branches, external calls |
| DTOs / Models (`*Dto.java`, `*Request.java`, `*Response.java`) | Field names, types, validation annotations |
| Exception handlers (`*ExceptionHandler.java`, error middleware) | Error codes, HTTP status mappings, error response formats |
| Configuration (`application.properties`, `application.yml`, `.env`) | Ports, URLs, feature flags, timeouts, external service URLs |
| Constants / Enums | Error code definitions, status values |
| `pom.xml` / `package.json` | Version, dependencies, build plugins |
| Deployment descriptors (`Dockerfile`, `k8s/`, CI configs) | Container config, resource limits, health checks |

For the frontend repo:
| File/Pattern | What to extract |
|--------------|-----------------|
| API client calls (`axios`, `fetch`, service files) | Which backend endpoints are consumed — extract ALL endpoint paths |
| Route definitions | User-facing URL paths |
| Environment config (`.env*`, `config.js`, `buildIndexes*.js`) | Backend API base URLs PER ENVIRONMENT (dev, UAT, staging, prod) — extract actual URLs |
| `public/index.html` | Canonical URL (`window.canonicalurl`), meta tags |
| `public/sitemap.xml` | Production domain/URL (definitive proof of production URL) |
| `public/locales/*/translation.json` | Support contacts, external links, help desk URLs |
| Error handling components (lockout pages, error pages) | How errors are displayed, external links shown to users on failure |
| Self-service features (order status, tracking) | All user-facing features beyond the primary order flow |
| **Identity verification components** (`VerifyIdentity*.js`) | In-State vs Out-of-State split — different providers, different lockout rules, different form fields |
| **reCAPTCHA integration** (`ReCaptcha.js`, `GetSiteKey.js`, grep `grecaptcha.enterprise`) | Version (v2/v3/Enterprise), invisible vs checkbox, siteKey source, score-based validation |

**CRITICAL — URL Discovery Rule:**
The production URL, API gateway URLs, and reCAPTCHA site keys are ALWAYS discoverable from the frontend codebase. Look in:
1. `buildIndexes*.js` or equivalent environment config — contains per-environment `apiurl`, `sitekey`, `canonicalurl`
2. `public/sitemap.xml` — canonical production domain
3. `public/index.html` — `window.canonicalurl` meta tag
4. `public/locales/*/translation.json` — order status links with full production domain

NEVER mark production URL as `[VERIFY]` without first checking these files. Only server names/IPs require verification.

**CRITICAL — Identity Verification Deep Scan (HARD GATE):**
Identity verification is ALWAYS multi-path. Before writing the Identity Verification integration section:
1. `find {frontend_repo}/src -name "*erifyIdentity*" -o -name "*dentity*"` — discover ALL verification components
2. If multiple verification components exist → document ALL paths with:
   - Different providers per path (discovered from component names and KB)
   - Different input fields per path
   - Different lockout thresholds (scan KB `common-services/` for attempt limits)
   - Separate sample request/response per provider
3. Read `knowledge-base/common-services/` for ALL identity/auth service documentation
4. Extract lockout attempt limits from KB (production vs non-production if documented)
NEVER write a single generic "identity verification" section when the code has multiple verification paths.

**CRITICAL — reCAPTCHA Deep Scan (HARD GATE):**
Before writing the reCAPTCHA section:
1. `grep -rn "grecaptcha" {frontend_repo}/src/` — determine version (v2/v3/Enterprise)
2. If `grecaptcha.enterprise` found → document as Enterprise with invisible mode
3. Extract: siteKey source (`window.sitekey`), script URL (`enterprise.js?render=`), which forms use it
4. Check Apigee KB (`apigee/security-config.md`) for server-side validation: FlowCallout name, score threshold, KVM key names
NEVER write reCAPTCHA as a simple `[VERIFY]` when the code reveals version, mode, and integration pattern.

**CRITICAL — Common Services Deep Scan (HARD GATE):**
The `knowledge-base/common-services/` directory contains documentation for SHARED platform services (TCAS, PACS, E-Wallet, Notification Engine, etc.). These contain:
- Per-service endpoint tables with HTTP methods and paths
- Error code tables with HTTP status codes
- Configuration properties with KVM/environment variable names
- Authentication patterns per service
- Lockout/retry/timeout policies
This directory MUST be read exhaustively before writing the Integrations section. Every integration in the runbook should cross-reference the corresponding common-services doc.

For the database repo:
| File/Pattern | What to extract |
|--------------|-----------------|
| Schema DDL (`*.sql`) | Table names, columns, constraints, indexes |
| Migration scripts | Schema evolution history |
| Stored procedures / functions | Business logic in DB layer |
| `BATCH_DIR`, `EXTRACT` references in DDL | Batch processing infrastructure clues — extract file paths, directory references |
| Global Temporary Tables (`ON COMMIT DELETE ROWS`) | Indicates batch/extract processing pipelines |

**CRITICAL — Batch Processing Deep Scan (HARD GATE):**
Before marking batch processing as `[VERIFY]`:
1. `grep -rn "extract\|batch\|cron\|EXTRACT" {db_repo}/ {services[]}/ knowledge-base/` — find ALL batch references
2. If any `*EXTRACT*` or `*BATCH*` table exists → a batch pipeline exists. Document:
   - What the extract does (KB business docs will describe the outbound file)
   - Source table and stored procedure name (from DDL/DAO code)
   - File format (XML/CSV — from KB or code comments referencing "XML data structure")
   - Target system (from KB project/business docs)
3. Check DAO implementations for `extract` or `batch` method references
4. Check KB `business/` and `project/` docs for batch workflow descriptions
NEVER mark batch processing as `[VERIFY]` when the database schema has extract tables and the KB describes the batch workflow.

**CRITICAL — Apigee Security Deep Scan (HARD GATE):**
Before writing Integrations and Monitor sections:
1. Read `knowledge-base/apigee/security-config.md` — contains ALL security layers: fingerprint token validation, spike arrest rates, CORS config, KVM credential storage
2. Read `knowledge-base/apigee/policies.md` — contains per-proxy policy tables
3. Read `knowledge-base/apigee/target-endpoints.md` — contains routing patterns
4. Read `knowledge-base/apigee/proxy-catalog.md` — contains proxy inventory
Extract: rate limit values, shared flow names, KVM names and what they store, authentication chain.
NEVER describe Apigee as just "API Gateway" without specifying the security layers from these docs.

### Step 4: Build Evidence Table (HARD GATE)

Every fact destined for the runbook MUST have an evidence row:

| Fact | Source File/Doc | Location | Confidence |
|------|-----------------|----------|------------|
| {service} listens on port {N} | `{repo}/src/main/resources/application.properties` | line {L} | HIGH |
| {endpoint} validates {field} | `{repo}/src/.../Controller.java` | line {L} | HIGH |
| Payment uses {vendor} iframe | `{repo}/src/.../PaymentComponent.js` | line {L} | HIGH |
| Deploy via {mechanism} | `knowledge-base/shared/{file}.md` | section {S} | HIGH |
| {integration} timeout is {N}s | No source found | — | `[VERIFY]` |

**EVIDENCE GATE:** If a fact has no row in this table, it CANNOT appear in the runbook.

### Step 5: Resolve Working Variables

| Variable | How to resolve |
|----------|----------------|
| `{workspace_root}` | Parent directory of the docs-repo |
| `{docs_repo}` | Directory matching `*-docs*/` pattern |
| `{app_name}` | From `project-context.md` or inferred from workspace directory name |
| `{services[]}` | List of all discovered backend service repos |
| `{frontend_repo}` | Directory matching frontend classification |
| `{db_repo}` | Directory matching database classification |
| `{output_dir}` | `{docs_repo}/knowledge-base/runbook/` (created if not exists) |
| `{runbook_filename}` | `{app_acronym}_{MMDDYYYY}_V1.md` (e.g., `APP_06232026_V1.md`) — increment version if file exists |
| `{diagram_dir}` | `{output_dir}/diagrams/v{N}/` — versioned subdirectory matching runbook version |

**VERSION MANAGEMENT RULES:**
1. Runbook files are versioned: `V1`, `V2`, etc. NEVER overwrite/delete a previous version.
2. Diagrams are stored in versioned subdirectories: `diagrams/v1/`, `diagrams/v2/`, etc.
3. Each version's diagrams are self-contained — V1 runbook references `diagrams/v1/`, V2 references `diagrams/v2/`.
4. If a previous version exists, increment: check `ls {output_dir}/*_V*.md | sort | tail -1` for latest version.
5. Previous versions serve as history — useful for diff/audit.

---

## Phase 2 — Diagram Generation

> **Read on demand:** `tools/diagram-standards.md` — Mermaid syntax, color palette, styled flowchart conventions, sizing rules.

### Step 6: Generate Diagrams from Evidence

Generate Mermaid `.mmd` files for each required diagram type. Every node MUST trace to a discovered source file from the evidence table. No speculative components.

**DIAGRAM QUALITY RULES:**
1. **NO emojis in diagram nodes.** They render inconsistently across SVG viewers. Use plain text with `<br/>` and `<i>` for emphasis.
2. **NO `classDef` with `\n` or `━` separators.** These break in many renderers. Use `<br/>` for line breaks and `<i>...</i>` for secondary text.
3. **Architecture diagrams (C4 Context/Container):** Use styled `graph TB` with explicit `style` statements per node. Color scheme:
   - Internal system nodes: `fill:#2D5F8A,color:#FFFFFF` (dark blue, white text)
   - External system nodes: `fill:#7F7F7F,color:#FFFFFF` (gray, white text) or `fill:#5B9BD5` (medium blue)
   - Actor nodes: `fill:#1A3D5C,color:#FFFFFF` (navy)
   - Database: `fill:#BDD7EE,color:#1A3D5C` (light blue, dark text)
   - Subgraph boundaries: `fill:#E8F4FD,stroke:#2D5F8A`
   - Use `-- "label" -->` for solid arrows, `-. "label" .->` for dashed/async
4. **Sequence diagrams:** Use `%%{init:}%%` theme with:
   - `actorBkg: #2D5F8A`, `actorTextColor: #FFFFFF`
   - `activationBkgColor: #E8F4FD`, `noteBkgColor: #FFF3CD`
   - `signalTextColor: #2D5F8A`
5. **Relationship arrows:** Short labels only (protocol name). No multi-line labels on arrows.
6. **DIAGRAM SIZE CHUNKING:** If a sequence diagram has more than 15 interactions, split into "Part 1" / "Part 2" files by logical phase. Each part should be 8-15 interactions. Reference both parts in the runbook.
7. **RENDERING:** `mmdc -i {file}.mmd -o {file}.svg --width 1400` (no `-t` flag — theme from init directive)
8. **NO `|"multi\nline"| target` arrow labels in flowcharts.** Mermaid renders these poorly. Use short labels.

#### 6a. C4 Context Diagram (as styled flowchart)

Shows the system boundary, external actors, and external systems:

- **Internal system** — the application being documented (single box)
- **External actors** — users, admin roles (discovered from KB or UI routes)
- **External systems** — payment gateways, email services, state APIs (discovered from source code HTTP clients and KB integration docs)

Output: `{diagram_dir}/c4-context.mmd`

#### 6b. C4 Container Diagram

Shows all containers (services, frontend, database, API gateway) within the system boundary:

- One container per discovered repo/service
- Include ports, tech stack from discovery
- Show inter-container communication (discovered from HTTP client configs, API base URLs)
- Show external system connections

Output: `{diagram_dir}/c4-container.mmd`

#### 6c. Sequence Diagrams (per major workflow)

For each major user workflow discovered from KB business docs + UI routes:

- Trace the request path: User → Frontend → API Gateway → Backend Service(s) → Database
- Include external system calls
- Show error paths where evidence exists

Output: `{diagram_dir}/seq-{workflow-name}.mmd` (one per workflow)

#### 6d. Deployment / Infrastructure Flowchart

If deployment evidence exists (KB shared docs, CI configs, Dockerfiles):

- Show deployment pipeline stages
- Show environment topology (dev → staging → prod)
- Show infrastructure components

Output: `{diagram_dir}/deploy-flow.mmd`

#### 6e. Per-Service Sequence Diagrams (MANDATORY — one per backend service)

For EACH backend service discovered in the workspace, generate a sequence diagram showing:
- ALL endpoints grouped by logical function (use `rect` colored regions for grouping)
- Which external services each endpoint calls (DB, PACS, Notification Engine, etc.)
- Key data transformations (what goes in, what comes out)
- Error/branch paths where evidence exists (found/not-found, success/failure)

**Purpose:** An on-call engineer should be able to look at ONE diagram and understand everything a service does, without reading source code. These diagrams are placed in Section 7.1.3 (Service Flow Diagrams) of the runbook, directly before the endpoint reference tables.

**Quality rules:**
- Group related endpoints in `rect` blocks with descriptive notes (e.g., "Order Lifecycle", "Fee Calculation", "Payment Transaction")
- Show the gateway as the caller (not the UI — services only see Apigee)
- Include brief payload descriptions as notes on key arrows
- If a service has no database or external dependencies (e.g., stateless PDF generation), note this explicitly

Output: `{diagram_dir}/seq-svc-{service-name}.mmd` (one per backend service)

#### 6f. Integration Flow Diagrams (MANDATORY — one per external integration)

For EACH external integration discovered in KB + source code, generate a sequence diagram showing:
- The exact API call path (UI → Gateway → Service → External system)
- Authentication mechanism used
- Success and failure paths (with lockout/error behavior)
- Data exchanged in each direction

These diagrams are CRITICAL for on-call ops engineers to understand what fails where.

Output: `{diagram_dir}/seq-{integration-name}.mmd` (one per integration)

**MINIMUM required integration diagrams:**
- Identity verification flow (showing lockout behavior)
- Payment flow (showing hosted form + two-step process)
- Record search flow (showing OAuth + found/not-found)
- Fee code retrieval flow (showing PACS → distribution)
- Any self-service features (order status check, etc.)

### Step 7: Render Diagrams

For EACH `.mmd` file generated:

```bash
mmdc -i {file}.mmd -o {file}.svg --width 1400
```

If `scripts/render-diagrams.sh` exists, use it instead (it handles batch rendering with consistent settings).

**SAVE BOTH FORMATS:**
- `.mmd` — Mermaid source script (committed to repo, editable for future updates)
- `.svg` — Rendered image (embedded in the runbook via `![alt](diagrams/file.svg)`)

**DIAGRAM GATE:** Every `.mmd` must render to `.svg` without errors. If `mmdc` fails on a file, fix the Mermaid syntax and re-render before proceeding. Do NOT proceed with a broken diagram.

### Step 8: Build Diagram Manifest

Create `{diagram_dir}/diagram-manifest.md`:

```markdown
# Diagram Manifest

| # | Diagram | Type | Source | File |
|---|---------|------|--------|------|
| 1 | System Context | C4 Context | KB + source scan | c4-context.mmd / .svg |
| 2 | Container View | C4 Container | repo scan | c4-container.mmd / .svg |
| 3 | {Workflow} Flow | Sequence | KB + controller scan | seq-{name}.mmd / .svg |
| N | Deployment Pipeline | Flowchart | CI + KB | deploy-flow.mmd / .svg |

Generated: {YYYY-MM-DD}
Evidence: All nodes trace to workspace discovery (Phase 1 evidence table)
```

---

## Phase 3 — Section Fill (Template Walk)

> **Read on demand:** `tools/section-grounding.md` — per-section fill rules, evidence requirements, voice standards.

### Step 9: Load Template

Read `templates/runbook-md.template.md`. This defines the canonical section structure. The orchestrator walks each section in order, filling from the evidence table.

**TEMPLATE RULE:** Never remove, reorder, or rename template sections. If a section cannot be filled due to missing evidence, insert:

```markdown
[VERIFY: This section could not be populated — no evidence found in KB or source code for {topic}. Ops team should provide: {what's needed}]
```

### Step 10: Fill Each Section

For each template section, apply the section-grounding rules:

1. **Identify** which evidence table rows map to this section
2. **Write** content using operational voice (G26):
   - What triggers → What happens → What ops sees → What to check
   - NO internal class names in descriptions (those go in Source Files sub-sections)
   - Write for an on-call engineer at 2am who has never read the codebase
3. **Embed** diagram references where the template indicates:
   ```markdown
   ![Context Diagram](diagrams/v1/c4-context.svg)

   *Figure 1: System Context — actors, system boundary, and external integrations*
   *Source: `{docs-repo}/knowledge-base/runbook/diagrams/v1/c4-context.mmd`*
   ```
4. **Tag** any sentence lacking direct evidence with `[VERIFY: ...]`
5. **Cross-reference** — if content in Section A references Section B, add a markdown link

#### Markdown Formatting Standards (MANDATORY)

The generated `.md` file MUST be professional and presentable:
- **Consistent spacing:** One blank line between paragraphs, two blank lines before `#` headings
- **Bullet points over walls of text:** Use `- ` for lists, don't write paragraphs where bullets work
- **Tables must be aligned:** Use consistent column widths, bold headers for key columns
- **Code blocks:** Use fenced code blocks for URLs, commands, and file paths
- **Indentation:** Nested content uses proper indentation (2 or 4 spaces)
- **No orphaned `[VERIFY]` without context:** Every `[VERIFY: ...]` must say WHAT is needed and WHO should provide it
- **Horizontal rules:** Use `---` between major sections for visual separation
- **Bold key terms:** Use `**bold**` for important field names in flowing text
- **Blockquotes for notes:** Use `>` for explanatory notes that provide context

#### Section Fill Order (follow template structure):

| Template Section | Primary Evidence Source | Key Rules |
|------------------|------------------------|-----------|
| 1. Introduction | `project-context.md`, KB project docs | Use formal ops manual language (see Standard Introduction below). NEVER abbreviate. Include batch integrations if discovered. Author = system user from Step 0. |
| 2. Contact List | `config/org-defaults.yaml` contacts section, KB project docs | Contact group emails come from org-defaults.yaml — NEVER `[VERIFY]`. Customer directory and vendor contacts may need `[VERIFY]` for first draft. |
| 3. Application Overview | KB business docs, UI routes, sequence diagrams, ALL UI features | Scan ALL page components — don't miss self-service features (order status, tracking). Include per-integration flow diagrams. |
| 4. Environment Overview | Config files (`buildIndexes*.js`, `.env`), KB shared docs, C4 diagrams | Production URL is ALWAYS in frontend code. Apigee URLs per environment from build config. Only server names/IPs need `[VERIFY]`. |
| 5. Deployment | CI configs, KB shared docs, devsecops-hub (if in workspace), Dockerfiles | Check `.github/workflows/` in EACH service repo for CI/CD pipeline definitions. If reusable workflow references exist (e.g., `uses: {org}/{hub-repo}/.github/workflows/ci-reusable.yml@master`), extract: runtime, build-tool, version, branch triggers, skip flags. |
| 6. Integrations | HTTP clients in source, KB integration docs, Apigee configs, common-services docs | MUST include per-integration sequence diagram. Show lockout/failure behavior. Tabular failure impact summary at top. For EACH integration: read `common-services/{service}.md` for endpoint details, error codes, lockout policies. Identity verification MUST split In-State vs Out-of-State if both exist in code. Include per-env service URLs from KB/Apigee docs if available. Include Splunk log index+source per integration from KB if documented. |
| 7. Operations | KB ops docs, batch job configs, health endpoints, DB schema (extract tables) | Include Microservices Reference with ALL endpoints from frontend API files. Add self-service features. For batch processing: if extract tables exist in DB schema and KB references daily files → document the batch workflow (trigger, stored proc, file format, target system). Batch details are ALWAYS in KB `business/` or `project/` docs + database DDL. |
| 8. Monitor | KB monitoring docs, Splunk queries, AppDynamics refs, Apigee security-config | Error codes from source code constants. Apigee security layers from `apigee/security-config.md`. Include spike arrest rate, shared flow names. |
| 9. Appendix | Error handlers, session config, KB supplementary docs | |

#### Standard Introduction (ALWAYS use this structure):

The Introduction section MUST open with this standard operations manual preamble (adapted to the application):

> "This document contains the project's full operations support manual. The contents cover all definitive parts of the environment, including hardware, software, configuration, contacts and any key information used during the installation of the environment. This Run Book is designed to outline all operational and physical requirements that are needed to meet the goals of the project's service agreements. The entire system configuration, including hardware and software is included, along with notes and special procedures and/or operations that take place within the environment. This document also defines routine procedures that must be performed as required by the installation/technical team. Finally, the document will stand to support the operations of the environment if an emergency occurs."

Follow with: Application Name, Acronym, Agency/Owner, ServiceNow CMDB CI Name (use "{App Name} - Production" if not otherwise known), Purpose (detailed from KB), Key Stakeholders, Scope.

#### Microservices Reference (MANDATORY for Section 7):

Before the Operations daily checklist, include a **Microservices Reference** subsection containing:
1. Service inventory table (service name, tech stack, deployment type, health check, gateway proxy)
2. API Gateway URLs per environment (extracted from frontend build config)
3. **Per-service sequence diagrams (HARD GATE)** — one diagram per backend service showing ALL endpoints grouped by function, external dependencies, and data flow. Generated in Phase 2 (Step 6e). These go in Section 7.1.3.
4. Full endpoint reference per service (path, method, purpose, request body summary)
5. **Sample request/response for EVERY endpoint (HARD GATE)** — use collapsible `<details>` blocks with JSON examples. Read each endpoint's Request DTO and Response DTO classes to build realistic samples. Sources: `src/main/resources/data/*.json`, DTO field analysis, controller return types.
   - **COVERAGE RULE (MANDATORY):** Every non-`/ping` endpoint discovered in controller scan MUST have a `<details>` block with request + response JSON. Missing any endpoint = generation INCOMPLETE.
   - **VARIANT RULE:** If an endpoint has multiple behavior paths (e.g., `found=true` vs `found=false`, different record types), provide ONE sample per distinct path.
   - **DTO TRUTH RULE:** Read the ACTUAL `@RequestBody` DTO class to determine field names. NEVER guess field names from prose or KB — the Java class is the contract.
   - **FORMAT RULE:** Every endpoint sample MUST follow this exact structure:
     ```
     **N. EndpointName**

     `METHOD /path/to/endpoint`

     Request:
     ```json
     { ... beautified JSON ... }
     ```

     Response:
     ```json
     { ... beautified JSON ... }
     ```
     ```
   - NEVER use inline backtick JSON for responses (e.g., `{ "key": "value" }`)
   - ALL JSON must be multi-line, properly indented, beautified
   - If an endpoint has multiple response scenarios (success/failure), show BOTH as separate blocks labeled `Response (found):` / `Response (not found):`
   - For PDF/binary responses, use plain `Content-Type: application/pdf` notation
6. Self-service features with flow diagrams

Source: Enumerate ALL files in the frontend `src/api/` directory. Each file = one endpoint. Extract the URL path from each. For request samples: (1) check `src/main/resources/data/*.json` in backend services, (2) read each `*Request.java` / `*Response.java` DTO for field inventory, (3) build realistic JSON from field names and types.

**ENDPOINT COVERAGE GATE (pre-completion check):**
```
controller_endpoints = count of non-/ping endpoints from controller scan
samples_in_runbook = count of <details> blocks in Section 7.1.4

IF samples_in_runbook < controller_endpoints THEN
  GENERATION INCOMPLETE — list missing endpoints
ENDIF
```
This is a HARD FAILURE. Do NOT skip endpoints because they seem "less important". The runbook is the single source of truth for ops — every endpoint matters.

#### Author Field Rule:

The `Document Author` and all `Author` columns in tables MUST use the system username (`whoami` or `git config user.name`). NEVER write "Auto-generated" or "AI-generated". The person running the prompt is the author.

### Step 10b: Content Writing Standards

Every behavioral description MUST be a full operational block:

| Content Type | Minimum Depth |
|--------------|---------------|
| Service description | What it does, what it depends on, how it fails, how to verify |
| Endpoint documentation | Path, method, request/response summary, error codes, SLA |
| Error code entry | Code, HTTP status, trigger condition, user impact, ops action, Splunk query |
| Integration description | What system, protocol, failure modes, retry logic, circuit breaker, fallback |
| Deployment step | Pre-condition, command/action, verification, rollback |

**VOICE-GATE:** Description paragraphs NEVER name internal class names. Write:

| Instead of | Write |
|------------|-------|
| `PaymentFormWidget` renders iframe | Payment card entry uses an embedded secure form from the payment vendor |
| `validateRequiredFields()` rejects | The system validates all mandatory fields before saving |
| `OrderReviewServiceImpl` aggregates | The order review service collects line items and calculates totals |

---

## Phase 4 — Verification

> **Read on demand:** `tools/post-generation-checks.md` — full checklist with auto-fix guidance.

### Step 11: Run Post-Generation Checks

Execute all checks from `tools/post-generation-checks.md` against the generated runbook. At minimum:

| Check | Method | Pass Criteria |
|-------|--------|---------------|
| Template completeness | Diff section headings: template vs output | Every template section present |
| `[VERIFY]` count | `grep -c '\[VERIFY' {output}` | Report count (0 is ideal, >0 is acceptable with justification) |
| Diagram references valid | Every `![...](diagrams/...)` points to existing `.svg` | All diagram links resolve |
| No hardcoded app names | `grep -ci` for known app-name patterns | 0 matches (G1 compliance) |
| No internal class names in descriptions | Scan description paragraphs for `*Impl`, `*Controller`, `*Service` Java patterns | Class names only in Source Files sections |
| Evidence coverage | Count evidence table rows vs runbook assertions | Every assertion has evidence |
| No fabricated endpoints | Cross-reference endpoint list against controller scan | Every listed endpoint exists in source |
| No fabricated error codes | Cross-reference error codes against constants/exception handlers | Every listed code exists in source |
| Diagram node coverage | Cross-reference C4/sequence nodes against repo scan | Every node traces to a real component |
| Diagram manifest complete | Every `.mmd` in `diagrams/` has a row in `diagram-manifest.md` | Counts match, every `.mmd` has `.svg` |
| **Deep-scan gate: Identity verification** | Check if runbook has multiple verification paths documented when both exist in code | If `find {frontend_repo}/src -name '*erifyIdentity*'` returns more than one component → runbook MUST document all verification paths with separate providers |
| **Deep-scan gate: reCAPTCHA** | Check if runbook specifies version + mode | If `grecaptcha.enterprise` in code → runbook MUST say "Enterprise" + specify invisible/checkbox |
| **Deep-scan gate: Batch processing** | Check if runbook documents batch when extract tables exist | If any `*EXTRACT*` or `*BATCH*` table exists in DDL → runbook MUST have batch section with workflow, not just `[VERIFY]` |
| **Deep-scan gate: Apigee security** | Check if runbook documents security layers | If `apigee/security-config.md` exists → runbook MUST list fingerprint validation, spike arrest rate, KVM credential storage |
| **Deep-scan gate: Common services** | Check if each integration cross-refs common-services doc | Every integration listed in `common-services/` MUST have its lockout/error/retry policy in the runbook |
| **Microservices Req/Res coverage (HARD GATE)** | Count `<details>` blocks in Section 7.1.4 vs non-/ping endpoints from controller scan | EVERY non-`/ping` endpoint MUST have a `<details>` block with request + response JSON. Endpoints with multiple behavior paths need one sample per path. Missing any = GENERATION INCOMPLETE. |
| **JSON format consistency** | Check all `<details>` blocks for consistent Request/Response format | All JSON blocks must be beautified, multi-line. Zero inline backtick JSON for responses. |
| **Author field** | Verify no "Auto-generated" or "AI-generated" in any Author column | Author must be system username |

### Step 12: Report Results

Display verification summary:

```
══════════════════════════════════════════════════════════════
RUNBOOK GENERATION — VERIFICATION REPORT
══════════════════════════════════════════════════════════════

  Template sections filled:     {N}/{total} ({pct}%)
  [VERIFY] tags remaining:      {count}
  Diagrams generated:           {count} (.mmd + .svg pairs)
  Diagram manifest:             ✅ created
  Evidence table rows:          {count}
  Hardcoded app names:          {count} (must be 0)
  Post-generation checks:       {passed}/{total} passed

  Output files:
    • {output_dir}/{runbook_filename}.md
    • {diagram_dir}/*.mmd
    • {diagram_dir}/*.svg
    • {diagram_dir}/diagram-manifest.md

══════════════════════════════════════════════════════════════
```

### Step 13: Completion Handoff

If `[VERIFY]` count > 0:

> "{count} sections need manual verification. Search the runbook for `[VERIFY` to find them. Each tag describes what evidence is missing and what the ops team should provide."

If all checks pass:

> "Runbook generated from workspace evidence. Review the `[VERIFY]` tags (if any) and validate diagrams render correctly in your markdown viewer."

---

## Phase 5 — Screenshot Capture (Mandatory Ask — Non-Prod Only)

> Runs within the same prompt session, immediately after Phase 4 handoff. ALWAYS ask the user for a test/staging URL. User may provide a URL or explicitly skip.

### Step 14: Offer Screenshot Capture

After displaying the Phase 4 verification report, ask the user:

> "Would you like to capture application screenshots?  
> I'll open a browser to your test/staging environment. You navigate the full flow (identity → order → payment → receipt). Every page change is auto-captured and appended to Section 9.1.  
>  
> Provide a **test or staging URL** to proceed, or say **skip** to finish without screenshots.  
> ⚠️ Production URLs are blocked."

- If user provides URL → proceed to Step 15
- If user says "skip" / "no" / "done" → end workflow

### Step 15: Validate & Execute

**1. Validate URL (HARD BLOCK on production):**
```bash
# Script rejects any URL matching: prod, prd
# Only allows: test, stage, stg, uat, dev, nonprod, localhost
```

**2. Check Playwright installed:**
```bash
node -e "require('playwright')" 2>/dev/null || echo "Install: npm install playwright"
```

**3. Run the capture script:**
```bash
node scripts/capture-screenshots.js {user_provided_url} {diagram_dir}/screenshots {output_dir}/{runbook_filename}.md
```

**What happens:**
1. A **visible browser window** opens at the provided URL
2. User navigates the app normally — fills forms, enters test data, clicks through the flow
3. On **every page/route change**, the script auto-captures a full-page screenshot
4. Screenshots saved sequentially: `01-order-vital-records.png`, `02-order-birth-certificate.png`, etc.
5. When user **closes the browser**, script finishes
6. All screenshots appended to Section 9.1 of the runbook with page name and route

**Detection mechanism (works for any SPA):**
- `history.pushState` / `replaceState` interceptor
- MutationObserver on `document.body` watching for pathname changes
- `framenavigated` event for full page navigations

**ANTI-DUPLICATION RULES (HARD GATE):**
- The capture script writes directly to Section 9.1. Do NOT also manually write screenshot references — this causes duplication.
- After the script completes, **verify** Section 9.1 was updated by reading the file. If the script failed to write (browser close timing), THEN manually write — but ONLY after confirming the section is still empty/placeholder.
- Before any manual write to Section 9.1, run: `sed -n '/^## 9.1/,/^## 9.2/p' {output_file} | grep -c '!\['` — if count > 0, screenshots already exist. Do NOT append a second set.
- Remove duplicate screenshots (same page captured twice during navigation back/forward). Keep the FIRST capture of each unique route.

### Step 16: Confirm Completion

After browser closes, display:

```
══════════════════════════════════════════════════════════════
  SCREENSHOTS CAPTURED: {count}
  Saved to: {diagram_dir}/screenshots/
  Runbook Section 9.1: Updated
══════════════════════════════════════════════════════════════
```

> "Screenshots captured and appended to your runbook. Review Section 9.1 to verify all key pages are included."

---
```


