---
mode: agent
description: "Validate operational runbooks against generated context documents and produce a discrepancy report."
---
# Validate Runbook Context

Validate the operational runbook(s) in `runbook/` against the generated context documents in the workspace to identify discrepancies between operational documentation and technical specifications.

This prompt is **application-agnostic** — it dynamically discovers context documents, runbook content, and operational details from any workspace.

## Purpose

Cross-reference runbook content with context documents to find mismatches. This validation:
- Identifies where runbook values differ from documented architecture and integrations
- Highlights discrepancies in server configurations, URLs, and service endpoints
- Finds gaps where documented systems lack operational coverage
- Ensures runbook technical details align with architecture documents
- Validates API endpoints, database connections, and integration details

**Important**: This validation identifies DIFFERENCES — the team decides whether to update the runbook or update context documents based on what the actual operational state is.

## Consistency Requirements

This validation MUST produce **deterministic, reproducible results**. The same unchanged workspace MUST produce the same report every time. Follow these rules strictly:

1. **Fixed output file**: ALWAYS write the report to `{docs-repo}/implementation-artifacts/runbook-validation-report.md` — overwrite if it already exists. NEVER create numbered variants (e.g., `runbook-validation-report_1.md`).
2. **Deterministic ordering**: Process validation categories in the **fixed order** defined below (Sections 1–10). Within each category, process items in **alphabetical order** by name/identifier.
3. **Deterministic discrepancy IDs**: Number discrepancies sequentially within each section. Use the section-specific prefixes defined in the report template (e.g., ENV-001, SVC-001, DB-001). Every section MUST have discrepancy IDs — never omit them.
4. **Exhaustive comparison**: Compare ALL runbook values against ALL relevant context document values — do not skip or sample. Every URL, every version, every configuration value must be checked.
5. **No subjective interpretation**: Report only factual differences between documented values. Do not infer, assume, or interpret beyond what is explicitly written in the source documents.
6. **Complete extraction**: Extract every value found — do not skip or sample. Every URL, IP, port, version, threshold, path, and configuration detail must be captured and compared.

### Status Classification Rules (CRITICAL — follow exactly)

Use these exact status indicators. The classification is **rule-based, not judgment-based**:

| Status | Symbol | Rule — Use ONLY when: |
|--------|--------|------------------------|
| MATCH | ✅ | Both sources document the same item AND the values are identical or semantically equivalent (e.g., `^16.13.1` vs `16.13.1` — caret prefix is a package manager convention, same version) |
| MISMATCH | ❌ | Both sources document the same item BUT values differ in any way (e.g., different version numbers, different URLs, different technology names, different configurations) |
| INFO | ℹ️ | Item exists in ONE source ONLY and the other source has NO mention of it at all (missing from one source) |

**Disambiguation rules** (to prevent status drift between runs):

| Scenario | Status | Rationale |
|----------|--------|-----------|
| Same item, different version numbers | ❌ MISMATCH | Values differ — requires reconciliation |
| Same item, different technology/product names (e.g., two different databases, two different app servers, two different frameworks) | ❌ MISMATCH | Fundamentally different technologies are contradictions |
| Same environment, different URL domains | ❌ MISMATCH | Different domains are a factual contradiction |
| Same endpoint, different URL path prefixes | ❌ MISMATCH | Path differences indicate a mismatch |
| Same endpoint, fundamentally different path structure or routing | ❌ MISMATCH | Different routing implies different service architecture |
| Item documented in one source only, no mention at all in the other | ℹ️ INFO | Cannot be a mismatch if one source never mentions it — item is missing |
| Inventory count differs (e.g., runbook lists 5 proxies, context docs list 2) | ❌ MISMATCH | Inventory disagreement is a factual contradiction |
| Same item, major version difference (e.g., v3 vs v4) | ❌ MISMATCH | Version differences require reconciliation |
| Different names for potentially the same thing (e.g., different sequence names, different config key names) | ❌ MISMATCH | Name differences are factual mismatches |

### Structural Consistency Rules

These rules prevent structural variation between runs:

