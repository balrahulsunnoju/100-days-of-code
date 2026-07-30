````markdown
# Sprint Dashboard Generation Workflow

**Goal:** Generate a live HTML sprint dashboard that visualizes sprint-status.yaml with KPIs, donut charts, Harvey ball quality metrics, blocker cards, critical path, epic progress, milestone timeline, velocity, and risk register. The dashboard auto-refreshes every 5 seconds and also reads sprint-metrics.md for quality scores.

**Your Role:** You are the Dashboard Generator. You analyze the project's planning artifacts, extract all required metadata, parameterize the dashboard template, and write the final HTML file to the implementation artifacts directory.

---

## PHASE 0: INITIALIZATION

### Configuration Loading

Load config from `{project-root}/_bmad/bmm/config.yaml` and resolve:

- `project_name`
- `implementation_artifacts`
- `planning_artifacts`

### Paths

- `epics_file` = `{planning_artifacts}/*epic*.md`
- `kanban_file` = `{implementation_artifacts}/kanban-plan.md`
- `status_file` = `{implementation_artifacts}/sprint-status.yaml`
- `metrics_file` = `{implementation_artifacts}/sprint-metrics.md`
- `output_file` = `{implementation_artifacts}/sprint-dashboard.html`
- `template_file` = `.github/i2a-skills/tdgs-aidlc-sprint-dashboard/templates/dashboard-template.html`

> **Self-contained:** The dashboard template bundles `js-yaml` 4.1.0 inline — no CDN or external network access required. It works in air-gapped and corporate-firewalled environments. The only requirement is serving via HTTP (e.g., `python3 -m http.server 8080`) so the YAML file can be fetched.

---

## PHASE 1: DISCOVER PROJECT STRUCTURE

### 1.1: Find Epics

Search for the epics document:
1. `{planning_artifacts}/epics.md`
2. `{planning_artifacts}/bmm-epics.md`
3. `{planning_artifacts}/*epic*.md`
4. `{planning_artifacts}/epics/index.md`

**If not found**, halt:
```
⛔ No epics file found. Run /bmad-create-epics-and-stories first.
```

### 1.2: Parse Epics

For each epic, extract:
- Epic number (sequential: 1, 2, 3, ...)
- Epic name/title
- Story count
- Story IDs with slugs
- ADE parallelism assignments (from parallelism maps if present)
- Whether it's on the critical path

### 1.3: Parse Kanban Plan (if exists)

If `{kanban_file}` exists, extract:
- Story complexity classifications (Trivial/Simple/Medium/Large/Complex)
- Story estimated hours from the velocity baseline T-shirt mapping
- Milestones with hour estimates
- Risks with likelihood/impact/status
- Critical path nodes
- Total estimated hours
- Velocity assumptions
- Team size (ADE count)

### 1.4: Parse Sprint Status (if exists)

If `{status_file}` exists:
- Count stories per status
- Determine which stories have UI components (for a11y N/A logic)

---

## PHASE 2: BUILD CONFIGURATION

### 2.1: Prompt User (if needed)

If kanban-plan.md does not exist or team size cannot be determined:

> How many ADEs will be working on this project? (default: 2)

### 2.2: Build JavaScript Constants

From the parsed data, construct these JavaScript objects:

**EPIC_META** — Object mapping epic number to `{ name, hours, assigned, critical }`:
```javascript
const EPIC_META = {
  1: { name: "Epic 1 Name", hours: 10.5, assigned: "Both", critical: true },
  // ...
};
```

**STORY_COMPLEXITY** — Object mapping story ID to complexity:
```javascript
const STORY_COMPLEXITY = {
  '1.1': 'Medium', '1.2': 'Simple', // ...
};
```

**STORY_HOURS** — Object mapping story ID to estimated total hours (dev + overhead, from the velocity baseline T-shirt mapping):
```javascript
const STORY_HOURS = {
  '1.1': 2.0, '1.2': 1.0, // ...
};
```

