import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {
  formatEntryMarkdown,
  saveEntry,
  listEntries
} from '../src/journal/manager.js';
import { formatJournalTable } from '../src/formatters/table.js';

let testDir;
let testJournalPath;

beforeEach(async () => {
  testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cveq-journal-test-'));
  testJournalPath = path.join(testDir, 'journal.md');
});

afterEach(async () => {
  try {
    await fs.rm(testDir, { recursive: true, force: true });
  } catch {
    // Ignore cleanup error in temp dir
  }
});

test('formatEntryMarkdown formats entry with score and top PoC', () => {
  const md = formatEntryMarkdown({
    date: '2026-10-24',
    cveId: 'CVE-2024-21762',
    severity: 'CRITICAL',
    score: 9.6,
    summary: 'A critical out-of-bounds write vulnerability.',
    pocs: [{ url: 'https://github.com/example/poc', stars: 150 }]
  });

  assert.match(md, /## 2026-10-24 — CVE-2024-21762/);
  assert.match(md, /- \*\*Severity:\*\* CRITICAL \(CVSS 9.6\)/);
  assert.match(md, /- \*\*Summary:\*\* A critical out-of-bounds write vulnerability\./);
  assert.match(md, /- \*\*Top PoC:\*\* https:\/\/github\.com\/example\/poc \(★ 150\)/);
});

test('formatEntryMarkdown formats entry without score and no PoCs', () => {
  const md = formatEntryMarkdown({
    date: '2026-10-24',
    cveId: 'CVE-2024-99999',
    severity: 'NOT SCORED',
    score: null,
    summary: 'Vulnerability summary without PoC.',
    pocs: []
  });

  assert.match(md, /- \*\*Severity:\*\* NOT SCORED/);
  assert.match(md, /- \*\*Top PoC:\*\* none found/);
});

test('formatEntryMarkdown truncates summary exceeding 200 chars', () => {
  const longSummary = 'A'.repeat(300);
  const md = formatEntryMarkdown({
    cveId: 'CVE-2024-0001',
    summary: longSummary
  });

  assert.match(md, /\.\.\./);
  const summaryLine = md.split('\n').find((line) => line.startsWith('- **Summary:**'));
  // "- **Summary:** " is 15 chars + max ~200 = ~215
  assert.ok(summaryLine.length <= 220);
});

test('saveEntry creates file with header and prepends newest entries first', () => {
  return (async () => {
    // Save entry 1
    await saveEntry(
      {
        date: '2026-10-23',
        cveId: 'CVE-2023-4863',
        severity: 'HIGH',
        score: 8.8,
        summary: 'Heap buffer overflow in WebP.',
        pocs: [{ url: 'https://github.com/first/poc', stars: 50 }]
      },
      testJournalPath
    );

    let content = await fs.readFile(testJournalPath, 'utf8');
    assert.ok(content.startsWith('# cveq Research Journal\n\n'));
    assert.match(content, /CVE-2023-4863/);

    // Save entry 2 (newer)
    await saveEntry(
      {
        date: '2026-10-24',
        cveId: 'CVE-2024-21762',
        severity: 'CRITICAL',
        score: 9.6,
        summary: 'Out-of-bounds write in FortiOS.',
        pocs: [{ url: 'https://github.com/second/poc', stars: 150 }]
      },
      testJournalPath
    );

    content = await fs.readFile(testJournalPath, 'utf8');
    assert.ok(content.startsWith('# cveq Research Journal\n\n'));

    // Verify CVE-2024-21762 is prepended BEFORE CVE-2023-4863
    const pos2024 = content.indexOf('CVE-2024-21762');
    const pos2023 = content.indexOf('CVE-2023-4863');
    assert.ok(pos2024 !== -1 && pos2023 !== -1);
    assert.ok(pos2024 < pos2023, 'Newest entry must appear before older entry');
  })();
});

test('listEntries returns empty array for non-existent file', async () => {
  const nonExistent = path.join(testDir, 'does-not-exist.md');
  const entries = await listEntries(nonExistent);
  assert.deepEqual(entries, []);
});

test('listEntries parses prepended entries up to 20', async () => {
  for (let i = 1; i <= 25; i++) {
    const id = `CVE-2024-${String(i).padStart(4, '0')}`;
    await saveEntry(
      {
        date: '2026-10-24',
        cveId: id,
        severity: 'HIGH',
        score: 7.5,
        summary: `Summary for ${id}`,
        pocs: []
      },
      testJournalPath
    );
  }

  const entries = await listEntries(testJournalPath);
  assert.equal(entries.length, 20);
  // Last inserted was CVE-2024-0025, so it should be first in list
  assert.equal(entries[0].cveId, 'CVE-2024-0025');
});

test('listEntries tolerates missing fields, different dashes, and bullets (amendment 5)', async () => {
  const malformedJournal = `# cveq Research Journal

## 2026-10-24 — CVE-2024-1001
- **Severity:** CRITICAL (CVSS 9.8)
- **Summary:** Complete entry.
- **Top PoC:** https://github.com/poc/one (★ 10)

## 2026-10-23 - CVE-2024-1002
- **Summary:** Entry with standard hyphen and missing severity and PoC.

## 2026-10-22 – CVE-2024-1003
* **Severity:** HIGH
* **Top PoC:** https://github.com/poc/three (★ 5)

## 2026-10-21 — CVE-2024-1004

## 2026-10-20 — CVE-2024-1005
Some unformatted notes without any bullet points.
`;

  await fs.writeFile(testJournalPath, malformedJournal, 'utf8');
  const entries = await listEntries(testJournalPath);

  assert.equal(entries.length, 5);

  // 1. Complete entry
  assert.equal(entries[0].cveId, 'CVE-2024-1001');
  assert.equal(entries[0].severity, 'CRITICAL (CVSS 9.8)');
  assert.equal(entries[0].summary, 'Complete entry.');
  assert.equal(entries[0].topPoc, 'https://github.com/poc/one (★ 10)');

  // 2. Standard hyphen, missing severity & PoC
  assert.equal(entries[1].cveId, 'CVE-2024-1002');
  assert.equal(entries[1].severity, 'NOT SCORED');
  assert.equal(entries[1].summary, 'Entry with standard hyphen and missing severity and PoC.');
  assert.equal(entries[1].topPoc, 'none found');

  // 3. En-dash and asterisk bullets, missing summary
  assert.equal(entries[2].cveId, 'CVE-2024-1003');
  assert.equal(entries[2].severity, 'HIGH');
  assert.equal(entries[2].summary, 'No summary available.');
  assert.equal(entries[2].topPoc, 'https://github.com/poc/three (★ 5)');

  // 4. Header only, completely empty body
  assert.equal(entries[3].cveId, 'CVE-2024-1004');
  assert.equal(entries[3].severity, 'NOT SCORED');
  assert.equal(entries[3].summary, 'No summary available.');
  assert.equal(entries[3].topPoc, 'none found');

  // 5. Unformatted notes body
  assert.equal(entries[4].cveId, 'CVE-2024-1005');
  assert.equal(entries[4].severity, 'NOT SCORED');
  assert.equal(entries[4].summary, 'No summary available.');
  assert.equal(entries[4].topPoc, 'none found');
});

test('formatJournalTable returns guidance message when empty', () => {
  const emptyOutput = formatJournalTable([]);
  assert.match(emptyOutput, /Journal is empty — run cveq <CVE-ID> --save to start your research log\./);

  const nullOutput = formatJournalTable(null);
  assert.match(nullOutput, /Journal is empty — run cveq <CVE-ID> --save to start your research log\./);
});

test('formatJournalTable renders clean table with headers and columns', () => {
  const entries = [
    {
      date: '2026-10-24',
      cveId: 'CVE-2024-21762',
      severity: 'CRITICAL (CVSS 9.6)',
      summary: 'Out-of-bounds write vulnerability in Fortinet FortiOS.'
    }
  ];

  const table = formatJournalTable(entries);
  assert.match(table, /Research Journal \(Recent Entries\):/);
  assert.match(table, /Date\s+\|\s+CVE ID\s+\|\s+Severity\s+\|\s+Summary/);
  assert.match(table, /2026-10-24/);
  assert.match(table, /CVE-2024-21762/);
  assert.match(table, /CRITICAL \(CVSS 9.6\)/);
  assert.match(table, /Out-of-bounds/);
});
