import { CalendarDays, Clock3, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Anime } from '../types';
import { formatSeason, informationLabels, sourceLabels, watchLabels, weekdayLabels } from '../utils';
import { Badge } from './Badge';
import { Cover } from './Cover';

interface AnimeCardProps {
  anime: Anime;
  compact?: boolean;
}

export function AnimeCard({ anime, compact = false }: AnimeCardProps) {
  return (
    <Link to={`/anime/${anime.id}`} className={`anime-card ${compact ? 'anime-card-compact' : ''}`}>
      <Cover seed={anime.coverSeed} className="anime-cover" label={`${anime.title}原创渐变封面`}>
        <span className="cover-code">#{anime.id.slice(0, 2).toUpperCase()}</span>
      </Cover>
      <div className="anime-card-body">
        <div className="row gap-sm wrap">
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
          {anime.broadcast && (
            <span><CalendarDays size={14} />{weekdayLabels[anime.broadcast.weekday]}</span>
          )}
          {anime.broadcast?.time && <span><Clock3 size={14} />{anime.broadcast.time}</span>}
          {anime.rating && <span><Star size={14} />{anime.rating.toFixed(1)}</span>}
        </div>
        <div className="row gap-sm wrap card-footer-tags">
          <Badge tone="gray">{watchLabels[anime.watchStatus]}</Badge>
          {anime.genres.slice(0, 2).map((genre) => <span key={genre} className="text-tag">#{genre}</span>)}
        </div>
      </div>
    </Link>
  );
}
