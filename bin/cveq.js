#!/usr/bin/env node

import { validateCveId } from '../src/utils/validator.js';
import { bold, cyan, green, yellow, red, dim, gray } from '../src/formatters/ansi.js';
import { fetchCveRecord } from '../src/api/cve.js';
import { formatReport } from '../src/formatters/report.js';

const VERSION = '0.1.0';

function showCompactHelp() {
  console.log(`
${bold('cveq')} — Instant zero-dependency CVE triage CLI tool (v${VERSION})

${bold('Usage:')}
  cveq <CVE-ID> [--save]       Triage a CVE and optionally save to journal
  cveq journal                 View recent investigated CVEs
  cveq --help                  Show complete options and documentation

${bold('Example:')}
  ${cyan('cveq CVE-2024-21762')}
`);
}

function showFullHelp() {
  console.log(`
${bold('cveq')} — Instant zero-dependency CVE triage CLI tool (v${VERSION})

${bold('Usage:')}
  cveq <CVE-ID> [options]
  cveq journal

${bold('Commands & Arguments:')}
  <CVE-ID>                     Vulnerability identifier (e.g. CVE-2024-21762, 2024-21762)
  journal                      Display last 20 research journal entries (~/.cveq/journal.md)

${bold('Options:')}
  --save                       Append vulnerability lookup to ~/.cveq/journal.md
  -h, --help                   Display this help screen
  -v, --version                Display current version

${bold('Environment Variables:')}
  GITHUB_TOKEN                 Optional GitHub Personal Access Token to avoid
                               unauthenticated rate limits (10 req/min -> 30 req/min)
  NO_COLOR                     Disable ANSI color formatting

${bold('Examples:')}
  ${cyan('cveq CVE-2024-21762')}
  ${cyan('cveq 2024-21762 --save')}
  ${cyan('cveq journal')}
`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    showCompactHelp();
    process.exit(0);
  }

  const firstArg = args[0];

  if (firstArg === '--help' || firstArg === '-h') {
    showFullHelp();
    process.exit(0);
  }

  if (firstArg === '--version' || firstArg === '-v') {
    console.log(`cveq v${VERSION}`);
    process.exit(0);
  }

  if (firstArg === 'journal') {
    console.log(dim('Journal command: will be connected in Slice 4.'));
    process.exit(0);
  }

  // CVE Lookup
  const validation = validateCveId(firstArg);
  if (!validation.valid) {
    console.error(red(validation.error));
    process.exit(1);
  }

  const cveId = validation.cveId;
  const isSave = args.includes('--save');

  // Fetch official CVE record
  const cveResult = await fetchCveRecord(cveId);
  if (!cveResult.success) {
    console.error(red(cveResult.error));
    process.exit(1);
  }

  // Render report
  const reportOutput = formatReport({ cve: cveResult.data });
  process.stdout.write(reportOutput);

  if (isSave) {
    console.log(dim(`Note: --save will be connected in Slice 4.`));
  }
}

main().catch((err) => {
  console.error(red(`Unexpected error: ${err.message}`));
  process.exit(1);
});
