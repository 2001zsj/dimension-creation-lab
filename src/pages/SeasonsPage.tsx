import { Archive, ArrowRight, BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Cover } from '../components/Cover';
import { useAnimeList } from '../liveAnime';
import type { SeasonName } from '../types';
import { formatSeason, seasonKey, seasonLabels } from '../utils';

const seasonOrder: SeasonName[] = ['winter', 'spring', 'summer', 'autumn'];

export function SeasonsPage() {
  const animeList = useAnimeList();
  const years = Array.from(new Set(animeList.filter((anime) => anime.season !== 'undecided').map((anime) => anime.year))).sort((a, b) => b - a);
  return (
    <div className="container page-top page-bottom">
      <div className="page-title-grid">
        <div><span className="eyebrow">SEASON ARCHIVE</span><h1>季度档案</h1><p>按年份和季度追溯收录内容，快速查看题材与改编来源分布。</p></div>
        <div className="page-title-icon"><Archive size={34} /></div>
      </div>

      <div className="year-timeline">
        {years.map((year) => (
          <section key={year} className="year-block">
            <div className="year-marker"><strong>{year}</strong><span>{animeList.filter((anime) => anime.year === year).length} 条记录</span></div>
            <div className="season-card-grid">
              {seasonOrder.map((season, index) => {
                const items = animeList.filter((anime) => seasonKey(anime.year, anime.season) === seasonKey(year, season));
                if (items.length === 0) return null;
                const airing = items.filter((anime) => anime.informationStatus === 'airing').length;
                const originals = items.filter((anime) => anime.sourceType === 'original').length;
                return (
                  <Link key={season} to={`/season/${year}/${season}`} className="season-card">
                    <Cover seed={year + index} className="season-card-cover"><span>{seasonLabels[season]}</span></Cover>
                    <div className="season-card-body">
                      <span className="eyebrow">{formatSeason(year, season)}</span>
                      <h2>{items.length} 部作品</h2>
                      <div className="season-metrics"><span><BarChart3 size={15} />原创 {originals}</span><span>放送中 {airing}</span></div>
                      <span className="text-link">打开季度档案 <ArrowRight size={15} /></span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
