import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('../src/dataQuality.ts', import.meta.url), 'utf8');
const output = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
}).outputText;
const quality = await import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`);

test('data quality recognizes empty collections, templates and forbidden placeholders', () => {
  assert.equal(quality.isPlaceholder('公开资料待补全'), true);
  assert.equal(quality.isPlaceholder('平台请以官方公告为准'), true);
  assert.equal(quality.isPlaceholder('{{ item.title }}'), true);
  assert.equal(quality.isPlaceholder([]), true);
  assert.equal(quality.isPlaceholder({}), true);
  assert.equal(quality.isPlaceholder(['真实制作']), false);
});

test('auditRecord requires identity, title and every declared required field', () => {
  const incomplete = quality.auditRecord({ id: 'age-1', title: '真实标题', sourceNote: '' }, ['id', 'title', 'sourceNote']);
  assert.equal(incomplete.valid, false);
  assert.deepEqual(incomplete.missing, ['sourceNote']);
  const complete = quality.auditRecord({ id: 'age-1', title: '真实标题', sourceNote: 'AGE' }, ['id', 'title', 'sourceNote']);
  assert.equal(complete.valid, true);
  assert.equal(complete.coverage, 1);
});

test('safeMerge never lets empty or placeholder fields erase old valid data', () => {
  const qualityState = { valid: true, conflicts: [] };
  const result = quality.safeMerge(
    { title: '旧标题', studio: ['旧制作'], synopsis: '旧简介' },
    { title: '新标题', studio: [], synopsis: '待补全' },
    qualityState,
  );
  assert.equal(result.title, '新标题');
  assert.deepEqual(result.studio, ['旧制作']);
  assert.equal(result.synopsis, '旧简介');
  assert.deepEqual(qualityState.conflicts, ['title']);
});

test('resource checks remove invalid duplicates and report cross-work binding', () => {
  const base = { kind: 'streaming', source: 'age', sourceUrl: 'https://cn.agekkkk.com/a', status: 'unverified', capturedAt: '2026-07-23T00:00:00Z' };
  const resources = quality.dedupeResources([
    { ...base, id: '1', animeId: 'a', url: 'https://media.example/1.m3u8' },
    { ...base, id: '2', animeId: 'a', url: 'https://media.example/1.m3u8' },
    { ...base, id: '3', animeId: 'a', url: 'bad-url' },
  ]);
  assert.equal(resources.length, 1);
  const issues = quality.auditResourceBindings([
    resources[0],
    { ...base, id: '4', animeId: 'b', url: 'https://media.example/1.m3u8' },
  ]);
  assert.ok(issues.some((issue) => issue.includes('绑定多个作品')));
});

test('resource contract preserves source, authorization, and availability metadata', () => {
  const resource = {
    id: 'resource-1', resourceId: 'resource-1', animeId: 'work-1', workId: 'work-1',
    kind: 'download', resourceType: 'download', url: 'https://example.com/file', originalUrl: 'https://example.com/file',
    source: 'age', sourceUrl: 'https://cn.agekkkk.com/detail', sourcePage: 'https://cn.agekkkk.com/detail',
    status: 'unchecked', authorizationStatus: 'disputed', availabilityStatus: 'redirected',
    capturedAt: '2026-07-23T00:00:00Z', lineId: 'line-1', episode: '1',
  };
  assert.equal(quality.dedupeResources([resource]).length, 1);
  assert.deepEqual(quality.auditResourceBindings([resource]), []);
});
