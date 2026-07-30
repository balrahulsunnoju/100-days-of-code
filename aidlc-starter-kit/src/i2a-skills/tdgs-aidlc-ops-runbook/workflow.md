# Ops Runbook Update Workflow — Orchestrator

**Goal:** Open an existing runbook (`.docx` or `.md`), identify sections affected by a release using the implementation plan version matrix, apply surgical edits preserving all original formatting, and generate verification artifacts.

**Approach:** intake → comprehend → scan release-scoped repos → plan → execute → verify. Never skip comprehension or scanning.

**Write scope:** ONLY the runbook file is modified. Source code, KB, configs, git — strictly read-only.

---

## HALT CONDITIONS (checked at every phase transition)

| Condition | Action |
|-----------|--------|
| `.docx` file missing, locked, or corrupt | HALT — report error, no edits |
| `.md` file missing or not readable | HALT — report error, no edits |
| `python-docx` not installed (`.docx` mode only) | HALT — instruct install |
| Implementation plan has no version matrix | HALT — cannot determine release scope |
| No repos from version matrix found in workspace | HALT — cannot scan code |
| Post-edit line count decreases (.md mode) | ABORT + restore from .bak |
| Knowledge base empty for affected topic | WARN — proceed with source code scan only; flag gaps with `[VERIFY: ...]` |
| Post-edit paragraph count drops >10% (`.docx` mode) | ABORT + restore from .bak |
| Any new paragraph has `left_indent` != its nearest sibling (`.docx` mode) | FIX before save |
| Any section-numbered paragraph uses style 'Normal' (`.docx` mode) | FIX to proper Heading style before save |

---

## Guardrails

| ID | Rule |
|----|------|
| G1 | Application-agnostic — discover from workspace |
| G2 | Discover-before-generate — read KB + code FIRST, exhaustively |
| G3 | No fabrication — unverifiable → `[VERIFY: ...]` |
| G4 | Format-match — clone adjacent paragraph properties (.docx) |
| G5 | Backup-first — `.bak` before ANY modification |
| G8 | Scope discipline — never modify unrelated sections |
| G9-G10 | python-docx ONLY for .docx — never pandoc |
| G11 | Idempotency — skip edits already present |
| G12 | Rollback on failure — any exception restores `.bak` |
| G15 | Operational depth — behavioral changes need full blocks |
| G17 | Filename date — rename suffix after save (.docx) |
| G19 | **Anti-hallucination** — every sentence traces to source |
| G20 | Spacing discipline — spacers between sections (.docx) |
| G21 | Anti-redundancy — grep before creating new sections |
| G22 | Historical preservation — never delete/overwrite descriptive prose. Version numbers, URLs, dates may be updated in-place. |
| G23 | TOC — NEVER set `w:updateFields`. Instruct user to right-click TOC → Update Field in Word. (.docx) |
| G24 | Metadata update — set `core_properties.last_modified_by` to current system user and `modified` to now() before save. (.docx) |
| G33 | **Release-scoped** — only edit sections for repos in the version matrix. Do not touch anything else. |
| G34 | **Read-only workspace** — ONLY the runbook file is written to. Never modify source code, KB, configs, or git state. |

---

## Phase 1 — Preflight & Intake

### Step 0: Mode Selection

If mode was already selected during prompt intake or via command argument (e.g., `/tdgs-aidlc-ops-runbook create`), skip to the appropriate workflow. Otherwise, ask the user:

> **What would you like to do?**
> 1. **Update** an existing runbook
> 2. **Create** a new runbook from scratch

- If **Create** → Switch to Create workflow: follow `./workflow-create.md` instead of this file.
- If **Update** → continue below.

### Step 0b: Collect Inputs

Ask the user for TWO things (if not already provided):

1. **Runbook path** — "Provide the path to your existing runbook file (`.docx` or `.md`)."
2. **Release source** — "Provide the path to the implementation plan `.md` file for this release. (Or list repos and release versions manually: `repo1=2.2.0, repo2=1.14.0`)"

Detect file format from extension:
- `.docx` → set `edit_mode = docx`
- `.md` → set `edit_mode = markdown`

### Step 0c: Environment Validation

```
1. rm -rf /tmp/runbook-work && mkdir -p /tmp/runbook-work
2. Verify runbook_path exists and matches expected extension (.docx or .md)
3. For .docx: Check for lock files (~$filename or .~lock.filename#) → HALT if found
4. Create backup IMMEDIATELY (G5 — before ANY other operation on the file):
   - .docx: shutil.copy2(runbook_path, f"{runbook_path}.bak")
   - .md:   cp runbook_path runbook_path.bak
5. For .docx: Verify python-docx installed → HALT if not
6. Check knowledge-base/ exists → WARN if missing or empty (source code scan still possible)
7. Locate docs-repo (*-docs*/ pattern)
```

**Resolve working variables:**

