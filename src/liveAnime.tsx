import type { ReactNode } from 'react';
import { useRegistry } from './dataRegistry';

/**
 * 兼容旧页面的统一数据入口。实际数据只由 DataRegistryProvider 管理，
 * 避免 YUC 与 AGE 分别请求、分别渲染造成的版本不一致。
 */
export function AnimeDataProvider({ children }: { children: ReactNode }) {
  return children;
}

export function useAnimeList() {
  return useRegistry().items;
}

export function useAnimeMeta() {
  const { sourceUrl, updatedAt, status } = useRegistry();
  return { sourceUrl, updatedAt, status };
}
