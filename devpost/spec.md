---
doc: spec
status: approved
---

# cveq — Technical Specification

A fast, zero-dependency Node.js CLI triage tool that fetches official CVE vulnerability records from CVE.org, discovers public PoC exploits via the GitHub Search API, and logs research into a centralized Markdown journal.

## How This Works, In Plain Language

When a user runs `cveq CVE-2024-21762`, the CLI validates and normalizes the input, then issues two concurrent HTTPS requests using Node's native `fetch`:
1. It requests the official CVE JSON 5.0 record from the official CVE.org API (`https://cveawg.mitre.org/api/cve/`).
2. It queries GitHub's repository search API for repositories containing the CVE identifier tagged with `poc` or `exploit`, excluding forks and sorting by star count.

Both calls run with an 8-second `AbortController` timeout. Once responses arrive, the data is normalized: CVSS score and severity are parsed (or set to `NOT SCORED`), affected products are truncated to top 3 (+ N more), and official references are limited to top 5. The CLI formats this data into high-contrast ANSI-colored output wrapped cleanly to the user's terminal column width.

If `--save` is passed, the CLI ensures `~/.cveq/journal.md` exists and prepends the formatted entry directly under the header. If no PoCs exist or if GitHub search was rate-limited, it records `- **Top PoC:** none found`. If `cveq journal` is invoked, it reads `~/.cveq/journal.md`, parses past entries via regex (tolerating missing fields), and outputs a 4-column ASCII table of the 20 most recent entries. If the journal is empty or absent, it prints a friendly guidance message and exits with code 0.

The entire tool runs on pure native Node.js 18+ with zero third-party runtime dependencies, eliminating supply-chain attack surfaces.

## The Core Journey Through the System

Implements `prd.md > The Core Journey` and `prd.md > Terminal Interaction Surfaces`.

1. **CLI Invocation & Routing:** User runs `cveq [args]`. `bin/cveq.js` receives `process.argv` and dispatches to the router.
   - If no arguments: prints compact usage and exits (0).
   - If `--help` / `-h`: prints full usage manual and exits (0).
   - If `journal`: calls `src/journal/manager.js` to render recent entries and exits (0).
   - If `<CVE-ID>`: routes to the lookup workflow.
2. **Validation & Normalization:** `src/utils/validator.js` inspects the input:
   - Uppercases input (e.g. `cve-2024-21762` -> `CVE-2024-21762`).
   - Prepends `CVE-` if given `YYYY-NNNN+` (e.g. `2024-21762` -> `CVE-2024-21762`).
   - Tests against regex `^CVE-\d{4}-\d{4,}$`. If invalid, prints error with format hint and exits (1).
3. **Concurrent Data Fetching:** `Promise.all()` concurrently fires:
   - `src/api/cve.js` -> `https://cveawg.mitre.org/api/cve/${cveId}`
   - `src/api/github.js` -> `https://api.github.com/search/repositories?q=${cveId}+poc+fork:false+in:name,description,readme&sort=stars&order=desc&per_page=5`
4. **Data Formatting & Terminal Render:**
   - Raw CVE JSON parsed for description, CVSS metrics, affected vendor/products, and references.
   - GitHub JSON parsed for top 5 repos (`full_name`, `stargazers_count`, `updated_at`, `html_url`).
   - `src/formatters/report.js` combines the fields and applies ANSI color helpers from `src/formatters/ansi.js` (with automatic TTY check and Windows color verification), wrapping descriptions to `process.stdout.columns`.
   - Report is printed to stdout. Exit code is 0 (even if GitHub Search hit rate limit).
5. **Persistence (if `--save` flag present):**
   - `src/journal/manager.js` checks `~/.cveq/journal.md`. If missing, creates directory and file with header `# cveq Research Journal\n\n`.
   - Formats entry according to PRD schema (falling back to `Top PoC: none found` if empty/rate-limited) and prepends it below the header.
   - Prints confirmation: `✓ ${cveId} saved to ~/.cveq/journal.md`.

