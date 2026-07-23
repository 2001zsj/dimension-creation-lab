import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { animeList as fallbackAnimeList } from './data';
import type { Anime, ExternalLink } from './types';
import {
  auditResourceBindings,
  cleanOptional,
  dedupeResources,
  isPlaceholder,
  normalizeTitle,
  type DataSource,
  type FieldSource,
  type PopularityMetric,
  type ResourceKind,
  type ResourceRecord,
} from './dataQuality';

export interface RegistryItem extends Anime {
  dataSource: DataSource;
  dataSources: DataSource[];
  sourceIds: Partial<Record<DataSource, string>>;
  aliases: string[];
  fieldSources: Record<string, FieldSource[]>;
  resources: ResourceRecord[];
  popularity?: PopularityMetric;
}

export type AgeCategoryKey = 'japan' | 'china' | 'dynamic' | 'theater' | 'tokusatsu' | 'western';

export const AGE_CATEGORIES: Array<{ key: AgeCategoryKey; label: string; typeId: number }> = [
  { key: 'japan', label: '日漫', typeId: 1 },
  { key: 'china', label: '国漫', typeId: 2 },
  { key: 'dynamic', label: '动态漫', typeId: 5 },
  { key: 'theater', label: '剧场', typeId: 24 },
  { key: 'tokusatsu', label: '特摄', typeId: 4 },
  { key: 'western', label: '美漫', typeId: 3 },
];

export interface AgeItem {
  id: string;
  title: string;
  detailUrl?: string;
  coverImage?: string;
  language?: string;
  year?: number;
  episodeLabel?: string;
  status?: string;
  weekday?: string;
  category?: AgeCategoryKey;
  categoryLabel?: string;
  rank?: number;
  popularityLabel?: string;
  sourcePage: string;
}

export interface AgeDetail {
  id: string;
  title: string;
  year?: number;
  language?: string;
  region?: string;
  type?: string;
  director?: string;
  synopsis?: string;
  episodeLabel?: string;
  channels?: Array<{ id?: string; name: string; episodeCount?: number }>;
  episodes?: Array<{ episode: string; url: string; line?: string; episodeIndex?: number }>;
  siteResources?: Array<{ label: string; url: string; kind: string }>;
  sourcePage: string;
}

export interface AgePlayResult {
  animeId: string;
  episode?: string;
  line?: string;
  nextUrl?: string;
  channels?: Array<{ name: string; url?: string; episodeCount?: number; sourceId?: number }>;
  resources?: Array<{ animeId: string; episode?: string; kind: string; url?: string; line?: string; authorizationStatus?: string; availability?: string; sourcePage: string }>;
  sourcePage: string;
}

export interface AgeCategoryProgress {
  label: string;
  pageCount: number;
  loadedPages: number[];
  itemCount: number;
}

export interface AgeSiteResource {
  id: string;
  label: string;
  url: string;
  kind: ResourceKind;
  sourcePage: string;
  capturedAt: string;
}

interface RegistryState {
  items: RegistryItem[];
  ageCount: number;
  agePages: number;
  loadedAgePages: number[];
  ageCategories: Record<AgeCategoryKey, AgeCategoryProgress>;
  siteResources: AgeSiteResource[];
  updatedAt?: string;
  sourceUrl: string;
  conflicts: string[];
  status: 'loading' | 'live' | 'fallback';
  loadingAgePage?: number;
  loadingAgeCategory?: AgeCategoryKey;
  loadAgePage: (page: number) => Promise<void>;
  loadAgeCategoryPage: (category: AgeCategoryKey, page: number) => Promise<void>;
  loadAgeDetail: (sourceId: string) => Promise<AgeDetail | undefined>;
  loadAgePlay: (sourceUrl: string) => Promise<AgePlayResult | undefined>;
  refresh: () => Promise<void>;
}

const YUC_URL = 'https://yuc.wiki/202607/';

function emptyAgeCategories(): Record<AgeCategoryKey, AgeCategoryProgress> {
  return Object.fromEntries(AGE_CATEGORIES.map((category) => [category.key, { label: category.label, pageCount: 0, loadedPages: [], itemCount: 0 }])) as unknown as Record<AgeCategoryKey, AgeCategoryProgress>;
}

