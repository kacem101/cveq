---
doc: prd
status: approved
---

# cveq — Product Requirements

A fast, zero-configuration CLI triage tool for cybersecurity students, CTF players, and junior pentesters that turns a CVE ID into actionable intelligence in under 5 seconds.
Source: `scope.md > The Unique Kernel`, `scope.md > Who It's For`

## The Core Journey

1. **Invocation:** The user encounters a vulnerability (e.g. `CVE-2024-21762`) in a CTF challenge or lab. They run `cveq 2024-21762` or `cveq CVE-2024-21762`.
2. **Input Normalization & Triage Report:** `cveq` normalizes the input, queries official vulnerability records and public GitHub PoC repositories concurrently, and prints a structured, ANSI-colored terminal report in under 5 seconds.
3. **Saving to Journal:** The user runs `cveq CVE-2024-21762 --save`. The tool renders the report to stdout and prepends a structured Markdown summary to `~/.cveq/journal.md`, confirming with `✓ CVE-2024-21762 saved to ~/.cveq/journal.md`.
4. **Reviewing Research History:** The user runs `cveq journal` and sees an ANSI-formatted table listing their last 20 investigated CVEs (newest first) to quickly resume or audit past work.

## Terminal Interaction Surfaces

Source: `scope.md > The Core Loop`, `scope.md > What "Working" Looks Like`

The tool operates strictly in the terminal across three interaction surfaces:

1. **Compact Help / Zero-Arg Surface:**
   - Trigger: `cveq` (with no arguments).
   - Display: Compact usage banner, primary syntax, and a 1-line example.
2. **Full Help Surface:**
   - Trigger: `cveq --help` or `cveq -h`.
   - Display: Complete command syntax, descriptions for all arguments/flags (`--save`, `journal`), environment variable usage (`GITHUB_TOKEN`), and 3 practical examples.
3. **Vulnerability Report Surface:**
   - Trigger: `cveq <CVE-ID> [--save]`.
   - Hierarchy (top to bottom):
     1. **Header Banner:** CVE ID + CVSS Severity Badge (e.g., `CRITICAL 9.8` in bold red).
     2. **Vulnerability Description:** Official vulnerability description word-wrapped to terminal width (no horizontal scrolling).
     3. **Affected Products:** Top 3 affected products/vendors, plus `+ N more` if the list exceeds 3.
     4. **Official References:** Top 5 reference links (vendor advisories, commits, NVD advisories).
     5. **GitHub PoCs:** Top 5 repositories sorted by star count, showing:
        - Repo name (`owner/repo`)
        - Star count (`★ 1.2k`)
        - Last updated timestamp
        - Direct repository URL
     6. **Save Confirmation (if `--save` used):** Clean green status line (`✓ CVE-2024-21762 saved to ~/.cveq/journal.md`).
4. **Journal Table Surface:**
   - Trigger: `cveq journal`.
   - Display: Clean tabular output with columns: `Date | CVE | Severity | Summary` (last 20 entries, newest first).

## Look and Feel

Source: `scope.md > Inspiration & Identity`

- **Visual Tone:** Minimalist, high-contrast, modern terminal styling.
- **Color Palette & Severity Coding:**
  - `CRITICAL` (CVSS 9.0–10.0): Bold Bright Red
  - `HIGH` (CVSS 7.0–8.9): Orange / Bright Yellow-Red
  - `MEDIUM` (CVSS 4.0–6.9): Yellow
  - `LOW` (CVSS 0.1–3.9): Green
  - `NOT SCORED`: Dim Gray / Muted White
  - Accents: Cyan for URLs, Muted Gray for dates and "+ N more" labels, Green for success checks (`✓`).
- **Formatting Constraints:** All long-form text (summaries) wraps automatically to the current terminal column width without breaking words or causing horizontal scrolling.

## Features and Behavior

### 1. Input Normalization and Validation

Source: `scope.md > The POC Boundary`

- **Case Normalization:** Converts any lowercase input (e.g. `cve-2024-21762`) to uppercase (`CVE-2024-21762`).
- **Prefix Normalization:** If input matches `YYYY-NNNN+` (e.g. `2024-21762`), automatically prepends `CVE-`.
- **Validation:** Enforces the pattern `^CVE-\d{4}-\d{4,}$`.
  - *Acceptance Criterion:* Running `cveq 2024-21762` outputs the report for `CVE-2024-21762`.
  - *Acceptance Criterion:* Running `cveq cve-2024-21762` outputs the report for `CVE-2024-21762`.
  - *Acceptance Criterion:* Running `cveq invalid-id` prints a concise format-hint error message (`Error: Invalid CVE format. Expected CVE-YYYY-NNNN (e.g., CVE-2024-21762)`) with non-zero exit code.

### 2. Vulnerability Data Aggregation

Source: `scope.md > The POC Boundary`

- Aggregates raw official CVE record data (description, CVSS score/severity, affected products, official links).
- If no CVSS score is present in the record, sets severity to `NOT SCORED`.
- Truncates affected products list to 3 items and appends `(+ N more)` when larger.
- Limits official references to top 5 links.
  - *Acceptance Criterion:* Given a valid CVE with a CVSS score, displays correct score and severity badge.
  - *Acceptance Criterion:* Given a valid CVE without a CVSS score, displays `Severity: NOT SCORED` without error.