## Stack

- **Runtime:** Node.js 18+ (ES Modules: `"type": "module"` in `package.json`).
  - *Rationale:* Native support for `fetch`, `AbortController`, ES modules, and `node:test`. Cross-platform across Windows, Linux, and macOS.
- **External Runtime Dependencies:** None (Zero dependencies).
  - *Rationale:* Eliminates supply-chain risks, ensures instant installation, zero dependency bloat, matches DevSecOps principles.
  - *Pre-approved Fallback:* If custom argument parsing or formatting encounters blocking friction (>45 min during build), fall back to `commander` and `picocolors` without re-planning.
- **Test Runner:** Built-in Node.js test runner (`node:test` and `node:assert`).
  - *Rationale:* Zero external test packages required; fast, built-in execution.

## Where It Runs and How Someone Tries It

- **Runtime Environment:** Local command line on any system with Node.js 18+ installed. Verified directly in Windows PowerShell / Windows Terminal.
- **Installation / Setup:**
  ```bash
  npm link
  # or directly: node bin/cveq.js <args>
  ```
- **Demo Commands:**
  ```bash
  # 1. Quick lookup (returns in <5s)
  cveq CVE-2024-21762

  # 2. Input normalization test (bare ID)
  cveq 2024-21762

  # 3. Save to journal
  cveq CVE-2024-21762 --save

  # 4. View research journal
  cveq journal

  # 5. Rate limit and error handling check
  cveq CVE-9999-0001
  ```
- **Submission Artifacts:** Public GitHub repository and a 1–2 minute terminal screen recording showing the demo commands.

## Look and Feel & Windows/TTY Color Safety

Implements `prd.md > Look and Feel`.

- **TTY & Windows Safety Rule (Priority 1):**
  - ANSI color codes are automatically disabled when `process.stdout.isTTY` is false, or if `NO_COLOR` is set.
  - In `src/formatters/ansi.js`, if colors are disabled or unsupported, all formatting helpers return raw uncolored strings.
  - The report must never print raw escape sequences (e.g., `←[1;31m`) as visible characters.
  - Verified in Windows Terminal during Step 1 of the build.
- **Density & Tone:** Snappy, technical, hacker-friendly, minimal whitespace.
- **Color Palette (ANSI SGR codes via `src/formatters/ansi.js` when TTY active):**
  - `CRITICAL` (CVSS >= 9.0): Bold Red (`\x1b[1;31m`)
  - `HIGH` (CVSS 7.0–8.9): Bold Bright Yellow/Orange (`\x1b[1;33m`)
  - `MEDIUM` (CVSS 4.0–6.9): Yellow (`\x1b[33m`)
  - `LOW` (CVSS 0.1–3.9): Green (`\x1b[32m`)
  - `NOT SCORED`: Dim Gray (`\x1b[2;37m`)
  - Labels & Headers: Bold White (`\x1b[1;37m`)
  - URLs: Cyan Underline (`\x1b[4;36m`)
  - Metadata / Dates / Notes: Dim/Muted Gray (`\x1b[90m`)
  - Success Indicator: Green checkmark (`\x1b[32m✓\x1b[0m`)
- **Word Wrapping:** Long text blocks wrap on word boundaries to `process.stdout.columns || 80` to prevent horizontal line overflow.

## Components

### 1. CLI Router & Entrypoint (`bin/cveq.js`)
- Receives process arguments via `process.argv.slice(2)`.
- Handles flags: `--help`/`-h`, `--version`/`-v`, `--save`.
- Dispatches to sub-workflows: help display, journal table rendering, or CVE lookup and save.
- PRD ref: `prd.md > Terminal Interaction Surfaces`, `prd.md > What We're Building`.

