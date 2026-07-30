# AIDLC Starter Kit

![Version](https://img.shields.io/badge/version-2.1.2-blue)

AI-Assisted Development Lifecycle (AIDLC) Starter Kit for Texas.gov Digital Government Services. This repository provides prompts, configurations, and guides for implementing AI-assisted development workflows using GitHub Copilot and BMAD methodology.

## What's in the Kit

The starter kit contains everything needed to stand up an AI-assisted development workflow in a multi-repository workspace:

| Component | Path | Purpose |
|-----------|------|---------|
| **Prompts** | `src/prompts/` | 33 Copilot prompt files (`/tdgs-aidlc-*`) covering setup, issue intake, spec creation, code generation, testing, PR, commit, course correction, and help workflows |
| **Custom Skills** | `src/i2a-skills/` | Eleven distributable skills (kanban planning, sprint dashboard, help, test data catalog, ops runbook, API test setup/generate, unit test setup/generate, functional test setup/generate) |
| **i2a-config template** | `src/i2a-config.yml` | Template for workspace configuration (issues repo, worker repos, common services) |
| **VS Code settings** | `src/.vscode/` | Recommended editor and MCP server configuration |
| **User Guides** | `doc/` | Role-specific workflow guides for EMs, ADEs, and test management |
| **ACE Docs** | `doc/contributing/` | ACE guide, prompt/skill catalog, AI agent project context |
| **Test Suite** | `test/` | Automated validation for prompt structure, cross-references, and content quality |

## Prerequisites

| Tool | Minimum Version | Install |
|------|-----------------|---------|
| **VS Code** | Latest | [code.visualstudio.com](https://code.visualstudio.com/) |
| **GitHub Copilot** | Agent mode required | VS Code extension |
| **Node.js** | v20+ | [nodejs.org](https://nodejs.org/) |
| **Python** | 3.10+ | [python.org](https://python.org/) |
| **uv** | Any | [docs.astral.sh/uv](https://docs.astral.sh/uv/) |
| **Git** | Any | Pre-installed on most systems |
| **GitHub CLI** | Any | [cli.github.com](https://cli.github.com/) |

> See [Setup Guide — Prerequisites](./doc/setup.md#prerequisites) for verification commands and additional role-specific requirements.

## Getting Started

Add this repository to your multi-repo workspace alongside your project's code repositories. The recommended approach is to **clone once to a central location** and **symlink** into each workspace — this avoids duplicate copies and lets you update all workspaces with a single `git pull`:

```bash
# One-time: clone to a central location
git clone https://github.com/<org>/tdgs-aidlc-starter-kit.git ~/Development/tools/tdgs-aidlc-starter-kit

# Per workspace: create a symlink
cd ~/Development/projects/<project-name>
ln -s ~/Development/tools/tdgs-aidlc-starter-kit tdgs-aidlc-starter-kit
```

Alternatively, you can clone directly into each workspace (simpler but requires updating each copy separately).

See [Step 5: Add AIDLC Starter Kit to Workspace](./doc/setup.md#step-5-add-aidlc-starter-kit-to-workspace) for full platform-specific instructions (Windows/macOS/Linux).

```
my-workspace/
├── tdgs-aidlc-starter-kit/      ← symlinked or cloned
├── my-project-ui/
├── my-project-service/
├── my-project-docs/
└── ...
```

Then follow the guide for your role:

- **Engineering Managers** — Start with the [EM Guide](./doc/em-guide.md) for workspace setup, knowledge base generation, project planning, and post-deployment workflows
- **Agentic Delivery Engineers** — Start with the [ADE Guide](./doc/ade-guide.md) for workspace setup, M&O feature/hotfix workflow, and project implementation
- **ACEs** — See the [Prompt/Skill Catalog](./doc/contributing/catalog.md) for the full dependency map and the [Contributing Guide](./doc/contributing/README.md) for development workflow

> **Lost?** Type `/tdgs-aidlc-help` in Agent Chat to see all available commands, get role-specific guidance, and find what to do next.

## Key Commands Reference

> The table below highlights the most-used commands. For the **complete list of all 33 prompts and 11 custom skills**, see [Prompt & Skill Reference](./doc/prompt-reference.md).

| Command | Who | Purpose |
|---------|-----|---------|
| `/tdgs-aidlc-quick-setup` | All | Install/upgrade BMAD and copy prompts |
| `/tdgs-aidlc-setup-workspace` | All | Full first-time workspace setup |
| `/tdgs-aidlc-initiate-issue` | ADE | Pick up a feature/hotfix/bug issue and create branches |
| `/tdgs-aidlc-commit` | All | Stage and commit with conventional commit messages |
| `/tdgs-aidlc-create-pull-request` | Both | Create a PR with structured description |
| `/tdgs-aidlc-initiate-project` | EM | Start a project from a GitHub issue (Full BMAD) |
| `/tdgs-aidlc-help` | All | See all commands, get role-specific guidance |

See the role-specific guides below for full workflow details.

## Documentation

| Document | Description |
|----------|-------------|
| [Engineering Manager Guide](./doc/em-guide.md) | Setup, knowledge base, project planning, and post-deployment guide |
| [Agentic Delivery Engineer Guide](./doc/ade-guide.md) | Setup, M&O workflow, and project implementation guide |
| [Prompt & Skill Reference](./doc/prompt-reference.md) | Complete command reference for all prompts and skills |
| [Test Management Guide](./doc/test-management.md) | Functional, unit, and API test management guide |
| [Contributing Guide](./doc/contributing/README.md) | Development, testing, and release process for ACEs |
| [Prompt/Skill Catalog](./doc/contributing/catalog.md) | Detailed catalog of all prompts, skills, and BMAD dependencies |
| [Changelog](./CHANGELOG.md) | Release notes and version history |

## Keeping Up to Date

When the starter kit is updated:

1. Pull the latest changes: `git pull` in the `tdgs-aidlc-starter-kit/` directory
2. Re-run quick setup: `/tdgs-aidlc-quick-setup`

This copies updated prompts and skills without overwriting your workspace configuration.

## Contributing

See [doc/contributing/README.md](./doc/contributing/README.md) for the full ACE guide covering development workflow, test suite, version management, and release process.

## Support

For issues and questions, please open a GitHub Issue or contact the I2A Team.

---

*Maintained by Texas.gov Digital Government Services - I2A Team*
