import { Bookmark, CalendarDays, Clock3, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLocalLibrary } from '../localLibrary';
import type { Anime } from '../types';
import { formatSeason, informationLabels, isPersonalRecord, sourceLabels, watchLabels, weekdayLabels } from '../utils';
import { Badge } from './Badge';
import { Cover } from './Cover';

interface AnimeCardProps {
  anime: Anime;
  compact?: boolean;
}

export function AnimeCard({ anime, compact = false }: AnimeCardProps) {
  const { getRecord, toggleFavorite } = useLocalLibrary();
  const localRecord = getRecord(anime.id);
  const localStatus = localRecord?.status;

  return (
    <article className={`anime-card ${compact ? 'anime-card-compact' : ''}`}>
      <Link to={`/anime/${anime.id}`} className="anime-card-link" aria-label={`查看${anime.title}详情`}>
        <Cover seed={anime.coverSeed} imageUrl={anime.coverImage} className="anime-cover" label={`${anime.title}资料卡片封面`}>
          <span className="cover-code">#{anime.id.slice(0, 2).toUpperCase()}</span>
        </Cover>
        <div className="anime-card-body">
          <div className="row gap-sm wrap anime-card-badges">
            <Badge tone="purple">{formatSeason(anime.year, anime.season)}</Badge>
            <Badge tone="cyan">{sourceLabels[anime.sourceType]}</Badge>
            <Badge tone={anime.informationStatus === 'airing' ? 'green' : 'gray'}>{informationLabels[anime.informationStatus]}</Badge>
          </div>
          <div>
            <h3>{anime.title}</h3>
            <p className="anime-original">{anime.originalTitle}</p>
          </div>
          {!compact && <p className="clamp-2 muted">{anime.synopsis}</p>}
          <div className="anime-card-meta">
            {anime.broadcast && <span><CalendarDays size={14} />{weekdayLabels[anime.broadcast.weekday]}</span>}
            {anime.broadcast?.time && <span><Clock3 size={14} />{anime.broadcast.time}</span>}
            {anime.rating && <span><Star size={14} />{anime.rating.toFixed(1)}</span>}
          </div>
          <div className="row gap-sm wrap card-footer-tags">
            {localStatus && <Badge tone="pink">本地 · {watchLabels[localStatus]}</Badge>}
            {!localStatus && isPersonalRecord(anime) && <Badge tone="gray">{watchLabels[anime.watchStatus]}</Badge>}
            {anime.genres.slice(0, 2).map((genre) => <span key={genre} className="text-tag">#{genre}</span>)}
          </div>
        </div>
      </Link>
      <button
        type="button"
        className={localRecord?.favorite ? 'card-favorite active' : 'card-favorite'}
        onClick={() => toggleFavorite(anime.id)}
        aria-label={localRecord?.favorite ? `取消收藏${anime.title}` : `收藏${anime.title}`}
        aria-pressed={localRecord?.favorite ?? false}
        title={localRecord?.favorite ? '取消收藏' : '收藏'}
      >
        <Bookmark size={18} fill={localRecord?.favorite ? 'currentColor' : 'none'} />
      </button>
    </article>
  );
}
