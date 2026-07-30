#!/usr/bin/env node

/**
 * Simulation Rules Engine
 *
 * Deterministic decision rules extracted from all 31 AIDLC prompt files.
 * Each function mirrors a specific decision branch documented in a prompt,
 * enabling behavioral testing without LLM execution.
 *
 * Rule categories:
 *   - Branch validation & naming
 *   - Config validation
 *   - Prerequisite checks
 *   - Input parsing & validation
 *   - File sensitivity & deletion detection
 *   - Stack detection & framework mapping
 *   - PR targeting & conventional commit formatting
 *   - OS detection & package manager selection
 *   - File-to-context-doc mapping
 *   - Validation report classification
 *   - Workflow chain prerequisites
 *   - Worker repo URL parsing
 *   - Initiate project (branch naming, KB validation)
 *   - Show available stories (status classification, dependencies)
 *   - Switch issue (clean tree check, branch resolution)
 */

'use strict';

// ═══════════════════════════════════════════════════════════════════════════
// Branch Validation (commit, create-pr, pre-check-pr)
// ═══════════════════════════════════════════════════════════════════════════

const PROTECTED_BRANCH_RE = /^(master|main|release\/.+|feature\/.+|hotfix\/.+)$/;
const DEV_BRANCH_RE = /^dev\/.+$/;
const COMMIT_ALLOWED_RE = /^(dev|planning|project)\/.+$/;

/**
 * Validate whether a branch is allowed for commits / PR pre-checks.
 * Mirrors: commit.prompt.md → Branch Validation, pre-check-pull-request → Branch Validation
 * Allowed: dev/*, planning/*, project/* (for sprint-status updates and course correction)
 */
function validateCommitBranch(branch) {
  if (!branch) return { action: 'BAIL', reason: 'No branch name provided' };
  if (PROTECTED_BRANCH_RE.test(branch)) {
    return { action: 'BAIL', reason: `Cannot commit directly to protected branch: ${branch}` };
  }
  if (!COMMIT_ALLOWED_RE.test(branch)) {
    return { action: 'BAIL', reason: `Branch "${branch}" does not match dev/*, planning/*, or project/* pattern` };
  }
  return { action: 'PROCEED' };
}

const PROJECT_BRANCH_ALLOWED_FILES_RE = /(?:^|\/)sprint-status\.yaml$|(?:^|\/)bug-brief-[^/]+\.md$/;

/**
 * Validate files staged for commit on a project/* branch.
 * Mirrors: commit.prompt.md → Project branch file restriction
 * Only sprint-status.yaml and bug-brief-*.md are allowed on project/* branches.
 */
function validateProjectBranchFiles(branch, stagedFiles) {
  if (!branch || !branch.startsWith('project/')) {
    return { action: 'PROCEED' };
  }
  if (!stagedFiles || stagedFiles.length === 0) {
    return { action: 'PROCEED' };
  }
  const disallowed = stagedFiles.filter((f) => !PROJECT_BRANCH_ALLOWED_FILES_RE.test(f));
  if (disallowed.length > 0) {
    return { action: 'BAIL', reason: 'Protected project branch — restricted file types only', disallowedFiles: disallowed };
  }
  return { action: 'PROCEED' };
}

/**
 * Validate whether a branch is allowed as a PR source.
 * Mirrors: create-pull-request.prompt.md → Branch Pattern Requirements
 * Allowed: dev/* and planning/* (for planning→project PRs)
 */
function validatePrSourceBranch(branch) {
  if (!branch) return { action: 'BAIL', reason: 'No branch name provided' };
  if (/^(master|main|release\/.+|feature\/.+|hotfix\/.+)$/.test(branch)) {
    return { action: 'BAIL', reason: `Cannot create PR from branch: ${branch}` };
  }
  if (!DEV_BRANCH_RE.test(branch) && !/^planning\/.+$/.test(branch)) {
    return { action: 'BAIL', reason: `Branch "${branch}" does not match dev/* or planning/* pattern` };
  }
  return { action: 'PROCEED' };
}

/**
 * Validate a PR target branch.
 * Mirrors: create-pull-request.prompt.md → Target Branch Validation
 */
function validatePrTargetBranch(target) {
  if (!target) return { action: 'BAIL', reason: 'No target branch provided' };
  if (/^(master|main|release\/.+)$/.test(target)) {
    return { action: 'BAIL', reason: `Invalid target branch: ${target}` };
  }
  if (/^(feature|hotfix|project)\/ghi-\d+-.+$/.test(target) || target === 'feature/initial-docs-setup') {
    return { action: 'PROCEED' };
  }
  return { action: 'BAIL', reason: `Target "${target}" is not a valid integration branch` };
}

// ═══════════════════════════════════════════════════════════════════════════
// Branch Name Builder (initiate-issue, prepare-repos)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Sanitize a GitHub username for use in branch names.
 * Removes hyphens to ensure unambiguous branch parsing.
 * Mirrors: initiate-issue.prompt.md → Get GitHub username → Sanitize for branch naming
 */
function sanitizeUsername(username) {
  if (!username) return username;
  return username.replace(/-/g, '').toLowerCase();
}

/**
 * Build integration + dev branch names from issue inputs.
 * Mirrors: initiate-issue.prompt.md → Setup → branch naming rules
 */
function buildBranchNames(type, issueId, slug, username) {
  if (type !== 'feature' && type !== 'hotfix' && type !== 'project' && type !== 'bug') {
    return { action: 'BAIL', reason: `Invalid issue type: ${type}` };
  }
  if (!issueId || !slug || !username) {
    return { action: 'BAIL', reason: 'Missing required branch name components' };
  }
  if (type === 'bug') {
    const dev = `dev/ghi-${issueId}-bug-${slug}-${username}`;
    if (dev.length > 100) {
      return { action: 'BAIL', reason: `Bug branch name exceeds 100-char limit (${dev.length} chars): ${dev}` };
    }
    return { action: 'PROCEED', integration: null, dev };
  }
  if (type === 'project') {
    const integration = `project/ghi-${issueId}-${slug}`;
    return { action: 'PROCEED', integration, dev: null };
  }
  const integration = `${type}/ghi-${issueId}-${slug}`;
  const dev = `dev/ghi-${issueId}-${slug}-${username}`;
  return { action: 'PROCEED', integration, dev };
}

/**
 * Parse issue ID and slug from a dev branch name.
 * Mirrors: commit.prompt.md → Refs Footer, create-pull-request → Target Resolution
 */
function parseDevBranch(branch) {
  // Check for initial-docs-setup pattern
  if (branch === 'dev/initial-docs-setup') {
    return { action: 'PROCEED', issueId: null, slug: 'initial-docs-setup', username: null, special: true };
  }
  // Bug branch patterns: dev/ghi-{id}-bug-{scope_prefix}{slug}-{username}
  const bugEpicStory = branch.match(/^dev\/ghi-(\d+)-bug-e(\d+)-s(\d+)-(.+)-([^-]+)$/);
  if (bugEpicStory) {
    return { action: 'PROCEED', issueId: bugEpicStory[1], slug: bugEpicStory[4], username: bugEpicStory[5], isBug: true, bugScope: 'story', epicNumber: bugEpicStory[2], storyNumber: bugEpicStory[3] };
  }
  const bugEpic = branch.match(/^dev\/ghi-(\d+)-bug-e(\d+)-(.+)-([^-]+)$/);
  if (bugEpic) {
    return { action: 'PROCEED', issueId: bugEpic[1], slug: bugEpic[3], username: bugEpic[4], isBug: true, bugScope: 'epic', epicNumber: bugEpic[2] };
  }
  const bugProject = branch.match(/^dev\/ghi-(\d+)-bug-(.+)-([^-]+)$/);
  if (bugProject) {
    return { action: 'PROCEED', issueId: bugProject[1], slug: bugProject[2], username: bugProject[3], isBug: true, bugScope: 'project' };
  }
  // Standard dev branch: dev/ghi-{id}-{slug}-{username}
  const m = branch.match(/^dev\/ghi-(\d+)-(.+)-([^-]+)$/);
  if (!m) {
    return { action: 'BAIL', reason: `Cannot parse dev branch: ${branch}` };
  }
  return { action: 'PROCEED', issueId: m[1], slug: m[2], username: m[3] };
}

/**
 * Resolve the PR target integration branch from a dev branch.
 * Mirrors: create-pull-request.prompt.md → Branch Pattern Requirements
 */
