import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { ageParser } from "../scripts/age-parser.mjs";

const fixture = (name) => readFile(new URL(`./fixtures/age/${name}.html`, import.meta.url), "utf8");
const pages = {
  home: "https://cn.agekkkk.com/",
  category: "https://cn.agekkkk.com/type/1.html",
  week: "https://cn.agekkkk.com/week",
  topic: "https://cn.agekkkk.com/topic",
  detail: "https://cn.agekkkk.com/anime/38241bf798cf918917082c8e.html",
  play: "https://cn.agekkkk.com/anime/38241bf798cf918917082c8e/play/3/1.html",
};

test("AGE collection fixtures keep real titles, IDs, images and source pages", async () => {
  const home = ageParser.parseAgeHome(await fixture("home"), pages.home);
  const category = ageParser.parseAgeCategory(await fixture("category"), pages.category);
  const topic = ageParser.parseAgeTopic(await fixture("topic"), pages.topic);
  assert.ok(home.items.length > 0);
  assert.ok(category.items.length > 0);
  assert.ok(topic.items.length > 0);
  const item = category.items.find((entry) => entry.id === "38241bf798cf918917082c8e");
  assert.equal(item.title, "蛀在糖糖里");
  assert.match(item.coverImage, /90d1cec2d8254ed6ce5a77d7f7966c12\.webp$/);
  assert.equal(item.sourcePage, pages.category);
  assert.equal(category.pagination.pageCount, 181);
  assert.equal(category.pagination.nextUrl, "/type/1-2.html");
});

test("AGE week fixture assigns weekday from its real data-key sections", async () => {
  const result = ageParser.parseAgeWeek(await fixture("week"), pages.week);
  assert.ok(result.items.length > 0);
  assert.ok(result.items.some((item) => item.weekday === "monday"));
  assert.ok(result.items.some((item) => item.weekday === "friday"));
  assert.ok(result.items.every((item) => item.detailUrl.startsWith("https://cn.agekkkk.com/anime/")));
});

test("AGE detail fixture keeps works, channels and episode routes together", async () => {
  const result = ageParser.parseAgeDetail(await fixture("detail"), pages.detail);
  assert.equal(result.id, "38241bf798cf918917082c8e");
  assert.equal(result.title, "蛀在糖糖里");
  assert.equal(result.year, 2026);
  assert.equal(result.language, "日语");
  assert.equal(result.director, "见里朝希");
  assert.equal(result.channels.length, 4);
  assert.equal(result.episodes.length, 60);
  assert.equal(new Set(result.episodes.map((entry) => entry.url)).size, result.episodes.length);
  assert.ok(result.episodes.every((entry) => entry.url.includes(`/anime/${result.id}/play/`)));
});

test("AGE play fixture preserves source and marks media as unverified", async () => {
  const result = ageParser.parseAgePlay(await fixture("play"), pages.play);
  assert.equal(result.animeId, "38241bf798cf918917082c8e");
  assert.equal(result.episode, "第01集");
  assert.equal(result.line, "dyttm3u8");
  assert.equal(result.channels.length, 4);
  assert.equal(result.resources.length, 1);
  assert.equal(result.resources[0].authorizationStatus, "unknown");
  assert.equal(result.resources[0].availability, "unchecked");
  assert.equal(result.resources[0].animeId, result.animeId);
});

test("AGE parser does not invent records when required identity is absent", () => {
  assert.deepEqual(ageParser.parseAgeDetail("<title>暂无</title>", pages.detail), undefined);
  assert.deepEqual(ageParser.parseAgePlay("<html></html>", pages.play), undefined);
});

test("AGE card parsing is independent of attribute order and isolates malformed URLs", () => {
  const reordered = '<li><a data-original="/cover.webp" title="属性换序作品" href="/anime/reordered123.html" class="lazyload bCBBJ"><span>日语/2026</span><span>更新至01集</span></a></li>';
  const result = ageParser.parseAgeCategory(reordered, pages.category);
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].id, "reordered123");
  assert.equal(result.items[0].year, 2026);
  assert.equal(result.items[0].coverImage, "https://cn.agekkkk.com/cover.webp");

  const invalid = '<li><a class="bCBBJ" href="/anime/valid123.html" title="坏图片仍保留作品" data-original="http://%"><span>日语/2025</span><span>完结</span></a></li>';
  const invalidResult = ageParser.parseAgeCategory(invalid, pages.category);
  assert.equal(invalidResult.items.length, 1);
  assert.equal(invalidResult.items[0].coverImage, undefined);
});

test("AGE play parser does not crash on malformed percent encoding", () => {
  const html = '<script>var player_aaaa = {"url":"bad%zz","from":"line-a","link_next":""}</script>';
  const result = ageParser.parseAgePlay(html, pages.play);
  assert.equal(result.animeId, "38241bf798cf918917082c8e");
  assert.equal(result.resources.length, 1);
  assert.match(result.resources[0].url, /bad%zz$/);
});

test("AGE episode parsing prefers a numbered entry when an immediate-play duplicate URL exists", () => {
  const html = `<a href="/anime/work123/play/1/1.html">立即播放</a><a href="/anime/work123/play/1/1.html">第01集</a>`;
  const result = ageParser.parseAgeDetail(`<title>测试 - 4K动漫</title>${html}`, "https://cn.agekkkk.com/anime/work123.html");
  assert.equal(result.episodes.length, 1);
  assert.equal(result.episodes[0].episode, "第01集");
});