1. **Section headers**: Use the EXACT section titles from the template below. Never rename them (e.g., always "API Gateway Configuration", never "Apigee Proxy Configuration" or "API Gateway Proxies").
2. **Subsection headers**: Use the EXACT subsection titles from the template. Never rename "Critical Findings" to "Critical Mismatch" or similar.
3. **Table columns**: Use the EXACT column headers from the template. Never add, remove, or rename columns.
4. **Discrepancy list format**: Every section MUST end with a `### Discrepancies` subsection containing a bulleted list with format: `- **{PREFIX}-{NNN}** ({status symbol}): {description}`. Never omit this subsection.
5. **Recommendation format**: Every section MUST end with a `**Recommendation**:` line. Use specific file paths from the workspace (e.g., `shared/deployment-configuration.md`). Never suggest creating NEW files that don't exist — always recommend adding to existing context documents.
6. **Executive Summary status**: The status for each category in the Executive Summary table MUST be the WORST status found in that section (❌ > ℹ️ > ✅). The discrepancy count MUST equal the number of items in that section's `### Discrepancies` list.
7. **One row per atomic item**: Each comparison table row represents ONE specific item (one URL, one version, one table name). Never combine multiple items into one row. Never split one item across multiple rows.
8. **Environment ordering in tables**: Always order environments: Production → Staging → UAT/Test → Dev (top to bottom).
9. **"Not documented" wording**: When a value exists in one source but not the other, always use the exact phrase `Not documented` in the empty cell — never use variants like "Not mentioned", "Not specified", "Not explicitly documented", "Not in context", "Missing", "N/A", etc.

## Process

### 1. Pre-flight Checks

#### 1.1 Discover & Verify Runbook Documents

Scan the workspace for runbook documents. Look in these standard locations:

**Runbook Content** (look in `runbook/` folder):
- `runbook/*.md` — Operational runbook documents (may be named after the application, e.g., `ovra-runbook.md`, `app-runbook.md`, or simply `runbook.md`)
- Any other `.md` files in `runbook/`

**BAIL** if NO runbook documents are found. At minimum, one runbook `.md` file must exist in the `runbook/` directory.

List all discovered runbook documents for the report.

#### 1.2 Discover & Verify Context Documents

Scan the workspace for context documents. Look in these standard locations (check each, use what exists):

**Shared/Technical Context** (look in `shared/` folder):
- `shared/system-architecture.md` — System design and architecture
- `shared/integration-architecture.md` — External integrations and service communication
- `shared/data-models.md` — Domain data models
- `shared/database-schema.md` — Database structure, tables, schemas
- `shared/deployment-configuration.md` — Deployment settings and environments
- `shared/technology-stack.md` — Technology versions and dependencies
- `shared/external-services.md` — Third-party service integrations
- `shared/repository-structure.md` — Code organization
- `shared/source-tree-analysis.md` — Source code analysis
- Any other `.md` files in `shared/`

**Business Context** (look in `business/` folder):
- `business/business-rules-catalog.md` — Business rules, thresholds, limits
- `business/process-flows.md` — Workflow/process definitions
- `business/business-glossary.md` — Domain terminology
- `business/business-functionalities.md` — Feature descriptions
- Any other `.md` files in `business/`

**API Specs** (look in `api/` folder):
- `api/*.yaml` or `api/*.json` — OpenAPI/Swagger specs

**API Gateway** (look in `apigee/` or similar gateway folder):
- `apigee/*.md` — API gateway proxy configuration, policies, security
- Any similar gateway documentation folder

**Repository-specific docs** (look in `repos/` folder):
- `repos/*/architecture.md` — Per-service architecture
- `repos/*/*.md` — Any service-specific documentation

**BAIL** if NO context documents are found at all. At minimum, one of the shared or business documents must exist.

List all discovered context documents for the report.

---

### 2. Load & Analyze Runbook Content

Read ALL discovered runbook documents and extract operational reference data organized by category.

#### 2.1 Environment/Server Configuration Extraction

Extract ALL environment-specific information:
- Application URLs per environment (Production, Staging, UAT, Test, Dev)
- Infrastructure details (hosting, cloud regions, availability zones, VPC, subnets)
- Load balancer endpoints and configurations
- DNS entries and domain mappings

#### 2.2 Service Integration Extraction

