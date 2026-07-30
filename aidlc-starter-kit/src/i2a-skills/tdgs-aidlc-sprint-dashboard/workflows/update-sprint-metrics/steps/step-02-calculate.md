# Step 2: Calculate Metrics and Timing

## EXECUTION SEQUENCE

### 1. Generate Timestamp
Create ISO timestamp at the EXACT moment of file write (not workflow start).
- Use the system's current UTC time: YYYY-MM-DDTHH:MM:SSZ
- CRITICAL: Do NOT reuse a timestamp from earlier in the session or from a variable set at workflow start
- CRITICAL: Do NOT use the user's local time with a Z suffix — convert to UTC first
- Example: If user's local time is 10:39 AM EDT (UTC-4), the timestamp must be 2026-05-18T14:39:00Z

### 2. Apply Status-Specific Updates

#### For ready-for-dev:
```yaml
{story_key}:
  status: ready-for-dev
  story_file: {story_key}.md
  created: {timestamp}
```

#### For in-progress:
```yaml
{story_key}:
  status: in-progress
  # preserve: story_file, created
  started: {timestamp}
```

#### For review:
Calculate preliminary metrics:
```yaml
metrics:
  impl: {tasks_done / total_tasks * 4}
  test: {estimate from test results}
  review: 0  # Not yet reviewed
  docs: {estimate from story file}
  arch: {estimate from patterns}
  qa: 0  # Pending
  a11y: {estimate or 0 for backend}
```

#### For done:
Calculate final metrics:
```yaml
completed: {timestamp}
metrics:
  impl: 4  # All tasks complete
  test: {from coverage}
  review: {from review findings}
  docs: {from documentation}
  arch: {from compliance}
  qa: {from quality score}
  a11y: {from assessment}
```

### 3. Metrics Calculation Rules

#### impl (Implementation)
- floor(completed_tasks / total_tasks * 4)
- Always round DOWN (use floor, not round)

#### test (Tests)
- 4 = line ≥80% AND branch ≥70%
- 3 = line 70-79% OR branch 60-69%
- 2 = line 50-69% OR branch 40-59%
- 1 = line <50% OR branch <40%
- 0 = no test evidence

#### review (Code Review)
- 4 = Approved, no issues
- 3 = Approved, minor comments
- 2 = Changes requested
- 1 = Major issues
- 0 = Not reviewed

#### docs (Documentation)
- 4 = Complete (Dev Notes, File List, Change Log)
- 3 = Most sections complete
- 2 = Some sections missing
- 1 = Minimal documentation
- 0 = No documentation

#### arch (Architecture)
- 4 = Fully compliant with patterns
- 3 = Mostly compliant
- 2 = Partial compliance
- 1 = Major deviations
- 0 = Not following architecture

#### qa (QA Gate)
- 4 = quality_score ≥90
- 3 = quality_score 75-89
- 2 = quality_score 60-74
- 1 = quality_score 40-59
- 0 = quality_score <40

#### a11y (Accessibility)
- 4 = WCAG 2.1 AA compliant
- 3 = Minor a11y issues
- 2 = Moderate a11y issues
- 1 = Major a11y issues
- 0 = Not assessed / N/A (backend)
