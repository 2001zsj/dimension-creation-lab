import { ArrowLeft, BookOpen, CalendarDays, Gamepad2, PenLine, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AnimeCard } from '../components/AnimeCard';
import { SectionHeader } from '../components/SectionHeader';
import { StatCard } from '../components/StatCard';
import { useAnimeList } from '../liveAnime';
import type { SeasonName } from '../types';
import { formatSeason, isPersonalRecord, sourceLabels, weekdayLabels, weekdayOrder } from '../utils';

const validSeasons: SeasonName[] = ['winter', 'spring', 'summer', 'autumn'];
type SortMode = 'date' | 'rating' | 'weekday';

export function SeasonDetailPage() {
  const animeList = useAnimeList();
  const params = useParams();
  const year = Number(params.year);
  const season = validSeasons.includes(params.season as SeasonName) ? params.season as SeasonName : undefined;
  const [watchFilter, setWatchFilter] = useState<'all' | 'watching' | 'planned'>('all');
  const [sort, setSort] = useState<SortMode>('date');
  const allItems = season && Number.isFinite(year) ? animeList.filter((anime) => anime.year === year && anime.season === season) : [];
  const hasPersonalRecords = allItems.some(isPersonalRecord);

  useEffect(() => {
    if (!hasPersonalRecords) setWatchFilter('all');
    if (!hasPersonalRecords && sort === 'rating') setSort('date');
  }, [hasPersonalRecords, sort]);

  const items = useMemo(() => {
    const filtered = allItems.filter((anime) => watchFilter === 'all' || (isPersonalRecord(anime) && anime.watchStatus === watchFilter));
    return [...filtered].sort((a, b) => {
      if (sort === 'rating') return (b.rating ?? -1) - (a.rating ?? -1);
      if (sort === 'weekday') return weekdayOrder.indexOf(a.broadcast?.weekday ?? 'streaming') - weekdayOrder.indexOf(b.broadcast?.weekday ?? 'streaming');
      return (a.broadcast?.startDate ?? '9999-12-31').localeCompare(b.broadcast?.startDate ?? '9999-12-31');
    });
  }, [allItems, sort, watchFilter]);

  if (!season || !Number.isFinite(year) || allItems.length === 0) {
    return <div className="container page-top page-bottom"><div className="empty-panel large"><h1>没有找到这个季度</h1><Link className="button primary" to="/seasons">返回季度档案</Link></div></div>;
  }

  const countBySource = (source: 'original' | 'manga' | 'novel' | 'game') => allItems.filter((anime) => anime.sourceType === source).length;

  return (
    <div className="container page-top page-bottom">
      <Link className="back-link" to="/seasons"><ArrowLeft size={16} />返回季度档案</Link>
      <div className="page-title-grid season-detail-title">
        <div><span className="eyebrow">SEASON DATABASE</span><h1>{formatSeason(year, season)}新番档案</h1><p>从放送节奏、改编来源到公开资料入口，集中查看本季度条目。</p></div>
        <div className="season-big-number"><span>{String(year).slice(2)}</span><strong>{season.toUpperCase()}</strong></div>
      </div>

      <div className="stats-grid section-space-tight">
        <StatCard label="本季作品" value={allItems.length} note="公开资料" icon={CalendarDays} />
        <StatCard label={sourceLabels.original} value={countBySource('original')} note="原创企划" icon={Sparkles} />
        <StatCard label={sourceLabels.manga} value={countBySource('manga')} note="漫画来源" icon={PenLine} />
        <StatCard label="小说 / 游戏" value={countBySource('novel') + countBySource('game')} note="其他主要来源" icon={BookOpen} />
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
        <div className="archive-toolbar">
          {hasPersonalRecords && <div className="segmented"><button aria-pressed={watchFilter === 'all'} className={watchFilter === 'all' ? 'active' : ''} onClick={() => setWatchFilter('all')}>全部</button><button aria-pressed={watchFilter === 'watching'} className={watchFilter === 'watching' ? 'active' : ''} onClick={() => setWatchFilter('watching')}>只看在追</button><button aria-pressed={watchFilter === 'planned'} className={watchFilter === 'planned' ? 'active' : ''} onClick={() => setWatchFilter('planned')}>只看想看</button></div>}
          <label className="select-label">排序<select value={sort} onChange={(event) => setSort(event.target.value as SortMode)}><option value="date">开播日期</option>{hasPersonalRecords && <option value="rating">个人评分</option>}<option value="weekday">播出星期</option></select></label>
        </div>
        {items.length > 0 ? <div className="anime-grid three-col">{items.map((anime) => <AnimeCard key={anime.id} anime={anime} />)}</div> : <div className="empty-panel">当前筛选下没有条目。</div>}
      </section>

      <div className="notice-panel"><Gamepad2 size={20} /><p>季度数量、分布与放送安排均根据项目内的公开资料计算；个人观看状态仅在明确标记为个人记录时展示。</p></div>
    </div>
  );
}