**MILESTONES** — Array of milestone objects (include `epics` array for status detection):
```javascript
const MILESTONES = [
  { label: "E1 Complete — ...", hour: "~9h", status: "pending", epics: [1] },
  { label: "E3 Complete — ...", hour: "~40h", status: "pending", epics: [3], highlight: true },
  // ...
];
```

**RISKS** — Array of risk objects:
```javascript
const RISKS = [
  { risk: "Description", likelihood: "Medium", impact: "High", status: "Not encountered" },
  // ...
];
```

**CRITICAL_PATH_NODES** — Array of critical path epics:
```javascript
const CRITICAL_PATH_NODES = [
  { label: "Epic 1", epic: 1 },
  // ...
];
```

**UI_STORIES** — Set of story IDs with UI output:
```javascript
const UI_STORIES = new Set(['3.1', '3.2', ...]);
```

### 2.3: Resolve Color Scheme

Check for a custom color scheme in this order:

1. `{project_root}/_bmad/_config/dashboard-colors.yaml` — project-level override
2. `.github/i2a-skills/tdgs-aidlc-sprint-dashboard/data/color-schemes/deloitte.yaml` — Deloitte brand
3. `.github/i2a-skills/tdgs-aidlc-sprint-dashboard/data/color-schemes/default.yaml` — built-in

**If a color scheme file is found** (priority 1 first, then 2, then 3):

1. Read the YAML file and extract the `colors` map
2. Build a CSS `:root` override block from the color keys:

```css
:root {
  --bg: #0a0f1a;
  --surface: #111827;
  /* ... each key: value from the YAML ... */
  --accent-glow: rgba(R,G,B,.15);  /* derived: parse --accent hex, apply 15% alpha */
  --green-dim: rgba(R,G,B,.15);    /* derived: parse --green hex, apply 15% alpha */
  --yellow-dim: rgba(R,G,B,.15);   /* derived: parse --yellow hex, apply 15% alpha */
  --orange-dim: rgba(R,G,B,.15);   /* derived: parse --orange hex, apply 15% alpha */
  --red-dim: rgba(R,G,B,.15);      /* derived: parse --red hex, apply 15% alpha */
  --blue-dim: rgba(R,G,B,.15);     /* derived: parse --blue hex, apply 15% alpha */
  --purple-dim: rgba(R,G,B,.15);   /* derived: parse --purple hex, apply 15% alpha */
}
```

Store the CSS block as `{color_overrides}`.

