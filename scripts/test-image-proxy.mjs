import assert from 'node:assert/strict';

const calls = [];
const originalFetch = globalThis.fetch;
const worker = await import('../dist/server/index.js?image-tests=1');
const request = (url) => worker.default.fetch(new Request(`https://worker.test/api/image?url=${encodeURIComponent(url)}`));

globalThis.fetch = async (url, options) => {
  calls.push({ url: String(url), options });
  if (String(url).includes('redirect')) return new Response(null, { status: 302, headers: { location: 'https://evil.example/image.jpg' } });
  if (String(url).includes('text')) return new Response('not image', { status: 200, headers: { 'content-type': 'text/plain' } });
  if (String(url).includes('timeout')) throw new Error('timeout');
  if (String(url).includes('large')) return new Response(new Uint8Array(8 * 1024 * 1024 + 1), { status: 200, headers: { 'content-type': 'image/jpeg' } });
  return new Response(new Uint8Array([255, 216, 255, 217]), { status: 200, headers: { 'content-type': 'image/jpeg' } });
};

try {
  assert.equal((await request('https://as.cfhls.top/ok.jpg')).status, 200);
  assert.equal((await request('https://evil.example/ok.jpg')).status, 403);
  assert.equal((await request('https://as.cfhls.top/text')).status, 415);
  assert.equal((await request('https://as.cfhls.top/large')).status, 413);
  assert.equal((await request('https://as.cfhls.top/timeout')).status, 504);
  assert.equal((await request('https://as.cfhls.top/redirect')).status, 403);
  assert.ok(calls.every((entry) => entry.options.redirect === 'manual'));
  console.log(`Image proxy tests passed: normal, illegal host, redirect, non-image, oversized stream, timeout (${calls.length} requests).`);
} finally { globalThis.fetch = originalFetch; }