| Variable | How to resolve |
|----------|----------------|
| `{workspace_root}` | Parent directory of the docs-repo (the multi-repo workspace root) |
| `{docs_repo}` | Directory matching `*-docs*/` pattern in workspace |
| `runbook_path` | Provided by user |
| `edit_mode` | `docx` or `markdown` (from file extension) |

### Step 1: Parse Release Scope (Implementation Plan)

The implementation plan is the **single source of truth** for what this release contains.

**If user provided an implementation plan path:**

Parse the `## Release and Rollback Version Matrix` section. Extract:

```python
release_scope = []
# Expected table format:
# | Component | Deploy Version | Rollback Version |
# |-----------|----------------|------------------|
# | repo-name | 2.2.0-build    | 2.1.0            |

for row in version_matrix_rows:
    release_scope.append({
        'repo': row['Component'],
        'deploy_version': row['Deploy Version'],
        'rollback_version': row['Rollback Version'],
    })
```

**If user provided manual repo+version list:**

Parse from input: `repo1=2.2.0, repo2=1.14.0` → same `release_scope` structure.

**SCOPE GATE:** If `release_scope` is empty (no version matrix found, no manual input) → HALT: "Cannot determine release scope. Provide an implementation plan with a version matrix, or list repos and versions."

Display release scope to user for confirmation:

```
══════════════════════════════════════════════════════════════
RELEASE SCOPE (from implementation plan)
══════════════════════════════════════════════════════════════

  #  Repository                              Deploy Version      Rollback
  ─  ──────────────────────────────────────  ──────────────────  ────────
  1  {repo-1}                                {version}           {rollback}
  2  {repo-2}                                {version}           {rollback}
  ...

  Total repos in this release: {N}
══════════════════════════════════════════════════════════════

Proceed with this scope? (Y/n)
```

### Step 1b: Match Release Repos to Workspace

For each repo in `release_scope`, check if it exists in the workspace:

```python
workspace_repos = list_subdirectories(workspace_root)
matched_repos = []
unmatched_repos = []

for item in release_scope:
    # Match by name (may be partial — e.g., "tdgs-vic-ui" matches dir "tdgs-vic-ui/")
    found = find_matching_dir(workspace_repos, item['repo'])
    if found:
        matched_repos.append({'scope': item, 'path': found})
    else:
        unmatched_repos.append(item)
```

- If `unmatched_repos` is not empty → WARN: "These repos are in the release but not in your workspace: {list}. Their changes will be noted as `[VERIFY]` in the runbook."
- Proceed with `matched_repos` for code scanning.

Generate `version_label`: `{YYYY-MM}-{CHG-number}` (from implementation plan `Change Reference` field, or `{YYYY-MM}-release` if not found)

---

## Phase 2 — Document Comprehension (NEVER SKIP)

> **This is the most critical phase.** The quality of placement, style matching, and content relevance depends entirely on deep comprehension of the existing document.

### Step 2: Parse & Map Document

**If `edit_mode = markdown`:** skip to Step 2-MD below.

**If `edit_mode = docx`:**

```python
from docx import Document
import copy

doc = Document(runbook_path)
import shutil, os
assert os.path.exists(f"{runbook_path}.bak"), "HALT: .bak missing — Step 0 did not run"
```

**2a. Build Complete Section Map:**

```python
section_map = []
for i, para in enumerate(doc.paragraphs):
    if 'Heading' in para.style.name and para.text.strip():
        level = int(para.style.name.replace('Heading ', '')) if para.style.name.startswith('Heading ') else 0
        section_map.append({
            'index': i,
            'level': level,
            'style': para.style.name,
            'text': para.text.strip(),
            'font': para.runs[0].font.name if para.runs else None,
            'size': para.runs[0].font.size if para.runs else None,
        })
```

**2b. Identify Document Patterns:**

| Pattern | How to detect | Record |
|---------|---------------|--------|
| Heading style per level | Most common style name for Heading 1/2/3 | e.g., "Heading 2 = Open Sans 14pt" |
| Body paragraph indent | Mode of `left_indent` for Normal paragraphs | e.g., `indent=0` |
| Body paragraph spacing | Mode of `space_before`/`space_after` | e.g., `sp_b=None, sp_a=None` |
| Body font | Most common font in Normal runs | e.g., `Open Sans 11pt` |
| Bullet style | Style name + indent of bulleted items | e.g., `List Paragraph, indent=228600` |
| Section numbering format | e.g., "7.1.1", "9.8.6.1" | Record the highest number per level |
| Sub-section label pattern | How are labels formatted? Bold prefix? Colon? | e.g., "Description:", "Source Files:" |

```python
from collections import Counter
body_indents = []
body_fonts = []
for p in doc.paragraphs:
    if p.style.name == 'Normal' and p.text.strip():
        body_indents.append(p.paragraph_format.left_indent)
        if p.runs:
            body_fonts.append((p.runs[0].font.name, p.runs[0].font.size))

dominant_indent = Counter(body_indents).most_common(1)[0][0]
dominant_font = Counter(body_fonts).most_common(1)[0][0]
```

