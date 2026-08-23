import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const prismaCli = require.resolve('prisma');

export default function setup() {
  if (process.env.DATABASE_URL?.startsWith('file:')) {
    execFileSync(process.execPath, [prismaCli, 'db', 'push', '--skip-generate', '--force-reset', '--schema', 'prisma/schema.test.prisma'], {
      cwd: ROOT,
      env: { ...process.env },
      stdio: 'inherit',
    });
  }
}
