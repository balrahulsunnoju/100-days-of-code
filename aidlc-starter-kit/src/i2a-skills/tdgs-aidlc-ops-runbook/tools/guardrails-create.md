# Ops Runbook Create Mode — Guardrails

## Non-Negotiable Rules (Read First)

> **G-numbering:** G1–G3 are shared with Update mode. G25–G30 are Create-mode only.
> Update-mode guardrails (G4–G5, G8–G12, G15, G17, G19–G24) are defined in the prompt and workflow.md.

### G1 — Application-agnostic

No hardcoded app names, acronyms, repo names, or URLs. Every detail is **discovered** from the workspace at runtime using generic patterns (`*-docs*/`, `pom.xml`, `package.json`, `*Controller.java`, route files). The same workflow must produce a valid runbook for ANY Texas.gov application workspace.

### G2 — Discover-before-generate (MANDATORY)

Discovery sources in priority order:

1. `*-docs*/project-context.md` — application metadata, environment topology
2. `*-docs*/knowledge-base/master-index.md` → `reading-order.md` — understand KB structure
3. `*-docs*/knowledge-base/**/*.md` — ALL docs, no sampling, no shortcuts
4. Backend service repos — controllers, services, DTOs, config, exceptions, pom.xml
5. Frontend repo — routes, API clients, env config, error components
6. Database repo — DDL, migrations, stored procedures
7. Deployment artifacts — Dockerfiles, CI configs, k8s manifests
8. Apigee exports — proxy bundles, policies, target endpoints

**HARD GATE:** The evidence table (Step 4 in workflow) must be built BEFORE any content writing begins. No exceptions.

### G3 — No fabrication

If a fact cannot be verified from workspace source code, knowledge base, or configuration files, it MUST be tagged:

```markdown
[VERIFY: {specific guidance on what evidence is needed and where to find it}]
```

NEVER invent descriptions, endpoints, error codes, or operational procedures. An incomplete runbook with `[VERIFY]` tags is infinitely better than a fabricated one.

### G25 — Diagrams from evidence

Every node in a C4 or sequence diagram MUST trace to a discovered source file:

- Container nodes → discovered repos with confirmed tech stack
- External system nodes → HTTP clients or integration docs found in KB/source
- Sequence participants → controllers, services, or external APIs found in code
- Relationship arrows → confirmed inter-service calls (HTTP client configs, base URLs)

A speculative component that cannot be traced to source → do NOT include it.

### G26 — Operational voice

Write for an on-call engineer at 2am who has never read the codebase:

| Rule | Example |
|------|---------|
| No internal class names in descriptions | "The order service validates required fields" NOT "`OrderReviewServiceImpl.validateRequiredFields()` runs" |
| What happens, not how it's coded | "Payment uses an embedded secure form from the payment vendor" NOT "`PaymentFormWidget` renders an iframe" |
| Actionable language | "Check Splunk for error code X, then verify upstream service Y is responding" |
| Class names allowed ONLY in | Source Files tables, API endpoint path references, configuration property keys |

### G27 — Template fidelity

- NEVER remove, reorder, or rename template sections
- NEVER merge template sections (even if content seems similar)
- Unfilled sections get the `[VERIFY]` tag, not deletion
- Strip all instructional blockquotes (`> Provide a brief summary...`, `> Describe...`) from the template — these are generator instructions, not output content
- `IF APPLICABLE` sections without evidence → keep the heading + `[VERIFY: no evidence found — remove if not applicable]`
- `REQUIRED` sections without evidence → keep the heading + `[VERIFY: required section — ops team must provide: {specifics}]`

### G28 — Diagram manifest

Every generated `.mmd` file and its rendered `.svg` MUST be registered in `diagram-manifest.md`. The manifest includes:

- Diagram name and type (C4 Context, C4 Container, Sequence, Flowchart)
- Source evidence (which KB/source files informed the diagram)
- File paths (both `.mmd` and `.svg`)
- Generation date

If a diagram fails to render, the manifest records it as `RENDER_FAILED` with the error — it is NOT silently dropped.

### G29 — Anti-hallucination (evidence gate)

Every sentence in the runbook MUST trace to a row in the evidence table:

| Confidence | Action |
|------------|--------|
| HIGH — exact match in source/KB | Write as fact |
| MEDIUM — inferred from patterns | Write as fact + note inference in evidence table |
| LOW — reasonable assumption with no source | Tag with `[VERIFY: ...]` |
| NONE — cannot determine | Do NOT write. Leave section for `[VERIFY]` |

**Automatic disqualifiers (NEVER write these without evidence):**
- Port numbers, URLs, IP addresses
- SLA values, timeout durations, threshold percentages
- Team names, contact emails, phone numbers
- Vendor names, license keys, account IDs
- Server hostnames, database connection strings

### G30 — Write scope (READ workspace, WRITE only output)

This workflow is **read-only** on the workspace. It reads source code, KB, and configuration to gather evidence. It NEVER modifies, creates, or deletes any existing workspace file.

**Allowed writes (exhaustive list):**
- `{output_dir}/{runbook_filename}.md` — the generated runbook
- `{output_dir}/diagrams/v{N}/*.mmd` — Mermaid source scripts (N = version number, starts at 1)
- `{output_dir}/diagrams/v{N}/*.svg` — rendered diagram images
- `{output_dir}/diagrams/v{N}/diagram-manifest.md` — diagram registry
- `mkdir -p {output_dir}/diagrams/v{N}/` — create versioned output directory if not exists
- Session memory checkpoint files (`/memories/session/ops-runbook-checkpoint.md`) — for resume across context windows

**NEVER allowed:**
- Modify any source code file (`.java`, `.js`, `.jsx`, `.ts`, `.py`)
- Modify any configuration file (`application.properties`, `.env`, `pom.xml`, `package.json`)
- Modify any existing KB document outside `{output_dir}` (`knowledge-base/api/`, `knowledge-base/shared/`, etc.)
- Modify any existing doc (`project-context.md`, change-briefs, specs)
- Create any file outside `{output_dir}/`
- Delete any file anywhere

---

### G31 — Placeholder resolution

Every `{PLACEHOLDER}` token from the template MUST be resolved to either:
- A discovered value (from evidence table)
- A `[VERIFY: ...]` tag stating what value is needed and where to obtain it

NEVER emit a literal `{PLACEHOLDER_NAME}` token in the final runbook. Post-generation check: `grep -n '{[A-Z_]*}' {output_file}` — must return zero matches.

---

### G32 — Diagram-prose alignment

Component names in Mermaid diagram source MUST match the names used in the corresponding runbook section prose. After generating both, verify that every labeled node in each `.mmd` file appears verbatim (or as a clear abbreviation) in the section that embeds it. Mismatched names between diagrams and prose confuse ops staff during incident triage.
