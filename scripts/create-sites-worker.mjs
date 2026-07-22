import { copyFile, mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const distRoot = join(projectRoot, "dist");
const workerPath = join(projectRoot, "dist", "server", "index.js");
const hostingOutputPath = join(projectRoot, "dist", ".openai", "hosting.json");

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

const yucRuntimeSource = String.raw`
const YUC_SOURCE_URL = "https://yuc.wiki/202607/";

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
  const start = new Date(Date.UTC(2026, parts[0] - 1, parts[1]));
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
      const startDate = dateMatch ? "2026-" + dateMatch.split("/").map((part) => part.padStart(2, "0")).join("-") : undefined;
      const informationStatus = statusForDate(date);
      const progress = informationStatus === "airing" ? 1 : 0;
      const decodedTime = time ? decodeHtml(time).replace("~", "") : undefined;
      const decodedDate = decodeHtml(date ?? "日期未定");
      const id = slugify(title, items.length);

      items.push({
        id,
        title,
        originalTitle: title,
        year: 2026,
        season: "summer",
        sourceType: sourceForTitle(title),
        genres: ["新番", "TV 动画", "2026 夏季"],
        synopsis: "收录自長門番堂《2026年7月新番表》的真实新番条目。本站只整理标题、放送日与公开资料入口，剧情与授权平台请以官方资料为准。",
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
          { label: "長門番堂 2026年7月新番表", url: YUC_SOURCE_URL, type: "reference" },
          ...links,
        ],
        informationStatus,
        lastUpdated: today,
        sourceNote: "主资料来自長門番堂（Yuc's Anime List）2026年7月新番表；平台与档期可能变化，请以官方公告为准。",
        watchStatus: informationStatus === "airing" ? "watching" : "planned",
        progress,
        shortComment: "長門番堂表记：" + (decodedTime ?? "时间未定") + " " + decodedDate + "；" + (links.length ? "收录 " + links.map((link) => link.label).join(" / ") + " 资料入口" : "暂无平台入口") + "。",
        recommendation: "真实新番表条目，适合作为放送日历和季度档案追踪。",
        audience: "关注 2026 年 7 月新番的观众。",
        warning: "本站仅整理公开资料链接，不提供动画播放、下载或盗版资源。",
        logs: [
          {
            date: today,
            episode: String(progress),
            note: "已同步自長門番堂 2026 年 7 月新番表" + (startDate ? "，表记开播日：" + startDate : "") + "。",
          },
        ],
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

const workerSource = `const ASSETS = ${JSON.stringify(assets)};
const STATIC_FILE_RE = /\\.[a-z0-9]+$/i;
${yucRuntimeSource}

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

    if (url.pathname === "/api/yuc/202607") {
      return yucAnimeResponse(request);
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
