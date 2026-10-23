import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeCveId, validateCveId } from '../src/utils/validator.js';

test('normalizeCveId normalizes lowercase and trims whitespace', () => {
  assert.equal(normalizeCveId('  cve-2024-21762  '), 'CVE-2024-21762');
});

test('normalizeCveId prepends CVE- to bare year-sequence numbers', () => {
  assert.equal(normalizeCveId('2024-21762'), 'CVE-2024-21762');
  assert.equal(normalizeCveId('2021-44228'), 'CVE-2021-44228');
});

test('normalizeCveId preserves canonical CVE format', () => {
  assert.equal(normalizeCveId('CVE-2024-21762'), 'CVE-2024-21762');
});

test('validateCveId accepts valid formats', () => {
  assert.deepEqual(validateCveId('CVE-2024-21762'), {
    valid: true,
    cveId: 'CVE-2024-21762'
  });

  assert.deepEqual(validateCveId('2024-21762'), {
    valid: true,
    cveId: 'CVE-2024-21762'
  });

  assert.deepEqual(validateCveId('cve-2021-44228'), {
    valid: true,
    cveId: 'CVE-2021-44228'
  });
});

test('validateCveId rejects invalid formats with format-hint error', () => {
  const res1 = validateCveId('invalid');
  assert.equal(res1.valid, false);
  assert.match(res1.error, /Invalid CVE format/);

  const res2 = validateCveId('CVE-99-1');
  assert.equal(res2.valid, false);

  const res3 = validateCveId('hello');
  assert.equal(res3.valid, false);
});
