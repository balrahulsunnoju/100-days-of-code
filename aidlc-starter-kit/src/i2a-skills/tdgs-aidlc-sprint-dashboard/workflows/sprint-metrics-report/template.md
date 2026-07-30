# Sprint Metrics Report

**Generated:** {{generated_date}}
**Last Updated:** {{generated_date}}
**Project:** {{project_name}}

---

## Summary

| Metric | Value |
|--------|-------|
| Total Epics | {{total_epics}} |
| Total Stories | {{total_stories}} |
| Stories Complete | {{done_stories}} |
| Overall Progress | {{progress_percent}}% |
| Total Dev Time | {{total_duration}} |

---

## Epic Status

{{#each epics}}
### Epic {{number}}: {{name}}

- **Status:** {{status}}
- **Stories:** {{done_count}}/{{total_count}} complete
- **Progress:** {{progress_percent}}%
- **Total Time:** {{duration}}

{{/each}}

---

## Quality Metrics Overview

| Metric | Average | Min | Max |
|--------|---------|-----|-----|
| Implementation | {{avg_impl}} | {{min_impl}} | {{max_impl}} |
| Tests | {{avg_test}} | {{min_test}} | {{max_test}} |
| Code Review | {{avg_review}} | {{min_review}} | {{max_review}} |
| Documentation | {{avg_docs}} | {{min_docs}} | {{max_docs}} |
| Architecture | {{avg_arch}} | {{min_arch}} | {{max_arch}} |
| QA Gate | {{avg_qa}} | {{min_qa}} | {{max_qa}} |
| Accessibility | {{avg_a11y}} | {{min_a11y}} | {{max_a11y}} |

---

## Story Metrics Summary

| Story | Status | impl | test | review | docs | arch | qa | a11y | Composite |
|-------|--------|:----:|:----:|:------:|:----:|:----:|:--:|:----:|:---------:|
{{#each scored_stories}}
| **{{id}}** {{name}} | {{status}} | {{impl_symbol}} | {{test_symbol}} | {{review_symbol}} | {{docs_symbol}} | {{arch_symbol}} | {{qa_symbol}} | {{a11y_symbol}} | {{composite}} |
{{/each}}

---

## Stories Needing Attention

{{#each attention_stories}}
- **{{key}}**: {{reason}}
{{/each}}

---

### Quality Gaps

| Priority | Gap | Stories | Action |
|----------|-----|---------|--------|
{{#each quality_gaps}}
| **{{priority}}** | {{gap}} | {{stories}} | {{action}} |
{{/each}}

---

## Completed Stories

{{#each completed_stories}}
### {{key}}
- Duration: {{duration}}
- Metrics: impl={{impl}}, test={{test}}, review={{review}}, docs={{docs}}, arch={{arch}}, qa={{qa}}, a11y={{a11y}}
{{/each}}