function ageCategoryLabel(key: AgeCategoryKey | undefined): string | undefined {
  return AGE_CATEGORIES.find((category) => category.key === key)?.label;
}
const GENERIC_TEXT = /(?:收录自長門番堂.*公开新番资料条目|本站只整理标题|可用于核对本季放送安排|关注\s*\d{4}\s*年|本站仅整理公开资料链接)/;

function linkKind(link: ExternalLink): ResourceKind {
  if (link.type === 'official') return 'official';
  if (link.type === 'pv') return 'pv';
  if (link.type === 'streaming') return 'streaming';
  return 'reference';
}

function capturedAt(item: Anime): string {
  const parsed = new Date(item.lastUpdated);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function cleanAnime(item: Anime): Anime {
  const studio = item.staff.studio.filter((value) => !isPlaceholder(value));
  const cast = item.staff.cast.filter((value) => !isPlaceholder(value));
  const platforms = item.broadcast?.platforms.filter((value) => !isPlaceholder(value)) ?? [];
  return {
    ...item,
    synopsis: isPlaceholder(item.synopsis) || GENERIC_TEXT.test(item.synopsis) ? '' : item.synopsis,
    staff: {
      ...item.staff,
      castCredits: item.staff.castCredits?.filter((credit) => credit.actor && !isPlaceholder(credit.actor)),
      studio,
      cast,
      director: cleanOptional(item.staff.director),
      seriesComposition: cleanOptional(item.staff.seriesComposition),
      characterDesign: cleanOptional(item.staff.characterDesign),
      music: cleanOptional(item.staff.music),
    },
    broadcast: item.broadcast ? { ...item.broadcast, platforms } : undefined,
    shortComment: item.shortComment && !GENERIC_TEXT.test(item.shortComment) ? item.shortComment : undefined,
    recommendation: item.recommendation && !GENERIC_TEXT.test(item.recommendation) ? item.recommendation : undefined,
    audience: item.audience && !GENERIC_TEXT.test(item.audience) ? item.audience : undefined,
    warning: item.warning && !GENERIC_TEXT.test(item.warning) ? item.warning : undefined,
  };
}

function mergeAnimeRecord(previous: Anime | undefined, incoming: Anime): Anime {
  if (!previous) return incoming;
  const prefer = <T,>(next: T, old: T): T => isPlaceholder(next) ? old : next;
  return {
    ...previous,
    ...incoming,
    title: prefer(incoming.title, previous.title),
    originalTitle: prefer(incoming.originalTitle, previous.originalTitle),
    englishTitle: cleanOptional(incoming.englishTitle) ?? previous.englishTitle,
    genres: incoming.genres.filter((value) => !isPlaceholder(value)).length ? incoming.genres.filter((value) => !isPlaceholder(value)) : previous.genres,
    synopsis: cleanOptional(incoming.synopsis) ?? previous.synopsis,
    staff: {
      studio: incoming.staff.studio.filter((value) => !isPlaceholder(value)).length ? incoming.staff.studio.filter((value) => !isPlaceholder(value)) : previous.staff.studio,
      cast: incoming.staff.cast.filter((value) => !isPlaceholder(value)).length ? incoming.staff.cast.filter((value) => !isPlaceholder(value)) : previous.staff.cast,
      castCredits: incoming.staff.castCredits?.length ? incoming.staff.castCredits : previous.staff.castCredits,
      director: cleanOptional(incoming.staff.director) ?? previous.staff.director,
      seriesComposition: cleanOptional(incoming.staff.seriesComposition) ?? previous.staff.seriesComposition,
      characterDesign: cleanOptional(incoming.staff.characterDesign) ?? previous.staff.characterDesign,
      music: cleanOptional(incoming.staff.music) ?? previous.staff.music,
    },
    broadcast: incoming.broadcast ? {
      ...previous.broadcast,
      ...incoming.broadcast,
      platforms: incoming.broadcast.platforms.filter((value) => !isPlaceholder(value)).length
        ? incoming.broadcast.platforms.filter((value) => !isPlaceholder(value))
        : previous.broadcast?.platforms ?? [],
    } : previous.broadcast,
    externalLinks: [...previous.externalLinks, ...incoming.externalLinks.filter((link) => !previous.externalLinks.some((entry) => entry.url === link.url))],
    coverImage: cleanOptional(incoming.coverImage) ?? previous.coverImage,
    sourceNote: cleanOptional(incoming.sourceNote) ?? previous.sourceNote,
  };
}

function mergeAgeItem(previous: AgeItem | undefined, incoming: AgeItem): AgeItem {
  if (!previous) return incoming;
  return {
    ...previous,
    ...incoming,
    title: cleanOptional(incoming.title) ?? previous.title,
    detailUrl: cleanOptional(incoming.detailUrl) ?? previous.detailUrl,
    coverImage: cleanOptional(incoming.coverImage) ?? previous.coverImage,
    language: cleanOptional(incoming.language) ?? previous.language,
    year: incoming.year && incoming.year > 0 ? incoming.year : previous.year,
    episodeLabel: cleanOptional(incoming.episodeLabel) ?? previous.episodeLabel,
    status: cleanOptional(incoming.status) ?? previous.status,
    weekday: cleanOptional(incoming.weekday) ?? previous.weekday,
    category: incoming.category ?? previous.category,
    categoryLabel: cleanOptional(incoming.categoryLabel) ?? previous.categoryLabel,
    rank: incoming.rank ?? previous.rank,
    popularityLabel: cleanOptional(incoming.popularityLabel) ?? previous.popularityLabel,
    sourcePage: cleanOptional(incoming.sourcePage) ?? previous.sourcePage,
  };
}

function externalResources(item: Anime, source: DataSource): ResourceRecord[] {
  const captured = capturedAt(item);
  return dedupeResources(item.externalLinks.map((link, index) => ({
    id: `${source}-${item.id}-${index}`,
    animeId: item.id,
    resourceId: `${source}-${item.id}-${index}`,
    workId: item.id,
    kind: linkKind(link),
    resourceType: linkKind(link),
    label: link.label,
    url: link.url,
    originalUrl: link.url,
    source,
    sourceUrl: source === 'yuc' ? YUC_URL : link.url,
    sourcePage: source === 'yuc' ? YUC_URL : link.url,
    status: link.type === 'official' ? 'verified' : 'unverified',
    availabilityStatus: 'unchecked',
    authorizationStatus: link.type === 'official' ? 'official' : 'unknown',
    capturedAt: captured,
  })));
}

function yucToRegistry(input: Anime): RegistryItem {
  const item = cleanAnime(input);
  const captured = capturedAt(item);
  const fieldSources: Record<string, FieldSource[]> = {};
  const source = { source: 'yuc' as const, url: item.externalLinks.find((link) => link.url.includes('yuc.wiki'))?.url ?? YUC_URL, capturedAt: captured };
  for (const field of ['title', 'originalTitle', 'year', 'season', 'sourceType', 'informationStatus']) fieldSources[field] = [source];
  if (item.coverImage) fieldSources.coverImage = [source];
  if (item.synopsis) fieldSources.synopsis = [source];
  if (item.staff.studio.length) fieldSources['staff.studio'] = [source];
  if (item.staff.director) fieldSources['staff.director'] = [source];
  if (item.staff.seriesComposition) fieldSources['staff.seriesComposition'] = [source];
  if (item.staff.characterDesign) fieldSources['staff.characterDesign'] = [source];
  if (item.staff.music) fieldSources['staff.music'] = [source];
  if (item.staff.cast.length) fieldSources['staff.cast'] = [source];
  if (item.broadcast) fieldSources.broadcast = [source];
  return {
    ...item,
    dataSource: 'yuc',
    dataSources: ['yuc'],
    sourceIds: { yuc: item.id },
    aliases: [item.originalTitle, item.englishTitle].filter((value): value is string => Boolean(value && value !== item.title)),
    fieldSources,
    resources: externalResources(item, 'yuc'),
  };
}

function ageToAnime(item: AgeItem, index: number, captured: string): RegistryItem {
  const title = item.title.trim();
  const source: FieldSource = { source: 'age', url: item.sourcePage, capturedAt: captured };
  const fieldSources: Record<string, FieldSource[]> = { title: [source], informationStatus: [source] };
  if (item.coverImage) fieldSources.coverImage = [source];
  if (item.year) fieldSources.year = [source];
  const detailResource: ResourceRecord[] = item.detailUrl ? [{
    id: `age-detail-${item.id}`,
    animeId: `age-${item.id}`,
    resourceId: `age-detail-${item.id}`,
    workId: `age-${item.id}`,
    kind: 'detail',
    resourceType: 'detail',
    label: 'AGE 详情页',
    url: item.detailUrl,
    originalUrl: item.detailUrl,
    source: 'age',
    sourceUrl: item.sourcePage,
    sourcePage: item.sourcePage,
    status: 'verified',
    availabilityStatus: 'unchecked',
    authorizationStatus: 'unknown',
    capturedAt: captured,
  }] : [];
  return {
    id: `age-${item.id}`,
    title,
    originalTitle: title,
    year: item.year ?? 0,
    season: 'undecided',
    sourceType: 'other',
    genres: [item.categoryLabel ?? ageCategoryLabel(item.category)].filter((value): value is string => Boolean(value)),
    synopsis: '',
    staff: { studio: [], cast: [] },
    externalLinks: item.detailUrl ? [{ label: 'AGE 详情页', url: item.detailUrl, type: 'reference' }] : [],
    informationStatus: item.status === 'finished' ? 'finished' : item.status === 'airing' ? 'airing' : 'announced',
    lastUpdated: captured.slice(0, 10),
    sourceNote: `AGE 数据，来源页：${item.sourcePage}`,
    recordSource: 'source',
    watchStatus: 'planned',
    progress: 0,
    logs: [],
    coverSeed: index + 1,
    coverImage: item.coverImage,
    dataSource: 'age',
    dataSources: ['age'],
    sourceIds: { age: item.id },
    aliases: [],
    fieldSources,
    resources: detailResource,
    popularity: item.rank ? { value: item.rank, label: item.popularityLabel ?? 'AGE 榜单排名', source: 'age', sourceUrl: item.sourcePage, capturedAt: captured, scope: 'rank', inferred: false } : undefined,
  };
}

function mergeFieldSources(left: Record<string, FieldSource[]>, right: Record<string, FieldSource[]>): Record<string, FieldSource[]> {
  const result = { ...left };
  for (const [field, sources] of Object.entries(right)) {
    const existing = result[field] ?? [];
    result[field] = [...existing, ...sources.filter((source) => !existing.some((entry) => entry.source === source.source && entry.url === source.url))];
  }
  return result;
}

export function mergeRegistryItems(yucItems: Anime[], ageItems: AgeItem[], captured = new Date().toISOString()): { items: RegistryItem[]; conflicts: string[] } {
  const conflicts: string[] = [];
  const items = yucItems.map(yucToRegistry);
  const titleIndex = new Map<string, RegistryItem>();
  for (const item of items) {
    for (const title of [item.title, item.originalTitle, ...item.aliases]) {
      const key = normalizeTitle(title);
      if (key) titleIndex.set(key, item);
    }
  }

  ageItems.filter((item) => item.id && !isPlaceholder(item.title)).forEach((raw, index) => {
    const age = ageToAnime(raw, index, captured);
    const match = titleIndex.get(normalizeTitle(age.title));
    if (!match) {
      items.push(age);
      titleIndex.set(normalizeTitle(age.title), age);
      return;
    }
    if (age.year > 0 && match.year > 0 && age.year !== match.year) {
      conflicts.push(`${match.title}：YUC 年份 ${match.year} 与 AGE 年份 ${age.year} 不一致，已保留为两个独立条目`);
      items.push(age);
      return;
    }
    match.dataSources = Array.from(new Set([...match.dataSources, 'age']));
    match.sourceIds.age = raw.id;
    match.resources = dedupeResources([...match.resources, ...age.resources.map((resource) => ({ ...resource, animeId: match.id }))]);
    match.externalLinks = [...match.externalLinks, ...age.externalLinks.filter((link) => !match.externalLinks.some((entry) => entry.url === link.url))];
    match.fieldSources = mergeFieldSources(match.fieldSources, age.fieldSources);
    if (!match.coverImage && age.coverImage) match.coverImage = age.coverImage;
  });

  const resourceConflicts = auditResourceBindings(items.flatMap((item) => item.resources));
  conflicts.push(...resourceConflicts);
  return { items, conflicts: Array.from(new Set(conflicts)) };
}

const noopAsync = async () => undefined;
const fallback = fallbackAnimeList.map(yucToRegistry);
const RegistryContext = createContext<RegistryState>({
  items: fallback,
  ageCount: 0,
  agePages: 0,
  loadedAgePages: [],
  ageCategories: emptyAgeCategories(),
  siteResources: [],
  sourceUrl: YUC_URL,
  conflicts: [],
  status: 'loading',
  loadAgePage: async () => undefined,
  loadAgeCategoryPage: async () => undefined,
  loadAgeDetail: noopAsync,
  loadAgePlay: noopAsync,
  refresh: async () => undefined,
});

async function fetchJson(url: string): Promise<{ ok: boolean; payload: Record<string, unknown> }> {
  try {
    const response = await fetch(url, { cache: 'no-store' });
    return { ok: response.ok, payload: response.ok ? await response.json() as Record<string, unknown> : {} };
  } catch {
    return { ok: false, payload: {} };
  }
}

export function DataRegistryProvider({ children }: { children: ReactNode }) {
  const yucItemsRef = useRef<Anime[]>(fallbackAnimeList);
  const ageItemsRef = useRef(new Map<string, AgeItem>());
  const loadedPagesRef = useRef(new Set<number>());
  const loadedCategoryPagesRef = useRef(new Map<AgeCategoryKey, Set<number>>(AGE_CATEGORIES.map((category) => [category.key, new Set<number>()])));
  const ageCategoryMetaRef = useRef(new Map<AgeCategoryKey, { pageCount: number; label: string }>(AGE_CATEGORIES.map((category) => [category.key, { pageCount: 0, label: category.label }])));
  const siteResourcesRef = useRef(new Map<string, AgeSiteResource>());
  const [state, setState] = useState<Omit<RegistryState, 'loadAgePage' | 'loadAgeCategoryPage' | 'loadAgeDetail' | 'loadAgePlay' | 'refresh'>>({
    items: fallback,
    ageCount: 0,
    agePages: 0,
    loadedAgePages: [],
    ageCategories: emptyAgeCategories(),
    siteResources: [],
    sourceUrl: YUC_URL,
    conflicts: [],
    status: 'loading',
  });

  const rebuild = useCallback((extra?: Partial<typeof state>) => {
    const merged = mergeRegistryItems(yucItemsRef.current, [...ageItemsRef.current.values()]);
    const categoryCounts = new Map<AgeCategoryKey, number>();
    for (const item of ageItemsRef.current.values()) {
      if (item.category) categoryCounts.set(item.category, (categoryCounts.get(item.category) ?? 0) + 1);
    }
    const ageCategories = Object.fromEntries(AGE_CATEGORIES.map((category) => {
      const meta = ageCategoryMetaRef.current.get(category.key);
      const pages = loadedCategoryPagesRef.current.get(category.key) ?? new Set<number>();
      return [category.key, {
        label: meta?.label ?? category.label,
        pageCount: meta?.pageCount ?? 0,
        loadedPages: [...pages].sort((a, b) => a - b),
        itemCount: categoryCounts.get(category.key) ?? 0,
      }];
    })) as Record<AgeCategoryKey, AgeCategoryProgress>;
    setState((current) => ({
      ...current,
      ...extra,
      items: merged.items,
      ageCount: ageItemsRef.current.size,
      loadedAgePages: [...loadedPagesRef.current].sort((a, b) => a - b),
      ageCategories,
      siteResources: [...siteResourcesRef.current.values()],
      conflicts: merged.conflicts,
    }));
  }, []);

  const ingestSiteResources = useCallback((payload: Record<string, unknown>, capturedAt: string) => {
    const candidates: unknown[] = [];
    if (Array.isArray(payload.siteResources)) candidates.push(...payload.siteResources);
    const collections = payload.collections;
    if (collections && typeof collections === 'object') {
      for (const collection of Object.values(collections as Record<string, unknown>)) {
        if (collection && typeof collection === 'object' && Array.isArray((collection as { siteResources?: unknown[] }).siteResources)) {
          candidates.push(...((collection as { siteResources: unknown[] }).siteResources));
        }
      }
    }
    for (const entry of candidates) {
      if (!entry || typeof entry !== 'object') continue;
      const record = entry as Record<string, unknown>;
      const label = typeof record.label === 'string' ? record.label.trim() : '';
      const url = typeof record.url === 'string' ? record.url : '';
      const sourcePage = typeof record.sourcePage === 'string' ? record.sourcePage : url;
      const rawKind = typeof record.kind === 'string' ? record.kind : 'reference';
      const kind: ResourceKind = rawKind === 'anti_loss' || rawKind === 'mirror' ? rawKind : 'reference';
      if (!label || !url) continue;
      try {
        const normalizedUrl = new URL(url).toString();
        siteResourcesRef.current.set(`${kind}|${normalizedUrl}`, {
          id: `age-site-${kind}|${normalizedUrl}`,
          label,
          url: normalizedUrl,
          kind,
          sourcePage,
          capturedAt,
        });
      } catch {
        // 单条异常链接不影响其他数据。
      }
    }
  }, []);

  const ingestAgeCollections = useCallback((payload: Record<string, unknown>) => {
    const collections = payload.collections;
    if (!collections || typeof collections !== 'object') return;
    for (const [name, collection] of Object.entries(collections as Record<string, unknown>)) {
      if (!['home', 'week', 'dayhot'].includes(name) || !collection || typeof collection !== 'object') continue;
      const values = (collection as { items?: unknown[] }).items;
      if (!Array.isArray(values)) continue;
      for (const raw of values) {
        if (!raw || typeof raw !== 'object') continue;
        const item = raw as AgeItem;
        if (!item.id || !item.title) continue;
        ageItemsRef.current.set(item.id, mergeAgeItem(ageItemsRef.current.get(item.id), item));
      }
    }
  }, []);

  const ingestAgeSnapshot = useCallback((payload: Record<string, unknown>) => {
    const rawItems = payload.items;
    if (rawItems && typeof rawItems === 'object') {
      for (const raw of Object.values(rawItems as Record<string, unknown>)) {
        if (!raw || typeof raw !== 'object') continue;
        const item = raw as AgeItem;
        if (item.id && item.title) ageItemsRef.current.set(item.id, mergeAgeItem(ageItemsRef.current.get(item.id), item));
      }
    }
    const categories = payload.categories;
    if (categories && typeof categories === 'object') {
      for (const [key, raw] of Object.entries(categories as Record<string, unknown>)) {
        if (!AGE_CATEGORIES.some((category) => category.key === key) || !raw || typeof raw !== 'object') continue;
        const category = key as AgeCategoryKey;
        const meta = raw as { pageCount?: number; label?: string; completedPages?: number[] };
        ageCategoryMetaRef.current.set(category, { pageCount: Number(meta.pageCount) || 0, label: meta.label ?? ageCategoryLabel(category) ?? category });
        const loaded = loadedCategoryPagesRef.current.get(category) ?? new Set<number>();
        for (const page of meta.completedPages ?? []) if (Number.isInteger(page) && page > 0) loaded.add(page);
        loadedCategoryPagesRef.current.set(category, loaded);
        if (category === 'japan') for (const page of loaded) loadedPagesRef.current.add(page);
      }
    }
    ingestAgeCollections(payload);
    ingestSiteResources(payload, typeof payload.updatedAt === 'string' ? payload.updatedAt : new Date().toISOString());
  }, [ingestAgeCollections, ingestSiteResources]);

  const loadAgeCategoryPage = useCallback(async (category: AgeCategoryKey, page: number) => {
    const categoryDefinition = AGE_CATEGORIES.find((entry) => entry.key === category);
    if (!categoryDefinition) return;
    const normalizedPage = Math.max(1, Math.floor(page));
    const loadedPages = loadedCategoryPagesRef.current.get(category) ?? new Set<number>();
    if (loadedPages.has(normalizedPage)) return;
    setState((current) => ({ ...current, loadingAgePage: normalizedPage, loadingAgeCategory: category }));
    const { ok, payload } = await fetchJson(`/api/age/current?category=${encodeURIComponent(category)}&page=${normalizedPage}`);
    if (!ok || !Array.isArray(payload.items)) {
      const snapshot = await fetchJson('/data/age-latest.json');
      if (snapshot.ok) {
        ingestAgeSnapshot(snapshot.payload);
        rebuild({ status: 'live', updatedAt: typeof snapshot.payload.updatedAt === 'string' ? snapshot.payload.updatedAt : undefined, loadingAgePage: undefined, loadingAgeCategory: undefined });
      }
      setState((current) => ({ ...current, loadingAgePage: undefined, loadingAgeCategory: undefined }));
      return;
    }

    const captured = typeof payload.updatedAt === 'string' ? payload.updatedAt : new Date().toISOString();
    const categoryLabel = typeof payload.categoryLabel === 'string' ? payload.categoryLabel : categoryDefinition.label;
    for (const rawItem of payload.items as AgeItem[]) {
      if (!rawItem.id || !rawItem.title) continue;
      ageItemsRef.current.set(rawItem.id, mergeAgeItem(ageItemsRef.current.get(rawItem.id), { ...rawItem, category, categoryLabel }));
    }
    loadedPages.add(normalizedPage);
    loadedCategoryPagesRef.current.set(category, loadedPages);
    if (category === 'japan') {
      loadedPagesRef.current.add(normalizedPage);
    }
    const pageCount = Math.max(0, Number(payload.pageCount) || 0);
    ageCategoryMetaRef.current.set(category, { pageCount, label: categoryLabel });
    ingestAgeCollections(payload);
    ingestSiteResources(payload, captured);
    rebuild({
      status: 'live',
      agePages: category === 'japan' ? pageCount : state.agePages,
      updatedAt: captured,
      loadingAgePage: undefined,
      loadingAgeCategory: undefined,
    });
  }, [ingestAgeCollections, ingestAgeSnapshot, ingestSiteResources, rebuild, state.agePages]);

  const loadAgePage = useCallback((page: number) => loadAgeCategoryPage('japan', page), [loadAgeCategoryPage]);

  const refresh = useCallback(async () => {
    setState((current) => ({ ...current, status: 'loading' }));
    const [yuc, age] = await Promise.allSettled([
      fetchJson('/api/anime/current'),
      fetchJson('/api/age/current?category=japan&page=1'),
    ]);
    let anyLive = false;
    let updatedAt: string | undefined;
    let sourceUrl = YUC_URL;
    let japanPageCount = ageCategoryMetaRef.current.get('japan')?.pageCount ?? 0;

    if (yuc.status === 'fulfilled' && yuc.value.ok) {
      const payload = yuc.value.payload;
      if (Array.isArray(payload.items) && payload.items.length > 0) {
        const previousById = new Map(yucItemsRef.current.map((item) => [item.id, item]));
        const previousByTitle = new Map(yucItemsRef.current.map((item) => [normalizeTitle(item.title), item]));
        yucItemsRef.current = (payload.items as Anime[]).map((item) => mergeAnimeRecord(previousById.get(item.id) ?? previousByTitle.get(normalizeTitle(item.title)), item));
        anyLive = true;
      }
      if (typeof payload.updatedAt === 'string') updatedAt = payload.updatedAt;
      if (typeof payload.sourceUrl === 'string') sourceUrl = payload.sourceUrl;
    }

    if (age.status === 'fulfilled' && age.value.ok) {
      const payload = age.value.payload;
      const captured = typeof payload.updatedAt === 'string' ? payload.updatedAt : new Date().toISOString();
      if (Array.isArray(payload.items) && payload.items.length > 0) {
        for (const rawItem of payload.items as AgeItem[]) {
          if (rawItem.id && rawItem.title) ageItemsRef.current.set(rawItem.id, mergeAgeItem(ageItemsRef.current.get(rawItem.id), { ...rawItem, category: 'japan', categoryLabel: '日漫' }));
        }
        loadedPagesRef.current.add(1);
        loadedCategoryPagesRef.current.get('japan')?.add(1);
        anyLive = true;
      }
      japanPageCount = Math.max(0, Number(payload.pageCount) || japanPageCount);
      ageCategoryMetaRef.current.set('japan', { pageCount: japanPageCount, label: '日漫' });
      ingestAgeCollections(payload);
      ingestSiteResources(payload, captured);
      updatedAt = captured;
    } else {
      const snapshot = await fetchJson('/data/age-latest.json');
      if (snapshot.ok) {
        ingestAgeSnapshot(snapshot.payload);
        anyLive = ageItemsRef.current.size > 0;
        if (typeof snapshot.payload.updatedAt === 'string') updatedAt = snapshot.payload.updatedAt;
        japanPageCount = ageCategoryMetaRef.current.get('japan')?.pageCount ?? japanPageCount;
      }
    }

    rebuild({ status: anyLive ? 'live' : 'fallback', ...(updatedAt ? { updatedAt } : {}), sourceUrl, agePages: japanPageCount });
  }, [ingestAgeCollections, ingestAgeSnapshot, ingestSiteResources, rebuild]);

  useEffect(() => { void refresh(); }, [refresh]);

  const loadAgeDetail = useCallback(async (sourceId: string) => {
    const { ok, payload } = await fetchJson(`/api/age/detail/${encodeURIComponent(sourceId)}`);
    const normalizeDetail = (value: Record<string, unknown>): AgeDetail => ({
      ...value,
      siteResources: Array.from(new Map(((value.siteResources as AgeDetail['siteResources']) ?? []).map((resource) => [`${resource.kind}|${resource.url}`, resource])).values()),
      episodes: Array.from(new Map(((value.episodes as AgeDetail['episodes']) ?? []).map((episode) => [episode.url, episode])).values()),
    } as AgeDetail);
    if (ok && !payload.error) return normalizeDetail(payload);
    const snapshot = await fetchJson('/data/age-latest.json');
    const details = snapshot.payload.details;
    const detail = details && typeof details === 'object' ? (details as Record<string, unknown>)[sourceId] : undefined;
    return detail && typeof detail === 'object' ? normalizeDetail(detail as Record<string, unknown>) : undefined;
  }, []);

  const loadAgePlay = useCallback(async (sourceUrl: string) => {
    const { ok, payload } = await fetchJson(`/api/age/play?source=${encodeURIComponent(sourceUrl)}`);
    if (ok && !payload.error) return payload as unknown as AgePlayResult;
    const snapshot = await fetchJson('/data/age-latest.json');
    const play = snapshot.payload.play;
    const result = play && typeof play === 'object' ? (play as Record<string, unknown>)[sourceUrl] : undefined;
    return result && typeof result === 'object' ? result as AgePlayResult : undefined;
  }, []);

  const value = useMemo<RegistryState>(() => ({
    ...state,
    loadAgePage,
    loadAgeCategoryPage,
    loadAgeDetail,
    loadAgePlay,
    refresh,
  }), [loadAgeCategoryPage, loadAgeDetail, loadAgePage, loadAgePlay, refresh, state]);
  return <RegistryContext.Provider value={value}>{children}</RegistryContext.Provider>;
}

export function useRegistry() { return useContext(RegistryContext); }
export function useResourceRecords() {
  const registry = useContext(RegistryContext);
  return registry.items.flatMap((item) => item.resources);
}
