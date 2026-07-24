import assert from 'node:assert/strict';
import { stat } from 'node:fs/promises';

const worker = await import('../dist/server/index.js');
const call = (path) => worker.default.fetch(new Request(`https://worker.test${path}`));
const age = await call('/api/age/current?category=japan&page=1');
assert.equal(age.status, 200);
assert.equal((await age.json()).snapshot, true);
const detail = await call('/api/age/detail/38241bf798cf918917082c8e');
assert.ok([200, 404, 422, 502].includes(detail.status));
const invalidImage = await call('/api/image?url=https%3A%2F%2Fevil.example%2Fpixel.png');
assert.equal(invalidImage.status, 403);
const method = await worker.default.fetch(new Request('https://worker.test/api/age/current', { method: 'POST' }));
assert.equal(method.status, 405);
const size = (await stat('dist/server/index.js')).size;
assert.ok(size > 0);
console.log(`Worker API smoke passed; dist/server/index.js=${size} bytes.`);