Extract ALL service endpoint information:
- External service URLs per environment (payment services, identity verification, etc.)
- Internal microservice URLs per environment
- API base paths and endpoint paths
- Service-to-service communication patterns

#### 2.3 Database Configuration Extraction

Extract ALL database-related information:
- Database types and versions (Oracle, MySQL, PostgreSQL, etc.)
- Connection strings, hostnames, ports
- Schema names and purposes
- Table references
- Database sequences
- Backup and retention policies
- Driver and dialect information

#### 2.4 Technology Stack Extraction

Extract ALL technology versions:
- Frontend framework versions (React, Angular, Vue, etc.)
- Backend framework versions (Spring Boot, .NET, Django, etc.)
- Language versions (Java, Python, Node.js, etc.)
- Library versions
- Infrastructure components (application servers, web servers, etc.)

#### 2.5 API Gateway Configuration Extraction

Extract ALL API gateway information:
- Proxy names and purposes
- Environment-specific gateway URLs
- Shared flows/policies
- Security configurations (JWT, OAuth, CORS, etc.)

#### 2.6 Monitoring & Observability Extraction

Extract ALL monitoring information:
- Log aggregation systems (Splunk, ELK, etc.) — URLs, indexes
- Log file paths per service
- APM tools (AppDynamics, New Relic, etc.) — URLs
- Analytics tools (Google Analytics, etc.) — accounts, properties
- Alerting configurations

#### 2.7 Authentication & Security Extraction

Extract ALL security-related configuration:
- Authentication mechanisms and lockout thresholds
- Session configurations (timeouts, etc.)
- Certificate/token details
- Security verification services

#### 2.8 Batch Processing Extraction

Extract ALL batch/scheduled job information:
- Job names, purposes, schedules
- Stored procedures and functions
- File formats and output paths
- Retention policies

---

### 3. Load & Analyze Context Documents

Read ALL discovered context documents and extract corresponding reference data.

#### 3.1 Architecture & Infrastructure

From `shared/system-architecture.md`, `shared/deployment-configuration.md`, and related:
- Documented environments and URLs
- Infrastructure topology
- Deployment patterns

#### 3.2 Integration & Services

From `shared/integration-architecture.md`, `shared/external-services.md`, and related:
- External service integrations
- Internal service communication
- API contracts

#### 3.3 Database Schema

From `shared/database-schema.md`, `shared/data-models.md`, and related:
- Database types, schemas, tables
- Connection configurations
- Data models

#### 3.4 Technology Stack

From `shared/technology-stack.md` and related:
- Framework and language versions
- Library dependencies
- Infrastructure components

#### 3.5 API Gateway

From `apigee/*.md` or similar gateway docs:
- Proxy inventory
- Policy catalog
- Security configurations
- Target endpoints

#### 3.6 Business Rules & Thresholds

From `business/business-rules-catalog.md` and related:
- Operational thresholds (lockout limits, retry counts, etc.)
- Session/timeout policies
- Business-critical configuration values

#### 3.7 API Specifications

From `api/*.yaml` or `api/*.json`:
- Endpoint paths and methods
- Request/response schemas
- Base URLs and server definitions

---

### 4. Perform Validation Comparisons

Execute the following validation checks in order. For each check, compare every value found in the runbook against the corresponding value in context documents (and vice versa).

#### 4.1 Server/Environment URL Validation

Compare ALL environment URLs found in the runbook against deployment configuration and architecture docs:
- Application URLs per environment
- Infrastructure details (cloud provider, regions, availability zones)
- VPC/networking configuration
- Record ✅ for matches, ❌ for value mismatches, ℹ️ for values present in only one source (missing)

#### 4.2 Service Integration URL Validation

Compare ALL service integration endpoints:
- External service URLs per environment (payment, identity, notification services)
- Internal microservice URLs and base paths
- API endpoint paths (compare runbook paths against API specs)
- Note path differences (e.g., different base paths, capitalization differences)

#### 4.3 Database Configuration Validation

Compare ALL database details:
- Database types (flag if runbook mentions databases not in context or vice versa)
- Connection details (hostnames, ports, schemas)
- Table inventory (compare runbook table references vs schema docs)
- Sequences and procedures
- Backup/retention policies

#### 4.4 Technology Stack Validation

