import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const workerPath = join(projectRoot, "dist", "server", "index.js");
const hostingOutputPath = join(projectRoot, "dist", ".openai", "hosting.json");

const workerSource = `const STATIC_FILE_RE = /\\.[a-z0-9]+$/i;

function withHeaders(response, headers) {
  const nextHeaders = new Headers(response.headers);
  for (const [key, value] of Object.entries(headers)) {
    nextHeaders.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: nextHeaders,
  });
}

async function fetchAsset(env, request, pathname) {
  const assetUrl = new URL(request.url);
  assetUrl.pathname = pathname;
  return env.ASSETS.fetch(new Request(assetUrl, request));
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    const assetResponse = await env.ASSETS.fetch(request);
    if (assetResponse.status !== 404) {
      return assetResponse;
    }

    if (STATIC_FILE_RE.test(url.pathname)) {
      return assetResponse;
    }

    const indexResponse = await fetchAsset(env, request, "/index.html");
    if (!indexResponse.ok) {
      return indexResponse;
    }

    return withHeaders(indexResponse, {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    });
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
