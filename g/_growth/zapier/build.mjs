// Bundles one workflow file for the local tests, with stand-ins for the two Zapier packages.
// Usage: node g/_growth/zapier/build.mjs zap2-calendly-booking.ts
// The output goes to g/_growth/zapier/out/ (ignored by git). This is a test build only: what runs
// in Zapier is the .ts file itself, published as workflow.ts (see README.md).
import { build } from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const file = process.argv[2];
if (!file || !file.endsWith('.ts')) {
  console.error('Usage: node g/_growth/zapier/build.mjs <workflow file>.ts');
  process.exit(1);
}
await build({
  entryPoints: [path.join(here, file)],
  outfile: path.join(here, 'out', file.replace(/\.ts$/, '.mjs')),
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node20',
  logLevel: 'error',
  alias: {
    '@zapier/zapier-durable': path.join(here, 'stubs/durable.mjs'),
    '@zapier/zapier-sdk': path.join(here, 'stubs/sdk.mjs'),
  },
});
console.log('built', file);
