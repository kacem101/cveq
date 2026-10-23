/**
 * Terminal Vulnerability Report Formatter
 */

import { bold, white, cyan, underline, gray, dim, formatSeverityBadge } from './ansi.js';

/**
 * Word wraps text to target terminal width without breaking words.
 *
 * @param {string} text
 * @param {number} [maxWidth]
 * @param {string} [indent='']
 * @returns {string}
 */
export function wordWrap(text, maxWidth, indent = '') {
  if (!text) return '';
  const width = maxWidth || (process.stdout && process.stdout.columns) || 80;
  const usableWidth = Math.max(20, width - indent.length);

  // Normalize all whitespaces/newlines into single spaces
  const words = text.replace(/\s+/g, ' ').trim().split(' ');
  const lines = [];
  let currentLine = '';

  for (const word of words) {
    if (!currentLine) {
      currentLine = word;
    } else if (currentLine.length + 1 + word.length <= usableWidth) {
      currentLine += ' ' + word;
    } else {
      lines.push(indent + currentLine);
      currentLine = word;
    }
  }

  if (currentLine) {
    lines.push(indent + currentLine);
  }

  return lines.join('\n');
}

/**
 * Formats full terminal report
 *
 * @param {object} params
 * @param {object} params.cve
 * @param {object} [params.poc]
 * @returns {string}
 */
export function formatReport({ cve, poc = null }) {
  const sections = [];

  // 1. Header Banner
  const badge = formatSeverityBadge(cve.severity, cve.score);
  sections.push(`\n${bold(white(cve.cveId))}  ${badge}`);

  // 2. Vulnerability Description
  sections.push(`\n${bold('Description:')}`);
  sections.push(wordWrap(cve.summary, null, '  '));

  // 3. Affected Products
  sections.push(`\n${bold('Affected Products:')}`);
  if (cve.affected && cve.affected.length > 0) {
    for (const prod of cve.affected) {
      sections.push(`  • ${prod}`);
    }
    if (cve.affectedMoreCount > 0) {
      sections.push(gray(`  (+ ${cve.affectedMoreCount} more)`));
    }
  } else {
    sections.push(gray('  None specified in official record'));
  }

  // 4. Official References
  sections.push(`\n${bold('Official References:')}`);
  if (cve.references && cve.references.length > 0) {
    for (const ref of cve.references) {
      sections.push(`  • ${cyan(underline(ref))}`);
    }
  } else {
    sections.push(gray('  None provided in official record'));
  }

  // 5. GitHub PoCs (if provided or explicitly requested)
  if (poc) {
    sections.push(`\n${bold('Public PoCs (GitHub):')}`);

    if (poc.rateLimited) {
      sections.push(
        `  ${gray('⚠ GitHub search rate limit reached (10 req/min). Set GITHUB_TOKEN environment variable to increase limit.')}`
      );
    } else if (poc.items && poc.items.length > 0) {
      for (const item of poc.items) {
        const stars = `★ ${item.stars.toLocaleString()}`;
        sections.push(
          `  • ${bold(item.name)} ${gray(`(${stars}, updated ${item.updated})`)}\n    ${cyan(underline(item.url))}`
        );
      }
    } else {
      sections.push(gray('  No public PoC found on GitHub.'));
    }
  }

  return sections.join('\n') + '\n';
}