### 3. Public GitHub PoC Discovery

Source: `scope.md > The POC Boundary`, `scope.md > What "Working" Looks Like`

- Queries GitHub Search API for the CVE identifier with keyword filtering (`poc` or `exploit`).
- Excludes forks.
- Sorts by star count descending; caps results at 5.
- Displays repo full name, stars, last updated date, and URL.
- Supports unauthenticated requests by default; detects and uses `GITHUB_TOKEN` from the environment if present.
  - *Acceptance Criterion:* Top 5 star-ranked PoC repos are displayed with stars, update date, and URLs.
  - *Acceptance Criterion:* If zero repositories match, displays `No public PoC found on GitHub` instead of an empty or broken section.
  - *Acceptance Criterion:* If GitHub returns HTTP 403 (rate limited), displays a friendly notice (`⚠ GitHub search rate limit reached (10 req/min). Set GITHUB_TOKEN environment variable to increase limit.`), renders the CVE report with partial PoC data, and exits with code 0.

### 4. Research Journal Management (`~/.cveq/journal.md`)

Source: `scope.md > The Core Loop`, `scope.md > Why This Matters to the Learner`

- **Storage Location:** Centralized user home directory at `~/.cveq/journal.md`.
- **File Creation:** Creates directory `~/.cveq` and file `journal.md` if they do not exist. First entry writes `# cveq Research Journal\n\n`.
- **Prepend Order:** New entries are prepended immediately below the header so the latest research stays at the top of the file (Obsidian-friendly).
- **Entry Schema:**
  ```markdown
  ## YYYY-MM-DD — CVE-YYYY-NNNN

  - **Severity:** CRITICAL (CVSS 9.8)
  - **Summary:** <first ~200 chars of official description>...
  - **Top PoC:** https://github.com/user/repo (★ 1.2k)
  ```
  *(If no PoC was found or PoC search was rate-limited, records `Top PoC: none found`).*
- **Journal Table Command (`cveq journal`):**
  - Parses `~/.cveq/journal.md` and renders the last 20 entries in a terminal table:
    `Date | CVE | Severity | Summary`
  - *Acceptance Criterion:* Running `cveq <CVE-ID> --save` creates/updates `~/.cveq/journal.md` with prepended newest-first entry and prints green confirmation.
  - *Acceptance Criterion:* Running `cveq journal` displays a formatted table of up to 20 recent entries.
  - *Acceptance Criterion:* If `~/.cveq/journal.md` does not exist or has 0 entries, `cveq journal` prints `Journal is empty — run cveq <CVE-ID> --save to start your research log.` and exits 0.

## States and Boundaries

- **First Use (No journal file):** `cveq journal` shows empty-state guidance. Running `cveq <CVE-ID> --save` automatically provisions `~/.cveq/journal.md`.
- **Offline / Network Timeout:** If the vulnerability data source cannot be reached within 5 seconds, reports `Error: Request timed out. Check your network connection.`
- **Invalid Input Format:** Caught immediately via regex before making external network calls.
- **CVE Not Found:** When API returns 404 / record not found, reports `CVE not found in official records: CVE-YYYY-NNNN`.
- **Persistence:** Only `~/.cveq/journal.md` persists. No local cache, no SQLite database, no config file.

## Product Decisions

- **Deterministic Official Text over AI Summaries:** Retains exact official wording to prevent semantic drift in security descriptions; avoids API key friction.
- **Human Triage over Exploit Ranking:** Displays stars, dates, and URLs so the human analyst evaluates code quality; avoids false claims of automated exploit safety.
- **Global Home Directory Journal over Local Folder:** Centralizes notes in `~/.cveq/journal.md` to prevent fragmentation across CTF project directories and eliminate accidental git commits.
- **Prepend Newest-First:** Markdown entries are added to the top of the file so Obsidian notes show the latest activity immediately without scrolling.

## What We're Building

- CLI binary `cveq` with commands:
  - `cveq <CVE-ID>` (and loose input aliases like `2024-21762`)
  - `cveq <CVE-ID> --save`
  - `cveq journal`
  - `cveq --help` / `cveq` (compact help)
- Colored terminal layout with wrapping, badges, tables, and top 5 references/PoCs.
- Local Markdown journal generator/parser at `~/.cveq/journal.md`.

## Deferred From the POC

- **Journal full-text search / filtering (`cveq journal --filter ...`):** Deferred to keep POC tight.
- **JSON output mode (`--json`):** Deferred; terminal display is the primary deliverable for human triage.
- **EPSS (Exploit Prediction Scoring System) integration:** Deferred; CVSS is sufficient for the MVP.

## Non-Goals

- **Exploit execution / payload runner:** Strictly prohibited to ensure the tool remains a safe, legal triage utility.
- **Network / port scanner:** `cveq` is an intelligence aggregator, not an active scanner.
- **Web UI / Electron client:** Out of scope; target audience operates inside terminal workflows.
- **Remote DB / user accounts:** Pure local zero-dependency architecture.

## Open Questions

*(All critical behavioral decisions resolved. Technical API endpoint specifics and library choices belong in `4-spec`.)*
