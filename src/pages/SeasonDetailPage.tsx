import { ArrowLeft, Bookmark, CalendarDays, Gamepad2, PenLine, Search, Sparkles } from 'lucide-react';
import { useMemo, useState, type ChangeEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AnimeCard } from '../components/AnimeCard';
import { SectionHeader } from '../components/SectionHeader';
import { StatCard } from '../components/StatCard';
import { useAnimeList } from '../liveAnime';
import { useLocalLibrary } from '../localLibrary';
import type { SeasonName, WatchStatus } from '../types';
import { formatSeason, sourceLabels, watchLabels, weekdayLabels, weekdayOrder } from '../utils';

const validSeasons: SeasonName[] = ['winter', 'spring', 'summer', 'autumn'];
type SortMode = 'date' | 'rating' | 'weekday' | 'favorite';

export function SeasonDetailPage() {
  const animeList = useAnimeList();
  const { records } = useLocalLibrary();
  const params = useParams();
  const year = Number(params.year);
  const season = validSeasons.includes(params.season as SeasonName) ? params.season as SeasonName : undefined;
  const [keyword, setKeyword] = useState('');
  const [watchFilter, setWatchFilter] = useState<'all' | WatchStatus>('all');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [sort, setSort] = useState<SortMode>('date');
  const allItems = season && Number.isFinite(year) ? animeList.filter((anime) => anime.year === year && anime.season === season) : [];

  const items = useMemo(() => {
    const tokens = keyword.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const filtered = allItems.filter((anime) => {
      const localRecord = records[anime.id];
      const haystack = [anime.title, anime.originalTitle, anime.englishTitle ?? '', ...anime.genres, ...anime.staff.studio, ...(anime.broadcast?.platforms ?? [])].join(' ').toLowerCase();
      return tokens.every((token) => haystack.includes(token))
        && (watchFilter === 'all' || localRecord?.status === watchFilter)
        && (!onlyFavorites || localRecord?.favorite);
    });
    return [...filtered].sort((a, b) => {
      if (sort === 'rating') return (b.rating ?? -1) - (a.rating ?? -1);
      if (sort === 'weekday') return weekdayOrder.indexOf(a.broadcast?.weekday ?? 'streaming') - weekdayOrder.indexOf(b.broadcast?.weekday ?? 'streaming');
      if (sort === 'favorite') {
        const favoriteDifference = Number(Boolean(records[b.id]?.favorite)) - Number(Boolean(records[a.id]?.favorite));
        return favoriteDifference || (a.broadcast?.startDate ?? '9999-12-31').localeCompare(b.broadcast?.startDate ?? '9999-12-31');
      }
      return (a.broadcast?.startDate ?? '9999-12-31').localeCompare(b.broadcast?.startDate ?? '9999-12-31');
    });
  }, [allItems, keyword, onlyFavorites, records, sort, watchFilter]);

  if (!season || !Number.isFinite(year) || allItems.length === 0) {
    return <div className="container page-top page-bottom"><div className="empty-panel large"><h1>没有找到这个季度</h1><Link className="button primary" to="/seasons">返回季度档案</Link></div></div>;
  }

  const countBySource = (source: 'original' | 'manga' | 'novel' | 'game') => allItems.filter((anime) => anime.sourceType === source).length;
  const favoriteCount = allItems.filter((anime) => records[anime.id]?.favorite).length;

  return (
    <div className="container page-top page-bottom">
      <Link className="back-link" to="/seasons"><ArrowLeft size={16} />返回季度档案</Link>
      <div className="page-title-grid season-detail-title">
        <div><span className="eyebrow">SEASON DATABASE</span><h1>{formatSeason(year, season)}新番档案</h1><p>从放送节奏、改编来源到本地收藏和追番状态，集中查看本季度条目。</p></div>
        <div className="season-big-number"><span>{String(year).slice(2)}</span><strong>{season.toUpperCase()}</strong></div>
      </div>

      <div className="stats-grid section-space-tight">
        <StatCard label="本季作品" value={allItems.length} note="公开资料" icon={CalendarDays} />
        <StatCard label={sourceLabels.original} value={countBySource('original')} note="原创企划" icon={Sparkles} />
        <StatCard label={sourceLabels.manga} value={countBySource('manga')} note="漫画来源" icon={PenLine} />
        <StatCard label="我的收藏" value={favoriteCount} note="当前浏览器" icon={Bookmark} />
      </div>

      <section className="section-space-tight">
        <SectionHeader eyebrow="BROADCAST MAP" title="星期放送概览" description="按日本星期汇总本季度条目，网络放送单独列出。" />
        <div className="weekday-summary">
          {weekdayOrder.map((day) => {
            const dayItems = allItems.filter((anime) => anime.broadcast?.weekday === day);
            return <div key={day} className="weekday-summary-card"><strong>{weekdayLabels[day]}</strong><span>{dayItems.length} 部</span><small>{dayItems.map((anime) => anime.title).join('、') || '暂无'}</small></div>;
          })}
        </div>
      </section>

      <section className="section-space-tight">
        <SectionHeader eyebrow="ANIME LIST" title="本季作品" description={`当前显示 ${items.length} / ${allItems.length} 部。`} />
        <div className="archive-toolbar season-filter-toolbar">
          <label className="search-field grow"><Search size={16} /><input value={keyword} onChange={(event: ChangeEvent<HTMLInputElement>) => setKeyword(event.target.value)} placeholder="搜索标题、制作公司、平台或题材" aria-label="搜索本季度作品" /></label>
          <label className="select-label">本地状态<select value={watchFilter} onChange={(event: ChangeEvent<HTMLSelectElement>) => setWatchFilter(event.target.value as 'all' | WatchStatus)}><option value="all">全部</option>{Object.entries(watchLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="toggle-label"><input type="checkbox" checked={onlyFavorites} onChange={(event: ChangeEvent<HTMLInputElement>) => setOnlyFavorites(event.target.checked)} /><span aria-hidden="true" /><Bookmark size={15} />只看收藏</label>
          <label className="select-label">排序<select value={sort} onChange={(event: ChangeEvent<HTMLSelectElement>) => setSort(event.target.value as SortMode)}><option value="date">开播日期</option><option value="weekday">播出星期</option><option value="favorite">收藏优先</option><option value="rating">项目内评分</option></select></label>
        </div>
        {items.length > 0 ? <div className="anime-grid three-col">{items.map((anime) => <AnimeCard key={anime.id} anime={anime} />)}</div> : <div className="empty-panel">当前筛选下没有条目。</div>}
      </section>

      <div className="notice-panel"><Gamepad2 size={20} /><p>季度数量、分布与放送安排根据公开资料计算；收藏、追番状态与进度只保存在当前浏览器。</p></div>
    </div>
  );
}
