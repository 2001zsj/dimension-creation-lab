import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { animeList as fallbackAnimeList } from './data';
import type { Anime } from './types';
import { isPlaceholder, type DataSource, type PopularityMetric, type ResourceRecord } from './dataQuality';

export interface RegistryItem extends Anime {
  dataSource: DataSource;
  fieldSources: Record<string, { source: DataSource; url: string; capturedAt: string }>;
  resources: ResourceRecord[];
  popularity?: PopularityMetric;
}

interface AgeItem { id: string; title: string; detailUrl?: string; coverImage?: string; year?: number; episodeLabel?: string; status?: string; sourcePage: string; }
interface RegistryState { items: RegistryItem[]; ageCount: number; agePages: number; updatedAt?: string; conflicts: string[]; status: 'loading' | 'live' | 'fallback'; }

const fallback = fallbackAnimeList.map((item) => ({ ...item, dataSource: 'yuc' as const, fieldSources: {}, resources: [] }));
const RegistryContext = createContext<RegistryState>({ items: fallback, ageCount: 0, agePages: 0, conflicts: [], status: 'loading' });

function ageToAnime(item: AgeItem, index: number): RegistryItem {
  const now = new Date().toISOString();
  const title = item.title.trim();
  return {
    id: `age-${item.id}`, title, originalTitle: title, year: item.year ?? new Date().getFullYear(), season: 'undecided', sourceType: 'other', genres: [], synopsis: '',
    staff: { studio: [], cast: [] }, externalLinks: item.detailUrl ? [{ label: 'AGE 详情资料', url: item.detailUrl, type: 'reference' }] : [],
    informationStatus: item.status === 'finished' ? 'finished' : item.status === 'airing' ? 'airing' : 'announced', lastUpdated: now,
    sourceNote: `AGE 采集，来源页 ${item.sourcePage}`, recordSource: 'source', watchStatus: 'planned', progress: 0, logs: [], coverSeed: index + 1, coverImage: item.coverImage,
    dataSource: 'age', fieldSources: Object.fromEntries(['title', 'coverImage', 'year', 'informationStatus'].map((field) => [field, { source: 'age', url: item.sourcePage, capturedAt: now }])), resources: item.detailUrl ? [{ id: `age-detail-${item.id}`, animeId: `age-${item.id}`, kind: 'detail', label: '详情资料', url: item.detailUrl, source: 'age', sourceUrl: item.sourcePage, status: 'verified', capturedAt: now }] : [],
  };
}

export function mergeRegistryItems(yucItems: Anime[], ageItems: AgeItem[]): { items: RegistryItem[]; conflicts: string[] } {
  const conflicts: string[] = [];
  const yuc = yucItems.map((item) => ({ ...item, dataSource: 'yuc' as const, fieldSources: {}, resources: [] }));
  const age = ageItems.filter((item) => item.id && !isPlaceholder(item.title)).map(ageToAnime);
  return { items: [...yuc, ...age], conflicts };
}

export function DataRegistryProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<RegistryState>({ items: fallback, ageCount: 0, agePages: 0, conflicts: [], status: 'loading' });
  useEffect(() => {
    let active = true;
    Promise.all([fetch('/api/anime/current', { cache: 'no-store' }), fetch('/api/age/current', { cache: 'no-store' })]).then(async ([yucResponse, ageResponse]) => {
      const yucPayload = yucResponse.ok ? await yucResponse.json() : {};
      const agePayload = ageResponse.ok ? await ageResponse.json() : {};
      const merged = mergeRegistryItems(Array.isArray(yucPayload.items) ? yucPayload.items : fallback, Array.isArray(agePayload.items) ? agePayload.items : []);
      if (active) setState({ items: merged.items, ageCount: agePayload.count ?? 0, agePages: agePayload.pageCount ?? 0, updatedAt: agePayload.updatedAt ?? yucPayload.updatedAt, conflicts: merged.conflicts, status: yucResponse.ok || ageResponse.ok ? 'live' : 'fallback' });
    }).catch(() => { if (active) setState((current) => ({ ...current, status: 'fallback' })); });
    return () => { active = false; };
  }, []);
  const value = useMemo(() => state, [state]);
  return <RegistryContext.Provider value={value}>{children}</RegistryContext.Provider>;
}

export function useRegistry() { return useContext(RegistryContext); }
export function useResourceRecords() { return useContext(RegistryContext).items.flatMap((item) => item.resources); }
