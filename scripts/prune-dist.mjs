import { rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const fullSnapshotPath = join(projectRoot, 'dist', 'data', 'age-latest.json');

// The browser uses paged AGE shards under /data/age/. The complete snapshot is
// embedded in compressed form by create-sites-worker.mjs for Worker APIs, so the
// uncompressed 28+ MB copy is removed from the deploy output afterwards.
await rm(fullSnapshotPath, { force: true });
console.log('Pruned dist/data/age-latest.json; paged AGE shards remain available.');
