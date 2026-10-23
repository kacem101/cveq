/**
 * GitHub Search API Client for Proof-of-Concept (PoC) Repositories
 */

const GITHUB_SEARCH_BASE = 'https://api.github.com/search/repositories';
const DEFAULT_TIMEOUT_MS = 8000;

/**
 * Searches public GitHub repositories for CVE proof of concepts.
 *
 * @param {string} cveId
 * @param {number} [timeoutMs=8000]
 * @returns {Promise<{
 *   success: boolean,
 *   rateLimited: boolean,
 *   items: Array<{ name: string, stars: number, updated: string, url: string }>,
 *   error?: string
 * }>}
 */
export async function searchGithubPocs(cveId, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const query = `${cveId} in:name,description fork:false`;
  const url = `${GITHUB_SEARCH_BASE}?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=5`;

  const headers = {
    'User-Agent': 'cveq-cli',
    'Accept': 'application/vnd.github+json'
  };

  if (process.env.GITHUB_TOKEN) {
    headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers
    });

    clearTimeout(timeoutId);

    if (res.status === 403) {
      return {
        success: true,
        rateLimited: true,
        items: []
      };
    }

    if (!res.ok) {
      return {
        success: false,
        rateLimited: false,
        items: [],
        error: `GitHub search failed (HTTP ${res.status}).`
      };
    }

    const data = await res.json();
    const rawItems = Array.isArray(data.items) ? data.items : [];

    const items = rawItems.map((repo) => ({
      name: repo.full_name,
      stars: typeof repo.stargazers_count === 'number' ? repo.stargazers_count : 0,
      updated: repo.updated_at ? repo.updated_at.slice(0, 10) : 'Unknown',
      url: repo.html_url
    }));

    return {
      success: true,
      rateLimited: false,
      items
    };
  } catch (err) {
    clearTimeout(timeoutId);

    if (err.name === 'AbortError' || err.code === 'UND_ERR_CONNECT_TIMEOUT') {
      return {
        success: false,
        rateLimited: false,
        items: [],
        error: 'GitHub search timed out.'
      };
    }

    return {
      success: false,
      rateLimited: false,
      items: [],
      error: `GitHub search error: ${err.message}`
    };
  }
}
