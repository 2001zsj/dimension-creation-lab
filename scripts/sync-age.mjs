import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ageParser } from './age-parser.mjs';

const AGE_ORIGIN = 'https://cn.agekkkk.com';
export const AGE_CATEGORIES = {
  japan: { label: '日漫', typeId: 1 },
  china: { label: '国漫', typeId: 2 },
  dynamic: { label: '动态漫', typeId: 5 },
  theater: { label: '剧场', typeId: 24 },
  tokusatsu: { label: '特摄', typeId: 4 },
  western: { label: '美漫', typeId: 3 },
};

function parseArgs(argv) {
  const flags = new Set(argv.filter((value) => value.startsWith('--') && !value.includes('=')));
  const values = Object.fromEntries(argv.filter((value) => value.startsWith('--') && value.includes('=')).map((value) => {
    const [key, ...rest] = value.slice(2).split('=');
    return [key, rest.join('=')];
  }));
  const requested = values.categories?.split(',').map((value) => value.trim()).filter(Boolean);
  const categories = flags.has('--all-categories') || !requested?.length ? Object.keys(AGE_CATEGORIES) : requested;
  for (const category of categories) {
    if (!(category in AGE_CATEGORIES)) throw new Error(`Unknown category: ${category}`);
  }
  return {
    categories,
    auxiliary: !flags.has('--no-auxiliary'),
    details: flags.has('--details'),
    play: flags.has('--play'),
    resume: !flags.has('--no-resume'),
    concurrency: Math.max(1, Math.min(6, Number(values.concurrency) || 2)),
    delayMs: Math.max(0, Number(values.delay) || 180),
    output: resolve(values.output || 'public/data/age-latest.json'),
    maxPages: Math.max(1, Number(values['max-pages']) || 500),
    maxDetails: Math.max(0, Number(values['max-details']) || Infinity),
    maxPlay: Math.max(0, Number(values['max-play']) || Infinity),
  };
}

