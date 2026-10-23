import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wordWrap, formatReport } from '../src/formatters/report.js';

test('wordWrap wraps text to line width without splitting words', () => {
  const input = 'This is a test of the word wrapping utility function in the terminal.';
  const wrapped = wordWrap(input, 20);
  const lines = wrapped.split('\n');

  for (const line of lines) {
    assert.ok(line.length <= 20, `Line exceeds width: "${line}"`);
  }
  assert.equal(lines.join(' '), input);
});

test('formatReport generates complete report with severity badge and wrapped summary', () => {
  const cve = {
    cveId: 'CVE-2024-21762',
    severity: 'CRITICAL',
    score: 9.8,
    published: '2024-02-09',
    summary: 'An out-of-bounds write vulnerability in FortiOS allows a remote unauthenticated attacker to execute arbitrary code.',
    affected: ['Fortinet FortiOS', 'Fortinet FortiProxy'],
    affectedMoreCount: 0,
    references: ['https://fortiguard.com/psirt/FG-IR-24-015']
  };

  const output = formatReport({ cve });
  assert.match(output, /CVE-2024-21762/);
  assert.match(output, /CRITICAL/);
  assert.match(output, /Published: 2024-02-09/);
  assert.match(output, /Fortinet FortiOS/);
  assert.match(output, /FG-IR-24-015/);
});

test('formatReport handles NOT SCORED fallback gracefully', () => {
  const cve = {
    cveId: 'CVE-2024-0001',
    severity: 'NOT SCORED',
    score: null,
    summary: 'A vulnerability pending scoring.',
    affected: [],
    affectedMoreCount: 0,
    references: []
  };

  const output = formatReport({ cve });
  assert.match(output, /NOT SCORED/);
  assert.match(output, /None specified/);
});
