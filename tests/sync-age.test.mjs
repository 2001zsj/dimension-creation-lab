import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { roundRobinEpisodes, runAgeSync } from '../scripts/sync-age.mjs';

const fixture = () => readFile(new URL('./fixtures/age/category.html', import.meta.url), 'utf8');

test('AGE full synchronizer checkpoints category pages and keeps source metadata', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'dimension-age-sync-'));
  const output = join(directory, 'age.json');
  const html = await fixture();
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    return new Response(html, { status: 200, headers: { 'content-type': 'text/html' } });
  };
  try {
    const snapshot = await runAgeSync({
      categories: ['japan'],
      auxiliary: false,
      details: false,
      play: false,
      resume: true,
      concurrency: 2,
      delayMs: 0,
      output,
      maxPages: 4,
      maxDetails: 0,
      maxPlay: 0,
    });
    assert.deepEqual(snapshot.categories.japan.completedPages, [1, 2, 3, 4]);
    assert.equal(snapshot.categories.japan.pageCount, 4);
    assert.ok(Object.keys(snapshot.items).length > 0);
    assert.ok(Object.values(snapshot.items).every((item) => item.category === 'japan'));
    assert.equal(calls.length, 4);
    const saved = JSON.parse(await readFile(output, 'utf8'));
    assert.equal(saved.schemaVersion, 1);
    assert.equal(saved.sourceSite, 'cn.agekkkk.com');
  } finally {
    globalThis.fetch = originalFetch;
    await rm(directory, { recursive: true, force: true });
  }
});


test('AGE play candidates are sampled across works instead of exhausting the first title', () => {
  const selected = roundRobinEpisodes([
    { id: 'a', episodes: [{ url: 'https://example.com/a1' }, { url: 'https://example.com/a2' }, { url: 'https://example.com/a3' }] },
    { id: 'b', episodes: [{ url: 'https://example.com/b1' }, { url: 'https://example.com/b2' }] },
    { id: 'c', episodes: [{ url: 'https://example.com/c1' }] },
  ], 5);
  assert.deepEqual(selected.map((item) => item.animeId), ['a', 'b', 'c', 'a', 'b']);
});
