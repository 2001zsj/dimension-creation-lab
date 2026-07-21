import { LayoutGrid, List, Search, SlidersHorizontal } from 'lucide-react';
import { useMemo, useState } from 'react';
import { animeList } from '../data';
import { AnimeCard } from '../components/AnimeCard';
import { sourceLabels, watchLabels } from '../utils';
import type { AnimeSourceType, WatchStatus } from '../types';

export function AnimeArchivePage() {
  const [keyword, setKeyword] = useState('');
  const [source, setSource] = useState<'all' | AnimeSourceType>('all');
  const [watch, setWatch] = useState<'all' | WatchStatus>('all');
  const [view, setView] = useState<'grid' | 'compact'>('grid');
  const [sort, setSort] = useState<'updated' | 'rating' | 'year'>('updated');

  const items = useMemo(() => {
    const filtered = animeList.filter((anime) => {
      const haystack = [anime.title, anime.originalTitle, anime.englishTitle ?? '', ...anime.genres].join(' ').toLowerCase();
      return (!keyword || haystack.includes(keyword.toLowerCase())) && (source === 'all' || anime.sourceType === source) && (watch === 'all' || anime.watchStatus === watch);
    });
    return [...filtered].sort((a, b) => sort === 'rating' ? (b.rating ?? 0) - (a.rating ?? 0) : sort === 'year' ? b.year - a.year : b.lastUpdated.localeCompare(a.lastUpdated));
  }, [keyword, sort, source, watch]);

  return (
    <div className="container page-top page-bottom">
      <div className="page-title-grid"><div><span className="eyebrow">PERSONAL ANIME DATABASE</span><h1>动漫档案</h1><p>资料字段与个人观看记录分层维护，共 {items.length} 条结果。</p></div><div className="page-title-icon"><SlidersHorizontal size={34} /></div></div>
      <div className="archive-toolbar archive-toolbar-large">
        <label className="search-field grow"><Search size={17} /><input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜索标题、原名或题材" /></label>
        <label className="select-label">来源<select value={source} onChange={(event) => setSource(event.target.value as 'all' | AnimeSourceType)}><option value="all">全部</option>{Object.entries(sourceLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="select-label">状态<select value={watch} onChange={(event) => setWatch(event.target.value as 'all' | WatchStatus)}><option value="all">全部</option>{Object.entries(watchLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="select-label">排序<select value={sort} onChange={(event) => setSort(event.target.value as 'updated' | 'rating' | 'year')}><option value="updated">最近更新</option><option value="rating">评分</option><option value="year">年份</option></select></label>
        <div className="segmented icon-segment"><button aria-label="卡片模式" className={view === 'grid' ? 'active' : ''} onClick={() => setView('grid')}><LayoutGrid size={16} /></button><button aria-label="紧凑模式" className={view === 'compact' ? 'active' : ''} onClick={() => setView('compact')}><List size={16} /></button></div>
      </div>
      {items.length > 0 ? <div className={view === 'grid' ? 'anime-grid four-col' : 'anime-grid compact-grid'}>{items.map((anime) => <AnimeCard key={anime.id} anime={anime} compact={view === 'compact'} />)}</div> : <div className="empty-panel large">没有找到符合条件的动漫。</div>}
    </div>
  );
}