Compare ALL technology versions:
- Frontend libraries and versions
- Backend frameworks and versions
- Language runtime versions
- Application server details
- Flag version mismatches and missing entries

#### 4.5 Microservice/Service Inventory Validation

Compare the list of services documented in the runbook vs context docs:
- Services present in both
- Services only in runbook
- Services only in context docs
- Compare detail levels

#### 4.6 API Gateway Configuration Validation

Compare API gateway details:
- Proxy inventory (runbook vs gateway docs)
- Environment-specific gateway base URLs
- Shared flows/policies
- Security configurations

#### 4.7 Monitoring Configuration Validation

Compare monitoring and observability configuration:
- Log aggregation system details
- Log file paths
- APM configuration
- Analytics configuration
- Note items present only in runbook (common since context docs often lack monitoring details)

#### 4.8 Authentication & Security Validation

Compare security configurations:
- Lockout thresholds against business rules
- Session timeout policies
- Security service configurations
- Certificate/token details

#### 4.9 Database Table Validation

Cross-reference database tables:
- Tables mentioned in runbook vs tables in database schema docs
- Identify tables in one source but not the other
- Check schema references (e.g., primary schema, secondary schemas)

#### 4.10 Batch Processing Validation

Compare batch/scheduled processing:
- Jobs documented in runbook vs context docs
- Schedules, procedures, retention policies
- Flag items in one source only

---

### 5. Generate Validation Report

Create (or **overwrite** if it already exists) `{docs-repo}/implementation-artifacts/runbook-validation-report.md` using the format below. NEVER create a new file with a numeric suffix — always use the exact filename `runbook-validation-report.md`.

**CRITICAL**: Dynamically populate ALL sections based on what was actually discovered and compared. Do NOT hardcode any application-specific values. Every discrepancy, match, and gap must come from the actual comparison performed.

The report format:

---

# Runbook Validation Report

**Generated**: {YYYY-MM-DD}
**Application**: {Application name — infer from workspace README.md or root docs}
**Runbook Source**: `{path(s) to discovered runbook file(s)}`
**Context Documents**: `{summary of discovered context paths, e.g., shared/*.md, api/*.yaml, apigee/*.md}`
**Validation Method**: Cross-reference comparison between operational runbook and generated context documentation

---

## Executive Summary

| Category | Status | Discrepancies | Notes |
|----------|--------|---------------|-------|
| Server/Environment URLs | {✅/❌/ℹ️} | {count} | {brief note} |
| Service Integration URLs | {✅/❌/ℹ️} | {count} | {brief note} |
| Database Configuration | {✅/❌/ℹ️} | {count} | {brief note} |
| Technology Stack | {✅/❌/ℹ️} | {count} | {brief note} |
| Microservices | {✅/❌/ℹ️} | {count} | {brief note} |
| API Gateway Proxies | {✅/❌/ℹ️} | {count} | {brief note} |
| Monitoring Configuration | {✅/❌/ℹ️} | {count} | {brief note} |
| Authentication & Security | {✅/❌/ℹ️} | {count} | {brief note} |
| Database Tables | {✅/❌/ℹ️} | {count} | {brief note} |
| Batch Processing | {✅/❌/ℹ️} | {count} | {brief note} |

**Legend**: ✅ MATCH | ❌ MISMATCH (values differ) | ℹ️ INFO (missing from one source)

---

## 1. Server/Environment URLs

### Application URLs

| Environment | Runbook | Context Docs | Status |
|-------------|---------|--------------|--------|
| {env name} | {URL from runbook} | {URL from context or "Not documented"} | {✅/❌/ℹ️} |

### Infrastructure Details

| Item | Runbook | Context Docs | Status |
|------|---------|--------------|--------|
| {item} | {runbook value} | {context value} | {✅/❌/ℹ️} |

**Recommendation**: {Specific actionable recommendation, e.g., "Add environment URL inventory to shared/deployment-configuration.md"}

---

## 2. Service Integration URLs

_For each integration category discovered (e.g., Payment, Identity Verification, Notification, etc.), create a subsection:_

### {Integration Name} (e.g., Payment Integration)