async function sleep(ms) {
  if (ms > 0) await new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

async function fetchText(url, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetch(url, {
        headers: { accept: 'text/html,application/xhtml+xml', 'user-agent': 'DimensionLabSync/1.0' },
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.text();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await sleep(400 * attempt);
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error(`${url}: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
}

async function mapLimit(values, limit, worker) {
  const output = new Array(values.length);
  let cursor = 0;
  async function run() {
    while (cursor < values.length) {
      const index = cursor;
      cursor += 1;
      output[index] = await worker(values[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, run));
  return output;
}

async function readSnapshot(path) {
  try {
    const parsed = JSON.parse(await readFile(path, 'utf8'));
    if (parsed?.schemaVersion === 1) return parsed;
  } catch {
    // 新建快照。
  }
  return {
    schemaVersion: 1,
    sourceSite: 'cn.agekkkk.com',
    sourceOrigin: AGE_ORIGIN,
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    categories: {},
    collections: {},
    items: {},
    details: {},
    play: {},
    siteResources: [],
    failures: [],
  };
}

const snapshotWriteQueues = new Map();

async function writeSnapshotAtomic(path, serialized) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, serialized, 'utf8');
  await rename(temporary, path);
}

async function saveSnapshot(path, snapshot) {
  snapshot.updatedAt = new Date().toISOString();
  const serialized = `${JSON.stringify(snapshot, null, 2)}\n`;
  const previous = snapshotWriteQueues.get(path) ?? Promise.resolve();
  const next = previous.catch(() => undefined).then(() => writeSnapshotAtomic(path, serialized));
  snapshotWriteQueues.set(path, next);
  try {
    await next;
  } finally {
    if (snapshotWriteQueues.get(path) === next) snapshotWriteQueues.delete(path);
  }
}

function categoryUrl(typeId, page) {
  return page === 1 ? `${AGE_ORIGIN}/type/${typeId}.html` : `${AGE_ORIGIN}/type/${typeId}-${page}.html`;
}

function addSiteResources(snapshot, resources = []) {
  const index = new Map(snapshot.siteResources.map((resource) => [`${resource.kind}|${resource.url}`, resource]));
  for (const resource of resources) {
    if (!resource?.url || !resource?.kind) continue;
    index.set(`${resource.kind}|${resource.url}`, resource);
  }
  snapshot.siteResources = [...index.values()];
}

async function syncAuxiliary(snapshot, options) {
  const definitions = [
    ['home', `${AGE_ORIGIN}/`, ageParser.parseAgeHome],
    ['week', `${AGE_ORIGIN}/week`, ageParser.parseAgeWeek],
    ['topic', `${AGE_ORIGIN}/topic`, ageParser.parseAgeTopic],
    ['dayhot', `${AGE_ORIGIN}/dayhot`, ageParser.parseAgeHot],
  ];
  await mapLimit(definitions, Math.min(options.concurrency, definitions.length), async ([name, url, parser]) => {
    try {
      const collection = parser(await fetchText(url), url);
      snapshot.collections[name] = { ...collection, capturedAt: new Date().toISOString() };
      addSiteResources(snapshot, collection.siteResources);
      if (name === 'home' || name === 'week' || name === 'dayhot') {
        for (const item of collection.items || []) snapshot.items[item.id] = { ...snapshot.items[item.id], ...item };
      }
    } catch (error) {
      snapshot.failures.push({ stage: name, url, error: error instanceof Error ? error.message : String(error), at: new Date().toISOString() });
    }
    await saveSnapshot(options.output, snapshot);
  });
}

async function syncCategory(snapshot, key, options) {
  const definition = AGE_CATEGORIES[key];
  const firstUrl = categoryUrl(definition.typeId, 1);
  const first = ageParser.parseAgeCategory(await fetchText(firstUrl), firstUrl);
  const pageCount = Math.min(options.maxPages, first.pagination?.pageCount || 1);
  const current = snapshot.categories[key] || { key, label: definition.label, typeId: definition.typeId, pageCount, completedPages: [], failures: [] };
  current.pageCount = pageCount;
  current.label = definition.label;
  current.typeId = definition.typeId;
  snapshot.categories[key] = current;

  const completed = new Set(options.resume ? current.completedPages : []);
  const pages = Array.from({ length: pageCount }, (_, index) => index + 1).filter((page) => !completed.has(page));
  if (!completed.has(1)) {
    for (const item of first.items) snapshot.items[item.id] = { ...snapshot.items[item.id], ...item, category: key, categoryLabel: definition.label };
    addSiteResources(snapshot, first.siteResources);
    completed.add(1);
    current.completedPages = [...completed].sort((a, b) => a - b);
    await saveSnapshot(options.output, snapshot);
  }

  const remaining = pages.filter((page) => page !== 1);
  await mapLimit(remaining, options.concurrency, async (page) => {
    const url = categoryUrl(definition.typeId, page);
    try {
      const parsed = ageParser.parseAgeCategory(await fetchText(url), url);
      if (!parsed.items.length) throw new Error('parser returned zero items');
      for (const item of parsed.items) snapshot.items[item.id] = { ...snapshot.items[item.id], ...item, category: key, categoryLabel: definition.label };
      addSiteResources(snapshot, parsed.siteResources);
      completed.add(page);
      current.completedPages = [...completed].sort((a, b) => a - b);
      current.failures = current.failures.filter((failure) => failure.page !== page);
    } catch (error) {
      const failure = { category: key, page, url, error: error instanceof Error ? error.message : String(error), at: new Date().toISOString() };
      current.failures = [...current.failures.filter((entry) => entry.page !== page), failure];
      snapshot.failures.push(failure);
    }
    await saveSnapshot(options.output, snapshot);
    await sleep(options.delayMs);
  });
}

async function syncDetails(snapshot, options) {
  const items = Object.values(snapshot.items).filter((item) => item.id && item.detailUrl && (!options.resume || !snapshot.details[item.id])).slice(0, options.maxDetails);
  let processed = 0;
  await mapLimit(items, options.concurrency, async (item) => {
    try {
      const detail = ageParser.parseAgeDetail(await fetchText(item.detailUrl), item.detailUrl);
      if (!detail || detail.id !== item.id) throw new Error('detail identity mismatch');
      snapshot.details[item.id] = { ...detail, capturedAt: new Date().toISOString() };
      addSiteResources(snapshot, detail.siteResources);
    } catch (error) {
      snapshot.failures.push({ stage: 'detail', id: item.id, url: item.detailUrl, error: error instanceof Error ? error.message : String(error), at: new Date().toISOString() });
    }
    processed += 1;
    if (processed % 10 === 0 || processed === items.length) await saveSnapshot(options.output, snapshot);
    await sleep(options.delayMs);
  });
  if (items.length > 0) await saveSnapshot(options.output, snapshot);
}

async function syncPlay(snapshot, options) {
  const episodes = Object.values(snapshot.details).flatMap((detail) => (detail.episodes || []).map((episode) => ({ animeId: detail.id, ...episode })))
    .filter((episode) => episode.url && (!options.resume || !snapshot.play[episode.url]))
    .slice(0, options.maxPlay);
  let processed = 0;
  await mapLimit(episodes, options.concurrency, async (episode) => {
    try {
      const result = ageParser.parseAgePlay(await fetchText(episode.url), episode.url);
      if (!result || result.animeId !== episode.animeId) throw new Error('play identity mismatch');
      snapshot.play[episode.url] = { ...result, capturedAt: new Date().toISOString() };
    } catch (error) {
      snapshot.failures.push({ stage: 'play', id: episode.animeId, url: episode.url, error: error instanceof Error ? error.message : String(error), at: new Date().toISOString() });
    }
    processed += 1;
    if (processed % 10 === 0 || processed === episodes.length) await saveSnapshot(options.output, snapshot);
    await sleep(options.delayMs);
  });
  if (episodes.length > 0) await saveSnapshot(options.output, snapshot);
}

export async function runAgeSync(options) {
  const snapshot = await readSnapshot(options.output);
  if (options.auxiliary) await syncAuxiliary(snapshot, options);
  for (const category of options.categories) await syncCategory(snapshot, category, options);
  if (options.details) await syncDetails(snapshot, options);
  if (options.play) await syncPlay(snapshot, options);
  snapshot.completedAt = new Date().toISOString();
  await saveSnapshot(options.output, snapshot);
  return snapshot;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  const options = parseArgs(process.argv.slice(2));
  runAgeSync(options).then((snapshot) => {
    const completedPages = Object.values(snapshot.categories).reduce((sum, category) => sum + category.completedPages.length, 0);
    console.log(JSON.stringify({ output: options.output, items: Object.keys(snapshot.items).length, details: Object.keys(snapshot.details).length, playPages: Object.keys(snapshot.play).length, completedPages, failures: snapshot.failures.length }, null, 2));
  }).catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