### 2. Input Validator & Normalizer (`src/utils/validator.js`)
- Cleans and normalizes raw user inputs:
  - Uppercases all lowercase strings.
  - Matches `^\d{4}-\d{4,}$` and prepends `CVE-`.
- Validates against canonical regex `^CVE-\d{4}-\d{4,}$`.
- Returns `{ valid: true, cveId }` or `{ valid: false, error }`.
- PRD ref: `prd.md > 1. Input Normalization and Validation`.

### 3. CVE.org API Client (`src/api/cve.js`)
- Queries `https://cveawg.mitre.org/api/cve/${cveId}` with 8-second `AbortController`.
- Parses CVE JSON 5.0 schema:
  - Description: `containers.cna.descriptions[0].value`.
  - Severity & Metrics: Checks `containers.cna.metrics` and `containers.adp[].metrics` for `cvssV3_1` or `cvssV3_0`. Extracts `baseScore` and `baseSeverity`. If missing, sets severity to `NOT SCORED` and score to `null`.
  - Affected Products: Extracts vendor and product names from `containers.cna.affected[]`. Truncates to top 3 + `(+ N more)`.
  - References: Extracts URLs from `containers.cna.references[]`. Limits to top 5.
- Robust Error Handling:
  - If HTTP 404: returns error `CVE not found in official records: ${cveId}` (Exit 1).
  - Any other non-200 HTTP response: returns error `Could not fetch CVE record (HTTP ${status}). The service may be temporarily unavailable.` (Exit 1).
  - Network timeout / failure: returns `Error: Request timed out. Check your network connection.` (Exit 1).
  - Never leaks raw stack traces to the console.
- PRD ref: `prd.md > 2. Vulnerability Data Aggregation`.

### 4. GitHub Search API Client (`src/api/github.js`)
- Queries `https://api.github.com/search/repositories?q=${cveId}+poc+fork:false+in:name,description,readme&sort=stars&order=desc&per_page=5`.
- Headers:
  - `User-Agent: cveq-cli`
  - `Accept: application/vnd.github+json`
  - `Authorization: Bearer ${process.env.GITHUB_TOKEN}` (only if `GITHUB_TOKEN` is populated).
- Uses 8-second `AbortController`.
- Parses items: `full_name`, `stargazers_count`, `updated_at` (formatted YYYY-MM-DD), `html_url`.
- Error Handling:
  - Detects HTTP 403: returns explicit flag `{ rateLimited: true, pocs: [] }`.
  - Detects empty items array: returns `{ rateLimited: false, pocs: [] }`.
- PRD ref: `prd.md > 3. Public GitHub PoC Discovery`.

### 5. ANSI & Terminal Formatter (`src/formatters/ansi.js`, `src/formatters/report.js`)
- `ansi.js`: Lightweight wrapper for ANSI 16-color codes, guarded by `process.stdout.isTTY && !process.env.NO_COLOR`.
- `report.js`: Composes the report layout:
  - Header: `cveId` + severity badge.
  - Wrapped description block.
  - Affected products list.
  - Official references.
  - GitHub PoCs:
    - If PoCs present: list top 5 with stars, update date, URL.
    - If rate-limited: prints `⚠ GitHub search rate limit reached (10 req/min). Set GITHUB_TOKEN environment variable to increase limit.`
    - If empty (not rate-limited): prints `No public PoC found on GitHub.`
- PRD ref: `prd.md > Look and Feel`, `prd.md > 2. Vulnerability Data Aggregation`, `prd.md > 3. Public GitHub PoC Discovery`.

### 6. Journal Manager & Table Formatter (`src/journal/manager.js`, `src/formatters/table.js`)
- Path resolution: `path.join(os.homedir(), '.cveq', 'journal.md')`.
- Save (`saveEntry`):
  - Ensures `~/.cveq` directory exists (`fs.mkdir(..., { recursive: true })`).
  - Reads existing file or creates new with `# cveq Research Journal\n\n`.
  - Formats Top PoC: uses top PoC URL (`url (★ stars)`) or `none found` if empty/rate-limited.
  - Injects new entry immediately after the header (prepending newest first).
