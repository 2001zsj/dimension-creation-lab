import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { WatchStatus } from './types';

export interface LocalAnimeRecord {
  favorite: boolean;
  status?: WatchStatus;
  progress: number;
  updatedAt: string;
}

interface LocalLibraryContextValue {
  records: Record<string, LocalAnimeRecord>;
  getRecord: (animeId: string) => LocalAnimeRecord | undefined;
  toggleFavorite: (animeId: string) => void;
  setStatus: (animeId: string, status?: WatchStatus) => void;
  setProgress: (animeId: string, progress: number) => void;
  clearRecord: (animeId: string) => void;
}

const STORAGE_KEY = 'dimension-lab-local-library-v1';
const validStatuses = new Set<WatchStatus>(['planned', 'watching', 'completed', 'paused', 'dropped']);

function normalizeRecord(value: unknown): LocalAnimeRecord | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const candidate = value as Partial<LocalAnimeRecord>;
  const favorite = candidate.favorite === true;
  const status = candidate.status && validStatuses.has(candidate.status) ? candidate.status : undefined;
  const numericProgress = Number(candidate.progress ?? 0);
  const progress = Number.isFinite(numericProgress) ? Math.max(0, Math.floor(numericProgress)) : 0;
  if (!favorite && !status && progress === 0) return undefined;
  return {
    favorite,
    status,
    progress,
    updatedAt: typeof candidate.updatedAt === 'string' ? candidate.updatedAt : new Date().toISOString(),
  };
}

function loadRecords(): Record<string, LocalAnimeRecord> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(parsed)
        .map(([key, value]) => [key, normalizeRecord(value)] as const)
        .filter((entry): entry is readonly [string, LocalAnimeRecord] => Boolean(entry[1])),
    );
  } catch {
    return {};
  }
}

const LocalLibraryContext = createContext<LocalLibraryContextValue | null>(null);

export function LocalLibraryProvider({ children }: { children: ReactNode }) {
  const [records, setRecords] = useState<Record<string, LocalAnimeRecord>>(loadRecords);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch {
      // Browsers may block storage in private or restricted contexts.
    }
  }, [records]);

  const updateRecord = useCallback((animeId: string, updater: (current: LocalAnimeRecord) => LocalAnimeRecord) => {
    setRecords((currentRecords) => {
      const current = currentRecords[animeId] ?? { favorite: false, progress: 0, updatedAt: new Date().toISOString() };
      const next = updater(current);
      const normalized = normalizeRecord({ ...next, updatedAt: new Date().toISOString() });
      if (!normalized) {
        const remaining = { ...currentRecords };
        delete remaining[animeId];
        return remaining;
      }
      return { ...currentRecords, [animeId]: normalized };
    });
  }, []);

  const toggleFavorite = useCallback((animeId: string) => {
    updateRecord(animeId, (current) => ({ ...current, favorite: !current.favorite }));
  }, [updateRecord]);

  const setStatus = useCallback((animeId: string, status?: WatchStatus) => {
    updateRecord(animeId, (current) => ({ ...current, status }));
  }, [updateRecord]);

  const setProgress = useCallback((animeId: string, progress: number) => {
    updateRecord(animeId, (current) => ({ ...current, progress: Math.max(0, Math.floor(progress)) }));
  }, [updateRecord]);

  const clearRecord = useCallback((animeId: string) => {
    setRecords((currentRecords) => {
      const remaining = { ...currentRecords };
      delete remaining[animeId];
      return remaining;
    });
  }, []);

  const value = useMemo<LocalLibraryContextValue>(() => ({
    records,
    getRecord: (animeId) => records[animeId],
    toggleFavorite,
    setStatus,
    setProgress,
    clearRecord,
  }), [clearRecord, records, setProgress, setStatus, toggleFavorite]);

  return <LocalLibraryContext.Provider value={value}>{children}</LocalLibraryContext.Provider>;
}

export function useLocalLibrary(): LocalLibraryContextValue {
  const value = useContext(LocalLibraryContext);
  if (!value) throw new Error('useLocalLibrary must be used within LocalLibraryProvider');
  return value;
}

