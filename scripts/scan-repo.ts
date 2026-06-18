import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { scan } from '@/lib/scanner/rules';

/**
 * Scan source files for committed secrets and exit non-zero if any are found —
 * a CI gate / GitHub Actions secret-scan simulation.
 *
 *   pnpm scan            # scans app, lib, scripts
 *   pnpm scan src config # scan specific paths
 */

const SKIP_DIRS = new Set(['node_modules', '.next', '.git', 'generated', 'tests', 'e2e']);
const SCAN_EXT = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.json',
  '.yml',
  '.yaml',
  '.env',
]);

const roots = process.argv.slice(2);
const targets = roots.length > 0 ? roots : ['app', 'lib', 'scripts'];

let total = 0;

function scanFile(path: string): void {
  let text: string;
  try {
    text = readFileSync(path, 'utf8');
  } catch {
    return;
  }
  for (const f of scan(text)) {
    total++;
    console.log(`${path}:${f.line}:${f.column}  ${f.severity.toUpperCase()}  ${f.ruleName}  ${f.match}`);
  }
}

function walk(dir: string): void {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of entries) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full);
    else if (SCAN_EXT.has(extname(name))) scanFile(full);
  }
}

for (const t of targets) walk(t);

if (total > 0) {
  console.error(`\n✖ ${total} potential secret(s) found in source.`);
  process.exit(1);
}
console.log(`✓ No secrets found in: ${targets.join(', ')}`);
