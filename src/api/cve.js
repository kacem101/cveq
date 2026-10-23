/**
 * Official CVE.org (CVE Services v5) API Client
 */

const CVE_API_BASE = 'https://cveawg.mitre.org/api/cve';
const DEFAULT_TIMEOUT_MS = 8000;

/**
 * Calculates severity rating from CVSS base score if baseSeverity is absent.
 * @param {number} score
 * @returns {string}
 */
function scoreToSeverity(score) {
  if (typeof score !== 'number' || isNaN(score)) return 'NOT SCORED';
  if (score >= 9.0) return 'CRITICAL';
  if (score >= 7.0) return 'HIGH';
  if (score >= 4.0) return 'MEDIUM';
  if (score > 0) return 'LOW';
  return 'NOT SCORED';
}

/**
 * Extracts CVSS metrics from CNA or ADP containers.
 * @param {object} cna
 * @param {Array} adpList
 * @returns {{ severity: string, score: number|null }}
 */
function extractCvss(cna = {}, adpList = []) {
  const metricSources = [];

  if (Array.isArray(cna.metrics)) {
    metricSources.push(...cna.metrics);
  }

  if (Array.isArray(adpList)) {
    for (const adp of adpList) {
      if (Array.isArray(adp.metrics)) {
        metricSources.push(...adp.metrics);
      }
    }
  }

  for (const item of metricSources) {
    const cvss = item.cvssV3_1 || item.cvssV3_0 || item.cvssV4_0 || item.cvssV2_0;
    if (cvss && (cvss.baseScore !== undefined || cvss.baseSeverity)) {
      const score = typeof cvss.baseScore === 'number' ? cvss.baseScore : (parseFloat(cvss.baseScore) || null);
      const severity = (cvss.baseSeverity || scoreToSeverity(score)).toUpperCase();
      return { severity, score };
    }
  }

  return { severity: 'NOT SCORED', score: null };
}

/**
 * Extracts affected products, deduplicating and formatting as 'Vendor Product'
 * @param {Array} affectedList
 * @returns {{ items: string[], moreCount: number }}
 */
function extractAffected(affectedList = []) {
  if (!Array.isArray(affectedList)) {
    return { items: [], moreCount: 0 };
  }

  const seen = new Set();
  const products = [];

  for (const entry of affectedList) {
    const vendor = (entry.vendor || '').trim();
    const product = (entry.product || '').trim();

    let name = '';
    if (vendor && product && !product.toLowerCase().startsWith(vendor.toLowerCase())) {
      name = `${vendor} ${product}`;
    } else {
      name = product || vendor || 'Unknown';
    }

    if (name && !seen.has(name.toLowerCase())) {
      seen.add(name.toLowerCase());
      products.push(name);
    }
  }

  const items = products.slice(0, 3);
  const moreCount = Math.max(0, products.length - 3);

  return { items, moreCount };
}

/**
 * Extracts top 5 unique reference URLs.
 * @param {Array} refList
 * @returns {string[]}
 */
function extractReferences(refList = []) {
  if (!Array.isArray(refList)) return [];

  const seen = new Set();
  const urls = [];

  for (const ref of refList) {
    const url = (ref.url || '').trim();
    if (url && !seen.has(url)) {
      seen.add(url);
      urls.push(url);
    }
    if (urls.length >= 5) break;
  }

  return urls;
}

/**
 * Extracts English or default description.
 * @param {Array} descList
 * @returns {string}
 */
function extractDescription(descList = []) {
  if (!Array.isArray(descList) || descList.length === 0) {
    return 'No description provided in official record.';
  }

  const enDesc = descList.find(d => (d.lang || '').toLowerCase().startsWith('en'));
  if (enDesc && enDesc.value) {
    return enDesc.value.trim();
  }

  return (descList[0].value || '').trim() || 'No description provided in official record.';
}

/**
 * Fetches and normalizes official CVE record from CVE.org
 *
 * @param {string} cveId
 * @param {number} [timeoutMs=8000]
 * @returns {Promise<{
 *   success: boolean,
 *   data?: {
 *     cveId: string,
 *     severity: string,
 *     score: number|null,
 *     summary: string,
 *     affected: string[],
 *     affectedMoreCount: number,
 *     references: string[]
 *   },
 *   error?: string
 * }>}
 */
export async function fetchCveRecord(cveId, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${CVE_API_BASE}/${cveId}`, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'cveq-cli'
      }
    });

    clearTimeout(timeoutId);

    if (res.status === 404) {
      return {
        success: false,
        error: `CVE not found in official records: ${cveId}`
      };
    }

    if (!res.ok) {
      return {
        success: false,
        error: `Could not fetch CVE record (HTTP ${res.status}). The service may be temporarily unavailable.`
      };
    }

    const json = await res.json();
    const cna = (json.containers && json.containers.cna) || {};
    const adpList = (json.containers && json.containers.adp) || [];

    const summary = extractDescription(cna.descriptions);
    const { severity, score } = extractCvss(cna, adpList);
    const { items: affected, moreCount: affectedMoreCount } = extractAffected(cna.affected);
    const references = extractReferences(cna.references);

    return {
      success: true,
      data: {
        cveId,
        severity,
        score,
        summary,
        affected,
        affectedMoreCount,
        references
      }
    };
  } catch (err) {
    clearTimeout(timeoutId);

    if (err.name === 'AbortError' || err.code === 'UND_ERR_CONNECT_TIMEOUT') {
      return {
        success: false,
        error: 'Error: Request timed out. Check your network connection.'
      };
    }

    return {
      success: false,
      error: `Could not fetch CVE record: ${err.message || 'Check your network connection.'}`
    };
  }
}
