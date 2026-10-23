/**
 * Zero-dependency ANSI styling helper with Windows/TTY color safety.
 * Gracefully degrades to plain text when stdout is not a TTY or NO_COLOR is set.
 */

export const isColorSupported = Boolean(
  process.stdout &&
  process.stdout.isTTY &&
  !process.env.NO_COLOR &&
  process.env.TERM !== 'dumb'
);

const wrap = (open, close) => (str) =>
  isColorSupported ? `${open}${str}${close}` : String(str);

export const bold = wrap('\x1b[1m', '\x1b[22m');
export const dim = wrap('\x1b[2m', '\x1b[22m');
export const underline = wrap('\x1b[4m', '\x1b[24m');

export const red = wrap('\x1b[31m', '\x1b[39m');
export const green = wrap('\x1b[32m', '\x1b[39m');
export const yellow = wrap('\x1b[33m', '\x1b[39m');
export const blue = wrap('\x1b[34m', '\x1b[39m');
export const magenta = wrap('\x1b[35m', '\x1b[39m');
export const cyan = wrap('\x1b[36m', '\x1b[39m');
export const white = wrap('\x1b[37m', '\x1b[39m');
export const gray = wrap('\x1b[90m', '\x1b[39m');

/**
 * Format CVSS severity badge with appropriate color coding.
 * @param {string} severity
 * @param {number|null} score
 * @returns {string}
 */
export function formatSeverityBadge(severity, score = null) {
  const norm = (severity || 'NOT SCORED').toUpperCase();
  const scoreStr = score !== null && score !== undefined ? ` ${Number(score).toFixed(1)}` : '';
  const label = `[${norm}${scoreStr}]`;

  switch (norm) {
    case 'CRITICAL':
      return bold(red(label));
    case 'HIGH':
      return bold(yellow(label));
    case 'MEDIUM':
      return yellow(label);
    case 'LOW':
      return green(label);
    case 'NOT SCORED':
    default:
      return dim(label);
  }
}
