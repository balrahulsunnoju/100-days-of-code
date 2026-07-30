# Ops Runbook Create Mode — Section Grounding Rules

## Purpose

This file defines the evidence requirements and fill rules for each section of the Texas.gov Run Book Template. The orchestrator walks each section in order, applying these rules to determine what content to write and from which evidence source.

---

## Output Formatting Standards

The generated runbook MUST follow these markdown conventions for professional, consistent presentation:

### Heading Hierarchy

| Level | Use | Example |
|-------|-----|---------|
| `#` (H1) | Document title + top-level numbered sections (1–9) | `# 1. Introduction` |
| `##` (H2) | Sub-sections within a numbered section | `## 4.1 Application Architecture Diagram` |
| `###` (H3) | Sub-sub-sections | `### 4.3.1 Production Servers / URL` |
| `####` (H4) | Rare — only for deeply nested content | `#### Performance Baselines` |

### Text Styling

| Pattern | When to use |
|---------|-------------|
| **Bold** | Field labels (`**Application Name:**`), column headers, key terms on first mention |
| *Italic* | Figure captions (`*Figure 1: System Context*`), notes, emphasis |
| `code` | Commands, file paths, endpoint paths, config property names, error codes |
| > blockquote | Descriptions, guidance text, important callouts |

### Structural Patterns