**2c. Identify Last Section Number** per parent — so new sections get the next sequential number.

**2d. Read Most Recent Additions** — last 2-3 sections added. These represent the current style standard.

**2e. Document Voice Analysis:**

Read 3-5 body paragraphs from the best-written section. Note:
- Sentence structure (imperative? passive? active?)
- Detail level (how many sentences per concept?)
- Jargon level (does it name classes? or describes behavior?)
- Label patterns (bold labels? colon-separated?)

**COMPREHENSION GATE:** Phase 2 is COMPLETE only when ALL of the following exist:
- [ ] Section map with every heading, its level, index, and style
- [ ] Dominant body paragraph format (indent, font, size)
- [ ] Dominant bullet format (style name, indent)
- [ ] Section numbering pattern (highest number per parent)
- [ ] Voice analysis (sentence structure, jargon level, label patterns)

If any is missing → do NOT proceed to Phase 3.

### Step 2-MD: Parse & Map Markdown Document

**If `edit_mode = markdown`:**

```python
import re

with open(runbook_path, 'r') as f:
    lines = f.readlines()

# Build section map from headings
section_map = []
heading_pattern = re.compile(r'^(#{1,6})\s+(.+)')
for i, line in enumerate(lines):
    match = heading_pattern.match(line)
    if match:
        level = len(match.group(1))
        text = match.group(2).strip()
        section_map.append({
            'line': i,
            'level': level,
            'text': text,
        })
```

**2-MD-a. Identify Document Patterns:**