- Read (`listEntries`):
  - Reads `~/.cveq/journal.md`.
  - If file does not exist or has zero entries: prints `Journal is empty — run cveq <CVE-ID> --save to start your research log.` and exits with code 0.
  - Robust Regex Parsing: extracts sections matching `## (\d{4}-\d{2}-\d{2}) — (CVE-[\w-]+)`. Tolerates missing/malformed bullet fields without crashing.
  - Limits to 20 most recent entries.
- Table Formatter (`table.js`):
  - Formats entries into a clean ASCII table: `Date | CVE | Severity | Summary`.
- PRD ref: `prd.md > 4. Research Journal Management (~/.cveq/journal.md)`.

## Data Model

### 1. In-Memory Vulnerability Report Schema
```javascript
{
  cveId: "CVE-2024-21762",
  severity: "CRITICAL", // "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "NOT SCORED"
  score: 9.8,           // number or null
  summary: "An out-of-bounds write vulnerability in FortiOS...",
  affected: ["Fortinet FortiOS", "Fortinet FortiProxy"],
  affectedMoreCount: 0, // integer count of truncated items
  references: [
    "https://nvd.nist.gov/vuln/detail/CVE-2024-21762",
    "https://fortiguard.com/psirt/FG-IR-24-015"
  ],
  pocs: [
    {
      name: "bishopfox/cve-2024-21762",
      stars: 482,
      updated: "2024-03-12",
      url: "https://github.com/bishopfox/cve-2024-21762"
    }
  ],
  rateLimited: false
}
```

### 2. Disk Journal File Schema (`~/.cveq/journal.md`)
```markdown
# cveq Research Journal

## 2026-10-23 — CVE-2024-21762

- **Severity:** CRITICAL (CVSS 9.8)
- **Summary:** An out-of-bounds write vulnerability in Fortinet FortiOS allows a remote unauthenticated attacker to execute arbitrary code...
- **Top PoC:** https://github.com/bishopfox/cve-2024-21762 (★ 482)

```
*(If no PoC was found or search was rate-limited: `- **Top PoC:** none found`)*

## File Structure

```
cveq/
├── bin/
│   └── cveq.js               # CLI executable entrypoint & routing
├── src/
│   ├── api/
│   │   ├── cve.js            # CVE.org API client & response normalizer
│   │   └── github.js         # GitHub Search API client & rate-limit handler
│   ├── formatters/
│   │   ├── ansi.js           # Zero-dep ANSI color formatting helpers & TTY safety
│   │   ├── report.js         # Full terminal report layout & text wrapping
│   │   └── table.js          # Zero-dep ASCII table generator for journal
│   ├── journal/
│   │   └── manager.js        # ~/.cveq/journal.md prepend writer & fault-tolerant parser
│   └── utils/
│       └── validator.js      # Input normalization & regex validation
├── test/
│   ├── validator.test.js     # Unit tests for input normalization & regex
│   └── journal.test.js       # Unit tests for journal prepend & tolerant parsing
├── devpost/
│   ├── learner-profile.md    # Learner profile (from 1-start)
│   ├── scope.md              # Scope definition (from 2-scope)
│   ├── prd.md                # Product requirements (from 3-prd)
│   └── spec.md               # Technical spec (this document)
├── package.json              # ES Module configuration, "bin", zero dependencies
├── .gitignore                # Git ignore rules
└── README.md                 # Project documentation & demo guide
```

## External Services and Dependencies

1. **Official CVE.org Services v5 API**
   - Documentation: `https://cveproject.github.io/cve-services/`
   - Endpoint: `GET https://cveawg.mitre.org/api/cve/{cve_id}`
   - Authentication: None required.
   - Rate Limits: Generous public access for read operations.
   - Payload: None.
   - Response: CVE JSON 5.0 container object.

