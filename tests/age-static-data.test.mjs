import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('../src/ageStaticData.ts', import.meta.url), 'utf8');
const output = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
}).outputText;
const ageStatic = await import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`);
const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  ageStatic.clearAgeStaticCache();
});

function playPayload(animeId, sourcePage) {
  return {
    animeId,
    plays: [{
      animeId,
      episode: '第01集',
      sourcePage,
      resources: [{
        animeId,
        episode: '第01集',
        kind: 'streaming',
        url: 'https://media.example/episode-1.m3u8',
        sourcePage,
      }],
    }],
  };
}

test('static AGE play returns only the exact requested episode result', async () => {
  const sourcePage = 'https://cn.agekkkk.com/anime/work123/play/4/1.html';
  globalThis.fetch = async () => new Response(JSON.stringify(playPayload('work123', sourcePage)), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });

  const result = await ageStatic.fetchStaticAgePlay(sourcePage);
  assert.equal(result?.sourcePage, sourcePage);
  assert.equal(result?.resources?.[0]?.url, 'https://media.example/episode-1.m3u8');
});

test('static AGE play never falls back to another episode from the same work', async () => {
  const storedPage = 'https://cn.agekkkk.com/anime/work123/play/4/1.html';
  const requestedPage = 'https://cn.agekkkk.com/anime/work123/play/4/2.html';
  globalThis.fetch = async () => new Response(JSON.stringify(playPayload('work123', storedPage)), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });

  const result = await ageStatic.fetchStaticAgePlay(requestedPage);
  assert.equal(result, undefined);
});

test('failed static AGE requests are evicted so a retry can recover without a page reload', async () => {
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    if (calls === 1) return new Response('temporary failure', { status: 502 });
    return new Response(JSON.stringify({ items: { abcd: { id: 'abcd', title: '恢复成功', sourcePage: 'https://example.com' } } }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  assert.equal(await ageStatic.fetchStaticAgeItem('abcd'), undefined);
  assert.equal((await ageStatic.fetchStaticAgeItem('abcd'))?.title, '恢复成功');
  assert.equal(calls, 2);
});

test('invalid JSON is not permanently cached and a later valid response is used', async () => {
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    if (calls === 1) return new Response('{bad json', { status: 200, headers: { 'content-type': 'application/json' } });
    return new Response(JSON.stringify({ items: { efgh: { id: 'efgh', title: '第二次成功', sourcePage: 'https://example.com' } } }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  assert.equal(await ageStatic.fetchStaticAgeItem('efgh'), undefined);
  assert.equal((await ageStatic.fetchStaticAgeItem('efgh'))?.title, '第二次成功');
  assert.equal(calls, 2);
});
