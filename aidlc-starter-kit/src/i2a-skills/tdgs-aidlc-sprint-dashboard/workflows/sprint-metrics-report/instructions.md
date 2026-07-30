# Sprint Metrics Report Workflow

**Goal:** Generate a markdown summary report of sprint metrics from sprint-status.yaml.

---

## Configuration

Load config from `{project-root}/_bmad/bmm/config.yaml` and resolve:
- `project_name`
- `implementation_artifacts` path
- `sprint_status_path` = `{implementation_artifacts}/sprint-status.yaml`
- `output_file` = `{implementation_artifacts}/sprint-metrics-report.md`

---

## Step 1: Load sprint status data

- Load sprint-status.yaml from `{sprint_status_path}`
- Parse all epics and stories
- Calculate aggregate statistics:
  - Total epics
  - Total stories
  - Stories by status (done, review, in-progress, ready-for-dev, backlog)
  - Overall progress percentage

---

## Step 2: Calculate metrics summaries

- For each completed/in-progress story with metrics, extract Harvey ball scores
- Calculate per-metric statistics:
  - Average
  - Minimum
  - Maximum
- Identify stories needing attention (any metric below 3)
- Calculate total development time from completed stories (completed - started)

---

## Step 3: Generate report

- Load template from: `./template.md`
- The template uses `{{variable}}` and `{{#each list}}...{{/each}}` placeholders — these are **text substitution markers for the AI agent**, not a Handlebars engine. Replace each placeholder with the corresponding calculated value or repeated block inline.
- For `{{#each ...}}` blocks: repeat the enclosed lines once per item, substituting the item's fields. Remove the `{{#each}}` / `{{/each}}` markers from the output.
- Write the resulting markdown to: `{output_file}`
- Output: `✅ Sprint metrics report generated at {output_file}`
