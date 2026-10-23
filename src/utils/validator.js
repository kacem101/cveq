/**
 * CVE Input Validator and Normalizer
 */

const CVE_REGEX = /^CVE-\d{4}-\d{4,}$/;

/**
 * Normalizes input:
 * 1. Trims whitespace
 * 2. Converts lowercase to uppercase (e.g. cve-2024-21762 -> CVE-2024-21762)
 * 3. Prepends 'CVE-' if bare numbers are provided (e.g. 2024-21762 -> CVE-2024-21762)
 *
 * @param {string} raw
 * @returns {string}
 */
export function normalizeCveId(raw) {
  if (typeof raw !== 'string') return '';
  let cleaned = raw.trim().toUpperCase();

  // If input matches bare year-seq pattern (e.g., 2024-21762)
  if (/^\d{4}-\d{4,}$/.test(cleaned)) {
    cleaned = `CVE-${cleaned}`;
  }

  return cleaned;
}

/**
 * Validates normalized CVE ID against standard pattern.
 *
 * @param {string} raw
 * @returns {{ valid: boolean, cveId?: string, error?: string }}
 */
export function validateCveId(raw) {
  const normalized = normalizeCveId(raw);

  if (CVE_REGEX.test(normalized)) {
    return { valid: true, cveId: normalized };
  }

  return {
    valid: false,
    error: 'Error: Invalid CVE format. Expected CVE-YYYY-NNNN (e.g., CVE-2024-21762)'
  };
}
