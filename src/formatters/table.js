/**
 * Zero-dependency ASCII Table Formatter for Journal Output
 */

import { bold, formatSeverityBadge, gray } from './ansi.js';

/**
 * Truncates text with ellipsis if it exceeds maxLength.
 * @param {string} text
 * @param {number} max
 * @returns {string}
 */
function truncate(text, max) {
  if (!text) return '';
  if (text.length <= max) return text;
  return text.slice(0, max - 3) + '...';
}

/**
 * Formats an array of journal entries into an ASCII table.
 *
 * @param {Array<{ date: string, cveId: string, severity: string, summary: string }>} entries
 * @returns {string}
 */
export function formatJournalTable(entries) {
  if (!entries || entries.length === 0) {
    return 'Journal is empty — run cveq <CVE-ID> --save to start your research log.\n';
  }

  const dateWidth = 10;
  const cveWidth = 16;
  const sevWidth = 20;
  const termWidth = (process.stdout && process.stdout.columns) || 80;
  // Calculate remaining width for summary (min 20)
  const sumWidth = Math.max(20, termWidth - (dateWidth + cveWidth + sevWidth + 10));

  const pad = (str, len) => (str + ' '.repeat(Math.max(0, len - str.length))).slice(0, len);

  const header = `  ${pad('Date', dateWidth)} | ${pad('CVE ID', cveWidth)} | ${pad('Severity', sevWidth)} | ${pad('Summary', sumWidth)}`;
  const separator = `  ${'-'.repeat(dateWidth)}-+-${'-'.repeat(cveWidth)}-+-${'-'.repeat(sevWidth)}-+-${'-'.repeat(sumWidth)}`;

  const rows = entries.map((e) => {
    const d = pad(e.date || '', dateWidth);
    const c = pad(e.cveId || '', cveWidth);
    const s = pad(truncate(e.severity || 'NOT SCORED', sevWidth), sevWidth);
    const sum = pad(truncate(e.summary || '', sumWidth), sumWidth);
    return `  ${d} | ${c} | ${s} | ${sum}`;
  });

  return `\n${bold('Research Journal (Recent Entries):')}\n\n${bold(header)}\n${gray(separator)}\n${rows.join('\n')}\n`;
}
