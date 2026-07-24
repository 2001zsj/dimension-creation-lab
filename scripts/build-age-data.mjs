import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const sourcePath = join(projectRoot, 'public', 'data', 'age-latest.json');
const outputRoot = join(projectRoot, 'public', 'data', 'age');

const categoryTypes = { japan: 1, china: 2, dynamic: 5, theater: 24, tokusatsu: 4, western: 3 };

function pageFromSource(sourcePage, typeId) {
  try {
    const pathname = new URL(sourcePage).pathname;
    if (pathname === `/type/${typeId}.html`) return 1;
    const match = pathname.match(new RegExp(`^/type/${typeId}-(\\d+)\\.html$`));
    return match ? Number(match[1]) : undefined;
  } catch {
    return undefined;
  }
}

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(value));
}

let snapshot;
try {
  snapshot = JSON.parse(await readFile(sourcePath, 'utf8'));
} catch {
  console.warn('AGE snapshot not found; skipped static shard generation.');
  process.exit(0);
}

await rm(outputRoot, { recursive: true, force: true });
await mkdir(outputRoot, { recursive: true });

const playValues = Object.values(snapshot.play ?? {}).filter((entry) => entry?.animeId);
const playDistribution = new Map();
for (const entry of playValues) playDistribution.set(entry.animeId, (playDistribution.get(entry.animeId) ?? 0) + 1);
const largestPlayGroup = Math.max(0, ...playDistribution.values());
const playSamplingStatus = playValues.length > 50 && largestPlayGroup / playValues.length > 0.8 ? 'sample-biased' : 'distributed';
const manifest = {
  schemaVersion: 2,
  sourceSite: snapshot.sourceSite,
  updatedAt: snapshot.updatedAt,
  completedAt: snapshot.completedAt,
  itemCount: Object.keys(snapshot.items ?? {}).length,
  detailCount: Object.keys(snapshot.details ?? {}).length,
  playPageCount: playValues.length,
  playAnimeCount: playDistribution.size,
  playSamplingStatus,
  categories: snapshot.categories ?? {},
  siteResources: snapshot.siteResources ?? [],
};
await writeJson(join(outputRoot, 'manifest.json'), manifest);

const categoryPages = new Map();
const itemShards = new Map();
for (const item of Object.values(snapshot.items ?? {})) {
  if (!item?.id || !item?.title) continue;
  const prefix = String(item.id).slice(0, 2).toLowerCase() || '__';
  const shard = itemShards.get(prefix) ?? {};
  shard[item.id] = item;
  itemShards.set(prefix, shard);

  const typeId = categoryTypes[item.category];
  if (!typeId) continue;
  const page = pageFromSource(item.sourcePage, typeId);
  if (!page) continue;
  const key = `${item.category}:${page}`;
  const list = categoryPages.get(key) ?? [];
  list.push(item);
  categoryPages.set(key, list);
}

const playsByAnime = new Map();
for (const play of Object.values(snapshot.play ?? {})) {
  if (!play?.animeId) continue;
  const entries = playsByAnime.get(play.animeId) ?? [];
  entries.push(play);
  playsByAnime.set(play.animeId, entries);
}

const searchIndex = Object.values(snapshot.items ?? {})
  .filter((item) => item?.id && item?.title)
  .map((item) => ({
    id: item.id,
    title: item.title,
    aliases: [item.originalTitle, item.englishTitle, ...(item.aliases ?? [])].filter(Boolean),
    year: item.year,
    category: item.category,
    categoryLabel: item.categoryLabel,
  }));
await writeJson(join(outputRoot, 'search-index.json'), { schemaVersion: 1, updatedAt: snapshot.updatedAt, count: searchIndex.length, items: searchIndex });

for (const [key, items] of categoryPages) {
  const [category, pageText] = key.split(':');
  const page = Number(pageText);
  const meta = snapshot.categories?.[category] ?? {};
  await writeJson(join(outputRoot, 'pages', category, `${page}.json`), {
    kind: 'registry-page',
    sourceSite: snapshot.sourceSite,
    category,
    categoryLabel: meta.label,
    updatedAt: snapshot.updatedAt,
    page,
    pageCount: meta.pageCount ?? 0,
    count: items.length,
    items,
    siteResources: snapshot.siteResources ?? [],
    snapshot: true,
  });
}

for (const [prefix, items] of itemShards) {
  await writeJson(join(outputRoot, 'items', `${prefix}.json`), { updatedAt: snapshot.updatedAt, items });
}

for (const [id, detail] of Object.entries(snapshot.details ?? {})) {
  const { episodes = [], ...metadata } = detail ?? {};
  await writeJson(join(outputRoot, 'details', `${id}.json`), { ...metadata, episodeCount: episodes.length, episodeShard: episodes.length > 0 });
  if (episodes.length > 0) await writeJson(join(outputRoot, 'episodes', `${id}.json`), { id, episodes });
}

for (const [id, plays] of playsByAnime) {
  await writeJson(join(outputRoot, 'play', `${id}.json`), { animeId: id, plays });
}

console.log(`AGE static shards: ${categoryPages.size} pages, ${itemShards.size} item shards, ${Object.keys(snapshot.details ?? {}).length} details, ${playsByAnime.size} play groups.`);

