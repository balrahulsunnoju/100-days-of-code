# Step 3: Update Sprint Status File

## EXECUTION SEQUENCE

### 1. Build Updated Entry
Construct the full story object:
```yaml
{story_key}:
  status: {new_status}
  story_file: {story_file}
  created: {created_timestamp}
  started: {started_timestamp}      # if applicable
  completed: {completed_timestamp}  # if applicable
  metrics:                            # if applicable
    impl: {impl}
    test: {test}
    review: {review}
    docs: {docs}
    arch: {arch}
    qa: {qa}
    a11y: {a11y}
```

### 2. Update Epic Status
If this is the first story in an epic moving to in-progress:
- Update epic-N status from backlog to in-progress

### 2.5. Update Top-Level Timestamp
- Set `last_updated` at the root level to the current UTC time as ISO 8601
- CRITICAL: Generate this timestamp at the moment of writing, NOT from a cached value
- CRITICAL: Must be proper UTC — do NOT use local time with Z suffix
- This is the authoritative "last modified" time the dashboard reads
- Format: ISO 8601 with Z suffix — e.g. `2026-05-18T14:39:00Z`

### 3. Write File
- Preserve ALL comments (STATUS DEFINITIONS, TIMING FIELDS, METRICS)
- Preserve file structure
- Write updated YAML

### 4. Sync sprint-metrics.md

After updating `sprint-status.yaml`, also update `sprint-metrics.md` so the live dashboard reflects current metrics without requiring a full Kanban regeneration.

1. Read `sprint-metrics.md` from `{implementation_artifacts}/sprint-metrics.md`
2. Update the **Last Updated** timestamp to the same value written to `last_updated` in `sprint-status.yaml`
3. Find the `## Story Metrics Summary` table and update the row for `{story_key}`:
   - If the row exists: replace the status and all 7 metric scores, recalculate the composite
   - If the row does not exist: insert a new row before the `| Average |` row (or at the end if no average row)
   - Preserve all other rows unchanged
4. If the `### Quality Gaps` section exists, evaluate whether the updated story introduces or resolves a gap:
   - If any metric dropped to ≤1 for a non-backlog story, add or update a gap entry
   - If a previously gapped metric improved to ≥3, remove the gap entry
   - If no `### Quality Gaps` section exists, create one after the `## Quality Trends` section
5. Save `sprint-metrics.md`

**If `sprint-metrics.md` does not exist:** Skip this step silently — the file is created by `/tdgs-aidlc-project-kanban-planning` during initial planning. Metrics will be visible after the next Kanban regeneration.

### 5. Confirm Update
Output confirmation:
```
✅ Sprint status updated
   Story: {story_key}
   Status: {new_status}
   Timing: created={created}, started={started}, completed={completed}
   Metrics: impl={impl}, test={test}, review={review}, docs={docs}, arch={arch}, qa={qa}, a11y={a11y}
   sprint-metrics.md: {updated | skipped (file not found)}
```
