import { Filter, RadioTower, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { AnimeCard } from '../components/AnimeCard';
import { SectionHeader } from '../components/SectionHeader';
import { useAnimeList } from '../liveAnime';
import type { AnimeSourceType, InformationStatus, SeasonName } from '../types';
import { formatSeason, informationLabels, sourceLabels } from '../utils';

const sourceOptions: Array<'all' | AnimeSourceType> = ['all', 'original', 'manga', 'novel', 'game', 'other'];
const statusOptions: Array<'all' | InformationStatus> = ['all', 'announced', 'scheduled', 'airing', 'delayed'];
const seasonOrder: SeasonName[] = ['summer', 'autumn', 'winter', 'spring', 'undecided'];

export function RadarPage() {
  const animeList = useAnimeList();
  const [keyword, setKeyword] = useState('');
  const [source, setSource] = useState<'all' | AnimeSourceType>('all');
  const [status, setStatus] = useState<'all' | InformationStatus>('all');

  const targets = useMemo(() => animeList.filter((anime) => {
    const future = anime.year >= 2026 && anime.informationStatus !== 'finished';
    const matchesKeyword = !keyword || `${anime.title}${anime.originalTitle}${anime.genres.join('')}`.toLowerCase().includes(keyword.toLowerCase());
    return future && matchesKeyword && (source === 'all' || anime.sourceType === source) && (status === 'all' || anime.informationStatus === status);
  }), [animeList, keyword, source, status]);

  const groups = useMemo(() => {
    const labels: Array<{ key: string; title: string; description: string; year: number; season: SeasonName }> = [
      { key: '2026-summer', title: '当前着陆 · 2026 夏季', description: '已经开始放送的本季条目。', year: 2026, season: 'summer' },
      { key: '2026-autumn', title: '下一轨道 · 2026 秋季', description: '已定档或持续公开情报的下一季项目。', year: 2026, season: 'autumn' },
      { key: '2027-winter', title: '远期雷达 · 2027 冬季', description: '已宣布但距离放送仍较远。', year: 2027, season: 'winter' },
      { key: 'undecided', title: '深空信号 · 档期未定', description: '仅有概念或初步企划信息。', year: 2027, season: 'undecided' },
    ];
    return labels.map((group) => ({ ...group, items: targets.filter((anime) => anime.year === group.year && anime.season === group.season) }));
  }, [targets]);

  return (
    <div className="container page-top page-bottom">
      <div className="page-title-grid">
        <div><span className="eyebrow">SATELLITE OBSERVATORY</span><h1>新番雷达</h1><p>参考长期资料站的分档逻辑，使用 AniList 公开资料与现代化筛选体验。</p></div>
        <div className="page-title-icon"><RadioTower size={34} /></div>
      </div>

      <div className="filter-panel">
        <label className="search-field"><Search size={17} /><input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜索雷达目标" /></label>
        <div className="filter-row"><Filter size={16} /><span>来源</span>{sourceOptions.map((option) => <button key={option} className={source === option ? 'filter-chip active' : 'filter-chip'} onClick={() => setSource(option)}>{option === 'all' ? '全部' : sourceLabels[option]}</button>)}</div>
        <div className="filter-row"><span className="filter-spacer" /> <span>状态</span>{statusOptions.map((option) => <button key={option} className={status === option ? 'filter-chip active' : 'filter-chip'} onClick={() => setStatus(option)}>{option === 'all' ? '全部' : informationLabels[option]}</button>)}</div>
      </div>

      {groups.sort((a, b) => seasonOrder.indexOf(a.season) - seasonOrder.indexOf(b.season)).map((group) => (
        <section key={group.key} className="section-space-tight radar-group">
          <SectionHeader eyebrow={group.items.length ? `${group.items.length} 个信号` : '暂无匹配'} title={group.title} description={group.description} />
          {group.items.length > 0 ? <div className="anime-grid four-col">{group.items.map((anime) => <AnimeCard key={anime.id} anime={anime} compact />)}</div> : <div className="empty-panel">当前筛选下没有 {formatSeason(group.year, group.season)} 条目。</div>}
        </section>
      ))}
    </div>
  );
}
