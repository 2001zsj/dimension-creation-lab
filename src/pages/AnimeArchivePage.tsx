import { Bookmark, ChevronLeft, ChevronRight, Database, LayoutGrid, List, Search, SlidersHorizontal } from 'lucide-react';
import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { AnimeCard } from '../components/AnimeCard';
import { useAnimeList } from '../liveAnime';
import { useRegistry } from '../dataRegistry';
import { useLocalLibrary } from '../localLibrary';
import { sourceLabels, watchLabels } from '../utils';
import type { AnimeSourceType, WatchStatus } from '../types';

 type SortMode = 'updated' | 'rating' | 'year' | 'favorite';

export function AnimeArchivePage() {
  const animeList = useAnimeList();
  const { agePages, loadedAgePages, loadingAgePage, loadAgePage } = useRegistry();
  const { records } = useLocalLibrary();
  const [keyword, setKeyword] = useState('');
  const [source, setSource] = useState<'all' | AnimeSourceType>('all');
  const [watch, setWatch] = useState<'all' | WatchStatus>('all');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [view, setView] = useState<'grid' | 'compact'>('grid');
  const [sort, setSort] = useState<SortMode>('updated');
  const [page, setPage] = useState(1);
  const pageSize = view === 'grid' ? 48 : 80;

  const items = useMemo(() => {
    const tokens = keyword.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const filtered = animeList.filter((anime) => {
      const localRecord = records[anime.id];
      const haystack = [anime.title, anime.originalTitle, anime.englishTitle ?? '', ...anime.genres, ...anime.staff.studio, ...anime.staff.cast, ...(anime.broadcast?.platforms ?? [])].join(' ').toLowerCase();
      return tokens.every((token) => haystack.includes(token))
        && (source === 'all' || anime.sourceType === source)
        && (watch === 'all' || localRecord?.status === watch)
        && (!onlyFavorites || localRecord?.favorite);
    });
    return [...filtered].sort((a, b) => {
      if (sort === 'rating') return (b.rating ?? -1) - (a.rating ?? -1);
      if (sort === 'year') return b.year - a.year;
      if (sort === 'favorite') return Number(Boolean(records[b.id]?.favorite)) - Number(Boolean(records[a.id]?.favorite)) || b.lastUpdated.localeCompare(a.lastUpdated);
      return b.lastUpdated.localeCompare(a.lastUpdated);
    });
  }, [animeList, keyword, onlyFavorites, records, sort, source, watch]);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const visibleItems = items.slice((page - 1) * pageSize, page * pageSize);
  useEffect(() => { setPage(1); }, [keyword, onlyFavorites, sort, source, watch, view]);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  const resetFilters = () => { setKeyword(''); setSource('all'); setWatch('all'); setOnlyFavorites(false); };
  const favoriteCount = Object.values(records).filter((record) => record.favorite).length;
  const nextMissingAgePage = Array.from({ length: agePages }, (_, index) => index + 1).find((candidate) => !loadedAgePages.includes(candidate));

  return (
    <div className="container page-top page-bottom">
      <div className="page-title-grid"><div><span className="eyebrow">ANIME DATABASE</span><h1>动漫档案</h1><p>按公开资料和本地追番状态筛选，当前匹配 {items.length} / {animeList.length} 条。</p></div><div className="page-title-icon"><SlidersHorizontal size={34} /></div></div>
      <div className="archive-toolbar archive-toolbar-large">
        <label className="search-field grow"><Search size={17} /><input value={keyword} onChange={(event: ChangeEvent<HTMLInputElement>) => setKeyword(event.target.value)} placeholder="标题、制作公司、声优、平台或题材" aria-label="搜索动漫档案" /></label>
        <label className="select-label">原作类型<select value={source} onChange={(event: ChangeEvent<HTMLSelectElement>) => setSource(event.target.value as 'all' | AnimeSourceType)}><option value="all">全部</option>{Object.entries(sourceLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="select-label">本地状态<select value={watch} onChange={(event: ChangeEvent<HTMLSelectElement>) => setWatch(event.target.value as 'all' | WatchStatus)}><option value="all">全部</option>{Object.entries(watchLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="toggle-label archive-favorite-toggle"><input type="checkbox" checked={onlyFavorites} onChange={(event: ChangeEvent<HTMLInputElement>) => setOnlyFavorites(event.target.checked)} /><span aria-hidden="true" /><Bookmark size={15} />只看收藏（{favoriteCount}）</label>
        <label className="select-label">排序<select value={sort} onChange={(event: ChangeEvent<HTMLSelectElement>) => setSort(event.target.value as SortMode)}><option value="updated">最近更新</option><option value="favorite">收藏优先</option><option value="rating">项目内评分</option><option value="year">年份</option></select></label>
        <div className="segmented icon-segment" aria-label="选择列表密度"><button aria-label="卡片模式" aria-pressed={view === 'grid'} className={view === 'grid' ? 'active' : ''} onClick={() => setView('grid')}><LayoutGrid size={16} /></button><button aria-label="紧凑模式" aria-pressed={view === 'compact'} className={view === 'compact' ? 'active' : ''} onClick={() => setView('compact')}><List size={16} /></button></div>
      </div>
      {nextMissingAgePage && <div className="notice-panel archive-local-notice"><Database size={19} /><p>AGE 日漫当前已载入 {loadedAgePages.length} / {agePages} 页。下一次将补载最早缺失的第 {nextMissingAgePage} 页。</p><button className="button secondary compact" type="button" disabled={Boolean(loadingAgePage)} onClick={() => void loadAgePage(nextMissingAgePage)}>{loadingAgePage ? `正在载入第 ${loadingAgePage} 页` : `载入第 ${nextMissingAgePage} 页`}</button></div>}
      {visibleItems.length > 0 ? <div className={view === 'grid' ? 'anime-grid four-col' : 'anime-grid compact-grid'}>{visibleItems.map((anime) => <AnimeCard key={anime.id} anime={anime} compact={view === 'compact'} />)}</div> : <div className="empty-panel large"><h2>没有找到符合条件的动漫</h2><p>尝试更换关键词或清除筛选条件。</p><button className="button secondary" onClick={resetFilters}>清除筛选</button></div>}
      {items.length > pageSize && <div className="pagination-row"><button className="button secondary" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}><ChevronLeft size={16} />上一页</button><span>第 {page} / {totalPages} 页</span><button className="button secondary" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)}>下一页<ChevronRight size={16} /></button></div>}
      <div className="notice-panel archive-local-notice"><Bookmark size={19} /><p>收藏、追番状态和进度只保存在当前浏览器，与公开资料字段相互独立。</p></div>
    </div>
  );
}
