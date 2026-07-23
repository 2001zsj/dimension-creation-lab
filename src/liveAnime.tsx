import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { animeList as fallbackAnimeList } from './data';
import type { Anime } from './types';

interface LiveAnimePayload {
  items?: Anime[];
  sourceUrl?: string;
  updatedAt?: string;
}

interface LiveAnimeState {
  animeList: Anime[];
  sourceUrl: string;
  updatedAt?: string;
  status: 'loading' | 'live' | 'fallback';
}

const yucUrl = 'https://yuc.wiki/202607/';

function normalizeAnimeList(items: Anime[]): Anime[] {
  return items.map((anime) => {
    const sourceOnly = anime.recordSource === 'source'
      || anime.sourceNote.includes('長門番堂')
      || anime.externalLinks.some((link) => link.url.includes('yuc.wiki'));

    if (!sourceOnly) return { ...anime, recordSource: anime.recordSource ?? 'personal' };

    return {
      ...anime,
      recordSource: 'source',
      watchStatus: 'planned',
      progress: 0,
      rating: undefined,
      scores: undefined,
      spoilerReview: undefined,
      logs: [],
    };
  });
}

const normalizedFallback = normalizeAnimeList(fallbackAnimeList);

const LiveAnimeContext = createContext<LiveAnimeState>({
  animeList: normalizedFallback,
  sourceUrl: yucUrl,
  status: 'loading',
});

export function AnimeDataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LiveAnimeState>({
    animeList: normalizedFallback,
    sourceUrl: yucUrl,
    status: 'loading',
  });

  useEffect(() => {
    let active = true;

    async function loadLiveData() {
      try {
        const response = await fetch('/api/anime/current', { cache: 'no-store' });
        if (!response.ok) throw new Error(`Live anime API ${response.status}`);
        const payload = (await response.json()) as LiveAnimePayload;
        if (!Array.isArray(payload.items) || payload.items.length === 0) {
          throw new Error('Live anime API returned no items');
        }
        if (!active) return;
        setState({
          animeList: normalizeAnimeList(payload.items),
          sourceUrl: payload.sourceUrl ?? yucUrl,
          updatedAt: payload.updatedAt,
          status: 'live',
        });
      } catch {
        if (!active) return;
        setState({
          animeList: normalizedFallback,
          sourceUrl: yucUrl,
          updatedAt: normalizedFallback[0]?.lastUpdated,
          status: 'fallback',
        });
      }
    }

    loadLiveData();
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo(() => state, [state]);
  return <LiveAnimeContext.Provider value={value}>{children}</LiveAnimeContext.Provider>;
}

export function useAnimeList() {
  return useContext(LiveAnimeContext).animeList;
}

export function useAnimeMeta() {
  const { animeList: _animeList, ...meta } = useContext(LiveAnimeContext);
  return meta;
}
