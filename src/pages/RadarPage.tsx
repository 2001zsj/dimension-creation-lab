import { Filter, RadioTower, RotateCcw, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { AnimeCard } from '../components/AnimeCard';
import { SectionHeader } from '../components/SectionHeader';
import { useAnimeList } from '../liveAnime';
import type { Anime, AnimeSourceType, InformationStatus, SeasonName } from '../types';
import { formatSeason, getActiveSeason, informationLabels, seasonSortValue, sourceLabels } from '../utils';

const sourceOptions: Array<'all' | AnimeSourceType> = ['all', 'original', 'manga', 'novel', 'game', 'other'];
const statusOptions: Array<'all' | InformationStatus> = ['all', 'announced', 'scheduled', 'airing', 'delayed'];

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

  const targets = useMemo(() => animeList.filter((anime) => {
    const currentValue = seasonSortValue(activeSeason.year, activeSeason.season);
    const futureOrCurrent = anime.season === 'undecided' || seasonSortValue(anime.year, anime.season) >= currentValue;
    const matchesKeyword = !keyword || [anime.title, anime.originalTitle, anime.englishTitle ?? '', ...anime.genres].join(' ').toLowerCase().includes(keyword.trim().toLowerCase());
    return futureOrCurrent && anime.informationStatus !== 'finished' && matchesKeyword
      && (source === 'all' || anime.sourceType === source)
      && (status === 'all' || anime.informationStatus === status);
  }), [activeSeason.season, activeSeason.year, animeList, keyword, source, status]);

  const groups = useMemo<RadarGroup[]>(() => {
    const map = new Map<string, RadarGroup>();
    targets.forEach((anime) => {
      const key = `${anime.year}-${anime.season}`;
      const group = map.get(key) ?? { key, year: anime.year, season: anime.season, items: [] };
      group.items.push(anime);
      map.set(key, group);
    });
    return [...map.values()].sort((a, b) => seasonSortValue(a.year, a.season) - seasonSortValue(b.year, b.season));
  }, [targets]);

  const resetFilters = () => {
    setKeyword('');
    setSource('all');
    setStatus('all');
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
        <div><span className="eyebrow">SATELLITE OBSERVATORY</span><h1>新番雷达</h1><p>根据项目中实际存在的季度动态分组，不再遗漏写死分组之外的条目。</p></div>
        <div className="page-title-icon"><RadioTower size={34} /></div>
      </div>

      <div className="filter-panel">
        <label className="search-field"><Search size={17} /><input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜索雷达目标" aria-label="搜索雷达目标" /></label>
        <div className="filter-row"><Filter size={16} /><span>来源</span>{sourceOptions.map((option) => <button type="button" key={option} aria-pressed={source === option} className={source === option ? 'filter-chip active' : 'filter-chip'} onClick={() => setSource(option)}>{option === 'all' ? '全部' : sourceLabels[option]}</button>)}</div>
        <div className="filter-row"><span className="filter-spacer" /><span>状态</span>{statusOptions.map((option) => <button type="button" key={option} aria-pressed={status === option} className={status === option ? 'filter-chip active' : 'filter-chip'} onClick={() => setStatus(option)}>{option === 'all' ? '全部' : informationLabels[option]}</button>)}</div>
        {(keyword || source !== 'all' || status !== 'all') && <button className="button secondary compact reset-filter" type="button" onClick={resetFilters}><RotateCcw size={15} />清除筛选</button>}
      </div>

      {groups.length > 0 ? groups.map((group) => {
        const copy = groupCopy(group);
        return (
          <section key={group.key} className="section-space-tight radar-group">
            <SectionHeader eyebrow={copy.eyebrow} title={copy.title} description={copy.description} />
            <div className="anime-grid four-col">{group.items.map((anime) => <AnimeCard key={anime.id} anime={anime} compact />)}</div>
          </section>
        );
      }) : <div className="empty-panel large section-space-tight"><h2>没有匹配的雷达目标</h2><p>请调整关键词、来源或状态筛选。</p><button className="button secondary" type="button" onClick={resetFilters}>清除筛选</button></div>}
    </div>
  );
}
