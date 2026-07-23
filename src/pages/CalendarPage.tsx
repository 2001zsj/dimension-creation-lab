import { CalendarDays, Clock3, LayoutGrid, List, Radio } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '../components/Badge';
import { Cover } from '../components/Cover';
import { useAnimeList } from '../liveAnime';
import type { Weekday } from '../types';
import { currentWeekday, formatBroadcastEpisode, formatBroadcastForZone, informationLabels, isPersonalRecord, watchLabels, weekdayLabels, weekdayOrder } from '../utils';

export function CalendarPage() {
  const animeList = useAnimeList();
  const [timezone, setTimezone] = useState<'jst' | 'local'>('jst');
  const [activeDay, setActiveDay] = useState<Weekday>(() => currentWeekday('Asia/Tokyo'));
  const [onlyWatching, setOnlyWatching] = useState(false);
  const [compact, setCompact] = useState(false);
  const hasPersonalRecords = animeList.some(isPersonalRecord);

  useEffect(() => {
    const zone = timezone === 'jst' ? 'Asia/Tokyo' : Intl.DateTimeFormat().resolvedOptions().timeZone;
    setActiveDay(currentWeekday(zone));
  }, [timezone]);

  useEffect(() => {
    if (!hasPersonalRecords) setOnlyWatching(false);
  }, [hasPersonalRecords]);

  const items = useMemo(() => animeList
    .filter((anime) => anime.informationStatus === 'airing' && anime.broadcast)
    .map((anime) => ({ anime, display: formatBroadcastForZone(anime.broadcast!, timezone) }))
    .filter(({ display }) => display.weekday === activeDay)
    .filter(({ anime }) => !onlyWatching || (isPersonalRecord(anime) && anime.watchStatus === 'watching'))
    .sort((a, b) => (a.display.time ?? '').localeCompare(b.display.time ?? '')), [activeDay, animeList, onlyWatching, timezone]);

  const zoneLabel = timezone === 'jst' ? 'Asia/Tokyo' : Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <div className="container page-top page-bottom">
      <div className="page-title-grid">
        <div><span className="eyebrow">WEEKLY BROADCAST</span><h1>每周放送表</h1><p>按星期、时间和公开播出资料整理；切换本地时间后会同步换算星期与时刻。</p></div>
        <div className="page-title-icon"><CalendarDays size={34} /></div>
      </div>

      <div className="weekday-tabs" role="tablist" aria-label="选择放送星期">
        {weekdayOrder.map((day) => (
          <button
            id={`weekday-tab-${day}`}
            key={day}
            role="tab"
            aria-selected={activeDay === day}
            aria-controls="broadcast-schedule"
            tabIndex={activeDay === day ? 0 : -1}
            className={activeDay === day ? 'weekday-tab active' : 'weekday-tab'}
            onClick={() => setActiveDay(day)}
          >
            {weekdayLabels[day]}{day === currentWeekday(timezone === 'jst' ? 'Asia/Tokyo' : Intl.DateTimeFormat().resolvedOptions().timeZone) && <small>今天</small>}
          </button>
        ))}
      </div>

      <div className="calendar-toolbar">
        {hasPersonalRecords && <label className="toggle-label"><input type="checkbox" checked={onlyWatching} onChange={(event) => setOnlyWatching(event.target.checked)} /><span aria-hidden="true" />只看我的在追记录</label>}
        <div className="segmented" aria-label="选择时区">
          <button aria-pressed={timezone === 'jst'} className={timezone === 'jst' ? 'active' : ''} onClick={() => setTimezone('jst')}>日本时间</button>
          <button aria-pressed={timezone === 'local'} className={timezone === 'local' ? 'active' : ''} onClick={() => setTimezone('local')}>本地时间</button>
        </div>
        <div className="segmented icon-segment" aria-label="选择列表密度">
          <button aria-label="卡片模式" aria-pressed={!compact} className={!compact ? 'active' : ''} onClick={() => setCompact(false)}><LayoutGrid size={16} /></button>
          <button aria-label="紧凑模式" aria-pressed={compact} className={compact ? 'active' : ''} onClick={() => setCompact(true)}><List size={16} /></button>
        </div>
      </div>

      <div className="calendar-headline"><div><Radio size={17} /><strong>{weekdayLabels[activeDay]}</strong><span>{items.length} 部作品</span></div><small>{zoneLabel}</small></div>

      <div id="broadcast-schedule" role="tabpanel" aria-labelledby={`weekday-tab-${activeDay}`}>
        {items.length > 0 ? (
          <div className={compact ? 'schedule-list compact' : 'schedule-list'}>
            {items.map(({ anime, display }) => (
              <Link to={`/anime/${anime.id}`} className="schedule-item" key={anime.id}>
                <time><Clock3 size={15} />{display.time ?? '未定'}</time>
                <Cover seed={anime.coverSeed} imageUrl={anime.coverImage} className="schedule-cover" label={`${anime.title}封面`} />
                <div className="schedule-copy">
                  <span className="row gap-sm wrap"><Badge tone="green">{informationLabels[anime.informationStatus]}</Badge>{isPersonalRecord(anime) && <Badge>{watchLabels[anime.watchStatus]}</Badge>}</span>
                  <h3>{anime.title}</h3><p>{anime.originalTitle}</p>
                </div>
                <div className="schedule-detail"><strong>{formatBroadcastEpisode(anime)}</strong><span>{anime.broadcast?.platforms.join(' / ')}</span><small>总计 {anime.broadcast?.episodeCount ?? '未公开'} 话</small></div>
              </Link>
            ))}
          </div>
        ) : <div className="empty-panel large">当前星期与筛选条件下没有放送条目。</div>}
      </div>

      <div className="notice-panel"><CalendarDays size={20} /><p>时间来自公开新番表并以日本时间为基准；本地时间换算由浏览器时区完成，地区平台与上架安排仍请以官方公告为准。</p></div>
    </div>
  );
}
