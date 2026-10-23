import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatReport } from '../src/formatters/report.js';

test('formatReport renders GitHub PoCs when items exist', () => {
  const cve = {
    cveId: 'CVE-2024-21762',
    severity: 'CRITICAL',
    score: 9.8,
    published: '2024-02-09',
    summary: 'A vulnerability summary.',
    affected: ['Fortinet FortiOS'],
    affectedMoreCount: 0,
    references: ['https://example.com']
  };

  const poc = {
    success: true,
    rateLimited: false,
    items: [
      {
        name: 'h4x0r-dz/CVE-2024-21762',
        stars: 150,
        updated: '2024-02-15',
        url: 'https://github.com/h4x0r-dz/CVE-2024-21762'
      }
    ]
  };

  const output = formatReport({ cve, poc });
  assert.match(output, /Public PoCs \(GitHub\):/);
  assert.match(output, /h4x0r-dz\/CVE-2024-21762/);
  assert.match(output, /★ 150/);
  assert.match(output, /updated 2024-02-15/);
});

test('formatReport renders rate limit notice when rateLimited is true', () => {
  const cve = {
    cveId: 'CVE-2024-21762',
    severity: 'CRITICAL',
    score: 9.8,
    published: '2024-02-09',
    summary: 'A vulnerability summary.',
    affected: [],
    affectedMoreCount: 0,
    references: []
  };

  const poc = {
    success: true,
    rateLimited: true,
    items: []
  };

  const output = formatReport({ cve, poc });
  assert.match(output, /GitHub search rate limit reached/);
  assert.match(output, /Set GITHUB_TOKEN environment variable/);
});

test('formatReport renders friendly message when zero PoCs found', () => {
  const cve = {
    cveId: 'CVE-2024-21762',
    severity: 'CRITICAL',
    score: 9.8,
    published: '2024-02-09',
    summary: 'A vulnerability summary.',
    affected: [],
    affectedMoreCount: 0,
    references: []
  };

  const poc = {
    success: true,
    rateLimited: false,
    items: []
  };

  const output = formatReport({ cve, poc });
  assert.match(output, /No public PoC found on GitHub/);
});