| Pattern | How to detect | Record |
|---------|---------------|--------|
| Heading hierarchy | `#` count per section | e.g., "## = major section, ### = subsection" |
| List style | `-` vs `*` vs numbered | e.g., "uses - for bullets" |
| Table format | Aligned `|` columns | Note column widths |
| Code block style | Fenced (```) vs indented | e.g., "fenced with language tags" |
| Spacing | Blank lines between sections | e.g., "1 blank line between paragraphs, 2 before headings" |
| Bold/emphasis pattern | `**bold**` for labels? `*italic*` for notes? | Match existing patterns |

**2-MD-b. Voice Analysis:**

Read 3-5 body paragraphs from the best-written section. Note style, detail level, label patterns — same as docx.

**COMPREHENSION GATE (Markdown):** Phase 2-MD is COMPLETE only when:
- [ ] Section map with every heading, its level, and line number
- [ ] List style identified (bullet char, indentation)
- [ ] Spacing pattern identified
- [ ] Voice analysis (sentence structure, jargon level)

If any is missing → do NOT proceed to Phase 3.

---

## Phase 3 — Change Analysis & Placement

### Step 3: Understand What Changed

For each repo in `matched_repos`, scan its source code to understand what changed in the release version vs rollback version:

- WHAT services/components are affected (from `release_scope`)
- WHAT is the user-visible behavior change (from code + KB scan)
- WHAT error codes/endpoints/configs changed (from code scan)
- IS this a version bump, behavioral change, new integration, or config change?

**Scanning approach (per repo):**
1. Read controllers — identify endpoints, HTTP methods, request/response
2. Read service implementations — business logic, validation, external calls
3. Read configs — versions, properties, feature flags
4. Read KB docs relevant to that service — integration docs, business rules
5. Cross-reference: what in this code is NOT already in the runbook?

**Edit Classification (determines depth):**

| Type | Depth | Example |
|------|-------|---------|
| Version bump | Value replacement only | `2.8.2` → `2.10.0` |
| Config change | Before/after + impact | Env var, timeout, feature flag |
| Behavioral change | Full operational block | New error code, new validation |
| New integration | Full section | New external dependency |

### Step 3b: Placement Analysis (CRITICAL)

**Full-topic grep** — search ENTIRE document text for ALL mentions:
- Service names from the change
- Endpoint names
- Error codes
- Component names
- Related function names

**For `.docx`:**
```python
change_terms = ["<ServiceName>", "<ErrorCode>", "<feature keyword>", ...]
for term in change_terms:
    matches = [(i, p.text[:80]) for i, p in enumerate(doc.paragraphs) 
               if term.lower() in p.text.lower()]
    for idx, txt in matches:
        parent_heading = None
        for s in reversed(section_map):
            if s['index'] < idx:
                parent_heading = s['text']
                break
        print(f"  Found '{term}' at [{idx}] under section: {parent_heading}")
```

**For `.md`:**
```python
for term in change_terms:
    for i, line in enumerate(lines):
        if term.lower() in line.lower():
            parent_heading = None
            for s in reversed(section_map):
                if s['line'] < i:
                    parent_heading = s['text']
                    break
            print(f"  Found '{term}' at line {i} under section: {parent_heading}")
```

**PLACE-GATE-1:** After selecting an insertion point, read 5 paragraphs ABOVE and BELOW. Verify they discuss the SAME service/component as the new content. If the nearest heading above discusses a DIFFERENT service → WRONG PLACE.

**PLACE-GATE-2:** For behavioral changes with error codes — find the section that covers the SERVICE that throws the error.

**Decide: UPDATE vs CREATE:**
- Topic already exists in 1+ sections → UPDATE those sections (enrich, don't duplicate)
- Topic is genuinely new → CREATE new sub-section under the correct parent

---

## Phase 4 — Ground Truth & Evidence (RELEASE-SCOPED — NO EXCEPTIONS)

> **This phase is NON-NEGOTIABLE.** Every fact that will be written into the runbook MUST be verified from actual source code or KB docs. Scan ALL repos in `matched_repos` — do not sample, do not shortcut.

### Step 4: Knowledge Base Scan (MANDATORY — read ALL relevant docs)

Read ALL relevant KB documents for repos in release scope — not just the ones that seem related. Cast a wide net:
```
knowledge-base/shared/          → integration, deployment, architecture
knowledge-base/apigee/ (or api-gateway/)  → proxy catalog, endpoints
knowledge-base/repos/           → per-service docs
knowledge-base/business/        → business rules
knowledge-base/common-services/ → shared utilities
knowledge-base/api/             → API specifications
knowledge-base/project/         → project-level context
```

**Scan discipline:**
- Read the `master-index.md` or `reading-order.md` FIRST to understand what exists
- Then read EVERY document that could be relevant to the change
- If unsure whether a doc is relevant → read it anyway

### Step 4b: Source Code Scan (MANDATORY — read ALL release-scoped code)

For EACH repo in `matched_repos` (from the implementation plan version matrix), read:
1. **Controller** — endpoint paths, HTTP methods, request/response structure
2. **Service impl** — business logic, validation rules, conditional branches
3. **Constants** — error codes, messages, thresholds
4. **Exception handlers** — HTTP status codes, error responses
5. **Model/DTO** — field names, types, required/optional
6. **Config files** — versions, properties, feature flags
7. **UI components** — if change affects user-facing behavior, read the relevant React/JS components

**What to extract (business logic focus):**

| Look for in code | Extract for runbook |
|------------------|---------------------|
| `if/else` branches in service logic | What conditions lead to different outcomes |
| Validation rules (required fields, format checks) | What the system rejects and why |
| External service calls (HTTP clients, queues) | What downstream systems are involved |
| Error codes and messages | Exact codes ops will see in logs |
| Retry/timeout/fallback logic | How the system handles failures |
| Feature flags or conditional routing | What behavior changes based on config |

**Key principle:** Don't just note WHAT the code does — understand WHY. The "why" is the business logic.

### Step 4c: Evidence Table (HARD GATE — no entry = no write)

| Fact to be written | Source file/doc | Line/section | Release repo |
|--------------------|-----------------|--------------|--------------|
| Every assertion | Exact citation | Exact location | Which repo from version matrix |

**If a fact has no row in this table → it CANNOT appear in the runbook. Period.**
**If a fact cannot be traced to source code or KB → mark as `[VERIFY: specific guidance]`. Never invent.**

### Step 4d: Write Content in Plain Language (VOICE-GATE enforcement)

Translate code-level facts into operational language:

| Code-level fact | Runbook description |
|-----------------|---------------------|
| `PaymentFormWidget` renders vendor iframe | Payment card entry uses an embedded secure form |
| `validateRequiredFields()` in SubmitController | Backend validates all mandatory fields before saving |
| HTTP 400 with APP-ERR-0002 | System rejects the submission with error code APP-ERR-0002 |

**VOICE-GATE-1:** Description paragraphs NEVER name internal class names or framework versions. Those go in "Source Files:" sub-section only.

**VOICE-GATE-2:** Write as: what triggers → what the user/system does → what ops sees → what to check.

---

## Phase 5 — Edit Planning

### Step 5: Plan All Edits

**Step 5-PRE: Duplication Sweep (MANDATORY before planning any edit)**

For EACH change about to be planned, verify it's not already in the document:

**For `.docx`:**
```python
from docx import Document
doc = Document(runbook_path)
all_doc_text = ' '.join(p.text.lower() for p in doc.paragraphs)
```

**For `.md`:**
```python
with open(runbook_path, 'r') as f:
    all_doc_text = f.read().lower()
```

**Then (both modes):**
```python
for change in changes_to_process:
    identifiers = [
        change.get('error_code', ''),
        change.get('section_title', ''),
        change.get('endpoint', ''),
        change.get('service_name', ''),
    ]
    found = [ident for ident in identifiers if ident and ident.lower() in all_doc_text]
    
    if len(found) >= 2:
        change['action'] = 'skip'       # Already documented
    elif len(found) == 1:
        change['action'] = 'enrich'     # Partially documented — add details
    else:
        change['action'] = 'new'        # Not in runbook at all

changes_to_process = [c for c in changes_to_process if c['action'] != 'skip']
```

For each remaining change, build an edit plan:

```python
import json, os
os.makedirs("/tmp/runbook-work", exist_ok=True)

edits = []
edits.append({
    "edit_type": "insert_after",        # replace | insert_after | new_section
    "anchor_index": 817,                # paragraph index to insert after
    "style_source_index": 816,          # paragraph to clone formatting from
    "heading_style": "Heading 4",       # if new_section, the heading style
    "content": [
        {"type": "spacer"},
        {"type": "heading", "text": "{section-number} {Title}"},
        {"type": "spacer"},
        {"type": "paragraph", "text": "{Description text...}"},
        {"type": "spacer"},
        {"type": "paragraph", "bold_prefix": "Error Code: ", "body": "{APP-ERR-XXX}"},
    ],
    "verification": "grep for '{Title}' in section map",
    "source_evidence": "{source-code-file} (repo: {repo-name} v{version})"
})

with open("/tmp/runbook-work/edit-plan.json", "w") as f:
    json.dump(edits, f, indent=2)
```

**If `edit_mode = markdown`, edit plan uses a simpler schema:**

```python
# Markdown edit plan — simpler than .docx (no paragraph indices or style objects)
edits = []
edits.append({
    "edit_type": "append",              # append | replace_value
    "section_heading": "7.1 Service X", # heading text to find in section_map
    "idempotency_keys": ["error-code-123", "new-endpoint"],  # grep these first — skip if all found
    "content": """### 7.1.5 New Feature\n\nDescription text...\n\n**Error Code:** APP-ERR-123\n""",
    "source_evidence": "{source-code-file} (repo: {repo-name} v{version})"
})

with open("/tmp/runbook-work/edit-plan.json", "w") as f:
    json.dump(edits, f, indent=2)
```

**Anti-displacement rule (HIST-GATE):**
- **HIST-GATE-1:** NEVER use `run.text.replace()` on descriptive content (only on version numbers, URLs, dates). If content is a sentence/paragraph → APPEND new paragraph below, never overwrite.
- **HIST-GATE-2:** NEVER rename existing headings.
- **HIST-GATE-3:** After applying all edits, verify no section LOST content. For `.docx`: compare paragraph counts globally (10% threshold). For `.md`: verify all original lines still exist (version/URL/date value replacements exempt per MD-GATE-3).

---

## Phase 6 — Execute Edits (`.docx` Mode)

> **This phase applies ONLY when `edit_mode = docx`.** If `edit_mode = markdown`, skip to Phase 6b.

### Step 6: Generate & Run python-docx Script

**Core principle:** Every new paragraph INHERITS formatting from its nearest sibling. Never create from scratch.

```python
import json, copy, sys, shutil, re
from docx import Document
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Pt, Inches

with open("/tmp/runbook-work/edit-plan.json") as f:
    edits = json.load(f)

doc = Document(runbook_path)

def clone_paragraph_format(source_para, new_para_element):
    """Deep-copy paragraph properties (indent, spacing, alignment) from source."""
    source_pPr = source_para._element.find(qn('w:pPr'))
    if source_pPr is not None:
        new_para_element.insert(0, copy.deepcopy(source_pPr))

def clone_run_format(source_para, new_run_element):
    """Deep-copy run properties (font, size, bold) from source's first run."""
    if source_para.runs:
        source_rPr = source_para.runs[0]._element.find(qn('w:rPr'))
        if source_rPr is not None:
            new_run_element.insert(0, copy.deepcopy(source_rPr))

def make_paragraph(text, style_source_para, bold_prefix=None):
    """Create a new paragraph element cloning formatting from style_source_para."""
    new_p = OxmlElement('w:p')
    clone_paragraph_format(style_source_para, new_p)
    
    if bold_prefix:
        bold_r = OxmlElement('w:r')
        clone_run_format(style_source_para, bold_r)
        rPr = bold_r.find(qn('w:rPr'))
        if rPr is None:
            rPr = OxmlElement('w:rPr')
            bold_r.insert(0, rPr)
        b_elem = rPr.find(qn('w:b'))
        if b_elem is None:
            rPr.append(OxmlElement('w:b'))
        bold_t = OxmlElement('w:t')
        bold_t.text = bold_prefix
        bold_t.set(qn('xml:space'), 'preserve')
        bold_r.append(bold_t)
        new_p.append(bold_r)
        
        body_r = OxmlElement('w:r')
        clone_run_format(style_source_para, body_r)
        body_rPr = body_r.find(qn('w:rPr'))
        if body_rPr is not None:
            b_in_body = body_rPr.find(qn('w:b'))
            if b_in_body is not None:
                body_rPr.remove(b_in_body)
        body_t = OxmlElement('w:t')
        body_t.text = text
        body_t.set(qn('xml:space'), 'preserve')
        body_r.append(body_t)
        new_p.append(body_r)
    else:
        new_r = OxmlElement('w:r')
        clone_run_format(style_source_para, new_r)
        new_t = OxmlElement('w:t')
        new_t.text = text
        new_t.set(qn('xml:space'), 'preserve')
        new_r.append(new_t)
        new_p.append(new_r)
    
    return new_p

def make_spacer(style_source_para):
    """Create empty paragraph matching source's paragraph format."""
    spacer = OxmlElement('w:p')
    clone_paragraph_format(style_source_para, spacer)
    return spacer

def make_heading(text, heading_style_name, doc):
    """Create a heading paragraph with proper Word style."""
    temp_para = doc.add_paragraph(text, style=heading_style_name)
    doc.element.body.remove(temp_para._element)
    return temp_para._element

def insert_block_after(anchor_para, elements):
    """Insert a list of elements in order after anchor_para."""
    current = anchor_para._element
    for elem in elements:
        current.addnext(elem)
        current = elem

# Apply edits in REVERSE order (highest anchor_index first)
# to prevent index shifting from invalidating subsequent anchors.
applied_edits = []
for edit in sorted(edits, key=lambda e: e['anchor_index'], reverse=True):
    anchor = doc.paragraphs[edit['anchor_index']]
    style_src = doc.paragraphs[edit['style_source_index']]
    elements = []
    
    for item in edit['content']:
        if item['type'] == 'spacer':
            elements.append(make_spacer(style_src))
        elif item['type'] == 'heading':
            elements.append(make_heading(item['text'], edit.get('heading_style', 'Heading 3'), doc))
        elif item['type'] == 'paragraph':
            if item.get('bold_prefix'):
                elements.append(make_paragraph(item.get('body', ''), style_src, bold_prefix=item['bold_prefix']))
            else:
                elements.append(make_paragraph(item['text'], style_src))
    
    insert_block_after(anchor, elements)
    applied_edits.append({'anchor_index': edit['anchor_index'], 'count': len(elements)})
```

**STYLE-GATE-1:** Every `make_paragraph()` call REQUIRES a `style_source_para`. NEVER create bare elements.

**STYLE-GATE-2 (post-insertion validation):**
```python
orig_texts = set(p.text.strip() for p in Document(f"{runbook_path}.bak").paragraphs if p.text.strip())
for i, p in enumerate(doc.paragraphs):
    if p.text.strip() and p.text.strip() not in orig_texts:
        if i > 0:
            sibling = doc.paragraphs[i - 1]
            if (sibling.style.name == p.style.name and 
                sibling.paragraph_format.left_indent != p.paragraph_format.left_indent):
                p.paragraph_format.left_indent = sibling.paragraph_format.left_indent
```

**STYLE-GATE-3:** Section-numbered content (e.g., "9.7.3.5 Title") MUST use `make_heading()` with proper Heading style, NEVER `make_paragraph()` with bold font.

### Step 6 Pre-save Validation (MANDATORY)

```python
# 1. Paragraph count check
original = Document(f"{runbook_path}.bak")
orig_count = len([p for p in original.paragraphs if p.text.strip()])
new_count = len([p for p in doc.paragraphs if p.text.strip()])
if new_count < orig_count * 0.9:
    raise RuntimeError(f"ABORT: paragraph count dropped {orig_count} → {new_count}")

# 2. Table count preserved
if len(doc.tables) < len(original.tables):
    raise RuntimeError(f"ABORT: table count dropped")

# 3. Heading integrity — no section-numbered Normal paragraphs
import re
orig_texts = set(p.text.strip() for p in original.paragraphs if p.text.strip())
section_num_pattern = re.compile(r'^\d+\.\d+')
for i, p in enumerate(doc.paragraphs):
    if section_num_pattern.match(p.text.strip()) and p.style.name == 'Normal':
        if p.text.strip() not in orig_texts:
            depth = p.text.strip().split(' ')[0].count('.')
            heading_level = min(depth + 1, 4)
            target_style = f'Heading {heading_level}'
            if target_style in [s.name for s in doc.styles]:
                p.style = doc.styles[target_style]

# 4. No new content has indent=None when siblings have indent=0
for i, p in enumerate(doc.paragraphs):
    if p.text.strip() and p.text.strip() not in orig_texts:
        if i > 0:
            sibling = doc.paragraphs[i - 1]
            if (sibling.paragraph_format.left_indent is not None and 
                p.paragraph_format.left_indent is None and
                p.style.name == sibling.style.name):
                p.paragraph_format.left_indent = sibling.paragraph_format.left_indent
```

### Step 6 Post-save Validation

```python
# G23 — NEVER set w:updateFields
from docx.oxml.ns import qn
settings = doc.settings.element
update_fields = settings.find(qn('w:updateFields'))
if update_fields is not None:
    settings.remove(update_fields)

# G24 — Update metadata
import os
from datetime import datetime
current_user = os.environ.get('USER', os.environ.get('USERNAME', 'Unknown'))
doc.core_properties.last_modified_by = current_user
doc.core_properties.modified = datetime.now()

doc.save(runbook_path)

# Verify saved file is valid
try:
    verify = Document(runbook_path)
    _ = len(verify.paragraphs)
except Exception as e:
    shutil.copy2(f"{runbook_path}.bak", runbook_path)
    raise RuntimeError(f"CORRUPT: restored from .bak — {e}")
```

---

## Phase 6b — Execute Edits (Markdown Mode)

> **This phase applies ONLY when `edit_mode = markdown`.** If `edit_mode = docx`, skip to Phase 7.

### Step 6-MD: Surgical Markdown Edits

For `.md` runbooks, edits are simpler — direct text manipulation — but the same discipline applies:

**Principles:**
- **Preserve existing structure** — heading hierarchy, spacing, indentation must remain intact
- **Insert, never overwrite** — add new content below the correct section heading, never replace existing paragraphs
- **Match voice** — read surrounding paragraphs and match their style (bullet vs prose, detail level)
- **Idempotency** — grep for key terms before inserting. If content already exists, skip.

**Helper functions:**

```python
import re, shutil

def get_section_text(lines, heading_line):
    """Return all text from heading_line to the next same-or-higher-level heading."""
    heading_level = len(re.match(r'^(#+)', lines[heading_line]).group(1))
    section_lines = []
    for i in range(heading_line + 1, len(lines)):
        match = re.match(r'^(#+)\s', lines[i])
        if match and len(match.group(1)) <= heading_level:
            break
        section_lines.append(lines[i])
    return ''.join(section_lines)

def find_section_end(lines, heading_line):
    """Return the line index where the section ends (before next same/higher heading or EOF)."""
    heading_level = len(re.match(r'^(#+)', lines[heading_line]).group(1))
    for i in range(heading_line + 1, len(lines)):
        match = re.match(r'^(#+)\s', lines[i])
        if match and len(match.group(1)) <= heading_level:
            return i
    return len(lines)
```

**Edit process:**

```python
import json

# Load edit plan
with open("/tmp/runbook-work/edit-plan.json") as f:
    edits = json.load(f)

# Read entire file
with open(runbook_path, 'r') as f:
    lines = f.readlines()
original_lines = lines.copy()

# For each planned edit:
for edit in edits:
    # 1. Find the target section by heading text
    target_heading = edit['section_heading']
    heading_pattern = re.compile(r'^#{1,6}\s+' + re.escape(target_heading) + r'\s*$', re.IGNORECASE)
    
    anchor_line = None
    for i, line in enumerate(lines):
        if heading_pattern.match(line):
            anchor_line = i
            break
    
    if anchor_line is None:
        edit['status'] = 'SKIPPED — section not found'
        continue
    
    # 2. Idempotency check — is this content already present?
    search_terms = edit.get('idempotency_keys', [])
    section_text = get_section_text(lines, anchor_line)
    if all(term.lower() in section_text.lower() for term in search_terms if term):
        edit['status'] = 'SKIPPED — already present'
        continue
    
    # 3. Find insertion point (end of section, before next same-level heading)
    insert_at = find_section_end(lines, anchor_line)
    
    # 4. Apply edit based on type
    if edit.get('edit_type') == 'replace_value':
        # In-place value replacement (version numbers, URLs, dates only per G22/HIST-GATE-1)
        old_value = edit.get('old_value', '')
        new_value = edit.get('new_value', '')
        for i in range(anchor_line, insert_at):
            if old_value in lines[i]:
                lines[i] = lines[i].replace(old_value, new_value, 1)
                edit['status'] = 'APPLIED (in-place replace)'
                break
        else:
            edit['status'] = 'SKIPPED — old_value not found in section'
    else:
        # Default: append new content at end of section
        new_content = edit['content']  # Already formatted with correct heading levels
        new_lines = ('\n' + new_content + '\n').splitlines(keepends=True)
        for offset, nl in enumerate(new_lines):
            lines.insert(insert_at + offset, nl)
        edit['status'] = 'APPLIED'

# Save
with open(runbook_path, 'w') as f:
    f.writelines(lines)
```

**MARKDOWN GATES:**
- **MD-GATE-1:** After edit, line count must not DECREASE. (We only add, never remove.)
- **MD-GATE-2:** All existing headings must still be present in the same order.
- **MD-GATE-3:** Diff should show ONLY additions — no existing prose removed. **Exception:** version numbers, URLs, and dates may be updated in-place (these appear as removal+addition of the same line with only the value changed).

**Validation:**
```python
# Compare backup vs edited
import difflib
with open(f"{runbook_path}.bak", 'r') as f:
    old = f.readlines()
with open(runbook_path, 'r') as f:
    new = f.readlines()

# Verify no prose deletions (version/URL/date updates are exempt)
import re
version_date_pattern = re.compile(r'^[\-\+].*\b(\d+\.\d+\.\d+|https?://|\d{4}-\d{2}-\d{2}|\d{2}/\d{2}/\d{4})\b')
removed = []
for line in difflib.unified_diff(old, new, lineterm=''):
    if line.startswith('-') and not line.startswith('---'):
        if not version_date_pattern.match(line):
            removed.append(line)

if removed:
    # ABORT — non-exempt content was removed
    shutil.copy2(f"{runbook_path}.bak", runbook_path)
    raise RuntimeError(f"ABORT: markdown edit removed existing prose ({len(removed)} lines) — restored from .bak")
```

---

## Phase 7 — Verify & Report

### Step 7: Change Manifest

Print structured change log:
```
=== CHANGE MANIFEST ===
Release: {version_label} (from implementation plan)
Repos in scope: {N}

[1] Section: §{parent-section} {Service Name} (para {N})
    TYPE: New sub-section ({next-number})
    CONTENT: {Brief title} — full operational block
    SOURCE: {source-code-file} (repo: {repo-name} v{version})

[2] Section: §{parent-section} {Component Name} (para {N})
    TYPE: Paragraph enrichment (appended)
    CONTENT: {Brief title} (1 paragraph)
    SOURCE: {KB-file or source-code-file}
```

### Step 7b: Text Diff

**For `.docx`:**
```python
from docx import Document
import difflib

old_lines = [p.text for p in Document(f"{runbook_path}.bak").paragraphs if p.text.strip()]
new_lines = [p.text for p in Document(runbook_path).paragraphs if p.text.strip()]
diff = difflib.unified_diff(old_lines, new_lines, fromfile="BEFORE", tofile="AFTER", lineterm="")
with open("/tmp/runbook-work/changes.diff", "w") as f:
    f.write("\n".join(diff))
```

**For `.md`:**
```bash
diff "{runbook_path}.bak" "{runbook_path}" > /tmp/runbook-work/changes.diff
```

### Step 7c: Review Instructions

- **`.docx`:** Open Word → Review → Compare → compare `.bak` vs updated file.
- **`.md`:** Use VS Code diff view: right-click `.bak` → Select for Compare → right-click `.md` → Compare with Selected.

### Step 8: Rename Date Suffix (G17 — `.docx` only)

```python
import re, os
from datetime import date
today = date.today().strftime("%m%d%Y")
old_name = os.path.basename(runbook_path)
new_name = re.sub(r'[_ ]?(\d{8})\.docx$', f'_{today}.docx', old_name)
if new_name != old_name:
    new_path = os.path.join(os.path.dirname(runbook_path), new_name)
    os.rename(runbook_path, new_path)
    os.rename(f"{runbook_path}.bak", f"{new_path}.bak")
```

### Step 9: TOC Update Hint (`.docx` only)

If new Heading-styled paragraphs were added:
> "New sections inserted. Refresh TOC: Open in Word → right-click TOC → Update Field → Update Entire Table."

---

## Content Writing Standards

### Description Depth Requirements

Every behavioral change MUST have a full operational block — never a one-liner:

| Edit type | Minimum content |
|-----------|-----------------|
| Version bump | 1 sentence: what version, what it affects |
| Config change | Before/after values + what behavior changes + rollback steps |
| Behavioral change | Full block: trigger → action → outcome → error handling → ops check |
| New integration | Full section: what system, why, data flow, failure modes, monitoring |

**A meaningful description answers these for the ops engineer:**
1. **WHAT** changed — in plain language
2. **WHEN** it triggers — user action or system event
3. **WHAT the user sees** — observable result
4. **WHAT the system does** — backend processing
5. **WHAT can go wrong** — failure modes, error codes
6. **HOW to verify** — Splunk query, log pattern
7. **HOW to fix** — immediate remediation steps

### Description Paragraphs (VOICE-GATE enforced)

Write for an on-call engineer at 2am who:
- Has never read the implementation plan
- Does not know React, Java class names, or framework internals
- Needs to understand: WHAT happened, WHAT they'll see, WHAT to do

**Complete example:**

```
9.7.3.5 Required Field Validation

Description:
All mandatory fields on the order form are now validated before submission.
If a required field is blank — which can happen when the form refreshes and
clears a previously-entered value — the system rejects the order. The user
sees an inline error message prompting them to re-enter the missing value.

When Triggers:
User clicks "Submit Order" with one or more required fields empty.

System Behavior:
The backend validates all required fields. If any are missing, it returns
HTTP 400 with the appropriate error code. The order is NOT saved.

Error Code: APP-ERR-003
HTTP Status: 400 Bad Request
Splunk Query: index=<app-index> "APP-ERR-003"

User Impact:
User sees a validation error on the form. They can correct the field and
resubmit. No data is lost — the form retains all other entered values.

Ops Action:
If error volume spikes suddenly, check whether a recent deployment changed
field visibility logic.

Source Files:
• SubmitController.java — validation endpoint
• FormConfig.json — field visibility rules
```

### Section Structure

```
[spacer paragraph]
{Section Number} {Title}                          ← Heading style
[spacer paragraph]
{Sub-heading}:                                     ← Bold Normal or Heading 4
[spacer paragraph]
{Description paragraph — full sentences}           ← Normal, cloned from adjacent
[spacer paragraph]
{Label}:                                           ← Bold Normal
• {bullet item}                                    ← List Paragraph
• {bullet item}
[spacer paragraph]
```
