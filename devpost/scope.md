---
doc: scope
status: approved
---

# cveq

A fast, zero-configuration CLI triage tool for cybersecurity students, CTF players, and junior pentesters that turns a CVE ID into actionable intelligence in under 5 seconds.

## The Unique Kernel
Zero-setup, deterministic vulnerability triage in the terminal: bridging the gap between official CVE/NVD vulnerability records, live GitHub Proof-of-Concept (PoC) repositories, and a personal Obsidian-compatible research journal—with zero required API keys and zero configuration.

## Who It's For
Cybersecurity students, HackTheBox/CTF players, and junior penetration testers who frequently triage CVEs under time pressure.
- **What they're trying to do:** Rapidly understand a vulnerability, assess its severity, find working PoCs, and document their findings.
- **What they do today:** Waste 15–20 minutes bouncing between slow NVD pages, fragmented searchsploit / Exploit-DB entries, and hunting uncurated GitHub repositories.

## The Core Loop
1. The user encounters a CVE during a CTF or security assessment.
2. In their terminal, they type `cveq <CVE-ID>` (e.g., `cveq CVE-2024-21762`).
3. In under 5 seconds, they get a clean, colored report: official summary, CVSS severity, affected products, official reference links, and top GitHub PoCs (stars, update date, URL).
4. They add `--save` to log it directly into their centralized research journal (`~/.cveq/journal.md`).
5. They run `cveq journal` to view their last 20 investigated vulnerabilities.

## Inspiration & Identity
- **Tone:** Snappy, technical, reliable, minimalist, hacker-friendly.
- **Aesthetic:** Clean ANSI colored terminal layout (severity color-coding: Critical red, High orange, Medium yellow, Low green; tidy tables and link lists).
- **Tool philosophy:** "The tool reports, the human triages." Truthful, unvarnished data—no fake hallucinated links, clear notification when no public PoC exists.

## Why This Matters to the Learner
Eliminates daily triage fatigue and context-switching during security labs and CTFs. Keeps research notes organized centrally in Obsidian-friendly Markdown without fragmenting across temporary project folders.

## What "Working" Looks Like
Demonstrated in under 60 seconds on screen:
1. Run `cveq CVE-2024-21762`: terminal displays formatted CVE metadata and top GitHub PoCs in < 5 seconds.
2. Run `cveq CVE-2024-21762 --save`: prints confirmation that the CVE was appended to `~/.cveq/journal.md`.
3. Run `cveq journal`: outputs a clean terminal table displaying recent entries (Date, CVE, Severity, Summary).
4. Run `cveq CVE-9999-0001` (invalid/unknown): outputs a graceful error message without crashing.
5. Built cross-platform by design (pure Node.js, no OS-specific code paths); verified on Windows with Node 18+.

## The POC Boundary
- **CLI Commands:**
  - `cveq <CVE-ID>`: fetches and displays vulnerability report.
  - `cveq <CVE-ID> --save`: fetches, displays, and appends to journal.
  - `cveq journal`: displays the 20 most recent journal entries.
- **Data Ingestion & Error Handling:**
  - Official CVE record: CVE.org / NVD public APIs (raw text cleaned and formatted).
  - Severity fallback: If no CVSS score is available for a CVE, display `Severity: not scored` instead of failing or inventing a value.
  - PoC lookup: GitHub Search API (top 3–5 repos by stars, forks excluded, CVE ID keyword match; displays stars, last updated, repo URL).
  - Rate-limit handling: Clean 403 handling on GitHub Search with a friendly hint to set `GITHUB_TOKEN` rather than an unhandled stack trace.
  - Authentication: Unauthenticated by default; optional `GITHUB_TOKEN` environment variable support.
- **Storage:** Local centralized markdown file at `~/.cveq/journal.md`.

## Later
- Optional AI plain-English summarization layer (for non-technical stakeholders).
- Journal search, filtering, and tag support (`cveq journal --filter ...`).
- EPSS (Exploit Prediction Scoring System) score integration.
- Export formats (JSON output via `--json` flag).

## Explicitly Cut
- **Exploit execution / automated payload launching:** Not an attack framework; keeps scope safe, legal, and educational.
- **Active network/port scanning:** Out of scope; cveq is a triage tool, not Nmap.
- **Web GUI / electron app:** Terminal-native workflow fits the target audience much better and avoids bloat.
- **Database / server backend / user accounts:** Unnecessary complexity; a local markdown journal meets the user's need and integrates directly with Obsidian.
- **Automated exploit code ranking / sandboxing:** Misleading security claims; the tool surfaces stars and metadata, leaving evaluation to the human analyst.
