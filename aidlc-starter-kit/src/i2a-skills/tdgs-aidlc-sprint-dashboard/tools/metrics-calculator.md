# Metrics Calculator Tool

## Purpose
Reusable logic for calculating Harvey ball metrics across workflows.

## Usage
This tool is referenced by:
- update-sprint-metrics workflow (via /tdgs-aidlc-update-metrics)
- code-review workflow (final metrics)
- dev-story workflow (preliminary metrics)

## Calculation Functions

### calculateImplMetric(story)
```
if (totalTasks == 0) return 0
impl = floor(completedTasks / totalTasks * 4)
```

### calculateTestMetric(coverage)
```
if (line >= 80 && branch >= 70) return 4
if (line >= 70 || branch >= 60) return 3
if (line >= 50 || branch >= 40) return 2
if (line > 0 || branch > 0) return 1
return 0
```

### calculateReviewMetric(findings)
```
if (high == 0 && medium == 0) return 4
if (high == 0 && medium <= 2) return 3
if (high <= 1) return 2
return 1
```

### calculateDocsMetric(story)
```
sections = ['Dev Notes', 'File List', 'Change Log']
completeSections = countCompleteSections(story, sections)

if (completeSections == 3) return 4
if (completeSections == 2) return 3
if (completeSections == 1) return 2
if (hasAnyDocumentation) return 1
return 0
```

### calculateArchMetric(story, projectContext)
```
violations = checkArchitectureViolations(story.files)

if (violations == 0) return 4
if (violations <= 2 && allMinor) return 3
if (violations <= 5) return 2
if (violations > 5 && anyMajor) return 1
return 0
```

### calculateQAMetric(qualityScore)
```
if (score >= 90) return 4
if (score >= 75) return 3
if (score >= 60) return 2
if (score >= 40) return 1
return 0
```

### calculateA11yMetric(story, hasUIComponents)
```
// For backend-only stories — write 0 in sprint-status.yaml
// Dashboard uses the UI_STORIES set (built at generation time) to distinguish
// "0 = N/A (backend)" from "0 = not assessed (UI story)" and displays "N/A"
if (!hasUIComponents) return 0  // N/A — dashboard handles display via UI_STORIES

// For frontend stories
if (wcagAACompliant) return 4
if (minorIssues <= 2) return 3
if (moderateIssues <= 5) return 2
if (majorIssues > 0) return 1
return 0
```

## Integration Notes

### In dev-story workflow (preliminary metrics)
Calculate at review status:
- impl: Based on task completion
- test: Based on test results if available
- review: 0 (not yet reviewed)
- docs: Based on story file sections
- arch: Estimated from file patterns
- qa: 0 (pending)
- a11y: Estimated or 0

### In code-review workflow (final metrics)
Calculate at done status:
- impl: 4 (all tasks verified complete)
- test: Updated from coverage report
- review: Based on review findings
- docs: Final assessment
- arch: Final compliance check
- qa: = review metric (review is QA gate)
- a11y: Final assessment
