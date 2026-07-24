import { copyFile, mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

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

void yucYear;
void yucSeasonLabel;

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

    if (relativeUrl.startsWith("/data/age/")) continue;
    const bytes = await readFile(absolutePath);
    const compress = relativeUrl === "/data/age-latest.json";
    const payload = compress ? gzipSync(bytes, { level: 9 }) : bytes;
    entries[relativeUrl] = {
      body: payload.toString("base64"),
      contentType: contentTypes[extension(relativeUrl)] ?? "application/octet-stream",
      ...(compress ? { encoding: "gzip" } : {}),
    };
  }
  return entries;
}

const assets = await collectAssets(distRoot);

const ageParserSource = (await readFile(join(projectRoot, "scripts", "age-parser.mjs"), "utf8"))
  .replace(/export function/g, "function")
  .replace(/export const ageParser[\s\S]*?;\s*$/m, "");

const yucParserSource = (await readFile(join(projectRoot, "scripts", "yuc-parser.mjs"), "utf8"))
  .replace(/export function/g, "function")
  .replace(/export const yucParser[\s\S]*?;\s*$/m, "");

const yucRuntimeSource = String.raw`const YUC_PARSER = (() => {
${yucParserSource}
  return { parseYucAnime };
})();

const YUC_PERIOD = "${yucPeriod}";
const YUC_SOURCE_URL = "https://yuc.wiki/" + YUC_PERIOD + "/";
let YUC_CACHE;
const YUC_CACHE_TTL = 30 * 60 * 1000;
const YUC_STALE_TTL = 24 * 60 * 60 * 1000;

async function yucFetch() {
  const now = Date.now();
  if (YUC_CACHE && now - YUC_CACHE.time < YUC_CACHE_TTL) return YUC_CACHE;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(YUC_SOURCE_URL, {
      headers: { "accept": "text/html,application/xhtml+xml", "user-agent": "DimensionLabSite/2.0 (+https://chatgpt.site)" },
      signal: controller.signal,
      cf: { cacheTtl: 1800, cacheEverything: true },
    });
    if (!response.ok) throw new Error("YUC " + response.status);
    const items = YUC_PARSER.parseYucAnime(await response.text(), { period: YUC_PERIOD });
    if (!items.length) throw new Error("YUC parser returned no items");
    YUC_CACHE = { time: now, items, stale: false };
    return YUC_CACHE;
  } catch (error) {
    if (YUC_CACHE && now - YUC_CACHE.time < YUC_STALE_TTL) return { ...YUC_CACHE, stale: true };
    throw error;
  } finally { clearTimeout(timer); }
}

async function yucAnimeResponse(request) {
  if (request.method === "HEAD") return new Response(null, { headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=300" } });
  try {
    const result = await yucFetch();
    return new Response(JSON.stringify({ sourceUrl: YUC_SOURCE_URL, updatedAt: new Date(result.time).toISOString(), count: result.items.length, stale: result.stale, items: result.items }), {
      headers: { "content-type": "application/json; charset=utf-8", "cache-control": result.stale ? "no-store" : "public, max-age=300", ...(result.stale ? { "x-data-stale": "1" } : {}) },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unable to fetch YUC", sourceUrl: YUC_SOURCE_URL }), { status: 502, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
  }
}
`;

