import { LayoutGrid, List, Search, SlidersHorizontal } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { AnimeCard } from '../components/AnimeCard';
import { useAnimeList } from '../liveAnime';
import { isPersonalRecord, sourceLabels, watchLabels } from '../utils';
import type { AnimeSourceType, WatchStatus } from '../types';

export function AnimeArchivePage() {
  const animeList = useAnimeList();
  const [keyword, setKeyword] = useState('');
  const [source, setSource] = useState<'all' | AnimeSourceType>('all');
  const [watch, setWatch] = useState<'all' | WatchStatus>('all');
  const [view, setView] = useState<'grid' | 'compact'>('grid');
  const [sort, setSort] = useState<'updated' | 'rating' | 'year'>('updated');
  const hasPersonalRecords = animeList.some(isPersonalRecord);

  useEffect(() => {
    if (!hasPersonalRecords) setWatch('all');
  }, [hasPersonalRecords]);

  const items = useMemo(() => {
    const filtered = animeList.filter((anime) => {
      const haystack = [anime.title, anime.originalTitle, anime.englishTitle ?? '', ...anime.genres].join(' ').toLowerCase();
      const watchMatches = watch === 'all' || (isPersonalRecord(anime) && anime.watchStatus === watch);
      return (!keyword || haystack.includes(keyword.trim().toLowerCase())) && (source === 'all' || anime.sourceType === source) && watchMatches;
    });
    return [...filtered].sort((a, b) => sort === 'rating' ? (b.rating ?? -1) - (a.rating ?? -1) : sort === 'year' ? b.year - a.year : b.lastUpdated.localeCompare(a.lastUpdated));
  }, [animeList, keyword, sort, source, watch]);

  const resetFilters = () => {
    setKeyword('');
    setSource('all');
    setWatch('all');
  };

  return (
    <div className="container page-top page-bottom">
      <div className="page-title-grid"><div><span className="eyebrow">ANIME DATABASE</span><h1>动漫档案</h1><p>按公开资料字段分层维护，当前显示 {items.length} / {animeList.length} 条。</p></div><div className="page-title-icon"><SlidersHorizontal size={34} /></div></div>
      <div className="archive-toolbar archive-toolbar-large">
        <label className="search-field grow"><Search size={17} /><input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜索标题、原名或题材" aria-label="搜索动漫档案" /></label>
        <label className="select-label">来源<select value={source} onChange={(event) => setSource(event.target.value as 'all' | AnimeSourceType)}><option value="all">全部</option>{Object.entries(sourceLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        {hasPersonalRecords && <label className="select-label">个人状态<select value={watch} onChange={(event) => setWatch(event.target.value as 'all' | WatchStatus)}><option value="all">全部</option>{Object.entries(watchLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>}
        <label className="select-label">排序<select value={sort} onChange={(event) => setSort(event.target.value as 'updated' | 'rating' | 'year')}><option value="updated">最近更新</option>{hasPersonalRecords && <option value="rating">个人评分</option>}<option value="year">年份</option></select></label>
        <div className="segmented icon-segment" aria-label="选择列表密度"><button aria-label="卡片模式" aria-pressed={view === 'grid'} className={view === 'grid' ? 'active' : ''} onClick={() => setView('grid')}><LayoutGrid size={16} /></button><button aria-label="紧凑模式" aria-pressed={view === 'compact'} className={view === 'compact' ? 'active' : ''} onClick={() => setView('compact')}><List size={16} /></button></div>
      </div>
      {items.length > 0 ? <div className={view === 'grid' ? 'anime-grid four-col' : 'anime-grid compact-grid'}>{items.map((anime) => <AnimeCard key={anime.id} anime={anime} compact={view === 'compact'} />)}</div> : <div className="empty-panel large"><h2>没有找到符合条件的动漫</h2><p>尝试更换关键词或清除筛选条件。</p><button className="button secondary" onClick={resetFilters}>清除筛选</button></div>}
    </div>
  );
}
