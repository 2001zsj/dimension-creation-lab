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

const workerSource = `const ASSETS = ${JSON.stringify(assets)};
const STATIC_FILE_RE = /\\.[a-z0-9]+$/i;

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
