---
mode: agent
description: "Generate a customized Knowledge Base documentation prompt by auto-detecting workspace features"
---

# Generate Knowledge Base Documentation

Generate a customized "document this project" prompt by reading configuration files and auto-detecting workspace features (Apigee proxies, common services).

## Pre-flight Check: Multi-Repository Workspace

> ⚠️ **CRITICAL**: The workspace root is NOT a git repository. Git repositories are located in subdirectories within the workspace.
>
> **DO NOT** run `git` commands at the workspace root level — they will fail.
>
> **ALWAYS** identify individual repository directories first, then run git commands within those directories.

## Workflow

### Phase 1: Load Configuration

1. **Read BMAD config** from `_bmad/bmm/config.yaml`:
   - Extract `project_name` → `{{project_name}}`
   - Extract `output_folder` → `{{docs_folder}}`
   - Extract `project_knowledge` → `{{kb_path}}`

2. **Read AIDLC config** from `.github/i2a-config.yml`:
   - Extract `worker_repos` keys → build `{{worker_repos_list}}` (comma-separated, human-readable)
   - Extract `common_repos` keys → build `{{common_repos_list}}` (comma-separated)
   - Check `kb_generation.apigee` for override (default: `auto`)
   - Check `kb_generation.apigee_folder` for custom folder name (default: `apigee-exports`)
   - Check `kb_generation.apigee_repos` for explicit proxy repo list

### Phase 2: Auto-Detect Workspace Features

#### Apigee Detection

Based on `kb_generation.apigee` setting (or `auto` if not set):

| Setting | Action |
|---------|--------|
| `auto` | Detect both modes, prefer git if both found |
| `git` | Force git-based detection only |
| `exports` | Force exports folder detection only |
| `false` | Skip Apigee section entirely |

**Git-based detection:**
- Scan workspace root for folders containing `apiproxy/` directory
- Look for repos matching pattern `*-proxy` or folders with Apigee structure
- If `kb_generation.apigee_repos` is set, use that list instead
- Set `{{apigee_mode}}` = `git`, populate `{{apigee_repos_list}}`

**Exports-based detection:**
- Check for `apigee-exports/` folder (or `kb_generation.apigee_folder` value)
- If found, list subdirectories as proxy names
- Set `{{apigee_mode}}` = `exports`, populate `{{apigee_folder}}`

**For both modes:**
- Scan detected sources to list proxy bundle names → `{{apigee_proxy_names}}`
- Set `{{include_apigee}}` = `true` if any proxies detected

#### Common Services Detection

- Check if `common_repos` in `i2a-config.yml` has any entries
- If non-empty: `{{include_common_services}}` = `true`
- Build `{{common_repos_list}}` from keys (e.g., "pacs-service, paymentintegration-service, notificationengine-service")

### Phase 3: Assemble Prompt

1. **Load template** from `src/templates/kb-generation-prompt.md` (or `.github/templates/kb-generation-prompt.md` in deployed workspace)

2. **Substitute variables:**

   | Variable | Source |
   |----------|--------|
   | `{{project_name}}` | BMAD config |
   | `{{worker_repos_list}}` | i2a-config worker_repos keys, formatted as "`repo1`, `repo2`, and `repo3`" |
   | `{{common_repos_list}}` | i2a-config common_repos keys, formatted similarly |
   | `{{docs_folder}}` | BMAD config output_folder |
   | `{{kb_path}}` | BMAD config project_knowledge |
   | `{{apigee_mode}}` | `git` or `exports` |
   | `{{apigee_mode_git}}` | boolean (true if mode is git) |
   | `{{apigee_repos_list}}` | Git mode: comma-separated proxy repo names |
   | `{{apigee_folder}}` | Exports mode: folder path |
   | `{{apigee_proxy_names}}` | Detected proxy bundle names |
   | `{{include_apigee}}` | boolean |
   | `{{include_common_services}}` | boolean |

3. **Process conditional blocks:**
   - `{{#if include_apigee}}...{{/if}}` - Include Apigee sections
   - `{{#if include_common_services}}...{{/if}}` - Include Common Services section
   - `{{#if apigee_mode_git}}...{{else}}...{{/if}}` - Git vs exports mode text

### Phase 4: Present and Invoke

1. **Display the assembled prompt** in a fenced code block for user review:

   ```
   ## Generated Knowledge Base Prompt
   
   The following prompt has been assembled based on your workspace configuration:
   
   **Detected Configuration:**
   - Project: {{project_name}}
   - Worker Repos: {{worker_repos_list}}
   - Common Services: {{common_repos_list}} (or "None detected")
   - Apigee Mode: {{apigee_mode}} (or "Not detected")
   - Apigee Proxies: {{apigee_proxy_names}} (or "N/A")
   - KB Output: {{kb_path}}
   
   **Assembled Prompt:**
   
   [Show the full assembled prompt]
   ```

2. **Ask user to confirm** or request modifications:
   - "Review the prompt above. Reply **'proceed'** to invoke BMAD Document Project, or describe any changes needed."

3. **On confirmation**, invoke the BMAD Document Project skill:
   - The phrase "document this project" at the beginning of the assembled prompt triggers the skill automatically
   - Present the full prompt to the BMAD skill

## Error Handling

| Error | Resolution |
|-------|------------|
| BMAD config not found | Ask user to run `/tdgs-aidlc-setup-workspace` first |
| i2a-config not found | Ask user to run `/tdgs-aidlc-setup-workspace` first |
| No worker_repos defined | Ask user to populate `worker_repos` in i2a-config.yml |
| Template file not found | Fall back to embedded template or error with path guidance |

## Example Output

For a workspace with:
- Project: `tx-ovra`
- Worker repos: `orderdetails-service`, `verificationletter-service`, `receipt-service`, `ovra-ui`
- Common repos: `pacs-service`, `paymentintegration-service`, `notificationengine-service`, `tcas-service`
- Apigee exports folder with proxies: `OVRA-REST-API-V1`, `OvraTransaction`, `OvraUtils`

The assembled prompt will include:
- All worker repos listed
- Common Services section with all 4 services
- Apigee section in exports mode listing all 3 proxies
- Properly numbered sections (a through i)