| Environment | Runbook URL | Context Docs | Status |
|-------------|-------------|--------------|--------|
| {env} | {URL} | {context value or "Not documented"} | {✅/❌/ℹ️} |

**Context Docs Reference**: {Which context doc was compared, and what it says}

**Recommendation**: {Specific actionable recommendation}

---

## 3. Database Configuration

### Critical Findings

| Attribute | Runbook | Context Docs | Status |
|-----------|---------|--------------|--------|
| {attribute} | {runbook value} | {context value} | {✅/❌/ℹ️} |

**Analysis**: {Description of the finding, e.g., hybrid database architecture}

**Recommendation**: {Specific actionable recommendation to resolve the discrepancy}

---

## 4. Technology Stack Comparison

### Frontend Stack

| Component | Runbook Version | Context Docs Version | Status |
|-----------|-----------------|----------------------|--------|
| {library} | {runbook version} | {context version} | {✅/❌/ℹ️} |

### Backend Stack

| Component | Runbook | Context Docs | Status |
|-----------|---------|--------------|--------|
| {component} | {runbook value} | {context value} | {✅/❌/ℹ️} |

**Note**: {Any observations about version differences}

**Recommendation**: {Specific actionable recommendations}

---

## 5. Microservices Comparison

### Service Inventory

| Service | Runbook | Context Docs | Status |
|---------|---------|--------------|--------|
| {service name} | {coverage level} | {coverage level} | {✅/❌/ℹ️} |

### Service Endpoint Comparison (Sample Environment)

| Service/Endpoint | Runbook URL | API Spec | Status |
|------------------|-------------|----------|--------|
| {endpoint name} | {runbook URL} | {API spec path} | {✅/❌/ℹ️} |

---

## 6. API Gateway Configuration

### Proxy Inventory Comparison

| Proxy | Runbook | Context Docs | Status |
|-------|---------|--------------|--------|
| {proxy name} | {status} | {status} | {✅/❌/ℹ️} |

### Gateway Base URLs

| Environment | Runbook | Context Docs | Status |
|-------------|---------|--------------|--------|
| {env} | {URL} | {URL} | {✅/❌/ℹ️} |

### Shared Flows/Policies (if discovered)

| Shared Flow/Policy | Purpose | Documented In |
|---------------------|---------|---------------|
| {name} | {purpose} | {which source(s)} |

**Recommendation**: {Specific actionable recommendations}

---

## 7. Monitoring Configuration

### Log Aggregation (e.g., Splunk, ELK)

| Environment | Index/Config | URL | Documented In |
|-------------|-------------|-----|---------------|
| {env} | {index} | {URL} | {which source} |

### Log File Paths

| Service | Log Path | Documented In |
|---------|----------|---------------|
| {service} | {path} | {which source} |

### APM Tools (if discovered)

| Tool | Environment | URL | Documented In |
|------|-------------|-----|---------------|
| {tool name} | {env} | {URL} | {which source} |

### Analytics (if discovered)

| Tool | Details | Documented In |
|------|---------|---------------|
| {tool name} | {account/property details} | {which source} |

**Status**: {Overall status note — often ℹ️ since context docs may lack monitoring details}

**Recommendation**: {Specific actionable recommendation}

---

## 8. Authentication & Security

### Lockout/Threshold Configuration

| Verification Type | Environment | Runbook | Business Rules | Status |
|-------------------|-------------|---------|----------------|--------|
| {type} | {env} | {value} | {value} | {✅/❌/ℹ️} |

### Session Configuration

| Setting | Runbook | Context Docs | Status |
|---------|---------|--------------|--------|
| {setting} | {value} | {value or "Not documented"} | {✅/❌/ℹ️} |

---

## 9. Database Tables

### Table Inventory Comparison

| Table | Runbook | Schema Docs | Status |
|-------|---------|-------------|--------|
| {table name} | {✅/—} | {✅/—} | {✅/❌/ℹ️} |

### Database Sequences (if discovered)

| Sequence | Used By | Documented In |
|----------|---------|---------------|
| {sequence name} | {purpose} | {which source} |

**Recommendation**: {Specific actionable recommendations}

---

## 10. Batch Processing

### Batch Job Inventory

| Item | Value | Documented In |
|------|-------|---------------|
| {attribute} | {value} | {which source} |