**If using the `default.yaml` scheme:** set `{color_overrides}` to an empty string (the template's built-in `:root` already has the default palette — no override needed).

**Deriving `-dim` variants:** Parse the hex color (e.g., `#86BC25`), convert to RGB, and wrap as `rgba(R,G,B,.15)`.

### 2.4: Determine Other Values

| Variable | Source | Default |
|----------|--------|---------|
| `PROJECT_TITLE` | See [Title Resolution](#project-title-resolution) below | "Sprint Dashboard" |
| `EPIC_COUNT` | Number of epics discovered | — |
| `TOTAL_HOURS` | Sum of EPIC_META hours or from kanban-plan | 0 |
| `TEAM_SIZE` | From kanban-plan or user input | 2 |
| `YAML_PATH` | `sprint-status.yaml` (relative to HTML location) | `sprint-status.yaml` |
| `METRICS_MD_PATH` | `sprint-metrics.md` (relative to HTML location) | `sprint-metrics.md` |

#### Project Title Resolution

Resolve `PROJECT_TITLE` using the following priority:

1. **User-provided title** — if the user passed a title argument to the generate command, use it as-is.
2. **Project branch slug** — detect the current branch in the docs repo:
   - If on a `project/ghi-{id}-{slug}` or `planning/ghi-{id}-{slug}` branch, extract `{slug}`, convert hyphens to spaces, and title-case it (e.g., `project/ghi-42-tabc-licensing-modernization` → `TABC Licensing Modernization`).
   - If on a `feature/ghi-{id}-{slug}` or `hotfix/ghi-{id}-{slug}` branch, same extraction logic.
3. **Config fallback** — use `project_name` from `_bmad/bmm/config.yaml` (e.g., `txgov-tabc` → `Txgov TABC`).
4. **Final fallback** — `"Sprint Dashboard"`.

---

## PHASE 3: GENERATE DASHBOARD

### 3.1: Load Template

Read the template from `{template_file}`.

### 3.2: Inject Configuration

Replace the placeholder constants in the template's `<script>` section.

> **Escaping rules:**
> - **HTML contexts** (`<title>`, `<h1>`): HTML-entity encode `<`, `>`, `&`, `"` in the substituted value.
> - **JS string contexts** (`'...'`): Use `JSON.stringify()` and strip the outer quotes, or escape `'`, `\`, and `</` sequences.
> - **JS object/array contexts**: Emit valid JSON via `JSON.stringify()` — this inherently escapes special characters.
> - Failure to escape can allow script injection in the generated HTML file.

| Template Placeholder | Replace With |
|---------------------|-------------|
| `{{COLOR_OVERRIDES}}` | CSS `:root { ... }` block from color scheme (empty string if using default) |
| `{{PROJECT_TITLE}}` | Project title string (HTML-escaped for `<title>`/`<h1>`, JS-escaped for string literals) |
| `{{BRANCH_NAME}}` | Current docs repo branch name (e.g., `planning/ghi-499-tabc-drupal-8-to-11-migration`). HTML-escaped. |
| `{{ISSUE_LINK}}` | HTML anchor tag linking to the GitHub issue, e.g., `<a href="https://github.com/{issues_repo}/issues/{id}" target="_blank" style="color:var(--accent);text-decoration:none;">#499</a>`. Use `issues.repository` from `i2a-config.yml`. If issue ID cannot be extracted from the branch, use `—`. |
| `{{YAML_PATH}}` | YAML path string (JS-escaped) |
| `{{METRICS_MD_PATH}}` | Metrics MD path string (JS-escaped) |
| `{{EPIC_COUNT}}` | Integer |
| `{{TOTAL_HOURS}}` | Integer |
| `{{TEAM_SIZE}}` | Integer |
| `{{EPIC_META}}` | Full JavaScript object literal |
| `{{STORY_COMPLEXITY}}` | Full JavaScript object literal |
| `{{STORY_HOURS}}` | Full JavaScript object literal (story ID → estimated hours) |
| `{{MILESTONES}}` | Full JavaScript array literal |
| `{{RISKS}}` | Full JavaScript array literal |
| `{{CRITICAL_PATH_NODES}}` | Full JavaScript array literal |
| `{{UI_STORIES}}` | Comma-separated quoted string list |
| `{{VELOCITY_STORIES_PER_DAY}}` | Float (e.g., 4.6) |
| `{{VELOCITY_PER_ADE}}` | Float (e.g., 2.3) |
| `{{DAILY_CAPACITY}}` | Integer hours |
| `{{AVG_HOURS_PER_STORY}}` | Float |
| `{{SEQUENTIAL_DAYS}}` | Integer |
| `{{PARALLEL_DAYS}}` | Integer |
| `{{TARGET_DATE}}` | Date string |
| `{{DEVOPS_ITEMS}}` | JavaScript array literal for DevOps checklist |

### 3.3: Write Output

Write the generated HTML to `{output_file}`.

### 3.4: Confirm

```
✅ Sprint Dashboard generated successfully!

   Location: {output_file}

   Data sources:
     • sprint-status.yaml — story statuses, timing, blockers
     • sprint-metrics.md — Harvey ball quality scores

   To view the dashboard:
     1. Open a terminal in your implementation-artifacts directory
     2. Start a local HTTP server:
        python3 -m http.server 8080
     3. Open in browser:
        http://localhost:8080/sprint-dashboard.html

   The dashboard auto-refreshes every 5 seconds.
   Run /tdgs-aidlc-generate-dashboard again after adding epics or changing project structure.
```

---

## REFRESH MODE

If `{output_file}` already exists, regenerate it with current data. This is useful after:
- Epics are added or modified
- Team size changes
- Kanban plan is regenerated with new estimates/risks

The dashboard itself auto-refreshes from the YAML/MD files — you only need to regenerate the HTML when the project structure changes (new epics, stories, milestones, risks).
````
