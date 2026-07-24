import { ExternalLink, Filter, RadioTower, RotateCcw, Search, ShieldCheck } from 'lucide-react';
import { useMemo, useState, type ChangeEvent } from 'react';
import { AnimeCard } from '../components/AnimeCard';
import { SectionHeader } from '../components/SectionHeader';
import { useAnimeList } from '../liveAnime';
import type { Anime, AnimeSourceType, InformationStatus, SeasonName } from '../types';
import { formatSeason, getActiveSeason, informationLabels, seasonSortValue, sourceLabels } from '../utils';

const sourceOptions: Array<'all' | AnimeSourceType> = ['all', 'original', 'manga', 'novel', 'game', 'other'];
const statusOptions: Array<'all' | InformationStatus> = ['all', 'announced', 'scheduled', 'airing', 'delayed'];
type SortMode = 'season' | 'updated';

interface RadarGroup {
  key: string;
  year: number;
  season: SeasonName;
  items: Anime[];
}

export function RadarPage() {
  const animeList = useAnimeList();
  const activeSeason = getActiveSeason(animeList);
  const [keyword, setKeyword] = useState('');
  const [source, setSource] = useState<'all' | AnimeSourceType>('all');
  const [status, setStatus] = useState<'all' | InformationStatus>('all');
  const [onlyWithLinks, setOnlyWithLinks] = useState(false);
  const [sort, setSort] = useState<SortMode>('season');

  const targets = useMemo(() => animeList.filter((anime) => {
    const currentValue = seasonSortValue(activeSeason.year, activeSeason.season);
    const futureOrCurrent = anime.season === 'undecided' || seasonSortValue(anime.year, anime.season) >= currentValue;
    const tokens = keyword.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const haystack = [anime.title, anime.originalTitle, anime.englishTitle ?? '', ...anime.genres, ...anime.staff.studio, anime.sourceNote].join(' ').toLowerCase();
    const isRadarSource = anime.dataSources?.includes('yuc') || anime.fieldSources?.title?.some((entry) => entry.url.includes('/topic'));
    return isRadarSource
      && futureOrCurrent
      && anime.informationStatus !== 'finished'
      && tokens.every((token) => haystack.includes(token))
      && (source === 'all' || anime.sourceType === source)
      && (status === 'all' || anime.informationStatus === status)
      && (!onlyWithLinks || anime.externalLinks.length > 0);
  }), [activeSeason.season, activeSeason.year, animeList, keyword, onlyWithLinks, source, status]);

  const groups = useMemo<RadarGroup[]>(() => {
    const map = new Map<string, RadarGroup>();
    targets.forEach((anime) => {
      const key = `${anime.year}-${anime.season}`;
      const group = map.get(key) ?? { key, year: anime.year, season: anime.season, items: [] };
      group.items.push(anime);
      map.set(key, group);
    });
    return [...map.values()]
      .map((group) => ({
        ...group,
        items: [...group.items].sort((a, b) => sort === 'updated' ? b.lastUpdated.localeCompare(a.lastUpdated) : a.title.localeCompare(b.title, 'zh-CN')),
      }))
      .sort((a, b) => sort === 'updated'
        ? (b.items[0]?.lastUpdated ?? '').localeCompare(a.items[0]?.lastUpdated ?? '')
        : seasonSortValue(a.year, a.season) - seasonSortValue(b.year, b.season));
  }, [sort, targets]);

  const resetFilters = () => {
    setKeyword('');
    setSource('all');
    setStatus('all');
    setOnlyWithLinks(false);
  };

  const firstFutureGroupKey = groups.find((group) => group.season !== 'undecided' && seasonSortValue(group.year, group.season) > seasonSortValue(activeSeason.year, activeSeason.season))?.key;
  const groupCopy = (group: RadarGroup) => {
    if (group.season === 'undecided') return { eyebrow: `${group.items.length} 个信号`, title: `深空信号 · ${formatSeason(group.year, group.season)}`, description: '已有公开信息，但具体放送季度仍未确认。' };
    if (group.year === activeSeason.year && group.season === activeSeason.season) return { eyebrow: `${group.items.length} 个信号`, title: `当前着陆 · ${formatSeason(group.year, group.season)}`, description: '当前季度已公开或正在放送的条目。' };
    if (group.key === firstFutureGroupKey) return { eyebrow: `${group.items.length} 个信号`, title: `下一轨道 · ${formatSeason(group.year, group.season)}`, description: '距离当前季度最近的后续档期。' };
    return { eyebrow: `${group.items.length} 个信号`, title: `远期雷达 · ${formatSeason(group.year, group.season)}`, description: '已公开但距离放送仍较远的企划。' };
  };

  return (
    <div className="container page-top page-bottom">
      <div className="page-title-grid">
        <div><span className="eyebrow">SATELLITE OBSERVATORY</span><h1>新番雷达</h1><p>区分仅官宣、已定档、延期和正在放送，并明确资料入口与更新时间。</p></div>
        <div className="page-title-icon"><RadioTower size={34} /></div>
      </div>

      <div className="radar-status-legend">
        <span><strong>{informationLabels.announced}</strong>已有公开消息，档期可能未定</span>
        <span><strong>{informationLabels.scheduled}</strong>已公布季度或日期</span>
        <span><strong>{informationLabels.delayed}</strong>已有延期信息，等待新档期</span>
        <span><strong>{informationLabels.airing}</strong>当前正在放送</span>
      </div>

      <div className="filter-panel">
        <label className="search-field"><Search size={17} /><input value={keyword} onChange={(event: ChangeEvent<HTMLInputElement>) => setKeyword(event.target.value)} placeholder="搜索标题、制作公司或资料备注" aria-label="搜索雷达目标" /></label>
        <div className="filter-row"><Filter size={16} /><span>来源</span>{sourceOptions.map((option) => <button type="button" key={option} aria-pressed={source === option} className={source === option ? 'filter-chip active' : 'filter-chip'} onClick={() => setSource(option)}>{option === 'all' ? '全部' : sourceLabels[option]}</button>)}</div>
        <div className="filter-row"><span className="filter-spacer" /><span>状态</span>{statusOptions.map((option) => <button type="button" key={option} aria-pressed={status === option} className={status === option ? 'filter-chip active' : 'filter-chip'} onClick={() => setStatus(option)}>{option === 'all' ? '全部' : informationLabels[option]}</button>)}</div>
        <div className="radar-tool-row">
          <label className="toggle-label"><input type="checkbox" checked={onlyWithLinks} onChange={(event: ChangeEvent<HTMLInputElement>) => setOnlyWithLinks(event.target.checked)} /><span aria-hidden="true" /><ExternalLink size={15} />仅看有资料入口</label>
          <label className="select-label">排序<select value={sort} onChange={(event: ChangeEvent<HTMLSelectElement>) => setSort(event.target.value as SortMode)}><option value="season">按档期</option><option value="updated">最近更新</option></select></label>
          {(keyword || source !== 'all' || status !== 'all' || onlyWithLinks) && <button className="button secondary compact reset-filter" type="button" onClick={resetFilters}><RotateCcw size={15} />清除筛选</button>}
        </div>
      </div>

      {groups.length > 0 ? groups.map((group) => {
        const copy = groupCopy(group);
        const latestUpdate = [...group.items].sort((a, b) => b.lastUpdated.localeCompare(a.lastUpdated))[0]?.lastUpdated;
        return (
          <section key={group.key} className="section-space-tight radar-group">
            <SectionHeader eyebrow={copy.eyebrow} title={copy.title} description={copy.description} />
            <div className="radar-group-meta"><ShieldCheck size={16} /><span>{group.items.filter((anime) => anime.externalLinks.length > 0).length} 条含外部资料入口</span><span>最近更新 {latestUpdate ?? '未记录'}</span></div>
            <div className="anime-grid four-col">{group.items.map((anime) => <div className="radar-card-wrap" key={anime.id}><AnimeCard anime={anime} compact /><small>资料更新：{anime.lastUpdated}</small></div>)}</div>
          </section>
        );
      }) : <div className="empty-panel large section-space-tight"><h2>没有匹配的雷达目标</h2><p>请调整关键词、来源、状态或资料入口筛选。</p><button className="button secondary" type="button" onClick={resetFilters}>清除筛选</button></div>}
    </div>
  );
}