2. **GitHub Search API**
   - Documentation: `https://docs.github.com/en/rest/search/search#search-repositories`
   - Endpoint: `GET https://api.github.com/search/repositories?q={cveId}+poc+fork:false+in:name,description,readme&sort=stars&order=desc&per_page=5`
   - Authentication: Unauthenticated by default; optional `Authorization: Bearer ${GITHUB_TOKEN}`.
   - Rate Limits: 10 requests/minute (unauthenticated); 30 requests/minute (authenticated).
   - Headers: `User-Agent: cveq-cli`, `Accept: application/vnd.github+json`.

## Important Failure Modes

1. **GitHub API Rate Limit Hit (HTTP 403)**
   - *Failure:* User runs rapid searches without a GitHub token and hits the 10 req/min limit.
   - *Behavior:* Report still displays full CVE metadata; PoC section prints:
     `⚠ GitHub search rate limit reached (10 req/min). Set GITHUB_TOKEN environment variable to increase limit.`
     Exits with code 0 (partial success, no stack trace).
2. **Invalid or Unknown CVE Record (HTTP 404)**
   - *Failure:* User enters a valid CVE format that doesn't exist upstream (e.g. `CVE-9999-0001`).
   - *Behavior:* Displays `CVE not found in official records: CVE-9999-0001`. Exits with code 1 (no stack trace).
3. **Generic Upstream Error (Non-200, Non-404 from CVE.org)**
   - *Failure:* CVE.org returns 500, 502, 503, or 429.
   - *Behavior:* Displays `Could not fetch CVE record (HTTP ${status}). The service may be temporarily unavailable.`. Exits with code 1 (no stack trace).
4. **Upstream Request Timeout (>8s)**
   - *Failure:* Network latency or dead connection causes request to hang.
   - *Behavior:* `AbortController` triggers. Displays `Error: Request timed out. Check your network connection.`. Exits with code 1 (no stack trace).
5. **Empty Journal**
   - *Failure:* User runs `cveq journal` before saving any entries or on a fresh machine.
   - *Behavior:* Displays `Journal is empty — run cveq <CVE-ID> --save to start your research log.`. Exits with code 0.
6. **No PoCs Found on GitHub**
   - *Failure:* Zero matching PoC repos exist on GitHub.
   - *Behavior:* PoC section displays `No public PoC found on GitHub.`. If `--save` is used, saves `Top PoC: none found`.

## What Was Simplified and Why

- **CVE.org as single data provider** instead of dual CVE.org + NVD 2.0 aggregation. Authoritative primary record, eliminates NVD throttling and multi-schema complexity.
- **Zero third-party runtime dependencies** instead of `commander` / `picocolors` / `cli-table3`. A custom ~25 LOC ANSI formatter with TTY guards and built-in argument parsing eliminate supply-chain risk and installation lag. (A 45-minute fallback rule protects the schedule).
- **Regex-based Markdown journal parsing** instead of an AST parser or local database. The journal schema is fixed and lightweight; regex parsing handles 20 entries in microseconds with zero dependencies.

## Decisions and Open Issues

### Key Decisions
- **Windows / TTY Color Safety:** Added TTY check and Windows color verification to guarantee escape codes never render as raw characters.
- **Zero Runtime Dependencies:** Native ES modules, native fetch, built-in node:test.
- **Pre-Approved Fallback:** If custom CLI argument parsing exceeds 45 minutes of build effort, immediately install `commander` without re-planning.
- **8-Second Timeout:** Added `AbortController` timeouts to all network fetches to strictly prevent command hanging.
- **Partial Report on 403 Rate Limit:** Report displays CVE data with warning banner and exits 0 instead of terminating completely.
- **Robust Journal Parser:** Tolerates missing or partial lines in older/manual entries without throwing exceptions.
