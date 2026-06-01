import { config } from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const wasDir = resolve(here, '../../../../../');
const rootDir = resolve(wasDir, '../..');

config({ path: resolve(wasDir, '.env.local'), override: false, quiet: true });
config({ path: resolve(rootDir, '.env.local'), override: false, quiet: true });
