# MCP Setup Guide

> **Purpose:** Configure VS Code Copilot Chat with MCP (Model Context Protocol) servers for GitHub, Splunk, and databases.
>
> **When needed:** GitHub and Splunk MCP are pre-configured by setup. Database MCP is optional — only needed for database-related work.
>
> **Platforms:** macOS | Windows

> [← Setup Guide — Step 9](setup.md#step-9-mcp-server-setup-optional)

---

## Table of Contents

1. [Overview](#1-overview)
2. [GitHub MCP](#2-github-mcp)
3. [Splunk MCP](#3-splunk-mcp)
4. [Database MCP Prerequisites](#4-database-mcp-prerequisites)
5. [Oracle Configuration](#5-oracle-configuration)
6. [MySQL Configuration](#6-mysql-configuration)
7. [PostgreSQL Configuration](#7-postgresql-configuration)
8. [MongoDB Configuration](#8-mongodb-configuration)
9. [Platform Notes](#9-platform-notes)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Overview

> [Prerequisites →](#4-database-mcp-prerequisites)

This guide covers all MCP servers available in the AIDLC workspace:

| Section | MCP Server | Setup Type | When Needed |
|---------|-----------|-----------|-------------|
| [§2 GitHub MCP](#2-github-mcp) | `github-mcp` | Pre-configured | Always (issues, PRs, Actions) |
| [§3 Splunk MCP](#3-splunk-mcp) | `splunk-mcp-server` | Token required | Log investigation, debugging |
| [§5–§8 Database MCP](#5-oracle-configuration) | `sqlcl-mcp`, `mysql-mcp`, `pg-mcp`, `mongodb` | Optional — manual setup | Database-related issues only |

**Database Credential Security:** All database credentials are stored securely using macOS Keychain (MySQL/PostgreSQL/MongoDB) or Oracle Wallet (Oracle). No passwords are ever stored in plaintext on disk.

---

## 2. GitHub MCP

> [← Overview](#1-overview) | [Splunk MCP →](#3-splunk-mcp)

The GitHub MCP server is **pre-configured** by `/tdgs-aidlc-setup-workspace`. It enables Copilot Chat to interact with GitHub Issues, Pull Requests, Projects, and Actions directly.

### Configuration

Pre-configured in `.vscode/mcp.json`:

```json
"github-mcp": {
  "type": "http",
  "url": "https://api.githubcopilot.com/mcp/",
  "headers": {
    "X-MCP-Toolsets": "default,projects,actions"
  }
}
```

No additional setup required — authenticated via your VS Code GitHub Copilot session.

### Available Capabilities

| Capability | Description |
|------------|-------------|
| Issues | Read, create, update, and comment on GitHub Issues |
| Pull Requests | Read PR diffs, reviews, and status |
| Projects | Read and update GitHub Project boards |
| Actions | Trigger and read CI/CD workflow runs |

---

## 3. Splunk MCP

> [← GitHub MCP](#2-github-mcp) | [Database Prerequisites →](#4-database-mcp-prerequisites)

The Splunk MCP Server provides Copilot Chat access to Splunk for querying application logs, monitoring dashboards, and investigating production issues — all from within VS Code Agent chat.

### Why Use Splunk MCP

- **Log Investigation:** Query Splunk indexes directly from Agent chat to investigate errors, trace transactions, or analyze application behavior
- **Debugging Support:** When working on hotfixes or troubleshooting issues, search production/test logs without leaving your IDE
- **Knowledge Gathering:** Pull real runtime data (error patterns, response times, transaction flows) to inform implementation decisions
- **Index Discovery:** List available indexes and their metadata to understand what data sources are available

### When to Use

| Scenario | Example |
|----------|---------|
| Investigating a bug or incident | Query error logs for a specific transaction ID or error code |
| Understanding runtime behavior | Search for request/response patterns in a service |
| Validating a fix | Check logs after deployment to confirm the fix is working |
| Building implementation context | Query existing log patterns to understand how a service behaves |

### Configuration

The Splunk MCP server is pre-configured in `.vscode/mcp.json` after running `/tdgs-aidlc-setup-workspace` or `/tdgs-aidlc-quick-setup`:

```json
"splunk-mcp-server": {
  "command": "npx",
  "args": [
    "-y",
    "mcp-remote",
    "https://<SPLUNK_HOST>:8089/services/mcp",
    "--header",
    "Authorization: Bearer <SPLUNK_MCP_ENCRYPTED_TOKEN>"
  ]
}
```

> ⚠️ **REQUIRED:** The `<SPLUNK_MCP_ENCRYPTED_TOKEN>` placeholder must be replaced with a valid encrypted Bearer token. **Contact the TX Platform Engineering team** to obtain your Splunk MCP token. Do not share or commit the token value to source control.

### Setup Steps

1. Open `.vscode/mcp.json` in your workspace
2. Locate the `splunk-mcp-server` entry
3. Replace `<SPLUNK_MCP_ENCRYPTED_TOKEN>` with the token provided by the TX team
4. Save the file — VS Code will automatically detect the MCP server
5. Verify by opening Agent chat and checking that Splunk tools appear in the available tools list

### Available Capabilities

| Capability | Description |
|------------|-------------|
| Run queries | Execute SPL (Splunk Processing Language) queries against Splunk indexes |
| List indexes | Discover available Splunk indexes and their metadata |
| Get index info | View details about a specific index (size, event count, time range) |
| Run saved searches | Execute pre-configured saved searches |
| Get knowledge objects | Access Splunk knowledge objects (lookups, field extractions, etc.) |

> 💡 **Tip:** You can ask the AI agent to "search Splunk for errors in the OVRA service in the last 24 hours" and it will construct and run the appropriate SPL query for you.

---

## 4. Database MCP Prerequisites

> [← Splunk MCP](#3-splunk-mcp) | [Oracle →](#5-oracle-configuration)

| Tool | Version | Purpose | macOS Install | Windows Install |
|------|---------|---------|--------------|----------------|
| **Java JDK** | 17+ | Required by SQLcl (Oracle) | `brew install openjdk@17` | [Microsoft Build of OpenJDK](https://learn.microsoft.com/en-us/java/openjdk/download) or `winget install Microsoft.OpenJDK.17` |
| **SQLcl** | 24.3+ | Oracle MCP server | `brew tap oracle/sqlcl && brew install sqlcl` or [Download](https://www.oracle.com/database/sqldeveloper/technologies/sqlcl/download/) | [Download ZIP](https://www.oracle.com/database/sqldeveloper/technologies/sqlcl/download/) — extract and add `bin\` to PATH |
| **Node.js** | 18+ | MCP servers for MySQL/PG/Mongo | Already required by AIDLC | Already required by AIDLC |
| **Python 3** | 3.8+ | URL-encoding in MongoDB script | Already required by AIDLC | Already required by AIDLC |

### Verify

**macOS:**
```bash
java -version          # java version "17.x.x" or higher
sql -version           # SQLcl: Release 24.3+ or higher
node --version         # v18.x.x or higher
```

**Windows (PowerShell):**
```powershell
java -version          # java version "17.x.x" or higher
sql -version           # SQLcl: Release 24.3+ or higher
node --version         # v18.x.x or higher
```

> **Note:** Java and SQLcl are only needed for Oracle databases. If you're only working with MySQL, PostgreSQL, or MongoDB, you can skip these.

---

## 5. Oracle Configuration

> [← Database Prerequisites](#4-database-mcp-prerequisites) | [MySQL →](#6-mysql-configuration)

SQLcl provides native MCP support via `sql -mcp`. Credentials are stored in an encrypted Oracle Wallet.

### 5.1 Install SQLcl

#### macOS

**Option A — Manual Download (Recommended for GovCloud):**

```bash
# Download from Oracle website, then:
mkdir -p ~/sqlcl
unzip sqlcl-*.zip -d ~/

# Add to PATH
echo 'export PATH="$HOME/sqlcl/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

**Option B — Homebrew:**

```bash
brew tap oracle/sqlcl
brew install sqlcl
```

#### Windows

**Option A — Manual Download (Recommended for GovCloud):**

```powershell
# Download sqlcl-*.zip from https://www.oracle.com/database/sqldeveloper/technologies/sqlcl/download/
# Then extract and add to PATH:
Expand-Archive -Path sqlcl-*.zip -DestinationPath "$env:USERPROFILE\sqlcl"

# Add to PATH permanently (run as Administrator):
[System.Environment]::SetEnvironmentVariable(
  "PATH",
  "$env:PATH;$env:USERPROFILE\sqlcl\bin",
  [System.EnvironmentVariableTarget]::User
)
# Restart PowerShell after adding to PATH
```

**Option B — Chocolatey:**

```powershell
choco install sqlcl
```

### 5.2 Save Oracle Connection (Encrypted Wallet)

The `conn -save` commands are identical on macOS and Windows. Run them in a terminal (zsh/bash on macOS, PowerShell or cmd on Windows):

```bash
# Start SQLcl
sql /nolog

# Save connection — password is stored in encrypted Oracle Wallet automatically
conn -save <connection_name> <username>/<password>@jdbc:oracle:thin:@<host>:<port>:<sid>

# Example (SID format):
conn -save mydb_oracle admin/MyPassword@jdbc:oracle:thin:@myhost.example.com:1521:MYDB

# Example (Service Name format):
conn -save mydb_oracle admin/MyPassword@jdbc:oracle:thin:@//myhost.example.com:1521/ORCL

# Verify saved connections
conn -list

exit
```

**Where credentials are stored:**
- **macOS:** `~/.dbtools/connections/<unique-id>/` — Encrypted Oracle Wallet (`cwallet.sso`)
- **Windows:** `%USERPROFILE%\.dbtools\connections\<unique-id>\` — Encrypted Oracle Wallet (`cwallet.sso`)
- Format: AES-256 encryption — no plaintext passwords on disk

### 5.3 MCP.json Entry

**macOS:**
```json
"sqlcl-mcp": {
  "type": "stdio",
  "command": "${userHome}/sqlcl/bin/sql",
  "args": ["-mcp"]
}
```

**Windows:**
```json
"sqlcl-mcp": {
  "type": "stdio",
  "command": "${userHome}\\sqlcl\\bin\\sql.exe",
  "args": ["-mcp"]
}
```

> If SQLcl is on your PATH (e.g., via Chocolatey), you can use `"command": "sql"` on both platforms.

### 5.4 Verification

**macOS:**
```bash
# Test MCP mode starts correctly
sql /nolog -mcp
# Should start and wait for JSON-RPC input (Ctrl+C to exit)
```

**Windows (PowerShell):**
```powershell
# Test MCP mode starts correctly
sql /nolog -mcp
# Should start and wait for JSON-RPC input (Ctrl+C to exit)
```

In Copilot Chat:
```
Connect to <connection_name> and show all tables
```

### 5.5 Available Tools

| Tool | Description |
|------|-------------|
| `connect` | Connect to a saved Oracle connection by name |
| `disconnect` | Close active connection |
| `list-connections` | Show all saved connection names |
| `run-sql` | Execute SQL queries (returns CSV) |
| `run-sqlcl` | Execute SQLcl commands (DDL, desc, info) |
| `schema-information` | Get metadata (tables, columns, indexes) |

---

## 6. MySQL Configuration

> [← Oracle](#5-oracle-configuration) | [PostgreSQL →](#7-postgresql-configuration)

Uses `@sajithrw/mcp-mysql` with a wrapper script that reads credentials from the system credential store at runtime.

### 6.1 Store Password in Credential Store

**macOS:**
```bash
read -rsp "Password: " DB_PASSWORD && echo
security add-generic-password \
  -a "<username>" \
  -s "dbtools-mysql-<connection_name>" \
  -w "$DB_PASSWORD"
unset DB_PASSWORD

# Example:
read -rsp "Password: " DB_PASSWORD && echo
security add-generic-password \
  -a "app_user" \
  -s "dbtools-mysql-myapp_db" \
  -w "$DB_PASSWORD"
unset DB_PASSWORD
```

**Windows (PowerShell):**
```powershell
# Store in Windows Credential Manager
cmdkey /add:dbtools-mysql-<connection_name> /user:<username> /pass:<password>

# Example:
cmdkey /add:dbtools-mysql-myapp_db /user:app_user /pass:YourPasswordHere
```

### 6.2 Create Connection Properties

```bash
CONN_ID="my_mysql_connection"
mkdir -p ~/.dbtools/connections/$CONN_ID

# Connection properties (NO password stored here)
cat > ~/.dbtools/connections/$CONN_ID/dbtools.properties << 'EOF'
name=myapp_db
type=MYSQL
connectionString=myhost.example.com\:3306
userName=app_user
EOF

# Keychain reference
cat > ~/.dbtools/connections/$CONN_ID/credentials.sso << 'EOF'
# MySQL credentials stored in macOS Keychain
keychain.service=dbtools-mysql-myapp_db
EOF

# Secure file permissions
chmod 700 ~/.dbtools/connections/$CONN_ID
chmod 600 ~/.dbtools/connections/$CONN_ID/*
```

### 6.3 Create Wrapper Script

**macOS (`~/.dbtools/mysql-mcp.sh`):**

```bash
cat > ~/.dbtools/mysql-mcp.sh << 'SCRIPT'
#!/bin/zsh

# Find MySQL connection by name (passed as $1, defaults to first MySQL found)
CONN_NAME="${1:-}"

if [[ -n "$CONN_NAME" ]]; then
    MYSQL_CONN_DIR=$(find ~/.dbtools/connections -name "dbtools.properties" -exec grep -l "name=$CONN_NAME" {} \; | head -1)
else
    MYSQL_CONN_DIR=$(find ~/.dbtools/connections -name "dbtools.properties" -exec grep -l "type=MYSQL" {} \; | head -1)
fi

[[ -z "$MYSQL_CONN_DIR" ]] && { echo "Error: No matching MySQL connection found in ~/.dbtools/connections" >&2; exit 1; }
CONN_DIR=$(dirname "$MYSQL_CONN_DIR")

# Parse properties
CONN_STRING=$(grep "^connectionString=" "$CONN_DIR/dbtools.properties" | cut -d= -f2- | sed 's/\\:/:/g')
USERNAME=$(grep "^userName=" "$CONN_DIR/dbtools.properties" | cut -d= -f2-)

# Extract host and port
MYSQL_HOST=$(echo "$CONN_STRING" | sed 's|:.*||; s|/.*||')
MYSQL_PORT=$(echo "$CONN_STRING" | grep -oE ':[0-9]+' | head -1 | tr -d ':')
MYSQL_PORT="${MYSQL_PORT:-3306}"

# Read password from Keychain
KEYCHAIN_SVC=$(grep "^keychain.service=" "$CONN_DIR/credentials.sso" | cut -d= -f2-)
MYSQL_PASS=$(security find-generic-password -s "$KEYCHAIN_SVC" -w 2>/dev/null)

# Database name (passed as $2, optional)
MYSQL_DB="${2:-}"

export MYSQL_HOST="$MYSQL_HOST"
export MYSQL_PORT="$MYSQL_PORT"
export MYSQL_USER="$USERNAME"
export MYSQL_PASSWORD="$MYSQL_PASS"
export MYSQL_DATABASE="$MYSQL_DB"

exec npx -y @sajithrw/mcp-mysql
SCRIPT

chmod +x ~/.dbtools/mysql-mcp.sh
```

**Windows (`%USERPROFILE%\.dbtools\mysql-mcp.ps1`):**

```powershell
# Create the .dbtools folder if it doesn't exist
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.dbtools" | Out-Null

@'
param(
    [string]$ConnectionName = "",
    [string]$Database = ""
)

$connRoot = "$env:USERPROFILE\.dbtools\connections"
$propsFile = Get-ChildItem -Path $connRoot -Recurse -Filter "dbtools.properties" |
    Where-Object { (Get-Content $_.FullName) -match "type=MYSQL" } |
    Select-Object -First 1

if ($ConnectionName) {
    $propsFile = Get-ChildItem -Path $connRoot -Recurse -Filter "dbtools.properties" |
        Where-Object { (Get-Content $_.FullName) -match "name=$ConnectionName" } |
        Select-Object -First 1
}

$props = Get-Content $propsFile.FullName | ConvertFrom-StringData
$connStr = $props["connectionString"] -replace '\\:', ':'
$username = $props["userName"]

# Parse host and port
$hostPort = $connStr -split '/'
$hostParts = $hostPort[0] -split ':'
$mysqlHost = $hostParts[0]
$mysqlPort = if ($hostParts.Count -gt 1) { $hostParts[1] } else { "3306" }

# Retrieve password from Windows Credential Manager
# Requires: Install-Module CredentialManager -Scope CurrentUser -Force
$credTarget = "dbtools-mysql-$($props['name'])"
try {
    $credObj = Get-StoredCredential -Target $credTarget -ErrorAction Stop
    $mysqlPass = $credObj.GetNetworkCredential().Password
} catch {
    Write-Error "CredentialManager module not found. Install with: Install-Module CredentialManager -Scope CurrentUser -Force"
    exit 1
}

# Set environment variables and launch MCP server
$env:MYSQL_HOST = $mysqlHost
$env:MYSQL_PORT = $mysqlPort
$env:MYSQL_USER = $username
$env:MYSQL_PASSWORD = $mysqlPass
$env:MYSQL_DATABASE = $Database

npx -y @sajithrw/mcp-mysql
'@ | Set-Content "$env:USERPROFILE\.dbtools\mysql-mcp.ps1"
```

### 6.4 MCP.json Entry

**macOS:**
```json
"mysql-mcp": {
  "type": "stdio",
  "command": "/bin/zsh",
  "args": [
    "${userHome}/.dbtools/mysql-mcp.sh",
    "<connection_name>"
  ]
}
```

**Windows:**
```json
"mysql-mcp": {
  "type": "stdio",
  "command": "powershell.exe",
  "args": [
    "-ExecutionPolicy", "Bypass",
    "-File", "${userHome}\\.dbtools\\mysql-mcp.ps1",
    "-ConnectionName", "<connection_name>"
  ]
}
```

### 6.5 Verification

**macOS:**
```bash
# Test wrapper script starts correctly
~/.dbtools/mysql-mcp.sh <connection_name>
# Should output: "MySQL MCP server running on stdio" (Ctrl+C to exit)
```

**Windows (PowerShell):**
```powershell
# Test wrapper script starts correctly
& "$env:USERPROFILE\.dbtools\mysql-mcp.ps1" -ConnectionName <connection_name>
# Should output: "MySQL MCP server running on stdio" (Ctrl+C to exit)
```

In Copilot Chat:
```
List databases on mysql-mcp
```

### 6.6 Available Tools

| Tool | Description |
|------|-------------|
| `mysql_connect` | Connect with host/user/password |
| `mysql_query` | Execute SQL queries |
| `mysql_list_databases` | List all databases |
| `mysql_list_tables` | List tables in a database |
| `mysql_show_indexes` | Show indexes for a table |
| `mysql_disconnect` | Close connection |

---

## 7. PostgreSQL Configuration

> [← MySQL](#6-mysql-configuration) | [MongoDB →](#8-mongodb-configuration)

Uses `@modelcontextprotocol/server-postgres` with a wrapper script that reads credentials from the system credential store at runtime.

### 7.1 Store Password in Credential Store

**macOS:**
```bash
read -rsp "Password: " DB_PASSWORD && echo
security add-generic-password \
  -a "<username>" \
  -s "dbtools-pg-<connection_name>" \
  -w "$DB_PASSWORD"
unset DB_PASSWORD

# Example:
read -rsp "Password: " DB_PASSWORD && echo
security add-generic-password \
  -a "app_user" \
  -s "dbtools-pg-myapp_db" \
  -w "$DB_PASSWORD"
unset DB_PASSWORD
```

**Windows (PowerShell):**
```powershell
cmdkey /add:dbtools-pg-<connection_name> /user:<username> /pass:<password>

# Example:
cmdkey /add:dbtools-pg-myapp_db /user:app_user /pass:YourPasswordHere
```

### 7.2 Create Connection Properties

```bash
CONN_ID="my_pg_connection"
mkdir -p ~/.dbtools/connections/$CONN_ID

# Connection properties (NO password stored here)
cat > ~/.dbtools/connections/$CONN_ID/dbtools.properties << 'EOF'
name=myapp_db
type=POSTGRESQL
connectionString=myhost.example.com\:5432/mydb
userName=app_user
EOF

# Keychain reference
cat > ~/.dbtools/connections/$CONN_ID/credentials.sso << 'EOF'
# PostgreSQL credentials stored in macOS Keychain
keychain.service=dbtools-pg-myapp_db
EOF

chmod 700 ~/.dbtools/connections/$CONN_ID
chmod 600 ~/.dbtools/connections/$CONN_ID/*
```

> **Connection string format:** `<host>\:<port>/<database>`

### 7.3 Create Wrapper Script

**macOS (`~/.dbtools/pg-mcp.sh`):**

```bash
cat > ~/.dbtools/pg-mcp.sh << 'SCRIPT'
#!/bin/zsh

# Find PostgreSQL connection by name (passed as $1, defaults to first PG found)
CONN_NAME="${1:-}"

if [[ -n "$CONN_NAME" ]]; then
    PG_CONN_DIR=$(find ~/.dbtools/connections -name "dbtools.properties" -exec grep -l "name=$CONN_NAME" {} \; | head -1)
else
    PG_CONN_DIR=$(find ~/.dbtools/connections -name "dbtools.properties" -exec grep -l "type=POSTGRESQL" {} \; | head -1)
fi

[[ -z "$PG_CONN_DIR" ]] && { echo "Error: No matching PostgreSQL connection found in ~/.dbtools/connections" >&2; exit 1; }
CONN_DIR=$(dirname "$PG_CONN_DIR")

# Parse properties
CONN_STRING=$(grep "^connectionString=" "$CONN_DIR/dbtools.properties" | cut -d= -f2- | sed 's/\\:/:/g')
USERNAME=$(grep "^userName=" "$CONN_DIR/dbtools.properties" | cut -d= -f2-)

# Extract host, port, database
PG_HOST=$(echo "$CONN_STRING" | sed 's|:.*||')
PG_PORT=$(echo "$CONN_STRING" | grep -oE ':[0-9]+' | head -1 | tr -d ':')
PG_PORT="${PG_PORT:-5432}"
PG_DB=$(echo "$CONN_STRING" | sed 's|.*:/||; s|?.*||')
PG_DB="${PG_DB:-postgres}"

# Read password from Keychain
KEYCHAIN_SVC=$(grep "^keychain.service=" "$CONN_DIR/credentials.sso" | cut -d= -f2-)
PG_PASS=$(security find-generic-password -s "$KEYCHAIN_SVC" -w 2>/dev/null)

# URL-encode password (pass via stdin to avoid injection)
ENCODED_PG_PASS=$(printf '%s' "$PG_PASS" | python3 -c "import sys, urllib.parse; print(urllib.parse.quote(sys.stdin.read(), safe=''))")

# Build connection URI
export DATABASE_URI="postgresql://${USERNAME}:${ENCODED_PG_PASS}@${PG_HOST}:${PG_PORT}/${PG_DB}"

exec npx -y @modelcontextprotocol/server-postgres "$DATABASE_URI"
SCRIPT

chmod +x ~/.dbtools/pg-mcp.sh
```

**Windows (`%USERPROFILE%\.dbtools\pg-mcp.ps1`):**

```powershell
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.dbtools" | Out-Null

@'
param(
    [string]$ConnectionName = ""
)

$connRoot = "$env:USERPROFILE\.dbtools\connections"
$propsFile = Get-ChildItem -Path $connRoot -Recurse -Filter "dbtools.properties" |
    Where-Object { (Get-Content $_.FullName) -match "type=POSTGRESQL" } |
    Select-Object -First 1

if ($ConnectionName) {
    $propsFile = Get-ChildItem -Path $connRoot -Recurse -Filter "dbtools.properties" |
        Where-Object { (Get-Content $_.FullName) -match "name=$ConnectionName" } |
        Select-Object -First 1
}

$props = Get-Content $propsFile.FullName | ConvertFrom-StringData
$connStr = $props["connectionString"] -replace '\\:', ':'
$username = $props["userName"]

# Parse host, port, database
$parts = $connStr -split '[:/]'
$pgHost = $parts[0]
$pgPort = if ($parts.Count -gt 1 -and $parts[1] -match '^\d+$') { $parts[1] } else { "5432" }
$pgDb   = if ($parts.Count -gt 2) { $parts[2] } else { "postgres" }

# Retrieve password from Windows Credential Manager
# Requires: Install-Module CredentialManager -Scope CurrentUser -Force
$credTarget = "dbtools-pg-$($props['name'])"
try {
    $credObj = Get-StoredCredential -Target $credTarget -ErrorAction Stop
    $pgPass = $credObj.GetNetworkCredential().Password
} catch {
    Write-Error "CredentialManager module not found. Install with: Install-Module CredentialManager -Scope CurrentUser -Force"
    exit 1
}

$env:DATABASE_URI = "postgresql://${username}:${pgPass}@${pgHost}:${pgPort}/${pgDb}"
npx -y @modelcontextprotocol/server-postgres $env:DATABASE_URI
'@ | Set-Content "$env:USERPROFILE\.dbtools\pg-mcp.ps1"
```

### 7.4 MCP.json Entry

**macOS:**
```json
"pg-mcp": {
  "type": "stdio",
  "command": "/bin/zsh",
  "args": [
    "${userHome}/.dbtools/pg-mcp.sh",
    "<connection_name>"
  ]
}
```

**Windows:**
```json
"pg-mcp": {
  "type": "stdio",
  "command": "powershell.exe",
  "args": [
    "-ExecutionPolicy", "Bypass",
    "-File", "${userHome}\\.dbtools\\pg-mcp.ps1",
    "-ConnectionName", "<connection_name>"
  ]
}
```

### 7.5 Verification

**macOS:**
```bash
~/.dbtools/pg-mcp.sh <connection_name>
# Should start and wait for JSON-RPC input (Ctrl+C to exit)
```

**Windows (PowerShell):**
```powershell
& "$env:USERPROFILE\.dbtools\pg-mcp.ps1" -ConnectionName <connection_name>
# Should start and wait for JSON-RPC input (Ctrl+C to exit)
```

In Copilot Chat:
```
List tables using pg-mcp
```

### 7.6 Available Tools

| Tool | Description |
|------|-------------|
| `query` | Execute read-only SQL queries |
| `list_tables` | List all tables |
| `describe_table` | Get column details for a table |

---

## 8. MongoDB Configuration

> [← PostgreSQL](#7-postgresql-configuration) | [Platform Notes →](#9-platform-notes)

Uses `mongodb-mcp-server` (official MongoDB MCP) with a wrapper script. Configured in **read-only mode** by default.

### 8.1 Store Password in Credential Store

**macOS:**
```bash
read -rsp "Password: " DB_PASSWORD && echo
security add-generic-password \
  -a "<username>" \
  -s "dbtools-mongodb-<connection_name>" \
  -w "$DB_PASSWORD"
unset DB_PASSWORD

# Example:
read -rsp "Password: " DB_PASSWORD && echo
security add-generic-password \
  -a "app_user" \
  -s "dbtools-mongodb-myapp_mongo" \
  -w "$DB_PASSWORD"
unset DB_PASSWORD
```

**Windows (PowerShell):**
```powershell
cmdkey /add:dbtools-mongodb-<connection_name> /user:<username> /pass:<password>

# Example:
cmdkey /add:dbtools-mongodb-myapp_mongo /user:app_user /pass:YourPasswordHere
```

### 8.2 Create Connection Properties

**macOS:**
```bash
CONN_ID="my_mongo_connection"
mkdir -p ~/.dbtools/connections/$CONN_ID

# Connection properties (NO password stored here)
cat > ~/.dbtools/connections/$CONN_ID/dbtools.properties << 'EOF'
name=myapp_mongo
type=MONGODB
connectionString=mongodb+srv://cluster.example.net/mydb
userName=app_user
EOF

# Keychain reference
cat > ~/.dbtools/connections/$CONN_ID/credentials.sso << 'EOF'
# MongoDB credentials stored in macOS Keychain
keychain.service=dbtools-mongodb-myapp_mongo
EOF

chmod 700 ~/.dbtools/connections/$CONN_ID
chmod 600 ~/.dbtools/connections/$CONN_ID/*
```

**Windows (PowerShell):**
```powershell
$connId = "my_mongo_connection"
$connDir = "$env:USERPROFILE\.dbtools\connections\$connId"
New-Item -ItemType Directory -Force -Path $connDir | Out-Null

@"
name=myapp_mongo
type=MONGODB
connectionString=mongodb+srv://cluster.example.net/mydb
userName=app_user
"@ | Set-Content "$connDir\dbtools.properties"

@"
# MongoDB credentials stored in Windows Credential Manager
keychain.service=dbtools-mongodb-myapp_mongo
"@ | Set-Content "$connDir\credentials.sso"
```

> **Connection string format:** Full MongoDB URI without credentials (e.g., `mongodb+srv://cluster.example.net/dbname`)

### 8.3 Create Wrapper Script

**macOS (`~/.dbtools/mongo-mcp.sh`):**

```bash
cat > ~/.dbtools/mongo-mcp.sh << 'SCRIPT'
#!/bin/zsh

# Find MongoDB connection in dbtools connections
MONGO_CONN_DIR=$(find ~/.dbtools/connections -name "dbtools.properties" -exec grep -l "type=MONGODB" {} \; | head -1)
[[ -z "$MONGO_CONN_DIR" ]] && { echo "Error: No matching MongoDB connection found in ~/.dbtools/connections" >&2; exit 1; }
CONN_DIR=$(dirname "$MONGO_CONN_DIR")

# Parse properties
CONN_STRING=$(grep "^connectionString=" "$CONN_DIR/dbtools.properties" | cut -d= -f2-)
USERNAME=$(grep "^userName=" "$CONN_DIR/dbtools.properties" | cut -d= -f2-)

# Read password from Keychain
KEYCHAIN_SVC=$(grep "^keychain.service=" "$CONN_DIR/credentials.sso" | cut -d= -f2-)
PASSWORD=$(security find-generic-password -s "$KEYCHAIN_SVC" -w 2>/dev/null)

# URL-encode special characters in password (pass via stdin — never interpolate into -c string)
ENCODED_PASSWORD=$(printf '%s' "$PASSWORD" | python3 -c "import sys, urllib.parse; print(urllib.parse.quote(sys.stdin.read(), safe=''))")

# Build authenticated connection string
AUTH_CONN_STRING=$(echo "$CONN_STRING" | sed "s|://|://${USERNAME}:${ENCODED_PASSWORD}@|")

# Enable read-only mode if requested (pass 'readonly' as first argument)
MCP_ARGS=(--connectionString "$AUTH_CONN_STRING")
[[ "$1" == "readonly" ]] && MCP_ARGS+=(--readOnly)

exec npx -y mongodb-mcp-server "${MCP_ARGS[@]}"
SCRIPT

chmod +x ~/.dbtools/mongo-mcp.sh
```

**Windows (`%USERPROFILE%\.dbtools\mongo-mcp.ps1`):**

```powershell
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.dbtools" | Out-Null

@'
$connRoot = "$env:USERPROFILE\.dbtools\connections"
$propsFile = Get-ChildItem -Path $connRoot -Recurse -Filter "dbtools.properties" |
    Where-Object { (Get-Content $_.FullName) -match "type=MONGODB" } |
    Select-Object -First 1

$props = Get-Content $propsFile.FullName | ConvertFrom-StringData
$connStr  = $props["connectionString"]
$username = $props["userName"]

# Retrieve password from Windows Credential Manager
# Requires: Install-Module CredentialManager -Scope CurrentUser -Force
$credTarget = "dbtools-mongodb-$($props['name'])"
try {
    $credObj = Get-StoredCredential -Target $credTarget -ErrorAction Stop
    $plainPass = $credObj.GetNetworkCredential().Password
} catch {
    Write-Error "CredentialManager module not found. Install with: Install-Module CredentialManager -Scope CurrentUser -Force"
    exit 1
}

# URL-encode the password
$encodedPass = [System.Uri]::EscapeDataString($plainPass)

# Build authenticated connection string
$authConnStr = $connStr -replace "://", "://${username}:${encodedPass}@"

npx -y mongodb-mcp-server --connectionString $authConnStr
'@ | Set-Content "$env:USERPROFILE\.dbtools\mongo-mcp.ps1"
```

### 8.4 MCP.json Entry

**macOS:**
```json
"mongodb": {
  "type": "stdio",
  "command": "/bin/zsh",
  "args": [
    "${userHome}/.dbtools/mongo-mcp.sh",
    "readonly"
  ]
}
```

**Windows:**
```json
"mongodb": {
  "type": "stdio",
  "command": "powershell.exe",
  "args": [
    "-ExecutionPolicy", "Bypass",
    "-File", "${userHome}\\.dbtools\\mongo-mcp.ps1"
  ]
}
```

> **`readonly` argument (macOS):** Disables all write operations (insert, update, delete, drop). The Windows PowerShell script does not pass this flag — it connects in default mode; limit permissions at the DB user level instead.

### 8.5 Verification

**macOS:**
```bash
~/.dbtools/mongo-mcp.sh readonly
# Should start and wait for JSON-RPC input (Ctrl+C to exit)
```

**Windows (PowerShell):**
```powershell
& "$env:USERPROFILE\.dbtools\mongo-mcp.ps1"
# Should start and wait for JSON-RPC input (Ctrl+C to exit)
```

In Copilot Chat:
```
List collections in <database_name> database
```

### 8.6 Available Tools (Read-Only Mode)

| Tool | Description |
|------|-------------|
| `find` | Query documents with filter/projection/sort/limit |
| `aggregate` | Run aggregation pipelines |
| `count` | Count documents matching a filter |
| `list-databases` | List all databases |
| `list-collections` | List collections in a database |
| `collection-schema` | Infer schema from sampled documents |
| `collection-indexes` | List indexes on a collection |

---

## 9. Platform Notes

macOS and Windows installation steps are provided inline within each database section above. For Linux environments, replace the credential storage commands as follows:

| Operation | macOS | Linux | Windows |
|-----------|-------|-------|---------|
| **Store password** | `security add-generic-password -a "<user>" -s "<svc>" -w "<pass>"` | `secret-tool store --label="<svc>" service "<svc>" username "<user>"` | `cmdkey /add:<svc> /user:<user> /pass:<pass>` |
| **Retrieve password** | `security find-generic-password -s "<svc>" -w` | `secret-tool lookup service "<svc>" username "<user>"` | `cmdkey /list:<svc>` (PowerShell) |
| **Delete password** | `security delete-generic-password -s "<svc>"` | `secret-tool clear service "<svc>"` | `cmdkey /delete:<svc>` |

**Linux adaptation:** Replace `security find-generic-password` calls in the `.sh` wrapper scripts with the `secret-tool lookup` equivalent.

---

## 10. Troubleshooting

### Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| MCP server not showing in Copilot | `mcp.json` not detected | Reload VS Code: `Cmd+Shift+P` (macOS) / `Ctrl+Shift+P` (Windows) → "Developer: Reload Window" |
| `Unsupported Connection` in SQLcl MCP | Trying MySQL/PG in SQLcl — only Oracle supported | Use dedicated mysql-mcp or pg-mcp server |
| `password authentication failed` | Wrong credentials in credential store | Delete and re-add: macOS `security delete-generic-password -s "<svc>"` / Windows `cmdkey /delete:<svc>` |
| `npx` hangs or times out | First run downloading packages | Run `npx -y <package> --help` once manually first |
| `SecKeychainItemCreateFromContent: already exists` | Keychain entry exists (macOS) | Delete first: `security delete-generic-password -s "<svc>"` then re-add |
| `Wallet Version Not Supported` | Connection saved by SQL Developer | Delete and re-save with `sql /nolog` + `conn -save` |
| Connection timeout | Network/VPN issue | macOS: `nc -zv <host> <port>` / Windows: `Test-NetConnection -ComputerName <host> -Port <port>` |

### Debug MCP Server Startup

```bash
# Test wrappers manually — they should start and wait for JSON-RPC input
~/.dbtools/mysql-mcp.sh <connection_name>
~/.dbtools/pg-mcp.sh <connection_name>
~/.dbtools/mongo-mcp.sh readonly
sql /nolog -mcp
```

### Update a Password

```bash
# 1. Delete old entry
security delete-generic-password -s "dbtools-mysql-<connection_name>"

# 2. Add new entry (portable: works in both zsh and bash)
read -rsp "New password: " DB_PASSWORD && echo
security add-generic-password -a "<username>" -s "dbtools-mysql-<connection_name>" -w "$DB_PASSWORD"
unset DB_PASSWORD

# 3. Reload VS Code (MCP servers restart automatically)
```

### Verify Keychain Entries

```bash
# List all dbtools keychain entries
security dump-keychain 2>&1 | grep -A2 "dbtools-"

# Test specific entry retrieval
security find-generic-password -s "dbtools-mysql-<connection_name>" -w
```

---

## What's Next

Now that MCP servers are configured, return to your role-specific guide:

- **Engineering Managers** → [EM Guide](em-guide.md) — workspace setup, knowledge base generation, project planning
- **Agentic Delivery Engineers** → [ADE Guide](ade-guide.md) — M&O workflow, project implementation

> **Tip:** Type `/tdgs-aidlc-help` in Agent Chat to see all available commands and find what to do next.
