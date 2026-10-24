# cveq

A fast, zero-dependency command-line interface (CLI) triage tool for cybersecurity students, CTF players, and pentesters that aggregates vulnerability records and public GitHub Proof-of-Concept (PoC) exploits in under 5 seconds.

---

## Features

- **Authoritative Vulnerability Records:** Queries CVE JSON 5.0 data directly from the official [CVE.org](https://www.cve.org/) API (`cveawg.mitre.org`).
- **Concurrent GitHub PoC Discovery:** Concurrently queries the GitHub Search API for public, un-forked exploit repositories sorted by stargazers.
- **Terminal-Optimized Formatting:** Automatic word-wrapping, high-contrast ANSI severity badges (Critical, High, Medium, Low, Not Scored), and TTY/Windows color safety.
- **Obsidian-Compatible Research Journal:** Appends lookups to `~/.cveq/journal.md` (newest first) with `--save` and renders past research in a 4-column ASCII table with `cveq journal`.
- **Zero Runtime Dependencies:** Built strictly with native Node.js 18+ standard libraries (`fetch`, `AbortController`, `node:dns`, `node:test`).

---

## Requirements

- **Node.js:** `>= 18.0.0` (ES Modules support)
- **Operating System:** Cross-platform (Windows PowerShell / Terminal, macOS, Linux)

---

## Installation

Clone the repository and install the binary globally using `npm link`:

```bash
git clone https://github.com/kacem101/cveq.git
cd cveq
npm link
```

Verify installation:

```bash
cveq --version
# cveq v0.1.0
```

*(Alternatively, run directly without linking: `node bin/cveq.js <command>`)*

---

## Usage

### 1. Quick Vulnerability Lookup
Pass any valid CVE ID (case-insensitive, with or without `CVE-` prefix):

```bash
cveq CVE-2024-21762
```

Bare identifier normalization:

```bash
cveq 2024-21762
```

### 2. Save Research to Journal
Append the investigation to your local markdown research log (`~/.cveq/journal.md`):

```bash
cveq CVE-2024-21762 --save
```

Output:
```text
✓ CVE-2024-21762 saved to ~/.cveq/journal.md
```

### 3. Review Past Research
Display an ASCII table of your last 20 investigated CVEs (newest first):

```bash
cveq journal
```

Example output:
```text
Research Journal (Recent Entries):

  Date       | CVE ID           | Severity             | Summary                 
  -----------+------------------+----------------------+-------------------------
  2026-10-24 | CVE-2024-21762   | CRITICAL (CVSS 9.6)  | A out-of-bounds write...
```

### 4. Help and Options
View full command options, environment variables, and usage examples:

```bash
cveq --help
```

---

## Environment Variables

| Variable | Description |
| :--- | :--- |
| `GITHUB_TOKEN` | *Optional.* GitHub Personal Access Token (`ghp_...`). Increases unauthenticated rate limits from 10 req/min to 30 req/min. |
| `NO_COLOR` | *Optional.* Standard environment variable to disable ANSI colors and escape sequences in terminal output. |

Example setting a temporary token in PowerShell:
```powershell
$env:GITHUB_TOKEN = "your_placeholder_token_here"
cveq CVE-2024-21762
```

Example in Bash:
```bash
GITHUB_TOKEN="your_placeholder_token_here" cveq CVE-2024-21762
```

---

## Running Tests

Run the built-in Node.js test suite (20 tests covering input validation, report formatting, rate limits, and journal prepending):

```bash
npm test
```

Or run directly:

```bash
node --test
```

---

## Architecture & Planning Artifacts

`cveq` was built following a spec-driven, plan-first workflow:

- [Scope Document](devpost/scope.md) — Problem statement, user persona, POC boundary, and explicitly cut features.
- [Product Requirements Document (PRD)](devpost/prd.md) — Core user journey, interaction surfaces, and acceptance criteria.
- [Technical Specification](devpost/spec.md) — Architecture, failure modes, data schemas, and zero-dependency constraints.
- [Build Checklist](devpost/checklist.md) — Ordered incremental slices, mechanical verification, and review records.
- [Application Map](devpost/app-map.html) — Interactive visual map of code paths, component routes, and reusable practices.

---

## License

[MIT](package.json)