const ageRuntimeSource = String.raw`const AGE_PARSER = (() => {
${ageParserSource}
  return { parseAgeHome, parseAgeHot, parseAgeCategory, parseAgeWeek, parseAgeTopic, parseAgeDetail, parseAgePlay };
})();

const AGE_ORIGIN = "https://cn.agekkkk.com";
const AGE_CATEGORIES = {
  japan: { label: "日漫", typeId: 1 },
  china: { label: "国漫", typeId: 2 },
  dynamic: { label: "动态漫", typeId: 5 },
  theater: { label: "剧场", typeId: 24 },
  tokusatsu: { label: "特摄", typeId: 4 },
  western: { label: "美漫", typeId: 3 },
};
const AGE_SOURCE_URL = AGE_ORIGIN + "/type/1.html";
const AGE_CACHE = new Map();
const AGE_CACHE_TTL = 30 * 60 * 1000;
const AGE_STALE_TTL = 24 * 60 * 60 * 1000;

async function ageFetch(url) {
  const cached = AGE_CACHE.get(url);
  const cacheAge = cached ? Date.now() - cached.time : Infinity;
  if (cached && cacheAge < AGE_CACHE_TTL) return cached.html;
  let lastError;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(url, {
        headers: { "accept": "text/html,application/xhtml+xml", "user-agent": "DimensionLabSite/2.0 (+https://chatgpt.site)" },
        signal: controller.signal,
        cf: { cacheTtl: 1800, cacheEverything: true },
      });
      if (!response.ok) throw new Error("AGE " + response.status + " " + url);
      const html = await response.text();
      AGE_CACHE.set(url, { time: Date.now(), html });
      return html;
    } catch (error) {
      lastError = error;
      if (attempt === 0) await new Promise((resolve) => setTimeout(resolve, 250));
    } finally { clearTimeout(timer); }
  }
  if (cached && cacheAge < AGE_STALE_TTL) return cached.html;
  throw lastError ?? new Error("Unable to fetch AGE " + url);
}

function ageJson(value, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=300", ...extraHeaders } });
}

let AGE_SNAPSHOT_PROMISE;
async function readAgeSnapshot() {
  if (AGE_SNAPSHOT_PROMISE) return AGE_SNAPSHOT_PROMISE;
  AGE_SNAPSHOT_PROMISE = (async () => {
    const asset = ASSETS["/data/age-latest.json"];
    if (!asset) return null;
    try {
      let bytes = decodeBase64(asset.body);
      if (asset.encoding === "gzip") {
        const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
        bytes = new Uint8Array(await new Response(stream).arrayBuffer());
      }
      return JSON.parse(new TextDecoder().decode(bytes));
    } catch { return null; }
  })();
  return AGE_SNAPSHOT_PROMISE;
}

async function snapshotPage(categoryKey, requestedPage) {
  const snapshot = await readAgeSnapshot();
  const category = AGE_CATEGORIES[categoryKey];
  const categoryState = snapshot?.categories?.[categoryKey];
  if (!snapshot || !category || !categoryState?.completedPages?.includes(requestedPage)) return undefined;
  const typeId = category.typeId;
  const expectedPath = requestedPage === 1 ? "/type/" + typeId + ".html" : "/type/" + typeId + "-" + requestedPage + ".html";
  const items = Object.values(snapshot.items ?? {}).filter((item) => {
    try { return new URL(item.sourcePage).pathname === expectedPath; } catch { return false; }
  });
  if (!items.length) return undefined;
  return {
    kind: "registry-page",
    sourceSite: "cn.agekkkk.com",
    sourceUrl: AGE_ORIGIN + expectedPath,
    category: categoryKey,
    categoryLabel: category.label,
    updatedAt: snapshot.updatedAt,
    count: items.length,
    page: requestedPage,
    pageCount: categoryState.pageCount,
    items,
    siteResources: snapshot.siteResources ?? [],
    snapshot: true,
  };
}

async function ageAnimeResponse(request) {
  try {
    const requestUrl = new URL(request.url);
    const categoryKey = requestUrl.searchParams.get("category") || "japan";
    const category = AGE_CATEGORIES[categoryKey];
    if (!category) return ageJson({ error: "Unsupported AGE category", categories: AGE_CATEGORIES }, 400);
    const requestedPage = Math.max(1, Math.min(500, Number(requestUrl.searchParams.get("page")) || 1));
    const sourceUrl = requestedPage === 1
      ? AGE_ORIGIN + "/type/" + category.typeId + ".html"
      : AGE_ORIGIN + "/type/" + category.typeId + "-" + requestedPage + ".html";
    const stored = await snapshotPage(categoryKey, requestedPage);
    if (stored) return ageJson(stored);
    const parsed = AGE_PARSER.parseAgeCategory(await ageFetch(sourceUrl), sourceUrl);
    if (!parsed.items.length) return ageJson({ error: "AGE parser returned no verified items", sourceUrl, category: categoryKey, page: requestedPage }, 502);
    const capturedAt = new Date().toISOString();
    const payload = {
      kind: "registry-page",
      sourceSite: "cn.agekkkk.com",
      sourceUrl,
      category: categoryKey,
      categoryLabel: category.label,
      updatedAt: capturedAt,
      count: parsed.items.length,
      page: requestedPage,
      pageCount: Math.min(parsed.pagination?.pageCount ?? 1, 500),
      items: parsed.items.map((item) => ({ ...item, category: categoryKey, categoryLabel: category.label })),
      siteResources: parsed.siteResources ?? [],
    };
    if (categoryKey === "japan" && requestedPage === 1) {
      const collections = {};
      const failures = [];
      for (const [name, url, parser] of [
        ["home", AGE_ORIGIN + "/", AGE_PARSER.parseAgeHome],
        ["week", AGE_ORIGIN + "/week", AGE_PARSER.parseAgeWeek],
        ["topic", AGE_ORIGIN + "/topic", AGE_PARSER.parseAgeTopic],
        ["dayhot", AGE_ORIGIN + "/dayhot", AGE_PARSER.parseAgeHot],
      ]) {
        try { collections[name] = parser(await ageFetch(url), url); }
        catch (error) { failures.push({ name, error: error instanceof Error ? error.message : String(error) }); }
      }
      payload.collections = collections;
      payload.failures = failures;
    }
    return ageJson(payload);
  } catch (error) {
    return ageJson({ error: error instanceof Error ? error.message : "Unable to fetch AGE", sourceUrl: AGE_SOURCE_URL }, 502, { "cache-control": "no-store" });
  }
}

async function ageItemResponse(id) {
  try {
    if (!/^[a-z0-9]+$/i.test(id)) return ageJson({ error: "Invalid AGE identity" }, 400);
    const snapshot = await readAgeSnapshot();
    const item = snapshot?.items?.[id];
    if (item) return ageJson({ item, updatedAt: snapshot.updatedAt, snapshot: true });
    const url = AGE_ORIGIN + "/anime/" + encodeURIComponent(id) + ".html";
    const detail = AGE_PARSER.parseAgeDetail(await ageFetch(url), url);
    if (!detail) return ageJson({ error: "AGE item identity not verified", sourceUrl: url }, 404);
    return ageJson({ item: { id, title: detail.title, detailUrl: url, year: detail.year, episodeLabel: detail.episodeLabel, sourcePage: url, status: "announced" }, capturedAt: new Date().toISOString() });
  } catch (error) {
    return ageJson({ error: error instanceof Error ? error.message : "Unable to fetch AGE item" }, 502, { "cache-control": "no-store" });
  }
}

async function ageDetailResponse(id) {
  try {
    if (!/^[a-z0-9]+$/i.test(id)) return ageJson({ error: "Invalid AGE identity" }, 400);
    const url = AGE_ORIGIN + "/anime/" + encodeURIComponent(id) + ".html";
    const stored = (await readAgeSnapshot())?.details?.[id];
    if (stored) return ageJson({ ...stored, snapshot: true });
    const parsed = AGE_PARSER.parseAgeDetail(await ageFetch(url), url);
    if (!parsed) return ageJson({ error: "AGE detail identity not verified", sourceUrl: url }, 422);
    return ageJson({ ...parsed, capturedAt: new Date().toISOString() });
  } catch (error) {
    return ageJson({ error: error instanceof Error ? error.message : "Unable to fetch AGE detail" }, 502, { "cache-control": "no-store" });
  }
}

async function agePlayResponse(requestUrl) {
  try {
    const url = new URL(requestUrl);
    const rawSource = url.searchParams.get("source");
    if (!rawSource) return ageJson({ error: "Missing source" }, 400);
    const sourceUrl = new URL(rawSource, AGE_ORIGIN);
    if (sourceUrl.origin !== AGE_ORIGIN || !/\/anime\/[^/]+\/play\//.test(sourceUrl.pathname)) return ageJson({ error: "Unsupported source URL" }, 400);
    const stored = (await readAgeSnapshot())?.play?.[sourceUrl.toString()];
    if (stored) return ageJson({ ...stored, snapshot: true });
    const parsed = AGE_PARSER.parseAgePlay(await ageFetch(sourceUrl.toString()), sourceUrl.toString());
    if (!parsed) return ageJson({ error: "AGE play identity not verified" }, 422);
    return ageJson({ ...parsed, capturedAt: new Date().toISOString() });
  } catch (error) {
    return ageJson({ error: error instanceof Error ? error.message : "Unable to fetch AGE play" }, 502, { "cache-control": "no-store" });
  }
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
      ...(asset.encoding ? { "content-encoding": asset.encoding } : {}),
    },
  });
}

const COVER_IMAGE_REFERERS = new Map([
  ["as.cfhls.top", "https://cn.agekkkk.com/"],
  ["i0.hdslb.com", "https://yuc.wiki/"],
]);
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"]);
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

function validateImageUrl(value) {
  let url;
  try { url = new URL(value); } catch { return undefined; }
  if (url.protocol !== "https:" || !COVER_IMAGE_REFERERS.has(url.hostname)) return undefined;
  url.pathname = "/" + url.pathname.split("/").filter(Boolean).join("/");
  return url;
}

async function fetchImageFollowingSafeRedirects(initialUrl, signal) {
  let current = initialUrl;
  for (let redirect = 0; redirect <= 3; redirect += 1) {
    const response = await fetch(current.toString(), {
      redirect: "manual",
      headers: {
        "accept": "image/avif,image/webp,image/jpeg,image/png,image/gif,*/*;q=0.5",
        "referer": COVER_IMAGE_REFERERS.get(current.hostname),
        "user-agent": "Mozilla/5.0 DimensionLabImageProxy/2.0",
      },
      signal,
      cf: { cacheTtl: 604800, cacheEverything: true },
    });
    if (![301, 302, 303, 307, 308].includes(response.status)) return response;
    const location = response.headers.get("location");
    const next = location ? validateImageUrl(new URL(location, current).toString()) : undefined;
    if (!next) throw new Error("Image redirect target is not allowed");
    current = next;
  }
  throw new Error("Too many image redirects");
}

async function readImageBody(response) {
  if (!response.body) return new Uint8Array();
  const reader = response.body.getReader();
  const chunks = []; let total = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      total += part.value.byteLength;
      if (total > MAX_IMAGE_BYTES) { await reader.cancel(); throw new Error("Image is too large"); }
      chunks.push(part.value);
    }
  } finally { reader.releaseLock(); }
  const body = new Uint8Array(total); let offset = 0;
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
  return body;
}

async function imageProxyResponse(request) {
  const requestUrl = new URL(request.url);
  const rawUrl = requestUrl.searchParams.get("url");
  if (!rawUrl) return new Response("Missing image URL", { status: 400 });

  const sourceUrl = validateImageUrl(rawUrl);
  if (!sourceUrl) {
    return new Response("Image host is not allowed", { status: 403 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetchImageFollowingSafeRedirects(sourceUrl, controller.signal);
    if (!response.ok) return new Response("Image upstream unavailable", { status: 502 });
    const contentType = (response.headers.get("content-type") ?? "").split(";")[0].toLowerCase();
    if (!IMAGE_TYPES.has(contentType)) {
      return new Response("Upstream did not return an image", { status: 415 });
    }
    const contentLength = Number(response.headers.get("content-length") ?? 0);
    if (contentLength > MAX_IMAGE_BYTES) return new Response("Image is too large", { status: 413 });
    const body = request.method === "HEAD" ? null : await readImageBody(response);
    return new Response(body, {
      headers: {
        "content-type": contentType,
        "cache-control": "public, max-age=604800, stale-while-revalidate=2592000",
        "cross-origin-resource-policy": "cross-origin",
        "x-content-type-options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Image is too large") return new Response("Image is too large", { status: 413 });
    if (error instanceof Error && error.message.includes("redirect target")) return new Response("Image redirect target is not allowed", { status: 403 });
    return new Response("Image proxy timeout", { status: 504 });
  } finally {
    clearTimeout(timeout);
  }
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

    if (url.pathname === "/api/age/categories") {
      return ageJson({ categories: AGE_CATEGORIES, updatedAt: new Date().toISOString() });
    }

    if (url.pathname === "/api/age/current") {
      return ageAnimeResponse(request);
    }

    if (url.pathname.startsWith("/api/age/item/")) {
      return ageItemResponse(decodeURIComponent(url.pathname.slice("/api/age/item/".length)));
    }

    if (url.pathname.startsWith("/api/age/detail/")) {
      return ageDetailResponse(decodeURIComponent(url.pathname.slice("/api/age/detail/".length)));
    }

    if (url.pathname === "/api/age/play") {
      return agePlayResponse(request.url);
    }

    if (url.pathname === "/api/image") {
      return imageProxyResponse(request);
    }

    const exactAsset = ASSETS[url.pathname];
    if (exactAsset) {
      const cacheControl = url.pathname.startsWith("/data/") ? "no-cache" : "public, max-age=31536000, immutable";
      return assetResponse(exactAsset, request.method, cacheControl);
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

