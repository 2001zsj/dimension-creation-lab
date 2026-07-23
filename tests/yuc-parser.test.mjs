import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { parseCastCredits, yucParser } from '../scripts/yuc-parser.mjs';

const html = `
<div class="post-body">
<!--周一-->
<table><tr>
<td><p class="imgtext3">20:30~</p><p class="imgtext4">7/6~ (全12话)</p><img src="/cover/test.webp"></td>
<td class="date_title_extra" data-x="1" colspan="3">真实作品</td>
<td><a href="https://example.com/stream"><p class="area">港台</p></a></td>
</tr></table>
<!--周二-->
<p>本期新番共收录 1 部</p>
<section>
<h2>真实作品</h2>
<p>リアルアニメ</p>
<p>漫画改编动画</p>
<p>奇幻／冒险</p>
<p>动画制作：真实动画工房</p>
<p>导演：真实监督</p>
<p>系列构成：真实编剧</p>
<p>人物设计：真实人设</p>
<p>音乐：真实音乐家</p>
<p>声优：甲、乙</p>
<a href="https://official.example/anime">动画官网</a>
<a href="https://video.example/pv">PV</a>
</section>
</div>`;

test('YUC parser extracts schedule and available detail fields without placeholders', () => {
  const items = yucParser.parseYucAnime(html, { period: '202607' });
  assert.equal(items.length, 1);
  const item = items[0];
  assert.equal(item.title, '真实作品');
  assert.equal(item.originalTitle, 'リアルアニメ');
  assert.equal(item.year, 2026);
  assert.equal(item.season, 'summer');
  assert.equal(item.sourceType, 'manga');
  assert.equal(item.broadcast.weekday, 'monday');
  assert.equal(item.broadcast.time, '20:30');
  assert.equal(item.broadcast.startDate, '2026-07-06');
  assert.equal(item.broadcast.episodeCount, 12);
  assert.deepEqual(item.broadcast.platforms, ['港台']);
  assert.deepEqual(item.staff.studio, ['真实动画工房']);
  assert.deepEqual(item.staff.cast, ['甲', '乙']);
  assert.equal(item.staff.director, '真实监督');
  assert.equal(item.staff.seriesComposition, '真实编剧');
  assert.equal(item.staff.characterDesign, '真实人设');
  assert.equal(item.staff.music, '真实音乐家');
  assert.ok(item.externalLinks.some((link) => link.type === 'official'));
  assert.ok(item.externalLinks.some((link) => link.type === 'pv'));
  assert.ok(!JSON.stringify(item).includes('待补'));
  assert.ok(!JSON.stringify(item).includes('未公开'));
});

test('YUC parser keeps missing detail fields empty instead of inventing values', () => {
  const minimal = `<div class="post-body"><!--周一--><table><tr><td><p class="imgtext3">23:00~</p><p class="imgtext4">7/1~</p></td><td colspan="3" class="date_title_">只有排期</td></tr></table><!--周二--></div>`;
  const [item] = yucParser.parseYucAnime(minimal, { period: '202607' });
  assert.ok(item);
  assert.deepEqual(item.staff.studio, []);
  assert.deepEqual(item.staff.cast, []);
  assert.equal(item.synopsis, '');
  assert.deepEqual(item.broadcast.platforms, []);
});

test('YUC CAST parser supports real cast cells, role/actor labels, actor-only rows, and deduplication', () => {
  assert.deepEqual(parseCastCredits('<br>角色：小林 / 演员：甲<br>演员：乙<br>甲　小林<br>甲　小林'), [
    { actor: '甲', character: '小林' },
    { actor: '乙' },
  ]);
});

test('three Playwright-captured YUC pages yield real structured CAST records', () => {
  const periods = ['202607', '202604', '202601'];
  let totalCastWorks = 0;
  for (const period of periods) {
    const source = fs.readFileSync(`tests/fixtures/yuc/${period}-cast.html`, 'utf8');
    const items = yucParser.parseYucAnime(source, { period });
    const castWorks = items.filter((item) => item.staff.castCredits?.length);
    assert.ok(items.length > 0, `${period} should contain schedule items`);
    assert.ok(castWorks.length > 0, `${period} should contain CAST records`);
    assert.ok(castWorks.every((item) => item.staff.castCredits.every((credit) => credit.actor && !/待补全|未公开|暂无/.test(credit.actor))));
    totalCastWorks += castWorks.length;
  }
  assert.ok(totalCastWorks >= 10, `expected at least 10 sampled works, got ${totalCastWorks}`);
});
