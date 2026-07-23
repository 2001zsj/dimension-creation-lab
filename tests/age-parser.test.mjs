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
  assert.equal(result.episodes.length, 61);
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
