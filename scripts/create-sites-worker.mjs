import { copyFile, mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const distRoot = join(projectRoot, "dist");
const workerPath = join(projectRoot, "dist", "server", "index.js");
const hostingOutputPath = join(projectRoot, "dist", ".openai", "hosting.json");

const yucPeriod = process.env.YUC_PERIOD ?? "202607";
if (!/^\d{6}$/.test(yucPeriod)) {
  throw new Error("YUC_PERIOD must use YYYYMM format, for example 202607");
}
const yucYear = Number(yucPeriod.slice(0, 4));
const yucMonth = Number(yucPeriod.slice(4, 6));
const yucSeason = yucMonth <= 3 ? "winter" : yucMonth <= 6 ? "spring" : yucMonth <= 9 ? "summer" : "autumn";
const yucSeasonLabel = { winter: "冬季", spring: "春季", summer: "夏季", autumn: "秋季" }[yucSeason];

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
};

function extension(path) {
  const lastDot = path.lastIndexOf(".");
  return lastDot === -1 ? "" : path.slice(lastDot).toLowerCase();
}

async function collectAssets(dir, urlPrefix = "") {
  const entries = {};
  for (const entry of await readdir(dir)) {
    if (entry === "server" || entry === ".openai") continue;

    const absolutePath = join(dir, entry);
    const relativeUrl = `${urlPrefix}/${entry}`;
    const info = await stat(absolutePath);

    if (info.isDirectory()) {
      Object.assign(entries, await collectAssets(absolutePath, relativeUrl));
      continue;
    }

    const bytes = await readFile(absolutePath);
    entries[relativeUrl] = {
      body: bytes.toString("base64"),
      contentType: contentTypes[extension(relativeUrl)] ?? "application/octet-stream",
    };
  }
  return entries;
}

const assets = await collectAssets(distRoot);

const ageParserSource = (await readFile(join(projectRoot, "scripts", "age-parser.mjs"), "utf8"))
  .replace(/export function/g, "function")
  .replace(/export const ageParser[\s\S]*?;\s*$/m, "");