function resolvePrTarget(devBranch) {
  if (devBranch === 'dev/initial-docs-setup') {
    return { action: 'PROCEED', target: 'feature/initial-docs-setup' };
  }
  const parsed = parseDevBranch(devBranch);
  if (parsed.action === 'BAIL') return parsed;
  if (parsed.isBug) {
    // Bug branches require resolving {pid} from bug-brief (external data)
    return {
      action: 'PROCEED',
      requiresBugBrief: true,
      bugScope: parsed.bugScope,
      epicNumber: parsed.epicNumber || null,
    };
  }
  return {
    action: 'PROCEED',
    candidates: [
      `feature/ghi-${parsed.issueId}-${parsed.slug}`,
      `hotfix/ghi-${parsed.issueId}-${parsed.slug}`,
    ],
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Input Parsing & Validation
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Parse issue ID from user input (strip # prefix if present).
 * Mirrors: initiate-issue.prompt.md → Input
 */
function parseIssueId(input) {
  if (!input) return { action: 'BAIL', reason: 'No issue ID provided' };
  const cleaned = String(input).replace(/^#/, '');
  const id = parseInt(cleaned, 10);
  if (Number.isNaN(id) || id <= 0) {
    return { action: 'BAIL', reason: `Invalid issue ID: ${input}` };
  }
  return { action: 'PROCEED', issueId: String(id) };
}

/**
 * Validate issue type input.
 * Mirrors: initiate-issue.prompt.md → type validation
 */
function validateIssueType(type) {
  if (type === 'feature' || type === 'hotfix' || type === 'project' || type === 'bug') {
    return { action: 'PROCEED', type };
  }
  return { action: 'BAIL', reason: `Invalid issue type: ${type}` };
}

/**
 * Validate setup-workspace persona.
 * Mirrors: setup-workspace.prompt.md → persona parameter validation
 */
function validatePersona(persona) {
  if (persona === 'em' || persona === 'ade') {
    return { action: 'PROCEED', persona };
  }
  return { action: 'BAIL', reason: 'Persona parameter is required. Use "em" or "ade".' };
}

/**
 * Parse release version (strip release/ prefix if present).
 * Mirrors: post-deployment-docs-sync.prompt.md → Input Parsing
 */
function parseReleaseVersion(input) {
  if (!input) return { action: 'BAIL', reason: 'Release version is required' };
  const version = String(input).replace(/^release\//, '');
  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    return { action: 'BAIL', reason: `Invalid release version: ${input}` };
  }
  return { action: 'PROCEED', version };
}

// ═══════════════════════════════════════════════════════════════════════════
// Config Validation (initiate-issue, prepare-repos, install-hooks)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Validate i2a-config.yml for initiate-issue prerequisites.
 * Mirrors: initiate-issue.prompt.md → Load Configuration
 */
function validateInitiateIssueConfig(config) {
  const errors = [];
  if (!config.issues?.repository) {
    errors.push('issues.repository is empty or missing');
  }
  if (!config.worker_repos || Object.keys(config.worker_repos).length === 0) {
    errors.push('worker_repos is empty or all entries commented out');
  }
  if (errors.length) return { action: 'BAIL', reasons: errors };
  return { action: 'PROCEED' };
}

/**
 * Validate BMAD version from config.
 * Mirrors: quick-setup.prompt.md, setup-workspace.prompt.md → BMAD version
 */
function validateBmadVersion(config) {
  const version = config.versions?.bmad;
  if (!version) return { action: 'BAIL', reason: 'BMAD version not configured in i2a-config.yml' };
  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    return { action: 'BAIL', reason: `Invalid BMAD semver: ${version}` };
  }
  return { action: 'PROCEED', version };
}

/**
 * Compare two semver strings. Returns -1 (a < b), 0 (equal), 1 (a > b),
 * or NaN if either string is unparseable.
 */
function compareSemver(a, b) {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  if (!pa || !pb) return NaN;
  if (pa.major !== pb.major) return pa.major < pb.major ? -1 : 1;
  if (pa.minor !== pb.minor) return pa.minor < pb.minor ? -1 : 1;
  if (pa.patch !== pb.patch) return pa.patch < pb.patch ? -1 : 1;
  return 0;
}

/**
 * Determine BMAD install action based on manifest vs config.
 * Mirrors: quick-setup.prompt.md → BMAD Install/Skip/Upgrade/Downgrade Logic
 *
 * Uses semver comparison so that v-prefixed or otherwise decorated version
 * strings (e.g. "v6.3.0" vs "6.3.0") are correctly recognized as equal.
 */
function determineBmadAction(manifestVersion, configVersion) {
  if (!manifestVersion) return 'install';
  const cmp = compareSemver(manifestVersion, configVersion);
  if (cmp === 0) return 'skip';
  if (cmp > 0) return 'downgrade';
  return 'update';
}

// ═══════════════════════════════════════════════════════════════════════════
// Prerequisite Checks (quick-setup, setup-workspace)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Parse a version string into { major, minor, patch }.
 */
function parseVersion(versionStr) {
  if (!versionStr) return null;
  const m = String(versionStr).match(/(\d+)\.(\d+)\.(\d+)/);
  return m ? { major: +m[1], minor: +m[2], patch: +m[3] } : null;
}

/**
 * Run prerequisite checks for quick-setup and setup-workspace.
 * Mirrors: quick-setup.prompt.md → Prerequisite Check,
 *          setup-workspace.prompt.md → Prerequisite Check
 */
function checkPrerequisites(versions, { requireGit = false, requireGh = false } = {}) {
  const results = [];

  // Node.js ≥ 20
  const node = parseVersion(versions.node);
  if (!node) {
    results.push({ tool: 'Node.js', status: 'FAIL', reason: 'Not found' });
  } else if (node.major < 20) {
    results.push({ tool: 'Node.js', status: 'FAIL', reason: `v${versions.node} < v20.0.0` });
  } else {
    results.push({ tool: 'Node.js', status: 'PASS', version: versions.node });
  }

  // Python ≥ 3.10
  const py = parseVersion(versions.python);
  if (!py) {
    results.push({ tool: 'Python', status: 'FAIL', reason: 'Not found' });
  } else if (py.major < 3 || (py.major === 3 && py.minor < 10)) {
    results.push({ tool: 'Python', status: 'FAIL', reason: `${versions.python} < 3.10` });
  } else {
    results.push({ tool: 'Python', status: 'PASS', version: versions.python });
  }

  // uv — any version
  if (!versions.uv) {
    results.push({ tool: 'uv', status: 'FAIL', reason: 'Not found' });
  } else {
    results.push({ tool: 'uv', status: 'PASS', version: versions.uv });
  }

  // Optional: git (setup-workspace)
  if (requireGit) {
    if (!versions.git) {
      results.push({ tool: 'git', status: 'FAIL', reason: 'Not found' });
    } else {
      results.push({ tool: 'git', status: 'PASS', version: versions.git });
    }
  }

  // Optional: gh CLI (setup-workspace)
  if (requireGh) {
    if (!versions.gh) {
      results.push({ tool: 'gh', status: 'FAIL', reason: 'Not found' });
    } else {
      results.push({ tool: 'gh', status: 'PASS', version: versions.gh });
    }
  }

  const allPass = results.every((r) => r.status === 'PASS');
  return { action: allPass ? 'PROCEED' : 'BAIL', results };
}

// ═══════════════════════════════════════════════════════════════════════════
// File Sensitivity & Deletion Detection (commit)
// ═══════════════════════════════════════════════════════════════════════════

const SENSITIVE_PATTERNS = [
  { pattern: /\.env(\.|$)/i, category: 'Environment file' },
  { pattern: /\.env\..+$/i, category: 'Environment file' },
  { pattern: /\.local$/i, category: 'Local config' },
  { pattern: /\.pem$/i, category: 'Certificate' },
  { pattern: /\.key$/i, category: 'Private key' },
  { pattern: /\.p12$/i, category: 'Certificate store' },
  { pattern: /credentials/i, category: 'Credentials file' },
  { pattern: /node_modules\//i, category: 'Dependencies' },
  { pattern: /venv\//i, category: 'Virtual environment' },
  { pattern: /__pycache__\//i, category: 'Python cache' },
  { pattern: /\.venv\//i, category: 'Virtual environment' },
  { pattern: /dist\//i, category: 'Build artifact' },
  { pattern: /build\//i, category: 'Build artifact' },
  { pattern: /\.pyc$/i, category: 'Compiled Python' },
  { pattern: /\.class$/i, category: 'Compiled Java' },
  { pattern: /\.DS_Store$/i, category: 'OS file' },
  { pattern: /Thumbs\.db$/i, category: 'OS file' },
  { pattern: /desktop\.ini$/i, category: 'OS file' },
  { pattern: /\.(log|tmp|swp)$/i, category: 'Temporary file' },
  { pattern: /~$/i, category: 'Backup file' },
];

/**
 * Detect sensitive files that should not be committed.
 * Mirrors: commit.prompt.md → Security & Sensitivity Checks
 */
function detectSensitiveFiles(files) {
  const flagged = [];
  for (const file of files) {
    for (const { pattern, category } of SENSITIVE_PATTERNS) {
      if (pattern.test(file)) {
        flagged.push({ file, category });
        break;
      }
    }
  }
  return { hasSensitive: flagged.length > 0, flagged };
}

/**
 * Detect deleted files from git status --porcelain output.
 * Mirrors: commit.prompt.md → File Deletion Check
 */
function detectDeletions(gitStatusLines) {
  return gitStatusLines
    .filter((line) => /^\s*D\s/.test(line))
    .map((line) => line.replace(/^\s*D\s+/, '').trim());
}

// ═══════════════════════════════════════════════════════════════════════════
// OS Detection & Package Manager Selection (install-hooks)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Detect OS type from uname -s output.
 * Mirrors: install-hooks.prompt.md → OS Detection
 */
function detectOS(unameOutput) {
  if (!unameOutput) return { action: 'BAIL', reason: 'No OS detected' };
  const os = String(unameOutput).trim();
  if (os === 'Darwin') return { action: 'PROCEED', osType: 'macos' };
  if (os === 'Linux') return { action: 'PROCEED', osType: 'linux' };
  if (/^(MINGW|MSYS|CYGWIN)/i.test(os)) return { action: 'PROCEED', osType: 'windows' };
  return { action: 'BAIL', reason: `Unsupported OS: ${os}` };
}

/**
 * Select package manager by priority.
 * Mirrors: install-hooks.prompt.md → Package Manager Selection
 */
function selectPackageManager(available) {
  const priority = ['brew', 'pip3', 'pip', 'choco', 'winget'];
  for (const pm of priority) {
    if (available.includes(pm)) return { action: 'PROCEED', packageManager: pm };
  }
  return { action: 'BAIL', reason: 'No supported package manager found' };
}

/**
 * Map package manager to install commands.
 * Mirrors: install-hooks.prompt.md → Tool Install Mapping
 */
function getInstallCommands(packageManager) {
  const map = {
    brew: { precommit: 'brew install pre-commit', gitleaks: 'brew install gitleaks' },
    pip3: { precommit: 'pip3 install pre-commit', gitleaks: 'binary-fallback' },
    pip: { precommit: 'pip install pre-commit', gitleaks: 'binary-fallback' },
    choco: { precommit: 'choco install pre-commit -y', gitleaks: 'choco install gitleaks -y' },
    winget: { precommit: null, gitleaks: 'winget install gitleaks' },
  };
  return map[packageManager] || null;
}

/**
 * Build gitleaks binary download URL for fallback installs.
 * Mirrors: install-hooks.prompt.md → Gitleaks Binary Fallback
 */
function buildGitleaksFallbackUrl(osType, arch) {
  const GITLEAKS_VERSION = '8.22.1';
  const osMap = { macos: 'darwin', linux: 'linux', windows: 'windows' };
  const archMap = { x86_64: 'x64', aarch64: 'arm64', arm64: 'arm64' };
  const gOS = osMap[osType];
  const gArch = archMap[arch];
  if (!gOS || !gArch) return null;
  return `https://github.com/gitleaks/gitleaks/releases/download/v${GITLEAKS_VERSION}/gitleaks_${GITLEAKS_VERSION}_${gOS}_${gArch}.tar.gz`;
}

// ═══════════════════════════════════════════════════════════════════════════
// Stack Detection (setup-unit-tests, setup-api-tests, setup-functional-tests)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Detect tech stack from project indicators.
 * Mirrors: setup-unit-tests → Stack Detection Rules,
 *          setup-api-tests → Backend Service Detection
 */
function detectStack(indicators) {
  // indicators: { hasPomXml, hasBuildGradle, packageJsonDeps, hasRequirementsTxt,
  //               hasPyprojectToml, hasCsproj, hasTemplateYaml, hasServerlessYml }
  if (indicators.hasPomXml) return { stack: 'java-spring', framework: 'JUnit 5 + Mockito', coverage: 'JaCoCo' };
  if (indicators.hasBuildGradle) return { stack: 'java-spring-gradle', framework: 'JUnit 5 + Mockito', coverage: 'JaCoCo' };
  if (indicators.hasCsproj) return { stack: 'dotnet', framework: 'xUnit', coverage: 'Coverlet' };
  if (indicators.hasTemplateYaml) return { stack: 'lambda-sam', framework: 'Jest/pytest', coverage: 'stack-specific' };
  if (indicators.hasServerlessYml) return { stack: 'lambda-serverless', framework: 'Jest/pytest', coverage: 'stack-specific' };

  const deps = indicators.packageJsonDeps || {};
  if (deps.react) return { stack: 'react', framework: 'Jest + RTL', coverage: 'Istanbul' };
  if (deps.angular || deps['@angular/core']) return { stack: 'angular', framework: 'Karma + Jasmine', coverage: 'Istanbul' };
  if (deps.vue) return { stack: 'vue', framework: 'Vitest', coverage: 'Vitest' };
  if (deps.express || deps.fastify || deps.nestjs || deps['@nestjs/core'] || deps.koa) {
    return { stack: 'node', framework: 'Jest', coverage: 'Jest' };
  }
  if (deps.next) return { stack: 'nextjs', framework: 'Jest + RTL', coverage: 'Istanbul' };
  if (deps.nuxt) return { stack: 'nuxt', framework: 'Vitest', coverage: 'Vitest' };
  if (deps.svelte) return { stack: 'svelte', framework: 'Vitest', coverage: 'Vitest' };

  if (indicators.hasRequirementsTxt || indicators.hasPyprojectToml) {
    return { stack: 'python', framework: 'pytest', coverage: 'pytest-cov' };
  }

  return null;
}

/**
 * Detect if a package.json indicates a UI/frontend repository.
 * Mirrors: setup-functional-tests.prompt.md → UI Repo Detection
 */
function isUiRepo(packageJsonDeps) {
  const uiIndicators = ['react', 'angular', '@angular/core', 'vue', 'next', 'nuxt', 'svelte'];
  return uiIndicators.some((dep) => packageJsonDeps[dep]);
}

/**
 * Determine React Testing Library version from React version.
 * Mirrors: setup-unit-tests.prompt.md → React Version Compatibility
 */
function reactTestingLibraryVersion(reactVersion) {
  const v = parseVersion(reactVersion);
  if (!v) return null;
  return v.major >= 18 ? '^14' : '^11';
}

/**
 * Detect default port for a given stack.
 * Mirrors: setup-api-tests.prompt.md → Port Auto-Detection
 */
function defaultPort(stack) {
  const ports = {
    'java-spring': 8080,
    'java-spring-gradle': 8080,
    node: 8080,
    'python-flask': 5000,
    'python-fastapi': 8000,
    dotnet: 5000,
    'lambda-sam': 3000,
  };
  return ports[stack] || 8080;
}

// ═══════════════════════════════════════════════════════════════════════════
// Exclusion Patterns (all test setup/generate prompts)
// ═══════════════════════════════════════════════════════════════════════════

const SCAN_EXCLUSIONS = [
  'node_modules',
  '_bmad',
  '_bmad-output',
  'tdgs-aidlc-starter-kit',
  '.github',
  'scripts',
  'apigee-exports',
];

/**
 * Check if a path should be excluded from scanning.
 * Mirrors: setup-unit-tests, setup-api-tests, setup-functional-tests → Exclusion Patterns
 */
function shouldExcludeFromScan(dirName) {
  const lower = dirName.toLowerCase();
  return SCAN_EXCLUSIONS.some((excl) => lower === excl || lower.startsWith(excl)) || lower.endsWith('-docs');
}

// ═══════════════════════════════════════════════════════════════════════════
// Coverage Target (all test prompts)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Resolve coverage target with default.
 * Mirrors: setup-unit-tests, setup-api-tests, setup-functional-tests → default 80%
 */
function resolveCoverageTarget(input) {
  if (input === undefined || input === null || input === '') return 80;
  const val = parseInt(String(input), 10);
  if (Number.isNaN(val) || val < 0 || val > 100) return 80;
  return val;
}

/**
 * Convert coverage % to JaCoCo minimum ratio.
 * Mirrors: setup-unit-tests.prompt.md → JaCoCo Coverage Rule
 */
function jacocoMinimum(coveragePercent) {
  return (coveragePercent / 100).toFixed(2);
}

// ═══════════════════════════════════════════════════════════════════════════
// Conventional Commit & PR Formatting (commit, create-pull-request)
// ═══════════════════════════════════════════════════════════════════════════

const COMMIT_TYPES = ['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'build', 'ci', 'chore'];

/**
 * Validate a conventional commit type.
 * Mirrors: commit.prompt.md → Commit Types
 */
function isValidCommitType(type) {
  return COMMIT_TYPES.includes(type);
}

/**
 * Derive PR commit type from integration branch prefix.
 * Mirrors: create-pull-request.prompt.md → PR Title Rules
 */
function prCommitType(integrationBranch) {
  if (integrationBranch.startsWith('feature/')) return 'feat';
  if (integrationBranch.startsWith('hotfix/')) return 'fix';
  return 'feat'; // default
}

/**
 * Build Refs footer for commit message.
 * Mirrors: commit.prompt.md → Refs Footer Resolution
 */
function buildRefsFooter(issueId, issuesRepository) {
  if (!issueId) return null;
  if (issuesRepository) return `Refs: ${issuesRepository}#${issueId}`;
  return `Refs: #${issueId}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// Worker Repo URL Parsing (setup-workspace)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Parse a git remote URL into org/repo config format.
 * Mirrors: setup-workspace.prompt.md → Worker Repo URL Formats
 */
function parseGitRemoteUrl(url) {
  // GitHub HTTPS: https://github.com/{org}/{repo}.git
  let m = url.match(/https:\/\/github\.com\/([^/]+)\/([^/.]+?)(?:\.git)?$/);
  if (m) return { provider: 'github', format: `${m[1]}/${m[2]}` };

  // GitHub SSH: git@github.com:{org}/{repo}.git
  m = url.match(/git@github\.com:([^/]+)\/([^/.]+?)(?:\.git)?$/);
  if (m) return { provider: 'github', format: `${m[1]}/${m[2]}` };

  // TX Bitbucket HTTPS: https://txgscmp.ad.portal.texas.gov/scm/{project}/{repo}.git
  m = url.match(/https:\/\/txgscmp\.ad\.portal\.texas\.gov\/scm\/([^/]+)\/([^/.]+?)(?:\.git)?$/);
  if (m) {
    return {
      provider: 'bitbucket',
      format: `https://txgscmp.ad.portal.texas.gov/projects/${m[1].toUpperCase()}/repos/${m[2]}/browse`,
    };
  }

  // TX Bitbucket SSH: ssh://git@txgscmp.ad.portal.texas.gov/{project}/{repo}.git
  m = url.match(/ssh:\/\/git@txgscmp\.ad\.portal\.texas\.gov\/([^/]+)\/([^/.]+?)(?:\.git)?$/);
  if (m) {
    return {
      provider: 'bitbucket',
      format: `https://txgscmp.ad.portal.texas.gov/projects/${m[1].toUpperCase()}/repos/${m[2]}/browse`,
    };
  }

  return null;
}

/**
 * Derive service key from repo name by stripping project prefix.
 * Mirrors: setup-workspace.prompt.md → Service Key from repo name
 */
function deriveServiceKey(repoName, projectPrefix) {
  if (!projectPrefix || !repoName.startsWith(projectPrefix + '-')) return repoName;
  return repoName.slice(projectPrefix.length + 1);
}

// ═══════════════════════════════════════════════════════════════════════════
// File-to-Context-Doc Mapping (update-context-docs)
// ═══════════════════════════════════════════════════════════════════════════

const FILE_DOC_MAPPINGS = [
  { pattern: /\/(model|dto|entity)\/.*\.java$/i, doc: 'shared/data-models.md' },
  { pattern: /(Entity|Repository|DAO)\.java$/i, doc: 'shared/database-schema.md' },
  { pattern: /\/(controller|resource)\/.*\.java$/i, docs: ['api/{service}-openapi.yaml', '{service}/architecture.md'] },
  { pattern: /\/service\/.*\.java$/i, doc: '{service}/architecture.md' },
  { pattern: /\/components\/.*\.(jsx|tsx|js)$/i, doc: '{ui}/ui-components.md' },
  { pattern: /\/pages\/.*\.(jsx|tsx|js)$/i, doc: '{ui}/architecture.md' },
  { pattern: /application\.(properties|yml)$/i, doc: 'shared/deployment-configuration.md' },
  { pattern: /(pom\.xml|package\.json)$/i, doc: 'shared/technology-stack.md' },
  { pattern: /\/(integration|client)\/.*\.java$/i, doc: 'shared/integration-architecture.md' },
  { pattern: /apiproxy\/.+$/i, docs: ['apigee/architecture.md', 'apigee/policies.md', 'apigee/proxy-catalog.md'] },
  { pattern: /apiproxy\/targets\/.*\.xml$/i, doc: 'apigee/target-endpoints.md' },
  { pattern: /apiproxy\/resources\/jsc\/.*\.js$/i, doc: 'apigee/policies.md' },
  { pattern: /apiproxy\/policies\/.*(OAuth|APIKey).*\.xml$/i, doc: 'apigee/security-config.md' },
];

/**
 * Map a changed file to its context document(s).
 * Mirrors: update-context-docs.prompt.md → File-to-Context-Document Mapping
 */
function mapFileToContextDocs(filePath) {
  const results = [];
  for (const mapping of FILE_DOC_MAPPINGS) {
    if (mapping.pattern.test(filePath)) {
      if (mapping.doc) results.push(mapping.doc);
      if (mapping.docs) results.push(...mapping.docs);
    }
  }
  return [...new Set(results)];
}

// ═══════════════════════════════════════════════════════════════════════════
// KB Sync Mode & Project Context (update-context-docs — project sync)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Determine sync mode from the current branch.
 * Mirrors: update-context-docs.prompt.md → Step 2 → sync mode determination
 */
function determineSyncMode(currentBranch) {
  if (/^release\//.test(currentBranch)) return 'release';
  if (/^project\//.test(currentBranch)) return 'project';
  return null;
}

/**
 * Resolve the planning branch name for KB sync in project mode.
 * Mirrors: update-context-docs.prompt.md → Step 2b → planning branch resolution
 */
function resolveKbSyncPlanningBranch(projectBranch) {
  const m = projectBranch.match(/^project\/ghi-(\d+)-(.+)$/);
  if (!m) return null;
  return `planning/ghi-${m[1]}-kb-sync`;
}

/**
 * Determine whether project-context.md needs updating based on delta files.
 * Mirrors: update-context-docs.prompt.md → Step 10 → conditional project-context update
 */
function shouldUpdateProjectContext(changedFiles) {
  const architecturePatterns = [
    /pom\.xml$/i,
    /package\.json$/i,
    /build\.gradle$/i,
    /jest\.config/i,
    /Dockerfile$/i,
    /\.github\/workflows\//i,
  ];
  return changedFiles.some((f) => architecturePatterns.some((p) => p.test(f)));
}

// ═══════════════════════════════════════════════════════════════════════════
// Validation Report Classification (validate-runbook-context, validate-test-context)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Classify a validation finding as MATCH / MISMATCH / INFO.
 * Mirrors: validate-runbook-context.prompt.md → Status Classification Rules
 */
function classifyRunbookStatus(runbookValue, contextValue) {
  const hasRunbook = runbookValue !== null && runbookValue !== undefined && runbookValue !== '';
  const hasContext = contextValue !== null && contextValue !== undefined && contextValue !== '';

  if (!hasRunbook && !hasContext) return { status: 'INFO', symbol: 'ℹ️' };
  if (!hasRunbook || !hasContext) return { status: 'INFO', symbol: 'ℹ️' };

  // Normalize for comparison (strip caret prefix — package manager convention)
  const normalize = (v) =>
    String(v)
      .trim()
      .replace(/^\^/, '');
  if (normalize(runbookValue) === normalize(contextValue)) return { status: 'MATCH', symbol: '✅' };
  return { status: 'MISMATCH', symbol: '❌' };
}

/**
 * Roll up section status to worst finding.
 * Mirrors: validate-runbook-context.prompt.md → Executive Summary → worst status
 */
function worstStatus(statuses) {
  if (statuses.includes('MISMATCH')) return { status: 'MISMATCH', symbol: '❌' };
  if (statuses.includes('INFO')) return { status: 'INFO', symbol: 'ℹ️' };
  return { status: 'MATCH', symbol: '✅' };
}

/**
 * Build a deterministic discrepancy ID.
 * Mirrors: validate-runbook-context.prompt.md → Discrepancy ID format
 */
function discrepancyId(prefix, index) {
  return `${prefix}-${String(index).padStart(3, '0')}`;
}

/**
 * Classify test-context severity.
 * Mirrors: validate-test-context.prompt.md → Severity Categories
 */
function classifyTestSeverity(type) {
  const map = {
    fee: { severity: 'Fee/Value Discrepancies', symbol: '🔴' },
    value: { severity: 'Fee/Value Discrepancies', symbol: '🔴' },
    calculation: { severity: 'Calculation Mismatches', symbol: '🟡' },
    coverage: { severity: 'Coverage Gaps', symbol: '🔵' },
    match: { severity: 'Matching Test Cases', symbol: '✅' },
  };
  return map[type] || { severity: 'Coverage Gaps', symbol: '🔵' };
}

/**
 * Detect calculation model from formula description.
 * Mirrors: validate-test-context.prompt.md → Calculation Model Detection
 */
function detectCalculationModel(description) {
  const lower = String(description).toLowerCase();
  if (/flat.?rate|quantity\s*[×x*]\s*unit/i.test(lower)) return 'flat-rate';
  if (/first.*additional|first\s*\+/i.test(lower)) return 'first-additional';
  if (/tier|bracket|volume/i.test(lower)) return 'tiered';
  if (/percent|%/i.test(lower)) return 'percentage';
  return 'unknown';
}

// ═══════════════════════════════════════════════════════════════════════════
// Workflow Chain Prerequisites
// ═══════════════════════════════════════════════════════════════════════════

const WORKFLOW_PREREQUISITES = {
  'quick-setup': { requiredBranch: null, requiredConfig: ['versions.bmad'] },
  'setup-workspace': { requiredBranch: null, requiredConfig: ['versions.bmad'], requiredPersona: true },
  'install-hooks': { requiredBranch: null, requiredConfig: ['worker_repos'] },
  'initiate-issue': {
    requiredBranch: 'master',
    requiredConfig: ['issues.repository', 'worker_repos'],
    requiredFolders: ['knowledge-base', 'planning-artifacts', 'implementation-artifacts'],
  },
  'initiate-project': {
    requiredBranch: 'master',
    requiredConfig: ['issues.repository', 'worker_repos'],
    requiredFolders: ['knowledge-base'],
  },
  'show-available-stories': {
    requiredBranch: /^project\//,
    requiredConfig: ['worker_repos'],
    requiredFiles: ['implementation-artifacts/sprint-status.yaml'],
  },
  'project-course-correction': {
    requiredBranch: /^(project|planning)\//,
    requiredConfig: ['issues.repository', 'worker_repos'],
    requiredFiles: ['implementation-artifacts/sprint-status.yaml'],
  },
  switch: { requiredBranch: null, requiredConfig: ['worker_repos'] },
  'reference-sync': { requiredBranch: null, requiredConfig: ['common_repos'], requiredMcp: true },
  'prepare-repos': { requiredBranch: /^(dev\/ghi-|project\/)/, requiredConfig: ['worker_repos'], requiredSpec: true },
  commit: { requiredBranch: /^(dev|planning|project)\//, requiredConfig: [] },
  'pre-check-pull-request': { requiredBranch: /^dev\//, requiredConfig: [] },
  'create-pull-request': { requiredBranch: /^(dev|planning)\//, requiredConfig: [] },
  'update-context-docs': { requiredBranch: /^(release|project)\//, requiredConfig: ['worker_repos'] },
  'post-deployment-docs-sync': { requiredBranch: 'master', requiredConfig: [] },
  'ops-runbook': { requiredBranch: null, requiredFiles: ['*.docx'] },
  'validate-runbook-context': { requiredBranch: null, requiredFiles: ['runbook/*.md'] },
  'validate-test-context': { requiredBranch: null, requiredFiles: ['test-management/manual/*.md'] },
  'generate-dashboard': { requiredBranch: null, requiredConfig: [], requiredFiles: ['implementation-artifacts/sprint-status.yaml'] },
  'update-metrics': { requiredBranch: null, requiredConfig: [], requiredFiles: ['implementation-artifacts/sprint-status.yaml'] },
  'manage-blockers': { requiredBranch: null, requiredConfig: [], requiredFiles: ['implementation-artifacts/sprint-status.yaml'] },
  'metrics-report': { requiredBranch: null, requiredConfig: [], requiredFiles: ['implementation-artifacts/sprint-status.yaml'] },
  'run-tests': { requiredBranch: null, requiredConfig: [], requiredFiles: [] },
  'setup-unit-tests': { requiredBranch: null, requiredConfig: [] },
  'setup-api-tests': { requiredBranch: null, requiredConfig: [] },
  'setup-functional-tests': { requiredBranch: null, requiredConfig: [] },
  'setup-testdata': { requiredBranch: null, requiredConfig: [], requiredFiles: [] },
  'generate-unit-tests': { requiredBranch: null, requiredConfig: [] },
  'generate-api-tests': { requiredBranch: null, requiredConfig: [] },
  'generate-functional-tests': { requiredBranch: null, requiredConfig: [] },
  help: { requiredBranch: null, requiredConfig: [] },
  'project-kanban-planning': {
    requiredBranch: /^(project|planning)\//,
    requiredConfig: [],
    requiredFiles: ['implementation-artifacts/sprint-status.yaml'],
  },
};

/**
 * Check if a workflow step's branch prerequisite is met.
 * Mirrors: all prompts → branch requirements
 */
function checkWorkflowBranchPrereq(step, currentBranch) {
  const prereq = WORKFLOW_PREREQUISITES[step];
  if (!prereq) return { action: 'BAIL', reason: `Unknown workflow step: ${step}` };
  if (!prereq.requiredBranch) return { action: 'PROCEED' };
  if (prereq.requiredBranch instanceof RegExp) {
    return prereq.requiredBranch.test(currentBranch)
      ? { action: 'PROCEED' }
      : { action: 'BAIL', reason: `Step "${step}" requires branch matching ${prereq.requiredBranch}, got "${currentBranch}"` };
  }
  return currentBranch === prereq.requiredBranch
    ? { action: 'PROCEED' }
    : { action: 'BAIL', reason: `Step "${step}" requires branch "${prereq.requiredBranch}", got "${currentBranch}"` };
}

// ═══════════════════════════════════════════════════════════════════════════
// Legacy Prompt Cleanup (quick-setup)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Determine if a prompt file should be removed during cleanup.
 * Mirrors: quick-setup.prompt.md → Legacy Prompt Cleanup Rule
 */
function isLegacyPrompt(filename) {
  return !filename.startsWith('tdgs-aidlc-');
}

// ═══════════════════════════════════════════════════════════════════════════
// Change Brief Frontmatter (initiate-issue)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Build change-brief frontmatter fields.
 * Mirrors: initiate-issue.prompt.md → Change Brief Frontmatter
 */
function buildChangeBriefMeta(issueId, repository, type, slug, username) {
  const integration = `${type}/ghi-${issueId}-${slug}`;
  const dev = `dev/ghi-${issueId}-${slug}-${username}`;
  return {
    source: 'github-issue',
    issue_id: issueId,
    repository,
    issue_type: type,
    integration_branch: integration,
    dev_branch: dev,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Pre-check Pull Request (pre-check-pull-request)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Classify CI failure type from log content.
 * Mirrors: pre-check-pull-request.prompt.md → Failure Type Detection
 */
function classifyCiFailure(logContent) {
  const lower = String(logContent).toLowerCase();
  if (/compilation error|cannot find symbol|syntax error/i.test(logContent)) return 'build';
  if (/test.*fail|assertion.*fail|expected.*but/i.test(logContent)) return 'test';
  if (/fatal: bad revision|could not determine log options|no commits to scan|failed to get commits/i.test(logContent))
    return 'gitleaks-baseline';
  if (/gitleaks.*finding|secret.*detect|leak.*detect/i.test(logContent)) return 'gitleaks-secret';
  if (/veracode/i.test(lower)) return 'veracode';
  return 'unknown';
}

/**
 * CI polling delay schedule.
 * Mirrors: pre-check-pull-request.prompt.md → Polling Logic
 */
function ciPollingDelays() {
  return [30, 45, 60, 90, 90, 90, 90, 90, 90]; // seconds, max ~10 min
}

// ═══════════════════════════════════════════════════════════════════════════
// API Test Specific (generate-api-tests)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * API test result classification.
 * Mirrors: generate-api-tests.prompt.md → Result Classification
 */
function classifyApiTestResult(type) {
  const map = {
    pass: { symbol: '✅', label: 'PASS' },
    defect: { symbol: '❌', label: 'API DEFECT' },
    infra: { symbol: '⚠️', label: 'INFRA ISSUE' },
    contract: { symbol: '🔄', label: 'CONTRACT MISMATCH' },
  };
  return map[type] || map.pass;
}

/**
 * Standard injection payloads for API security tests.
 * Mirrors: generate-api-tests.prompt.md → Test Data Injection Payloads
 */
function getSecurityPayloads() {
  return {
    xss: ["<script>alert('xss')</script>", '"><img onerror=alert(1)>', 'javascript:alert(1)'],
    sql: ["' OR 1=1--", "'; DROP TABLE users;--", '1; SELECT * FROM users'],
    pathTraversal: ['../../etc/passwd', '..\\..\\windows\\system32'],
    commandInjection: ['; ls -la', '| cat /etc/passwd'],
    ldap: ['*)(uid=*))(|(uid=*'],
    headerInjection: ['\r\nX-Injected: header'],
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Reference Sync (reference-sync)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check if GitHub MCP tools are available.
 * Mirrors: reference-sync.prompt.md → MCP availability
 */
function checkMcpAvailability(toolNames) {
  if (!toolNames || !Array.isArray(toolNames) || toolNames.length === 0) {
    return { action: 'BAIL', reason: 'GitHub MCP is not activated. Please enable it in VS Code settings.' };
  }
  const hasMcp = toolNames.some((t) => String(t).startsWith('mcp_github'));
  return hasMcp
    ? { action: 'PROCEED' }
    : { action: 'BAIL', reason: 'GitHub MCP is not activated. Please enable it in VS Code settings.' };
}

/**
 * Determine if a service should be synced.
 * Mirrors: reference-sync.prompt.md → Service filtering rule
 */
function shouldSyncService(serviceName, commonServices, syncAll) {
  if (syncAll === true) return true;
  if (!commonServices || !Array.isArray(commonServices) || commonServices.length === 0) return null;
  return commonServices.includes(serviceName);
}

/**
 * Get the two files synced per service.
 * Mirrors: reference-sync.prompt.md → Files Synced Per Service
 */
function getServiceSyncFiles(serviceName) {
  return [`repos/${serviceName}/README.md`, `repos/${serviceName}/architecture.md`];
}

/**
 * Gap analysis categories in fixed order.
 * Mirrors: reference-sync.prompt.md → Gap Analysis Categories
 */
function getGapAnalysisCategories() {
  return ['Glossary Terms', 'Business Rules', 'External Services'];
}

/**
 * Index files updated after sync.
 * Mirrors: reference-sync.prompt.md → Index Files Updated
 */
function getSyncIndexTargets() {
  return [
    { path: 'common-services/README.md', required: true },
    { path: 'master-index.md', required: false },
    { path: 'quick-reference.md', required: false },
  ];
}

// ═══════════════════════════════════════════════════════════════════════════
// Post-Deployment Docs Sync (post-deployment-docs-sync)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Release tag/branch discovery candidates in priority order.
 * Mirrors: post-deployment-docs-sync.prompt.md → Tag/Branch Discovery
 */
function getReleaseTagCandidates(version) {
  return [`v${version}`, version, `release/${version}`];
}

/**
 * Build the documentation branch name for post-deploy sync.
 * Mirrors: post-deployment-docs-sync.prompt.md → Documentation Branch Naming
 */
function buildDocsBranchName(release, date) {
  return `docs/post-deploy-${release}-${date}`;
}

/**
 * Check if a branch name is a valid release PR source.
 * Mirrors: post-deployment-docs-sync.prompt.md → Merged PR Source Branch Pattern
 */
function isReleasePrSourceBranch(branchName) {
  return /^feature\/ghi-\d+/.test(branchName) || /^hotfix\/ghi-\d+/.test(branchName);
}

/**
 * Extract issue ID from a commit message Refs footer.
 * Mirrors: post-deployment-docs-sync.prompt.md → Issue ID Extraction
 */
function extractIssueIdFromCommit(message) {
  const m = String(message).match(/Refs:\s+(?:[\w-]+\/[\w-]+)?#(\d+)/);
  return m ? m[1] : null;
}

/**
 * Build the sync commit title.
 * Mirrors: post-deployment-docs-sync.prompt.md → Commit Message Format
 */
function buildSyncCommitTitle(release) {
  return `docs(sync): update knowledge base for release ${release}`;
}

/**
 * Check if common-services sync should be triggered.
 * Mirrors: post-deployment-docs-sync.prompt.md → Common-services sync flag
 */
function shouldTriggerCommonServicesSync(flags) {
  if (!flags || !Array.isArray(flags)) return false;
  return flags.includes('--sync-common-services');
}

// ═══════════════════════════════════════════════════════════════════════════
// Validate Runbook Context — Extended Rules
// ═══════════════════════════════════════════════════════════════════════════

const ENVIRONMENT_ORDER = ['Production', 'Staging', 'UAT', 'Test', 'Dev'];

/**
 * Sort environments in the fixed runbook order.
 * Mirrors: validate-runbook-context.prompt.md → Environment Ordering
 */
function sortByEnvironmentOrder(environments) {
  return [...environments].sort((a, b) => {
    const ai = ENVIRONMENT_ORDER.findIndex((e) => a.toLowerCase().includes(e.toLowerCase()));
    const bi = ENVIRONMENT_ORDER.findIndex((e) => b.toLowerCase().includes(e.toLowerCase()));
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });
}

/**
 * The canonical empty-cell text for validation reports.
 * Mirrors: validate-runbook-context.prompt.md → Empty Cell Text
 */
function emptyCellText() {
  return 'Not documented';
}

const FORBIDDEN_EMPTY_CELL_VARIANTS = ['Not mentioned', 'Not specified', 'Not explicitly documented', 'Not in context', 'Missing', 'N/A', ''];

/**
 * Check if a cell text is one of the forbidden variants.
 */
function isForbiddenEmptyCellText(text) {
  return FORBIDDEN_EMPTY_CELL_VARIANTS.includes(text);
}

const RUNBOOK_SECTION_PREFIXES = {
  1: 'ENV',
  2: 'SVC',
  3: 'DB',
  4: 'TECH',
  5: 'MICRO',
  6: 'GW',
  7: 'MON',
  8: 'AUTH',
  9: 'DBTBL',
  10: 'BATCH',
};

/**
 * Get the discrepancy ID prefix for a runbook section.
 * Mirrors: validate-runbook-context.prompt.md → Section Prefixes
 */
function getSectionPrefix(sectionNumber) {
  return RUNBOOK_SECTION_PREFIXES[sectionNumber] || null;
}

/**
 * Sort items alphabetically by a key function.
 * Mirrors: validate-runbook-context.prompt.md → Alphabetical Ordering Within Sections
 */
function sortSectionItems(items, keyFn) {
  return [...items].sort((a, b) => keyFn(a).localeCompare(keyFn(b)));
}

/**
 * Fixed runbook report file path.
 * Mirrors: validate-runbook-context.prompt.md → Output File Rule
 */
function getRunbookReportFilePath() {
  return 'runbook-validation-report.md';
}

/**
 * Validate that a recommendation references only existing files.
 * Mirrors: validate-runbook-context.prompt.md → Recommendation Constraints
 */
function isValidRecommendationPath(filePath, existingFilePaths) {
  return existingFilePaths.includes(filePath);
}

// ═══════════════════════════════════════════════════════════════════════════
// Validate Test Context — Extended Rules
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fixed test report file path.
 * Mirrors: validate-test-context.prompt.md → Output File Rule
 */
function getTestReportFilePath() {
  return 'test-validation-report.md';
}

/**
 * The single discrepancy prefix for test validation.
 * Mirrors: validate-test-context.prompt.md → DISC prefix
 */
function getTestDiscrepancyPrefix() {
  return 'DISC';
}

/**
 * Sort test files alphabetically for deterministic processing.
 * Mirrors: validate-test-context.prompt.md → Alphabetical File Processing Order
 */
function sortTestFiles(fileNames) {
  return [...fileNames].sort();
}

/**
 * Match a test case against business rules by priority.
 * Mirrors: validate-test-context.prompt.md → Rule Matching Priority
 */
function matchBusinessRule(candidateRuleId, candidateDescription, businessRules) {
  // Priority 1: exact Rule ID match
  if (candidateRuleId) {
    const exact = businessRules.find((r) => r.id === candidateRuleId);
    if (exact) return { match: exact, matchType: 'exact-id' };
  }
  // Priority 2: category + description keyword match
  if (candidateDescription) {
    const lower = candidateDescription.toLowerCase();
    const fuzzy = businessRules.find(
      (r) => r.category && r.description && lower.includes(r.category.toLowerCase()) && lower.includes(r.description.toLowerCase()),
    );
    if (fuzzy) return { match: fuzzy, matchType: 'category-description' };
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// Setup Workspace — Extended Rules
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Derive project name from repo folder names (longest common prefix at hyphen boundary).
 * Mirrors: setup-workspace.prompt.md → Project Name Derivation
 */
function deriveProjectName(repoNames) {
  if (!repoNames || repoNames.length === 0) return null;
  if (repoNames.length === 1) {
    // Single repo: take everything before the last hyphen segment
    const parts = repoNames[0].split('-');
    return parts.length > 1 ? parts.slice(0, -1).join('-') : repoNames[0];
  }
  // Find longest common prefix
  let prefix = repoNames[0];
  for (let i = 1; i < repoNames.length; i++) {
    while (!repoNames[i].startsWith(prefix)) {
      prefix = prefix.substring(0, prefix.length - 1);
      if (!prefix) return null;
    }
  }
  // Trim to hyphen boundary
  if (prefix.endsWith('-')) prefix = prefix.slice(0, -1);
  else {
    const lastHyphen = prefix.lastIndexOf('-');
    if (lastHyphen > 0) prefix = prefix.substring(0, lastHyphen);
    else return prefix; // no hyphen — return as is
  }
  return prefix || null;
}

/**
 * Determine action for docs folder based on persona.
 * Mirrors: setup-workspace.prompt.md → Docs Folder Existence by Persona
 */
function checkDocsFolderForPersona(exists, persona) {
  if (exists) return { action: 'PROCEED' };
  if (persona === 'em') return { action: 'CREATE' };
  if (persona === 'ade') return { action: 'BAIL', reason: 'As ADE, clone the docs repo first.' };
  return { action: 'BAIL', reason: 'Invalid persona' };
}

/**
 * Whether to classify repos as common/shared.
 * Mirrors: setup-workspace.prompt.md → Common Repos Classification
 * In new model, both EM and ADE classify repos (detect symlinks).
 */
function shouldPopulateCommonServices(persona) {
  return true;
}

/**
 * Extract common service names from knowledge-base file list.
 * Mirrors: setup-workspace.prompt.md → ADE Scan
 */
function extractCommonServicesFromFiles(fileNames) {
  return fileNames
    .filter((f) => f.toLowerCase().endsWith('.md') && f.toLowerCase() !== 'readme.md')
    .map((f) => f.replace(/\.md$/i, ''))
    .sort();
}

/**
 * Build BMAD config field mapping.
 * Mirrors: setup-workspace.prompt.md → _bmad/bmm/config.yaml Fields
 */
function buildBmadConfig(projectName, docsFolder) {
  return {
    project_name: projectName,
    planning_artifacts: `${docsFolder}/planning-artifacts`,
    implementation_artifacts: `${docsFolder}/implementation-artifacts`,
    project_knowledge: `${docsFolder}/knowledge-base`,
    output_folder: docsFolder,
  };
}

/**
 * Check if a folder should be excluded from workspace scanning.
 * Mirrors: setup-workspace.prompt.md → Workspace Scan Exclusions
 */
function shouldExcludeFromWorkspaceScan(folderName, docsFolder) {
  const excludeList = ['_bmad', '_bmad-output', 'tdgs-aidlc-starter-kit'];
  if (excludeList.includes(folderName)) return true;
  if (docsFolder && folderName === docsFolder) return true;
  return false;
}

// ═══════════════════════════════════════════════════════════════════════════
// Install Hooks — Extended Rules
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Determine if a worker repo should be skipped during hook installation.
 * Mirrors: install-hooks.prompt.md → Worker Repo Skip Conditions
 */
function shouldSkipWorkerRepo(repoStatus) {
  if (!repoStatus.cloned) return { skip: true, reason: 'Not cloned locally' };
  if (!repoStatus.isGit) return { skip: true, reason: 'Not a git repository' };
  if (!repoStatus.hasPrecommitConfig) return { skip: true, reason: 'No .pre-commit-config.yaml' };
  return { skip: false };
}

/**
 * Resolve a worker repo's local path as sibling of the docs repo.
 * Mirrors: install-hooks.prompt.md → Sibling Directory Path Resolution
 */
function resolveWorkerRepoPath(docsRepoAbsPath, repoName) {
  const parts = docsRepoAbsPath.replace(/\/$/, '').split('/');
  parts.pop();
  return parts.join('/') + '/' + repoName;
}

// ═══════════════════════════════════════════════════════════════════════════
// Prepare Repos — Extended Rules
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Build the spec file glob pattern.
 * Mirrors: prepare-repos.prompt.md → Spec File Discovery
 */
function specFileGlob(docsFolder) {
  return `${docsFolder}/implementation-artifacts/spec-*.md`;
}

/**
 * Parse branch conflict resolution choice.
 * Mirrors: prepare-repos.prompt.md → Dev Branch Conflict Handling
 */
function parseBranchConflictChoice(input) {
  if (!input) return null;
  const lower = String(input).toLowerCase().trim();
  if (lower === '1' || lower === 'skip') return 'SKIP';
  if (lower === '2' || lower === 'reset') return 'RESET';
  if (lower === '3' || lower === 'abort') return 'ABORT';
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// Create Pull Request — Extended Rules
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Parse draft status input.
 * Mirrors: create-pull-request.prompt.md → Draft Status Logic
 */
function parseDraftStatus(input) {
  if (input === null || input === undefined || input === '') return { action: 'ASK' };
  const lower = String(input).toLowerCase().trim();
  if (lower === 'draft') return { action: 'PROCEED', draft: true };
  if (lower === 'ready') return { action: 'PROCEED', draft: false };
  return { action: 'ASK', reason: `Invalid draft status: ${input}` };
}

/**
 * Copilot reviewer is always added to PRs.
 * Mirrors: create-pull-request.prompt.md → Auto-actions
 */
function shouldAddCopilotReviewer() {
  return true;
}

/**
 * Check if there are commits ahead of target.
 * Mirrors: create-pull-request.prompt.md → Zero-commits-ahead BAIL
 */
function checkCommitsAhead(count) {
  if (count === 0) return { action: 'BAIL', reason: 'No commits to create PR. Branch is up-to-date with target.' };
  return { action: 'PROCEED', commitCount: count };
}

/**
 * Parse multi-repo selection input.
 * Mirrors: create-pull-request.prompt.md → Multi-repo "all"/"cancel" options
 */
function parseMultiRepoSelection(input, availableRepos) {
  if (!input) return null;
  const lower = String(input).toLowerCase().trim();
  if (lower === 'all') return [...availableRepos];
  if (lower === 'cancel') return [];
  const names = String(input)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const matched = names.filter((n) => availableRepos.includes(n));
  return matched.length > 0 ? matched : null;
}

// ═══════════════════════════════════════════════════════════════════════════
// Test Generation — Extended Rules
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Build test title with optional rule ID anchor.
 * Mirrors: generate-unit-tests, generate-api-tests, generate-functional-tests → Test Name Pattern
 */
function buildTestTitle(expectedBehavior, condition, ruleId) {
  const base = `should ${expectedBehavior} when ${condition}`;
  return ruleId ? `${base} [${ruleId}]` : base;
}

/**
 * Filter out already-completed modules.
 * Mirrors: generate-unit-tests.prompt.md → skip_completed Parameter
 */
function filterSkippedModules(moduleList, skipCompletedList) {
  if (!skipCompletedList || skipCompletedList.length === 0) return moduleList;
  return moduleList.filter((m) => !skipCompletedList.includes(m));
}

/**
 * Determine if auto-scaffold setup is needed before generation.
 * Mirrors: generate-*-tests → Auto-scaffold Trigger Conditions
 */
function needsAutoScaffold(infra) {
  return !infra.hasTestDir || !infra.hasPackageJson || !infra.hasTestRunner || !infra.hasFramework;
}

/**
 * Knowledge-base discovery paths.
 * Mirrors: generate-*-tests → Two-Phase Discovery → Phase 1 Paths
 */
function kbBusinessRulesPath(docsFolder) {
  return `${docsFolder}/knowledge-base/business/business-rules-catalog.md`;
}

function kbDataModelsPath(docsFolder) {
  return `${docsFolder}/knowledge-base/shared/data-models.md`;
}

function kbOpenApiPath(docsFolder, serviceName) {
  return `${docsFolder}/knowledge-base/api/${serviceName}-openapi.yaml`;
}

function kbServiceArchPath(docsFolder, serviceName) {
  return `${docsFolder}/knowledge-base/repos/${serviceName}/architecture.md`;
}

function kbIntegrationArchPath(docsFolder) {
  return `${docsFolder}/knowledge-base/shared/integration-architecture.md`;
}

function kbProcessFlowsPath(docsFolder) {
  return `${docsFolder}/knowledge-base/business/process-flows.md`;
}

// ═══════════════════════════════════════════════════════════════════════════
// Initiate Project (initiate-project)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Build a project integration branch name.
 * Mirrors: initiate-project.prompt.md → Setup → branch naming
 */
function buildProjectBranchName(issueId, slug) {
  if (!issueId || !slug) return { action: 'BAIL', reason: 'Missing issue ID or slug' };
  return { action: 'PROCEED', branch: `project/ghi-${issueId}-${slug}` };
}

/**
 * Parse a project branch name.
 * Mirrors: initiate-project.prompt.md, show-available-stories.prompt.md → Parse project branch
 */
function parseProjectBranch(branch) {
  const m = String(branch).match(/^project\/ghi-(\d+)-(.+)$/);
  if (!m) return { action: 'BAIL', reason: `Not a project branch: ${branch}` };
  return { action: 'PROCEED', issueId: m[1], slug: m[2] };
}

/**
 * Build change-brief metadata for a project (no dev branch).
 * Mirrors: initiate-project.prompt.md → Change Brief Frontmatter
 */
function buildProjectChangeBriefMeta(issueId, repository, slug) {
  return {
    source: 'github-issue',
    issue_id: issueId,
    repository,
    issue_type: 'project',
    integration_branch: `project/ghi-${issueId}-${slug}`,
    workflow: 'full-bmad',
  };
}

/**
 * Validate knowledge-base directory structure.
 * Mirrors: initiate-project.prompt.md → Pre-flight Checks (step 2)
 */
const REQUIRED_KB_DIRS = ['api', 'business', 'project', 'repos', 'shared'];

function validateKnowledgeBaseDirs(existingDirs) {
  const missing = REQUIRED_KB_DIRS.filter((d) => !existingDirs.includes(d));
  if (missing.length > 0) return { action: 'BAIL', missing };
  return { action: 'PROCEED' };
}

// ═══════════════════════════════════════════════════════════════════════════
// Show Available Stories (show-available-stories)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Classify a story into a display category.
 * Mirrors: show-available-stories.prompt.md → Categorize Stories
 */
function classifyStoryStatus(status, hasRemoteBranch, depsUnmet) {
  if (status === 'done') return 'DONE';
  if (hasRemoteBranch || status === 'in-progress' || status === 'review') return 'CLAIMED';
  if (status === 'ready-for-dev' && depsUnmet) return 'BLOCKED';
  if (status === 'ready-for-dev') return 'AVAILABLE';
  return 'NOT_READY';
}

/**
 * Resolve story dependencies from a dependency map.
 * Mirrors: show-available-stories.prompt.md → Resolve Dependencies
 *
 * @param {string} storyKey - e.g. "1-7-dry-run-pipeline"
 * @param {Object} dependencyMap - e.g. { "1-7-dry-run-pipeline": ["1-1", "1-2"] }
 * @param {Object} storyStatuses - e.g. { "1-1-auth-setup": "done", "1-2-db-init": "in-progress" }
 * @returns {{ met: boolean, unmet: string[] }}
 */
function resolveStoryDependencies(storyKey, dependencyMap, storyStatuses) {
  if (!dependencyMap || !dependencyMap[storyKey]) return { met: true, unmet: [] };
  const deps = dependencyMap[storyKey];
  const unmet = [];
  for (const dep of deps) {
    if (dep.startsWith('epic-')) {
      // Epic dependency — check if epic entry status is 'done'
      const epicStatus = storyStatuses[dep];
      if (epicStatus !== 'done') unmet.push(dep);
    } else {
      // Story prefix dependency (e.g. "1-1" matches "1-1-*")
      const matching = Object.entries(storyStatuses).find(([key]) => key.startsWith(`${dep}-`));
      if (!matching || matching[1] !== 'done') unmet.push(dep);
    }
  }
  return { met: unmet.length === 0, unmet };
}

/**
 * Parse a story-level dev branch name.
 * Mirrors: show-available-stories.prompt.md → Parse dev branch: dev/ghi-{id}-{N}-{S}-{slug}-{username}
 */
function parseStoryDevBranch(branch, projectIssueId) {
  const prefix = `dev/ghi-${projectIssueId}-`;
  if (!String(branch).startsWith(prefix)) return null;
  const remainder = String(branch).slice(prefix.length);
  // Pattern: {N}-{S}-{slug}-{username} where N and S are numeric
  const m = remainder.match(/^(\d+)-(\d+)-(.+)-([^-]+)$/);
  if (!m) return null;
  return { epic: m[1], story: m[2], slug: m[3], username: m[4], storyKey: `${m[1]}-${m[2]}` };
}

/**
 * Convert a kebab-case story slug to title case.
 * Mirrors: show-available-stories.prompt.md → Story title derivation
 */
function slugToTitle(slug) {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// ═══════════════════════════════════════════════════════════════════════════
// Switch
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check if all repositories have clean working trees.
 * Mirrors: switch.prompt.md → Clean Working Tree Check
 */
function checkAllReposClean(repoStatuses) {
  const dirty = repoStatuses.filter((r) => r.hasChanges);
  if (dirty.length > 0) {
    return { action: 'BAIL', dirty: dirty.map((r) => r.name) };
  }
  return { action: 'PROCEED' };
}

/**
 * Resolve which docs branch to switch to for a target issue.
 * Mirrors: switch.prompt.md → Find Docs Repo Branch (auto-detect priority order)
 * @param {string|null} role - 'em', 'ade', or null for auto-detect
 */
function findDevBranchesForUser(remoteBranches, issueId, username) {
  const re = new RegExp(`^dev/ghi-${issueId}-.+-${username}$`);
  return remoteBranches.filter((b) => re.test(b));
}

function resolveDocsBranchForSwitch(remoteBranches, issueId, username, role) {
  if (role === 'em') {
    // EM role: target planning branch
    const planningBranch = remoteBranches.find(
      (b) => new RegExp(`^planning/ghi-${issueId}-`).test(b),
    );
    if (planningBranch) return { action: 'PROCEED', branch: planningBranch, type: 'planning' };
    const projectBranch = remoteBranches.find(
      (b) => new RegExp(`^project/ghi-${issueId}-`).test(b),
    );
    if (projectBranch) return { action: 'PROCEED', branch: projectBranch, type: 'project' };
    // M&O issues have no planning branch
    const moBranch = remoteBranches.find(
      (b) => new RegExp(`^(feature|hotfix)/ghi-${issueId}-`).test(b),
    );
    if (moBranch) return { action: 'BAIL', reason: 'M&O issues have no EM planning branch' };
    return { action: 'BAIL', reason: `No branches found for issue #${issueId}` };
  }

  if (role === 'ade') {
    // ADE role: target dev branch
    const devMatches = findDevBranchesForUser(remoteBranches, issueId, username);
    if (devMatches.length > 1) {
      return { action: 'ASK_USER', candidates: devMatches, reason: `Multiple dev branches match issue #${issueId}` };
    }
    if (devMatches.length === 1) return { action: 'PROCEED', branch: devMatches[0], type: 'dev' };
    const projectBranch = remoteBranches.find(
      (b) => new RegExp(`^project/ghi-${issueId}-`).test(b),
    );
    if (projectBranch) return { action: 'PROCEED', branch: projectBranch, type: 'project' };
    return { action: 'BAIL', reason: 'No dev branch — run /tdgs-aidlc-prepare-repos first' };
  }

  // Auto-detect (no role specified) — backwards-compatible priority
  // Priority 1: user's own dev branch
  const devMatches = findDevBranchesForUser(remoteBranches, issueId, username);
  if (devMatches.length > 1) {
    return { action: 'ASK_USER', candidates: devMatches, reason: `Multiple dev branches match issue #${issueId}` };
  }
  if (devMatches.length === 1) return { action: 'PROCEED', branch: devMatches[0], type: 'dev' };

  // Priority 2: project branch
  const projectBranch = remoteBranches.find(
    (b) => new RegExp(`^project/ghi-${issueId}-`).test(b),
  );
  if (projectBranch) return { action: 'PROCEED', branch: projectBranch, type: 'project' };

  // Priority 3: planning branch
  const planningBranch = remoteBranches.find(
    (b) => new RegExp(`^planning/ghi-${issueId}-`).test(b),
  );
  if (planningBranch) return { action: 'PROCEED', branch: planningBranch, type: 'planning' };

  // Priority 4: feature/hotfix integration branch
  const integrationBranch = remoteBranches.find(
    (b) => new RegExp(`^(feature|hotfix)/ghi-${issueId}-`).test(b),
  );
  if (integrationBranch) return { action: 'PROCEED', branch: integrationBranch, type: 'integration' };

  return { action: 'BAIL', reason: `No branches found for issue #${issueId}` };
}

// ═══════════════════════════════════════════════════════════════════════════
// Project Course Correction (project-course-correction)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Parse and validate the source parameter for course correction.
 * Mirrors: project-course-correction.prompt.md → Input → source types
 */
function parseCourseCorrectionSource(input) {
  if (!input) return { action: 'BAIL', reason: 'Source parameter is required' };
  const str = String(input).trim();
  if (str === 'comment') return { action: 'PROCEED', type: 'comment' };
  if (str === 'inline') return { action: 'PROCEED', type: 'inline' };
  const subIssueMatch = str.match(/^sub-issue:(\d+)$/);
  if (subIssueMatch) return { action: 'PROCEED', type: 'sub-issue', subId: subIssueMatch[1] };
  const docMatch = str.match(/^document:(.+)$/);
  if (docMatch) {
    const docPath = docMatch[1].trim();
    if (!docPath) return { action: 'BAIL', reason: 'document: path is empty' };
    if (/\.\.[\\/]|[\\/]\.\./.test(docPath) || docPath.startsWith('..')) {
      return { action: 'BAIL', reason: `Path traversal not allowed: ${docPath}` };
    }
    return { action: 'PROCEED', type: 'document', path: docPath };
  }
  const urlMatch = str.match(/^url:(.+)$/);
  if (urlMatch) return { action: 'PROCEED', type: 'url', url: urlMatch[1] };
  return { action: 'BAIL', reason: `Invalid source type: ${str}` };
}

/**
 * Determine the next CR sequence number from existing CR brief files.
 * Mirrors: project-course-correction.prompt.md → Generate CR Brief → sequence numbering
 */
function nextCrSequence(existingCrBriefFiles, issueId) {
  const pattern = new RegExp(`^cr-brief-${issueId}-(\\d+)\\.md$`);
  let max = 0;
  for (const f of existingCrBriefFiles) {
    const m = f.match(pattern);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return max + 1;
}

/**
 * Build CR brief frontmatter fields.
 * Mirrors: project-course-correction.prompt.md → CR Brief template
 */
function buildCrBriefMeta(issueId, seq, sourceType, sourceRef, date) {
  return {
    project_issue: issueId,
    cr_sequence: seq,
    source_type: sourceType,
    source_ref: sourceRef,
    date: date || new Date().toISOString(),
    status: 'pending',
  };
}

/**
 * Determine planning branch action based on current branch state.
 * Mirrors: project-course-correction.prompt.md → Ensure Planning Branch
 */
function resolvePlanningBranchAction(currentBranch, remoteBranches, issueId) {
  const planningMatch = currentBranch.match(/^planning\/ghi-(\d+)-(.+)$/);
  if (planningMatch) {
    if (planningMatch[1] !== String(issueId)) {
      return { action: 'BAIL', reason: `Branch issue ${planningMatch[1]} does not match issueId ${issueId}` };
    }
    return { action: 'CONTINUE', branch: currentBranch };
  }
  const projectMatch = currentBranch.match(/^project\/ghi-(\d+)-(.+)$/);
  if (!projectMatch) {
    return { action: 'BAIL', reason: 'Not on a project/* or planning/* branch' };
  }
  if (projectMatch[1] !== String(issueId)) {
    return { action: 'BAIL', reason: `Branch issue ${projectMatch[1]} does not match issueId ${issueId}` };
  }
  const planningBranch = remoteBranches.find((b) => new RegExp(`^planning/ghi-${issueId}-`).test(b));
  if (planningBranch) {
    return { action: 'CHECKOUT', branch: planningBranch };
  }
  return { action: 'CREATE', branch: `planning/ghi-${issueId}-${projectMatch[2]}` };
}

/**
 * Classify the action for a story affected by a course correction based on its status.
 * Mirrors: project-course-correction.prompt.md → Phase 3 → Story-Level Changes
 */
function classifyCourseCorrectionStoryAction(status) {
  switch (status) {
    case 'done':
      return 'CREATE_FOLLOWUP';
    case 'in-progress':
    case 'review':
      return 'APPEND_DELTA';
    case 'ready-for-dev':
      return 'MODIFY_IN_PLACE';
    case 'backlog':
      return 'MODIFY_OR_REMOVE';
    default:
      return 'UNKNOWN';
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Generate dashboard (generate-dashboard)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Validate generate-dashboard prerequisites.
 * Mirrors: generate-dashboard.prompt.md → Verify prerequisites exist
 */
function validateGenerateDashboardPrerequisites(hasEpicsFile, hasSprintStatus) {
  if (!hasEpicsFile) {
    return { action: 'BAIL', reason: 'No epics file found. Run /bmad-create-epics-and-stories first.' };
  }
  if (!hasSprintStatus) {
    return { action: 'BAIL', reason: 'sprint-status.yaml not found. Run /bmad-sprint-planning first.' };
  }
  return { action: 'PROCEED' };
}

// ═══════════════════════════════════════════════════════════════════════════
// Update metrics (update-metrics) — Harvey ball 0–4
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Clamp a Harvey ball metric to the 0–4 integer scale.
 * Mirrors: update-sprint-metrics/step-02-calculate.md → Metrics Calculation Rules
 */
function clampHarveyMetric(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return { action: 'BAIL', reason: 'Metric is not a number' };
  const clamped = Math.max(0, Math.min(4, Math.floor(n)));
  return { action: 'PROCEED', value: clamped };
}

// ═══════════════════════════════════════════════════════════════════════════
// Manage blockers (manage-blockers)
// ═══════════════════════════════════════════════════════════════════════════

const BLOCKER_IMPACT_RE = /^(high|medium|low)$/i;

/**
 * Parse manage-blockers CLI intent.
 * Mirrors: manage-blockers/instructions.md → Step 1
 */
function parseManageBlockersCommand(action, storyKey, extra) {
  const act = String(action || '').toLowerCase().trim();
  if (!['add', 'resolve', 'update'].includes(act)) {
    return { action: 'BAIL', reason: `Invalid blocker action: ${action}` };
  }
  if (!storyKey || !String(storyKey).trim()) {
    return { action: 'BAIL', reason: 'story_key is required' };
  }
  if (act === 'add') {
    const impactMatch = String(extra || '').match(/impact:\s*(\S+)/i);
    if (!impactMatch || !BLOCKER_IMPACT_RE.test(impactMatch[1])) {
      return { action: 'BAIL', reason: 'add requires impact:high|medium|low' };
    }
    return { action: 'PROCEED', command: 'add', storyKey, impact: impactMatch[1].toLowerCase() };
  }
  if (act === 'resolve' && (!extra || !String(extra).trim())) {
    return { action: 'BAIL', reason: 'resolve requires a resolution string' };
  }
  return { action: 'PROCEED', command: act, storyKey, extra };
}

// ═══════════════════════════════════════════════════════════════════════════
// Multi-Repo Workspace Detection (all prompts)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Detect git context — single repo, multi-repo, or no repos.
 * Mirrors: all prompts → Pre-flight Check: Multi-Repository Workspace
 */
function detectGitContext(isCurrentDirGitRepo, subdirGitRepos) {
  if (isCurrentDirGitRepo) return { context: 'single-repo' };
  if (subdirGitRepos && subdirGitRepos.length > 0) return { context: 'multi-repo', repos: subdirGitRepos };
  return { action: 'BAIL', reason: 'No git repositories found in workspace' };
}

// ═══════════════════════════════════════════════════════════════════════════
// Run Tests (run-tests)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Validate test scope selection.
 * Mirrors: run-tests.prompt.md → Step 1 — Full Suite or Issue-Scoped
 */
function validateTestScope(input) {
  if (!input) return { action: 'ASK', reason: 'Scope not specified' };
  const lower = String(input).toLowerCase().trim();
  if (lower === 'full' || lower === '1') return { action: 'PROCEED', scope: 'full' };
  if (lower === 'issue' || lower === '2') return { action: 'PROCEED', scope: 'issue' };
  return { action: 'ASK', reason: `Invalid scope: ${input}` };
}

/**
 * Validate test type selection.
 * Mirrors: run-tests.prompt.md → Step A2 — What type of tests
 */
function validateTestType(input) {
  const valid = ['unit', 'functional', 'api', 'all'];
  if (!input) return { action: 'ASK', reason: 'Test type not specified' };
  const lower = String(input).toLowerCase().trim();
  if (valid.includes(lower)) return { action: 'PROCEED', type: lower };
  const numMap = { '1': 'unit', '2': 'functional', '3': 'api', '4': 'all' };
  if (numMap[lower]) return { action: 'PROCEED', type: numMap[lower] };
  return { action: 'ASK', reason: `Invalid test type: ${input}` };
}

/**
 * Validate test environment selection.
 * Mirrors: run-tests.prompt.md → Step 2 — Which Environment
 */
function validateTestEnvironment(input) {
  if (!input) return { action: 'PROCEED', env: 'local' };
  const lower = String(input).toLowerCase().trim();
  if (lower === 'production' || lower === 'prod') {
    return { action: 'BAIL', reason: 'Production test execution is not supported' };
  }
  if (['local', 'test', 'stage'].includes(lower)) return { action: 'PROCEED', env: lower };
  return { action: 'ASK', reason: `Invalid environment: ${input}` };
}

/**
 * Validate functional test execution mode.
 * Mirrors: run-tests.prompt.md → Step A2b — Mock vs Real (no default)
 */
function validateTestMode(input) {
  if (!input) return { action: 'ASK', reason: 'Mode is required — type 1 for Mock or 2 for Real' };
  const lower = String(input).toLowerCase().trim();
  if (lower === 'mock' || lower === '1') return { action: 'PROCEED', mode: 'mock' };
  if (lower === 'real' || lower === '2') return { action: 'PROCEED', mode: 'real' };
  return { action: 'ASK', reason: `Invalid mode: ${input}` };
}

/**
 * Compute pass rate using the G11 locked formula.
 * Mirrors: run-tests.prompt.md → G11 passRate formula
 * Skipped tests are excluded from the denominator.
 */
function computePassRate(counts) {
  const denominator = (counts.passed || 0) + (counts.failed || 0) + (counts.dataIssue || 0) + (counts.infra || 0);
  if (denominator === 0) return 0.0;
  return (counts.passed || 0) / denominator;
}

// ═══════════════════════════════════════════════════════════════════════════
// Setup Test Data (setup-testdata)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Classify identity pool record status after a test run.
 * Mirrors: setup-testdata.prompt.md → G9 — Pool record reuse + quarantine model
 */
function classifyPoolRecordStatus(testOutcome, currentConsecutiveFailures, quarantineThreshold) {
  const threshold = quarantineThreshold || 5;
  if (testOutcome === 'pass') {
    return { status: 'available', consecutiveFailureCount: 0 };
  }
  if (testOutcome === 'fail') {
    const newCount = (currentConsecutiveFailures || 0) + 1;
    if (newCount >= threshold) return { status: 'quarantined', consecutiveFailureCount: newCount };
    return { status: 'available', consecutiveFailureCount: newCount };
  }
  return { status: 'available', consecutiveFailureCount: currentConsecutiveFailures || 0 };
}

/**
 * Check if a value is a PLACEHOLDER_* sentinel.
 * Mirrors: setup-testdata.prompt.md → G3 — Ask-don't-assume
 */
function isPlaceholderValue(value) {
  return /^PLACEHOLDER_/.test(String(value));
}

/**
 * Determine merge action for a catalog section.
 * Mirrors: setup-testdata.prompt.md → G9 — Idempotency merge semantics
 */
function classifyCatalogMergeAction(sectionExists, hasNewData) {
  if (!sectionExists && hasNewData) return 'create';
  if (sectionExists && hasNewData) return 'merge';
  if (sectionExists && !hasNewData) return 'preserve';
  return 'skip';
}

// ═══════════════════════════════════════════════════════════════════════════
// Help Prompt — Mode Routing
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Determine help mode from user input.
 * Mirrors: help.prompt.md → Phase 1 Input Analysis → Mode Selection
 *
 * Mode A: "what can I do" / empty / vague → overview list
 * Mode B: role-specific → filter by EM/ADE/Shared
 * Mode C: specific prompt/skill name → targeted detail
 * Mode D: workflow question → sequence guidance
 */
function routeHelpMode(input) {
  const lower = (input || '').trim().toLowerCase();
  if (!lower || /^(help|what can i do|commands|list|overview)$/i.test(lower)) return 'A';
  if (/^(em|ade|engineer|manager|shared)\b/i.test(lower)) return 'B';
  if (/^\/?(tdgs-aidlc-)?[\w-]+$/i.test(lower) && !/(how|when|what|why|where)\b/i.test(lower)) return 'C';
  return 'D';
}

// ═══════════════════════════════════════════════════════════════════════════
// Exports
// ═══════════════════════════════════════════════════════════════════════════

module.exports = {
  // Branch
  validateCommitBranch,
  validateProjectBranchFiles,
  validatePrSourceBranch,
  validatePrTargetBranch,
  buildBranchNames,
  parseDevBranch,
  resolvePrTarget,
  sanitizeUsername,

  // Input parsing
  parseIssueId,
  validateIssueType,
  validatePersona,
  parseReleaseVersion,

  // Config
  validateInitiateIssueConfig,
  validateBmadVersion,
  determineBmadAction,

  // Prerequisites
  parseVersion,
  checkPrerequisites,

  // Sensitivity & deletion
  detectSensitiveFiles,
  detectDeletions,

  // OS & package manager
  detectOS,
  selectPackageManager,
  getInstallCommands,
  buildGitleaksFallbackUrl,

  // Stack detection
  detectStack,
  isUiRepo,
  reactTestingLibraryVersion,
  defaultPort,
  shouldExcludeFromScan,

  // Coverage
  resolveCoverageTarget,
  jacocoMinimum,

  // Conventional commits & PR
  isValidCommitType,
  prCommitType,
  buildRefsFooter,
  COMMIT_TYPES,

  // Worker repo URLs
  parseGitRemoteUrl,
  deriveServiceKey,

  // File-to-doc mapping
  mapFileToContextDocs,

  // KB sync mode (update-context-docs — project sync)
  determineSyncMode,
  resolveKbSyncPlanningBranch,
  shouldUpdateProjectContext,

  // Validation classification
  classifyRunbookStatus,
  worstStatus,
  discrepancyId,
  classifyTestSeverity,
  detectCalculationModel,

  // Workflow chain
  checkWorkflowBranchPrereq,
  WORKFLOW_PREREQUISITES,

  // Legacy cleanup
  isLegacyPrompt,

  // Change brief
  buildChangeBriefMeta,

  // CI pre-check
  classifyCiFailure,
  ciPollingDelays,

  // API test
  classifyApiTestResult,
  getSecurityPayloads,

  // Reference sync
  checkMcpAvailability,
  shouldSyncService,
  getServiceSyncFiles,
  getGapAnalysisCategories,
  getSyncIndexTargets,

  // Post-deployment docs sync
  getReleaseTagCandidates,
  buildDocsBranchName,
  isReleasePrSourceBranch,
  extractIssueIdFromCommit,
  buildSyncCommitTitle,
  shouldTriggerCommonServicesSync,

  // Validate runbook — extended
  ENVIRONMENT_ORDER,
  sortByEnvironmentOrder,
  emptyCellText,
  isForbiddenEmptyCellText,
  FORBIDDEN_EMPTY_CELL_VARIANTS,
  RUNBOOK_SECTION_PREFIXES,
  getSectionPrefix,
  sortSectionItems,
  getRunbookReportFilePath,
  isValidRecommendationPath,

  // Validate test — extended
  getTestReportFilePath,
  getTestDiscrepancyPrefix,
  sortTestFiles,
  matchBusinessRule,

  // Setup workspace — extended
  deriveProjectName,
  checkDocsFolderForPersona,
  shouldPopulateCommonServices,
  extractCommonServicesFromFiles,
  buildBmadConfig,
  shouldExcludeFromWorkspaceScan,

  // Install hooks — extended
  shouldSkipWorkerRepo,
  resolveWorkerRepoPath,

  // Prepare repos — extended
  specFileGlob,
  parseBranchConflictChoice,

  // Create PR — extended
  parseDraftStatus,
  shouldAddCopilotReviewer,
  checkCommitsAhead,
  parseMultiRepoSelection,

  // Test generation — extended
  buildTestTitle,
  filterSkippedModules,
  needsAutoScaffold,
  kbBusinessRulesPath,
  kbDataModelsPath,
  kbOpenApiPath,
  kbServiceArchPath,
  kbIntegrationArchPath,
  kbProcessFlowsPath,

  // Initiate project
  buildProjectBranchName,
  parseProjectBranch,
  buildProjectChangeBriefMeta,
  validateKnowledgeBaseDirs,
  REQUIRED_KB_DIRS,

  // Show available stories
  classifyStoryStatus,
  resolveStoryDependencies,
  parseStoryDevBranch,
  slugToTitle,

  // Switch issue
  checkAllReposClean,
  resolveDocsBranchForSwitch,
  findDevBranchesForUser,

  // Sprint management
  validateGenerateDashboardPrerequisites,
  clampHarveyMetric,
  parseManageBlockersCommand,

  // Project course correction
  parseCourseCorrectionSource,
  nextCrSequence,
  buildCrBriefMeta,
  resolvePlanningBranchAction,
  classifyCourseCorrectionStoryAction,

  // Multi-repo workspace
  detectGitContext,

  // Run-tests
  validateTestScope,
  validateTestType,
  validateTestEnvironment,
  validateTestMode,
  computePassRate,

  // Setup-testdata
  classifyPoolRecordStatus,
  isPlaceholderValue,
  classifyCatalogMergeAction,

  // Help
  routeHelpMode,
};
