---
doc: checklist
status: approved
---

# Build Checklist

Build mode: fast

## Slices

- [x] **1. Project Scaffold, Windows/TTY Color Safety, and Input Normalization**
  Becomes usable: The executable CLI entrypoint runs cleanly in the Windows terminal, displays compact help on no arguments or `--help`, and normalizes/validates CVE inputs with TTY-guarded ANSI colors without throwing escape errors.
  Why now: Bootstraps the project (`package.json`, CLI router, zero-dependency ANSI wrapper, regex validator) and proves Windows Terminal color safety immediately before adding network calls.
  PRD ref: `prd.md > Terminal Interaction Surfaces`, `prd.md > 1. Input Normalization and Validation`, `prd.md > Look and Feel`
  Spec ref: `spec.md > Stack`, `spec.md > Look and Feel & Windows/TTY Color Safety`, `spec.md > Components (1, 2, 5)`
  Build: Create `package.json` with `"type": "module"` and `"bin"`, `src/formatters/ansi.js` with TTY check, `src/utils/validator.js` with normalization regex, `bin/cveq.js` CLI router, and unit test `test/validator.test.js`.
  Verify (mechanical): Run `node --test test/validator.test.js` to verify normalization and validation; run `node bin/cveq.js` and verify compact help; run `node bin/cveq.js invalid` and verify exit code 1 with format-hint error.
  Learner check: Run `node bin/cveq.js` and `node bin/cveq.js 2024-21762` in your Windows terminal to verify clean, legible text without raw escape sequences.
  Commit: `Initialize cveq CLI with TTY color safety and input validation`

- [ ] **2. Official CVE.org Record Fetching & Formatted Terminal Report**
  Becomes usable: Running `cveq CVE-2024-21762` fetches live CVE JSON 5.0 data from CVE.org and prints a complete, word-wrapped, ANSI-colored vulnerability report with CVSS badge, affected products, and references in under 5 seconds.
  Why now: Implements the core vulnerability lookup engine and delivers the primary informational value of the tool.
  PRD ref: `prd.md > 2. Vulnerability Data Aggregation`, `prd.md > Terminal Interaction Surfaces (3)`
  Spec ref: `spec.md > Components (3, 5)`, `spec.md > External Services and Dependencies (1)`, `spec.md > Important Failure Modes (2, 3, 4)`
  Build: Implement `src/api/cve.js` with 8s `AbortController` timeout, parsing description, metrics (CVSS score/severity, with `NOT SCORED` fallback), affected products (+ N more truncation), and top 5 references; integrate into `src/formatters/report.js` and `bin/cveq.js`.
  Verify (mechanical): Query a known CVE (`CVE-2024-21762`) and verify exit code 0 and stdout contains "CRITICAL" and Fortinet; query an unknown CVE (`CVE-9999-0001`) and verify exit code 1 with clean "CVE not found in official records".
  Learner check: Run `node bin/cveq.js CVE-2024-21762` and observe the terminal layout, CVSS severity badge, and wrapping.
  Commit: `Add official CVE.org data fetcher and terminal report renderer`

- [ ] **3. Live GitHub PoC Discovery & 403 Rate-Limit Handling**
  Becomes usable: The vulnerability report now automatically discovers and displays top 5 star-ranked GitHub PoC repositories concurrently, or warns cleanly if rate-limited.
  Why now: Delivers the unique kernel that sets `cveq` apart from generic CVE search tools, completing the live triage view.
  PRD ref: `prd.md > 3. Public GitHub PoC Discovery`
  Spec ref: `spec.md > Components (4, 5)`, `spec.md > External Services and Dependencies (2)`, `spec.md > Important Failure Modes (1, 6)`
  Build: Implement `src/api/github.js` querying GitHub Search API with `AbortController`, keyword filtering (`poc` / `exploit`), fork exclusion, star sorting, and `GITHUB_TOKEN` support; add HTTP 403 rate-limit detection; update `report.js` and `bin/cveq.js` to run fetches via `Promise.all()`.
  Verify (mechanical): Query `CVE-2024-21762` and verify GitHub PoCs appear with stars and URLs; simulate/test empty PoC state and verify "No public PoC found on GitHub" is printed with exit 0.
  Learner check: Run `node bin/cveq.js 2024-21762` and check the PoC links and star counts.
  Commit: `Add concurrent GitHub PoC discovery with rate-limit safety`

- [ ] **4. Obsidian Markdown Research Journal (--save & cveq journal)**
  Becomes usable: The user can append lookups to `~/.cveq/journal.md` using `--save` and view past lookups in a 4-column ASCII table using `cveq journal`.
  Why now: Closes the user loop and finishes the entire proof-of-concept feature set described in the PRD and Spec.
  PRD ref: `prd.md > 4. Research Journal Management (~/.cveq/journal.md)`, `prd.md > Terminal Interaction Surfaces (4)`
  Spec ref: `spec.md > Components (6)`, `spec.md > Data Model (2)`, `spec.md > Important Failure Modes (5)`
  Build: Implement `src/journal/manager.js` (creating `~/.cveq/journal.md`, prepending newest-first, fault-tolerant regex parsing) and `src/formatters/table.js` (ASCII table rendering); wire `--save` flag and `cveq journal` command into `bin/cveq.js`; add `test/journal.test.js`.
  Verify (mechanical): Run unit tests `node test/journal.test.js`; test `cveq journal` on empty file (verifies exit 0 and guidance message); test `cveq CVE-2024-21762 --save` (verifies green check and file prepend); test `cveq journal` (verifies table contains entry).
  Learner check: Run `cveq CVE-2024-21762 --save` and then `cveq journal`, and optionally open `~/.cveq/journal.md` in Obsidian or an editor to inspect the formatting.
  Commit: `Add research journal manager with prepend writer and table view`

## Hands-on Checkpoints

- [ ] Early usable behavior explored — Slice 2 (live terminal CVE report)
- [ ] Final kick-the-tires exploration and feedback completed

## Final Review

- [ ] Final review complete — feedback resolved and learner confirms ready to ship

## Code Tour and App Map

- [ ] Learning activity complete — guided route, focused alternative, prior practice connected, or brief recap
- [ ] Optional edit and transfer reflection addressed — offered/declined/already covered/not applicable as appropriate
- [ ] `devpost/app-map.html` generated from finished code, checked, and shown, including a project-grounded practice to reuse

Activity and evidence: [what actually happened; real document/test/code references; unfinished work if interrupted]
Route and stops: [actual paths and symbols; guided stops completed, or reference-only route]
Edit outcome: [tried/kept/reverted/declined/not applicable; verification if changed]
Reflection: [offered/answered/declined/already covered — personal answer belongs only in the ignored profile]
Activity mode: [live app and editor, explicit static fallback, focused alternative, prior practice, or recap]

## Revisions
