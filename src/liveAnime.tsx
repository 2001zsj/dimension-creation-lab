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

const LiveAnimeContext = createContext<LiveAnimeState>({
  animeList: fallbackAnimeList,
  sourceUrl: yucUrl,
  status: 'loading',
});

export function AnimeDataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LiveAnimeState>({
    animeList: fallbackAnimeList,
    sourceUrl: yucUrl,
    status: 'loading',
  });

  useEffect(() => {
    let active = true;

    async function loadLiveData() {
      try {
        const response = await fetch('/api/yuc/202607', { cache: 'no-store' });
        if (!response.ok) throw new Error(`Live anime API ${response.status}`);
        const payload = (await response.json()) as LiveAnimePayload;
        if (!Array.isArray(payload.items) || payload.items.length === 0) {
          throw new Error('Live anime API returned no items');
        }
        if (!active) return;
        setState({
          animeList: payload.items,
          sourceUrl: payload.sourceUrl ?? yucUrl,
          updatedAt: payload.updatedAt,
          status: 'live',
        });
      } catch {
        if (!active) return;
        setState({
          animeList: fallbackAnimeList,
          sourceUrl: yucUrl,
          updatedAt: fallbackAnimeList[0]?.lastUpdated,
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
