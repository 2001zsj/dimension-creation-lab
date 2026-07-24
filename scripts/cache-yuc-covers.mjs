import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('..', import.meta.url)));
const source = await readFile(join(root, 'src', 'data.ts'), 'utf8');
const urls = [...source.matchAll(/https:\/\/i0\.hdslb\.com\/[^"']+/g)].map((match) => match[0]);
const output = join(root, 'public', 'assets', 'covers', 'yuc');
await mkdir(output, { recursive: true });
function hash(value) { let result = 2166136261; for (const char of value) { result ^= char.charCodeAt(0); result = Math.imul(result, 16777619); } return (result >>> 0).toString(16).padStart(8, '0'); }
function extension(url) { try { const suffix = new URL(url).pathname.match(/\.(jpe?g|png|webp|avif|gif)$/i)?.[1]?.toLowerCase(); return suffix === 'jpeg' ? 'jpg' : suffix ?? 'jpg'; } catch { return 'jpg'; } }
let downloaded = 0; let failed = 0; const queue = [...new Set(urls)];
async function worker() { while (queue.length) { const url = queue.shift(); const target = join(output, `${hash(url)}.${extension(url)}`); try { const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 8000); const response = await fetch(url, { redirect: 'manual', headers: { accept: 'image/jpeg,image/png,image/webp,image/avif,image/gif', referer: 'https://yuc.wiki/' }, signal: controller.signal }); clearTimeout(timer); const type = response.headers.get('content-type')?.split(';')[0].toLowerCase() ?? ''; if (!response.ok || !['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'].includes(type)) throw new Error(`HTTP ${response.status} ${type}`); const body = Buffer.from(await response.arrayBuffer()); if (body.byteLength > 4 * 1024 * 1024) throw new Error('image exceeds 4 MiB'); await writeFile(target, body); downloaded += 1; } catch { failed += 1; } } }
await Promise.all(Array.from({ length: Math.min(4, queue.length || 1) }, worker));
console.log(`YUC cover cache: ${downloaded} downloaded, ${failed} unavailable, ${new Set(urls).size} unique URLs.`);