const yucRuntimeSource = String.raw`
const YUC_PERIOD = "${yucPeriod}";
const YUC_YEAR = ${yucYear};
const YUC_MONTH = ${yucMonth};
const YUC_SEASON = "${yucSeason}";
const YUC_SEASON_LABEL = "${yucSeasonLabel}";
const YUC_SOURCE_URL = "https://yuc.wiki/" + YUC_PERIOD + "/";

function decodeHtml(value) {
  return String(value ?? "")
    .replace(/&nbsp;/g, " ")
    .replace(/&#x2F;/g, "/")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(value, index) {
  return (
    value
      .normalize("NFKD")
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "yuc-" + (index + 1)
  );
}

function sourceForTitle(title) {
  if (/第\s*\d+\s*期|第[二三四五六七八九十]+季|Season|续篇|最终章|总集篇/.test(title)) return "other";
  if (/游戏|格斗/.test(title)) return "game";
  if (/小说|轻小说|皇子|勇者|异世界|转生|恶役|魔法/.test(title)) return "novel";
  return "manga";
}

function statusForDate(dateText) {
  const dateMatch = String(dateText ?? "").match(/^\d{1,2}\/\d{1,2}/)?.[0];
  if (!dateMatch) return "announced";
  const parts = dateMatch.split("/").map(Number);
  const start = new Date(Date.UTC(YUC_YEAR, parts[0] - 1, parts[1]));
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return start <= today ? "airing" : "scheduled";
}

function parseLinks(block) {
  const links = [];
  const linkRe = /<a href="([^"]+)"[^>]*>[\s\S]*?<p class="area">([\s\S]*?)<\/p>[\s\S]*?<\/a>/g;
  for (const match of block.matchAll(linkRe)) {
    links.push({
      label: decodeHtml(match[2]),
      url: match[1],
      type: "reference",
    });
  }
  return links;
}

function parseYucAnime(html) {
  const weekdaySections = [
    ["monday", "周一"],
    ["tuesday", "周二"],
    ["wednesday", "周三"],
    ["thursday", "周四"],
    ["friday", "周五"],
    ["saturday", "周六"],
    ["sunday", "周日"],
    ["streaming", "网络"],
  ];
  const postBodyStart = html.indexOf('<div class="post-body"');
  const postBody = postBodyStart === -1 ? html : html.slice(postBodyStart);
  const items = [];
  const today = new Date().toISOString().slice(0, 10);

  for (let sectionIndex = 0; sectionIndex < weekdaySections.length; sectionIndex += 1) {
    const weekday = weekdaySections[sectionIndex][0];
    const marker = weekdaySections[sectionIndex][1];
    const start = postBody.indexOf("<!--" + marker + "-->");
    if (start === -1) continue;
    const nextMarkers = weekdaySections
      .slice(sectionIndex + 1)
      .map((section) => postBody.indexOf("<!--" + section[1] + "-->", start + 1))
      .filter((index) => index !== -1);
    const end = nextMarkers.length ? Math.min(...nextMarkers) : postBody.indexOf("</body>", start);
    const section = postBody.slice(start, end === -1 ? undefined : end);
    const cardRe = /<div style="float:left">([\s\S]*?)(?=<div style="float:left">|<div style="clear:both"|$)/g;

    for (const card of section.matchAll(cardRe)) {
      const block = card[1];
      const time = block.match(/<p class="imgtext4">([\s\S]*?)<\/p>/)?.[1];
      const date = block.match(/<p class="imgep">([\s\S]*?)<\/p>/)?.[1];
      const title = decodeHtml(block.match(/<td colspan="3" class="date_title_">([\s\S]*?)<\/td>/)?.[1] ?? "");
      if (!title) continue;

      const image = block.match(/<img[^>]+data-src="([^"]+)"/)?.[1];
      const links = parseLinks(block);
      const dateMatch = String(date ?? "").match(/^\d{1,2}\/\d{1,2}/)?.[0];
      const startDate = dateMatch ? YUC_YEAR + "-" + dateMatch.split("/").map((part) => part.padStart(2, "0")).join("-") : undefined;
      const informationStatus = statusForDate(date);
      const decodedTime = time ? decodeHtml(time).replace("~", "") : undefined;
      const decodedDate = decodeHtml(date ?? "日期未定");
      const id = slugify(title, items.length);

      items.push({
        id,
        title,
        originalTitle: title,
        year: YUC_YEAR,
        season: YUC_SEASON,
        sourceType: sourceForTitle(title),
        genres: ["新番", "TV 动画", YUC_YEAR + " " + YUC_SEASON_LABEL],
        synopsis: "收录自長門番堂《" + YUC_YEAR + "年" + YUC_MONTH + "月新番表》的公开新番资料条目。本站只整理标题、放送日与公开资料入口，剧情与授权平台请以官方资料为准。",
        staff: {
          studio: ["公开资料待补全"],
          cast: [],
        },
        broadcast: {
          weekday,
          time: decodedTime,
          startDate,
          platforms: links.length ? links.map((link) => link.label) : ["平台请以官方公告为准"],
          timezone: "Asia/Tokyo",
        },
        externalLinks: [
          { label: "長門番堂 " + YUC_YEAR + "年" + YUC_MONTH + "月新番表", url: YUC_SOURCE_URL, type: "reference" },
          ...links,
        ],
        informationStatus,
        lastUpdated: today,
        sourceNote: "主资料来自長門番堂（Yuc's Anime List）" + YUC_YEAR + "年" + YUC_MONTH + "月新番表；平台与档期可能变化，请以官方公告为准。",
        recordSource: "source",
        watchStatus: "planned",
        progress: 0,
        shortComment: "長門番堂表记：" + (decodedTime ?? "时间未定") + " " + decodedDate + "；" + (links.length ? "收录 " + links.map((link) => link.label).join(" / ") + " 资料入口" : "暂无平台入口") + "。",
        recommendation: "可用于核对本季放送安排与公开资料入口。",
        audience: "关注 " + YUC_YEAR + " 年 " + YUC_MONTH + " 月新番的读者。",
        warning: "本站仅整理公开资料链接，不提供动画播放、下载或盗版资源。",
        logs: [],
        coverSeed: image ? [...image].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 97 : items.length + 1,
        coverImage: image,
        featured: items.length < 6,
      });
    }
  }

  return items;
}

async function yucAnimeResponse(request) {
  if (request.method === "HEAD") {
    return new Response(null, {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  }

  const response = await fetch(YUC_SOURCE_URL, {
    headers: {
      "accept": "text/html,application/xhtml+xml",
      "user-agent": "DimensionLabSite/1.0 (+https://chatgpt.site)",
    },
    cf: { cacheTtl: 0, cacheEverything: false },
  });
  if (!response.ok) {
    return new Response(JSON.stringify({ error: "Unable to fetch Yuc wiki", status: response.status, sourceUrl: YUC_SOURCE_URL }), {
      status: 502,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  }

  const html = await response.text();
  const items = parseYucAnime(html);
  return new Response(JSON.stringify({
    sourceUrl: YUC_SOURCE_URL,
    updatedAt: new Date().toISOString(),
    count: items.length,
    items,
  }), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
`;

