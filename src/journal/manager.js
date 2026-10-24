/**
 * Centralized Research Journal Manager (~/.cveq/journal.md)
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

const HEADER = '# cveq Research Journal\n\n';

/**
 * Returns the default canonical path to the journal file.
 * @returns {string}
 */
export function getJournalPath() {
  return path.join(os.homedir(), '.cveq', 'journal.md');
}

/**
 * Formats a single markdown research journal entry.
 *
 * @param {object} params
 * @param {string} [params.date]
 * @param {string} params.cveId
 * @param {string} params.severity
 * @param {number|null} [params.score]
 * @param {string} params.summary
 * @param {Array<{ url: string, stars: number }>} [params.pocs]
 * @returns {string}
 */
export function formatEntryMarkdown({
  date = new Date().toISOString().slice(0, 10),
  cveId,
  severity = 'NOT SCORED',
  score = null,
  summary = '',
  pocs = []
}) {
  const normSev = severity.toUpperCase();
  const sevDisplay =
    score !== null && score !== undefined
      ? `${normSev} (CVSS ${Number(score).toFixed(1)})`
      : normSev;

  // Clean summary and truncate to ~200 characters
  const cleanSummary = (summary || '').replace(/\s+/g, ' ').trim();
  const truncatedSummary =
    cleanSummary.length > 200
      ? cleanSummary.slice(0, 197).trim() + '...'
      : cleanSummary || 'No summary available.';

  // Top PoC formatting
  let topPoc = 'none found';
  if (Array.isArray(pocs) && pocs.length > 0 && pocs[0]?.url) {
    topPoc = `${pocs[0].url} (★ ${pocs[0].stars ?? 0})`;
  }

  return (
    `## ${date} — ${cveId}\n\n` +
    `- **Severity:** ${sevDisplay}\n` +
    `- **Summary:** ${truncatedSummary}\n` +
    `- **Top PoC:** ${topPoc}\n\n`
  );
}

/**
 * Saves a CVE entry by prepending it to the journal file.
 *
 * @param {object} entryData
 * @param {string} [customPath]
 * @returns {Promise<string>}
 */
export async function saveEntry(entryData, customPath = null) {
  const filePath = customPath || getJournalPath();
  const dirPath = path.dirname(filePath);

  await fs.mkdir(dirPath, { recursive: true });

  let existing = '';
  try {
    existing = await fs.readFile(filePath, 'utf8');
  } catch {
    existing = '';
  }

  const newEntry = formatEntryMarkdown(entryData);

  let updatedContent = '';
  if (!existing || !existing.trim()) {
    updatedContent = HEADER + newEntry;
  } else if (existing.startsWith(HEADER)) {
    const afterHeader = existing.slice(HEADER.length);
    updatedContent = HEADER + newEntry + afterHeader.trimStart();
  } else if (existing.startsWith('# cveq Research Journal')) {
    const headerEndIndex = existing.indexOf('\n');
    const headerPart = existing.slice(0, headerEndIndex + 1);
    const bodyPart = existing.slice(headerEndIndex + 1);
    updatedContent = headerPart + '\n' + newEntry + bodyPart.trimStart();
  } else {
    updatedContent = HEADER + newEntry + existing;
  }

  await fs.writeFile(filePath, updatedContent, 'utf8');
  return filePath;
}

/**
 * Parses journal markdown and returns up to 20 recent entries.
 * Tolerates missing fields without throwing errors.
 *
 * @param {string} [customPath]
 * @returns {Promise<Array<{ date: string, cveId: string, severity: string, summary: string, topPoc: string }>>}
 */
export async function listEntries(customPath = null) {
  const filePath = customPath || getJournalPath();

  let content = '';
  try {
    content = await fs.readFile(filePath, 'utf8');
  } catch {
    return [];
  }

  if (!content.trim()) return [];

  // Split into sections by header: ## YYYY-MM-DD — CVE-XXXX-YYYY (tolerating em-dash, en-dash, or hyphen)
  const entryRegex = /##\s*(\d{4}-\d{2}-\d{2})\s*[—–-]\s*(CVE-[\w-]+)/gi;
  const matches = [...content.matchAll(entryRegex)];

  if (matches.length === 0) return [];

  const entries = [];

  for (let i = 0; i < matches.length; i++) {
    if (entries.length >= 20) break;

    const match = matches[i];
    const date = match[1];
    const cveId = match[2].toUpperCase();

    const startIndex = match.index + match[0].length;
    const endIndex = i + 1 < matches.length ? matches[i + 1].index : content.length;
    const body = content.slice(startIndex, endIndex);

    // Extract fields tolerantly (accepting - or * bullets, and case-insensitive)
    const sevMatch = body.match(/[-*]\s*\*\*Severity:\*\*\s*(.+)/i);
    const sumMatch = body.match(/[-*]\s*\*\*Summary:\*\*\s*(.+)/i);
    const pocMatch = body.match(/[-*]\s*\*\*Top PoC:\*\*\s*(.+)/i);

    entries.push({
      date,
      cveId,
      severity: sevMatch ? sevMatch[1].trim() : 'NOT SCORED',
      summary: sumMatch ? sumMatch[1].trim() : 'No summary available.',
      topPoc: pocMatch ? pocMatch[1].trim() : 'none found'
    });
  }

  return entries;
}
