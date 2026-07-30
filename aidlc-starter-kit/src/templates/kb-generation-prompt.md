# Knowledge Base Generation Prompt Template

> **Usage:** This template is assembled by `/tdgs-aidlc-generate-kb` with runtime variable substitution.
> Variables are resolved from `i2a-config.yml` and `_bmad/bmm/config.yaml`.

---

*document this project*

*I have an existing project in this workspace called `{{project_name}}` which has multiple git repositories: {{worker_repos_list}}.{{#if include_apigee}} Additionally, there are Apigee API proxy sources — {{#if apigee_mode_git}}Git repositories ({{apigee_repos_list}}){{else}}a manually exported `{{apigee_folder}}/` folder containing proxy bundles{{/if}}. Detected proxies: {{apigee_proxy_names}}.{{/if}}{{#if include_common_services}} Additionally, scan the symlinked common/shared service repositories ({{common_repos_list}}) with the same exhaustive source code analysis as the core application services and create their documentation in `{{kb_path}}/common-services/` instead of `repos/`. DO NOT infer functionality from how {{project_name}} calls these services, document what each service actually provides based on its source code. These are shared services used by this application but maintained as shared libraries across multiple applications.{{/if}} Scan ALL files (including deployment descriptors, build configuration files e.g. XML files{{#if include_apigee}}, and Apigee-specific configuration files in those proxy sources{{/if}}) and DO NOT make any assumptions, source code is your truth. All the documentation should be created in `{{kb_path}}` folder. When creating the documentation, ensure to follow the following process:*

***a. API Specifications***

*Loop through all the files within the backend service repositories to find the model classes and then create detailed API specifications in **OpenAPI 3.0.3** format. Ensure to expand ALL schemas across all backend services with actual code properties. No placeholders, no assumptions.*

- ***Location:** `{{kb_path}}/api/`*
- ***Naming convention:** `<service_name>-openapi.yaml`*

***b. Business Specifications***

*Create business-focused documentation in {{kb_path}}/business/ that translates code into business language. Scan the codebase to discover and document:*

*Business Functionalities (business-functionalities.md):*

- *Identify all user-facing features and capabilities by analyzing controllers/handlers, services, UI components, and user flows*
- *Document each functionality with: Business Purpose, User Benefit, Key Inputs/Outputs (in plain language), and Related Workflows*
- *Group functionalities by business domain*
- *Include a visual feature map showing how functionalities relate to each other*

*Business Rules Catalog (business-rules-catalog.md):*

- *Extract business rules by scanning for: validation logic, conditional statements in service/business logic layers, enum/constant definitions, error messages, status transitions, and workflow conditions*
- *Read the service/business logic implementation files - Extract actual fee calculation formulas, business conditions, and workflow logic from service implementation files*
- *Read the data access layer implementations - Understand the actual data queries and transformation logic*
- *Read the frontend validation schemas - Extract validation rules from form components*
- *Update the business documentation - Make business-rules-catalog.md reflect the actual code rather than inferred patterns*
- *Document each rule with: Rule ID, Rule Name, Plain Language Description, Business Justification (if discernible), and Affected Functionality*
- *Categorize rules by type: Validation Rules, Calculation Rules, Eligibility Rules, Workflow Rules, and Compliance Rules*
- *Flag any rules that appear inconsistent or duplicated across services*

*Business Glossary (business-glossary.md):*

- *Extract domain terminology from entity/model names, field names, enum values, and code comments*
- *Provide clear, non-technical definitions for each term*
- *Map technical terms to their business equivalents*
- *Include relationships between terms*

*Process Flows (process-flows.md):*

- *Trace end-to-end business processes by following service interactions and state changes*
- *Document each process with: Process Name, Business Objective, Trigger/Entry Point, Step-by-Step Flow (business language), Decision Points, and Outcomes*
- *Use simple flowchart notation (Mermaid diagrams) that business users can understand*

***Location:** `{{kb_path}}/business/`*
*Audience: Business analysts, product owners, and non-technical stakeholders*

***c. Shared Documentation***

*Create shared documentation (all 10 of them) in kebab case format in `{{kb_path}}/shared/` for the below:*
- *System architecture*
- *Integration architecture*
- *Data models*
- *Database Schema* - *Find database components across all backend services by searching for: Repository, DAO, Entity, Mapper, @Table, @Query, DbContext, ORM models, and raw SQL*
- *External services*
- *Deployment configuration*
- *Technology stack*
- *Source tree analysis*
- *Repository structure*
{{#if include_apigee}}- *Apigee API Gateway* - *Document API proxy configurations, policies, target endpoints, and security configurations from {{#if apigee_mode_git}}proxy repositories{{else}}exported Apigee packages{{/if}}*{{/if}}

***d. Repository-Specific Documentation***

***Location:** `{{kb_path}}/repos/`*

*Each service repository MUST follow the below structure and the files mentioned:*

```
<repository-name>/
├── architecture.md
├── ui-components.md    # Only if this is a UI-specific project - Check for all UI components, including custom dependencies defined in package.json, etc and document the components and package dependencies in detail
└── README.md
```

{{#if include_apigee}}
***e. Apigee API Gateway Documentation***

***Location:** `{{kb_path}}/apigee/`*

*Scan the Apigee proxy sources based on your setup:*
{{#if apigee_mode_git}}
- *Git-based: scan proxy repositories ({{apigee_repos_list}})*
{{else}}
- *Legacy: scan the `{{apigee_folder}}/` folder for exported Apigee packages*
{{/if}}

*Create the following documentation:*

```
apigee/
├── README.md               # Overview of all API proxies
├── architecture.md         # API Gateway architecture and flow diagrams
├── proxy-catalog.md        # Catalog of proxies with base paths and target endpoints
├── policies.md             # All policies (security, traffic management, mediation)
├── security-config.md      # OAuth, API key validation, threat protection
└── target-endpoints.md     # Backend target server configurations
```

*For each Apigee proxy (whether from Git repo or exported package), scan and document:*
- *`apiproxy/` folder structure including proxies.xml, policies/, resources/, and targets/*
- *Policy XML files - categorize by type (AssignMessage, RaiseFault, JavaScript, ServiceCallout, OAuthV2, SpikeArrest, Quota, etc.)*
- *JavaScript/Python/Java callout files in resources/*
- *Target endpoint configurations and backend routing logic*
- *Proxy-to-backend service mapping (correlate with backend services documented above)*
{{/if}}

{{#if include_common_services}}
***{{#if include_apigee}}f{{else}}e{{/if}}. Common Services Documentation***

***Location:** `{{kb_path}}/common-services/`*

*For each common/shared service repository ({{common_repos_list}}), create comprehensive documentation with the same depth as core application services:*

```
<service-name>/
├── architecture.md         # Service architecture, components, dependencies
├── api-contracts.md        # Endpoints this service exposes (what it provides, not how it's called)
├── data-models.md          # Entities, DTOs, domain objects
└── README.md               # Service overview, purpose, deployment notes
```

*Document what each service actually provides based on its source code — DO NOT infer from how {{project_name}} calls these services.*
{{/if}}

***{{#if include_apigee}}{{#if include_common_services}}g{{else}}f{{/if}}{{else}}{{#if include_common_services}}f{{else}}e{{/if}}{{/if}}. Project Documentation***

*Project-specific documentation structure:*

```
project/
├── existing-documentation-inventory.md
├── development-and-operations.md
└── project-scan-report.json
```

***{{#if include_apigee}}{{#if include_common_services}}h{{else}}g{{/if}}{{else}}{{#if include_common_services}}g{{else}}f{{/if}}{{/if}}. Root Documentation Files***

*Create the following files at the root of the docs folder:*
- *`master-index.md`*
- *`quick-reference.md`*
- *`reading-order.md`*
- *`README.md`*

***{{#if include_apigee}}{{#if include_common_services}}i{{else}}h{{/if}}{{else}}{{#if include_common_services}}h{{else}}g{{/if}}{{/if}}. Sync Requirement***

*Ensure the API Specifications in the `api/` folder and rest of the documentation within the `{{kb_path}}` folder always stays in sync.*

*Before proceeding with creating any documentation, check if there is any existing project documentation. If not, always use **Exhaustive Scan** option provided by BMAD `document-project` task.*