const ageRuntimeSource = String.raw`const AGE_PARSER = (() => {
${ageParserSource}
  return { parseAgeHome, parseAgeCategory, parseAgeWeek, parseAgeTopic, parseAgeDetail, parseAgePlay };
})();

const AGE_ORIGIN = "https://cn.agekkkk.com";
const AGE_SOURCE_URL = AGE_ORIGIN + "/type/1.html";

async function ageFetch(url) {
  const response = await fetch(url, { headers: { "accept": "text/html,application/xhtml+xml", "user-agent": "DimensionLabSite/1.0 (+https://chatgpt.site)" }, cf: { cacheTtl: 0, cacheEverything: false } });
  if (!response.ok) throw new Error("AGE " + response.status + " " + url);
  return response.text();
}

function ageJson(value, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
}

async function ageAnimeResponse(request) {
  try {
    const firstHtml = await ageFetch(AGE_SOURCE_URL);
    const first = AGE_PARSER.parseAgeCategory(firstHtml, AGE_SOURCE_URL);
    const pageCount = Math.min(first.pagination?.pageCount ?? 1, 181);
    const pages = [first];
    for (let start = 2; start <= pageCount; start += 8) {
      const batch = await Promise.all(Array.from({ length: Math.min(8, pageCount - start + 1) }, (_, offset) => {
        const page = start + offset;
        const url = AGE_ORIGIN + "/type/1-" + page + ".html";
        return ageFetch(url).then((html) => AGE_PARSER.parseAgeCategory(html, url));
      }));
      pages.push(...batch);
    }
    const items = [...new Map(pages.flatMap((page) => page.items).map((item) => [item.id, item])).values()];
    if (!items.length) return ageJson({ error: "AGE parser returned no verified items", sourceUrl: AGE_SOURCE_URL }, 502);
    const homeHtml = await ageFetch(AGE_ORIGIN + "/");
    const weekHtml = await ageFetch(AGE_ORIGIN + "/week");
    const topicHtml = await ageFetch(AGE_ORIGIN + "/topic");
    return ageJson({ kind: "registry", sourceSite: "cn.agekkkk.com", sourceUrl: AGE_SOURCE_URL, updatedAt: new Date().toISOString(), count: items.length, pageCount, pagesFetched: pages.length, items, collections: { home: AGE_PARSER.parseAgeHome(homeHtml, AGE_ORIGIN + "/"), week: AGE_PARSER.parseAgeWeek(weekHtml, AGE_ORIGIN + "/week"), topic: AGE_PARSER.parseAgeTopic(topicHtml, AGE_ORIGIN + "/topic") } });
  } catch (error) {
    return ageJson({ error: error instanceof Error ? error.message : "Unable to fetch AGE", sourceUrl: AGE_SOURCE_URL }, 502);
  }
}

async function ageDetailResponse(id) {
  try { const url = AGE_ORIGIN + "/anime/" + encodeURIComponent(id) + ".html"; return ageJson(AGE_PARSER.parseAgeDetail(await ageFetch(url), url) ?? { error: "AGE detail identity not verified" }, 200); }
  catch (error) { return ageJson({ error: error instanceof Error ? error.message : "Unable to fetch AGE detail" }, 502); }
}

async function agePlayResponse(requestUrl) {
  try { const url = new URL(requestUrl); const sourceUrl = AGE_ORIGIN + url.searchParams.get("source") ; const parsed = AGE_PARSER.parseAgePlay(await ageFetch(sourceUrl), sourceUrl); if (!parsed) return ageJson({ error: "AGE play identity not verified" }, 502); return ageJson({ ...parsed, resources: parsed.resources.map((resource) => ({ ...resource, url: undefined, status: "unverified" })) }); }
  catch (error) { return ageJson({ error: error instanceof Error ? error.message : "Unable to fetch AGE play" }, 502); }
}
`;

const workerSource = `const ASSETS = ${JSON.stringify(assets)};
const STATIC_FILE_RE = /\\.[a-z0-9]+$/i;
${yucRuntimeSource}
${ageRuntimeSource}

function decodeBase64(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function assetResponse(asset, method, cacheControl) {
  return new Response(method === "HEAD" ? null : decodeBase64(asset.body), {
    headers: {
      "content-type": asset.contentType,
      "cache-control": cacheControl,
    },
  });
}

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    if (url.pathname === "/api/anime/current" || url.pathname === "/api/yuc/${yucPeriod}") {
      return yucAnimeResponse(request);
    }

    if (url.pathname === "/api/age/current") {
      return ageAnimeResponse(request);
    }

    if (url.pathname.startsWith("/api/age/detail/")) {
      return ageDetailResponse(decodeURIComponent(url.pathname.slice("/api/age/detail/".length)));
    }

    if (url.pathname === "/api/age/play") {
      return agePlayResponse(request.url);
    }

    const exactAsset = ASSETS[url.pathname];
    if (exactAsset) {
      return assetResponse(exactAsset, request.method, "public, max-age=31536000, immutable");
    }

    if (STATIC_FILE_RE.test(url.pathname)) {
      return new Response("Not Found", { status: 404 });
    }

    return assetResponse(ASSETS["/index.html"], request.method, "no-store");
  },
};
`;

await mkdir(dirname(workerPath), { recursive: true });
await writeFile(workerPath, workerSource);
await mkdir(dirname(hostingOutputPath), { recursive: true });
await copyFile(
  join(projectRoot, ".openai", "hosting.json"),
  hostingOutputPath,
);