- **Tables** — use for structured data (endpoints, error codes, contacts, servers). Align columns with `:---` (left).
- **Bulleted lists** — use for unordered items (key components, business rules, validation notes).
- **Numbered lists** — use for sequential steps (deployment, restart, troubleshooting).
- **Horizontal rules** (`---`) — between major sections (matching template).
- **Code blocks** — use for Splunk queries, bash commands, config snippets. Always specify language (```spl, ```bash, ```json).

### Diagram Embedding

Every diagram MUST be embedded with this format:

```markdown
![{Descriptive alt text}](diagrams/v1/{filename}.svg)

*Figure {N}: {Caption — plain language describing what the diagram shows}*
```

- Line 1: Image embed with descriptive alt text (path includes version subdirectory)
- Line 2: Figure caption (italic) — what the diagram shows

The `.mmd` source files are saved alongside the `.svg` in the versioned diagrams directory:

```
{output_dir}/diagrams/v1/
├── c4-context.mmd          ← Mermaid source (editable)
├── c4-context.svg          ← Rendered image (embedded in runbook)
├── seq-order-flow.mmd
├── seq-order-flow.svg
└── diagram-manifest.md     ← Registry of all diagrams
```

### Professional Presentation

- No orphaned headings (every heading has content below it)
- No empty tables (if no data, use `[VERIFY]` tag instead)
- Consistent spacing: one blank line before headings, one blank line after code blocks
- Table alignment: use `|:---|` for left-aligned columns (default)
- Link cross-references between sections using standard markdown anchor format

---

## Fill Rules (Per Section)

### Header Table (Document Metadata)

| Field | Evidence Source | Confidence |
|-------|---------------|------------|
| Application Name | `project-context.md` → app name | HIGH if found |
| Acronym | `project-context.md` or inferred from repo prefix | MEDIUM if inferred |
| Application Tier | KB project docs or `[VERIFY]` | LOW unless explicit |
| Application URL | KB shared docs, env config, Apigee proxy base | HIGH if in config |
| Document Version | Always `1.0` (new document) | HIGH |
| Document Status | Always `Draft` | HIGH |
| Document Author | System username from `whoami` or `git config user.name` — NEVER write "Auto-generated" or `[VERIFY]` | HIGH |
| Date Released | Leave blank | N/A |
| Last Updated | Generation date | HIGH |

---

### Section 1: Introduction

**Evidence sources:** `project-context.md`, KB project docs, application README

**Fill rules:**
- Application Name + Acronym from metadata discovery
- Agency/Owner: default "Texas.gov Application Services" unless KB states otherwise
- ServiceNow CI Name: `[VERIFY]` unless found in KB
- Purpose: synthesize from `project-context.md` description — 2-3 sentences, business language
- Key Stakeholders / Primary Users: from KB business docs or `[VERIFY]`
- Scope paragraph: template with app name substituted

---

### Section 2: Contact List

**Evidence sources:** KB project docs, `project-context.md`, `org-defaults.yaml`

**Fill rules:**
- Group emails: auto-populate from `org-defaults.yaml` — NEVER `[VERIFY]` for org-level distribution lists
- Project-specific contacts not in org-defaults: `[VERIFY: obtain from project manager]`
- Section 2.1 (Customer Directory): `[VERIFY]` unless KB has explicit customer contacts
- Section 2.2 (3rd Party Vendor): populate vendor NAME from discovered integrations (payment vendor, email service, etc.) but contact details are `[VERIFY]`

---

### Section 3: Application Overview

**Evidence sources:** KB business docs, UI routes, controller scan, sequence diagrams

**Fill rules:**
- 3.1 Application Flow Diagram: embed generated sequence diagram(s) + write process steps from discovered UI flow
- 3.2 Key Business Functions: extract from KB business docs — list each function with description and priority
- Business Rules: extract from service implementations (validation logic, conditional branches)
- User Roles: from KB or UI route guards / auth config

---

### Section 4: Environment Overview

**Evidence sources:** KB shared docs, deployment configs, `application.properties`/`.yml`, Apigee proxy configs

**Fill rules:**
- 4.1 Application Architecture Diagram: embed `c4-context.svg` + describe key components
- 4.2 Technical Architecture Diagram: embed `c4-container.svg` + describe infrastructure layers
- 4.3 Servers and Infrastructure: populate ONLY from KB environment docs or config files
  - URLs from env configs (`.env`, `application.properties`)
  - Server names/IPs: `[VERIFY]` unless in KB
  - 4.3.5 Database Endpoints: from `application.properties` JDBC URLs or KB
- 4.4 Backup and Recovery: `[VERIFY]` unless KB has explicit backup procedures

---

### Section 5: Deployment

**Evidence sources:** CI configs, KB shared docs, Dockerfiles, `pom.xml` build plugins, GitHub Actions/Jenkins files

**Fill rules:**
- 5.1 Source Control: repository URLs from workspace discovery (`.git/config` or KB)
- 5.2 CI/CD Pipeline: extract stages from CI config files; if none found → populate from KB deployment docs
  - Pipeline tool: infer from config file type (Jenkinsfile → Jenkins, `.github/workflows/` → GitHub Actions)
  - Stages: map discovered build/test/deploy steps
- 5.3 Automation Dependencies: from KB shared docs or CI configs; list tools and frameworks
- Deployment to Production steps: from KB deployment docs or `[VERIFY]`
- Rollback procedure: from KB or `[VERIFY]`

---

### Section 6: Integrations

**Evidence sources:** HTTP clients in source code, KB integration docs, Apigee proxy configs, env variable URLs

**Fill rules:**
- One sub-section per discovered external integration
- Integration Type: infer from client code (REST, SOAP, batch file transfer)
- Direction: infer from code (outbound call vs inbound webhook)
- Protocol: from HTTP client config
- Authentication: from config (OAuth2, API key, mTLS) or `[VERIFY]`
- Error Handling: from exception handlers, retry annotations, circuit breaker configs
- SLA / Volume: `[VERIFY]` unless in KB
- Section 6.1 (reCAPTCHA): only include if reCAPTCHA dependency found in source/config

---

### Section 7: Operations

**Evidence sources:** KB ops docs, batch job configs, database scripts, health endpoints

**Fill rules:**
- 7.1 Daily Checklist: populate template defaults (health check, Splunk review, etc.) + add app-specific checks from KB
- 7.2 Routine Automated: from CI schedules, cron configs, or `[VERIFY]`
- 7.3 Routine Manual: from KB ops docs or `[VERIFY]`
- 7.4 Batch Processing: from job scheduler configs, Spring Batch classes, or `[VERIFY]`
- 7.5 Database Scripts: from database repo (DDL, migration scripts, stored procedures)
  - 7.5.1 Deployment: from migration tool config (Flyway, Liquibase) or manual scripts
  - 7.5.2 Database Refresh: `[VERIFY]` unless KB has explicit refresh procedures (frequency, masking, post-refresh steps)
  - 7.5.3 Key Database Objects: from schema DDL — table names, purposes inferred from column names
- 7.6 Restart Procedures: mostly `[VERIFY]` unless KB has explicit restart docs
  - 7.6.1 Restart Conditions: template defaults are acceptable (generic ops)
  - 7.6.3 Restart Steps: `[VERIFY]` for specific commands

---

### Section 8: Monitor

**Evidence sources:** KB ops/monitoring docs, Splunk queries in KB, health endpoints, AppDynamics references

**Fill rules:**
- 8.1 Splunk Exception Logs: from KB shared docs (log index, sourcetype) or `[VERIFY]`
  - Common exceptions: from exception handler scan (class names in source, NOT in description)
- 8.2 Splunk API / Apigee Logs: from Apigee proxy docs or KB
- 8.3 Splunk Dashboard: `[VERIFY]` for dashboard name/URL
- 8.4 AppDynamics: `[VERIFY]` for URLs and access — populate metric thresholds only if in KB
  - Health Check Endpoints: from controller scan (`/health`, `/actuator/health`)
- 8.5 Triage Guide: populate template defaults + add app-specific entries from error handler scan
- 8.6 Google Analytics: only include if GA/GTM dependency found in source

---

### Section 9: Appendix

**Evidence sources:** Various — error handling code, session config, KB

**Fill rules:**
- 9.1 Screenshots: Populated by Phase 5 interactive capture script (user provides test/staging URL). If skipped, leave as `[VERIFY: screenshots not captured — provide test/staging URL to run Phase 5]`
- 9.2 Error Page Handling: from error handling components (React error boundaries, Spring exception handlers)
  - Map HTTP status codes to discovered error handlers
- 9.3 Session Timeout: from session config (Spring session, cookie config) or `[VERIFY]`
- 9.4 Useful Tips: synthesize from KB or leave as `[VERIFY]`
- 9.5 Glossary: extract key terms from KB + source code domain terms
- 9.6 References: link to KB docs, source repos
- 9.7 Change Log: initial entry with generation date

---

### Microservices Request/Response Samples

**Placement:** Within each integration sub-section (Section 6.x) after the endpoint table, OR in Section 3 (Application Overview) if the endpoint is a core application flow.

**Evidence sources:** Controller scan (endpoints + `@RequestBody` DTOs), service implementations, existing KB API docs

**Fill rules:**
- Every non-`/ping` endpoint gets a `<details>` collapsible block with request + response JSON
- JSON field names MUST match actual DTO class fields (read the Java/JS model)
- Endpoints with multiple behavior paths (found/not-found, different record types) get one sample per path
- Response examples include both success and error responses
- Use fenced `json` code blocks, never inline backtick JSON

---

## Content Quality Gates (Per Section)

Before writing ANY section, verify:

1. **Evidence exists** — at least one evidence table row maps to this section
2. **Voice check** — no internal class names in description text
3. **Completeness** — every table has at least one populated row (or entire table is `[VERIFY]`)
4. **Cross-reference** — if section references another section, add a markdown link
5. **`[VERIFY]` specificity** — every `[VERIFY]` tag states WHAT is needed and WHERE to find it

---

## Section Type Handling

| Template Marker | Has Evidence | Action |
|----------------|-------------|--------|
| `REQUIRED` | YES | Fill from evidence |
| `REQUIRED` | NO | Keep heading + `[VERIFY: required section — ops team must provide: {specifics}]` |
| `IF APPLICABLE` | YES | Fill from evidence |
| `IF APPLICABLE` | NO | Keep heading + `[VERIFY: no evidence found — remove section if not applicable to this application]` |