**Status**: {Overall status note}

**Recommendation**: {Specific actionable recommendation}

---

## Summary of Required Updates

### High Priority (Mismatches — ❌)

{Numbered list of significant discrepancies that need resolution}

### Medium Priority (Missing Information — ℹ️)

{Numbered list of information gaps that should be documented}

### Low Priority (Enhancements)

{Numbered list of minor improvements}

---

## Appendix: Key Runbook Values Reference

### Critical URLs

```
{List all production/critical URLs extracted from runbook — dynamically populated}
```

### Critical Thresholds

```
{List all operational thresholds extracted from runbook — dynamically populated}
```

### Log Indexes / Monitoring

```
{List all monitoring identifiers extracted from runbook — dynamically populated}
```

---

## Context Documents Referenced

| Document | Path | Status |
|----------|------|--------|
| {document name} | {path} | Loaded / Not Found |

---

## Runbook Documents Analyzed

| File | Sections Analyzed | Discrepancies Found |
|------|-------------------|---------------------|
| {filename} | {count} | {count} |

---

**Report Generated By**: Architect Validation Agent
**Next Review**: After team determines resolution for discrepancies

---

### 6. Output Summary

After generating the report, display a summary to the user:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Runbook Context Validation Complete
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Application: {app name}
Runbook Documents Analyzed: {count}

Context Documents Referenced:
  {✓/✗ for each discovered document}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Validation Results:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✅ Matching Items:              {count}
  ❌ Mismatches (values differ):   {count}
  ℹ️  Info (missing from source):  {count}

Categories:
  1. Server/Environment URLs:     {status}
  2. Service Integration URLs:    {status}
  3. Database Configuration:      {status}
  4. Technology Stack:            {status}
  5. Microservices:               {status}
  6. API Gateway:                 {status}
  7. Monitoring Configuration:    {status}
  8. Authentication & Security:   {status}
  9. Database Tables:             {status}
  10. Batch Processing:           {status}

Report saved to: {docs-repo}/implementation-artifacts/runbook-validation-report.md
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{If discrepancies found:}
❌ DISCREPANCIES FOUND

High Priority:
{Numbered summary of ❌ MISMATCH items}

Medium Priority:
{Numbered summary of ℹ️ INFO items (missing from one source)}

ACTION: Verify actual operational state and update either runbook or context documents.
```

---

## Notes

- This prompt works with **ANY application** — it discovers runbook content and context documents dynamically
- All URLs, versions, configurations, and thresholds are extracted at runtime from workspace documents
- No application-specific values are hardcoded in this prompt
- Runbook naming conventions are auto-detected from the `runbook/` directory
- This validation identifies DISCREPANCIES — it does not assume which source is correct
- The team must verify actual operational state to determine source of truth
- After resolution, update either the runbook OR context documents accordingly
- Re-run validation after updates to confirm alignment
- **Output file**: Always `{docs-repo}/implementation-artifacts/runbook-validation-report.md` — overwrite, never create numbered copies
- **Section ordering**: Always use the fixed 10-section order defined above. Do not reorder, skip, or add sections.
- **Empty sections**: If a category has no data in either source, include the section header with a note: "No {category} information found in runbook or context documents."

### Determinism Checklist (self-verify before writing report)

Before writing the report file, verify these items to ensure consistency:

1. ☐ Every section uses the EXACT title from the template (Sections 1-10)
2. ☐ Every subsection uses the EXACT title from the template
3. ☐ Every table uses the EXACT column headers from the template
4. ☐ Every discrepancy has an ID in `{PREFIX}-{NNN}` format
5. ☐ Status symbols follow the classification rules (not subjective judgment)
6. ☐ Executive Summary status = worst status in that section
7. ☐ Executive Summary count = count of items in Discrepancies list
8. ☐ Empty cells use "Not documented" (exact wording)
9. ☐ Environments ordered: Production → Staging → UAT/Test → Dev
10. ☐ Items within tables are alphabetically ordered by name/identifier
11. ☐ One atomic item per table row (no combining, no splitting)
12. ☐ Every section has `### Discrepancies` and `**Recommendation**:`
13. ☐ Recommendations reference existing workspace files only
