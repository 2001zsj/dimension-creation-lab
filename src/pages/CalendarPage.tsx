import { CalendarDays, Clock3, LayoutGrid, List, Radio } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '../components/Badge';
import { Cover } from '../components/Cover';
import { useAnimeList } from '../liveAnime';
import type { Weekday } from '../types';
import { currentWeekday, watchLabels, weekdayLabels } from '../utils';

const weekdays: Weekday[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'streaming'];
const todayWeekday: Weekday = currentWeekday();

export function CalendarPage() {
  const animeList = useAnimeList();
  const [activeDay, setActiveDay] = useState<Weekday>(todayWeekday);
  const [onlyWatching, setOnlyWatching] = useState(false);
  const [compact, setCompact] = useState(false);
  const [timezone, setTimezone] = useState<'jst' | 'local'>('jst');

  const items = useMemo(() => animeList
    .filter((anime) => anime.informationStatus === 'airing' && anime.broadcast?.weekday === activeDay)
    .filter((anime) => !onlyWatching || anime.watchStatus === 'watching')
    .sort((a, b) => (a.broadcast?.time ?? '').localeCompare(b.broadcast?.time ?? '')), [activeDay, animeList, onlyWatching]);

  return (
    <div className="container page-top page-bottom">
      <div className="page-title-grid">
        <div><span className="eyebrow">WEEKLY BROADCAST</span><h1>每周放送表</h1><p>按星期、时间和公开播出资料整理本季条目。</p></div>
        <div className="page-title-icon"><CalendarDays size={34} /></div>
      </div>

      <div className="weekday-tabs" role="tablist" aria-label="选择放送星期">
        {weekdays.map((day) => (
          <button key={day} role="tab" aria-selected={activeDay === day} className={activeDay === day ? 'weekday-tab active' : 'weekday-tab'} onClick={() => setActiveDay(day)}>
            {weekdayLabels[day]}{day === todayWeekday && <small>今天</small>}
          </button>
        ))}
      </div>

      <div className="calendar-toolbar">
        <label className="toggle-label"><input type="checkbox" checked={onlyWatching} onChange={(event) => setOnlyWatching(event.target.checked)} /><span />只看我在追</label>
        <div className="segmented"><button className={timezone === 'jst' ? 'active' : ''} onClick={() => setTimezone('jst')}>日本时间</button><button className={timezone === 'local' ? 'active' : ''} onClick={() => setTimezone('local')}>本地时间</button></div>
        <div className="segmented icon-segment"><button aria-label="卡片模式" className={!compact ? 'active' : ''} onClick={() => setCompact(false)}><LayoutGrid size={16} /></button><button aria-label="紧凑模式" className={compact ? 'active' : ''} onClick={() => setCompact(true)}><List size={16} /></button></div>
      </div>

      <div className="calendar-headline"><div><Radio size={17} /><strong>{weekdayLabels[activeDay]}</strong><span>{items.length} 部作品</span></div><small>{timezone === 'jst' ? 'Asia/Tokyo' : Intl.DateTimeFormat().resolvedOptions().timeZone}</small></div>

      {items.length > 0 ? (
        <div className={compact ? 'schedule-list compact' : 'schedule-list'}>
          {items.map((anime) => (
            <Link to={`/anime/${anime.id}`} className="schedule-item" key={anime.id}>
              <time><Clock3 size={15} />{anime.broadcast?.time ?? '未定'}</time>
              <Cover seed={anime.coverSeed} imageUrl={anime.coverImage} className="schedule-cover" />
              <div className="schedule-copy"><span className="row gap-sm wrap"><Badge tone="green">放送中</Badge><Badge>{watchLabels[anime.watchStatus]}</Badge></span><h3>{anime.title}</h3><p>{anime.originalTitle}</p></div>
              <div className="schedule-detail"><strong>第 {anime.progress + 1} 话</strong><span>{anime.broadcast?.platforms.join(' / ')}</span><small>总计 {anime.broadcast?.episodeCount ?? '?'} 话</small></div>
            </Link>
          ))}
        </div>
      ) : <div className="empty-panel large">当前条件下没有放送条目。</div>}

      <div className="notice-panel"><CalendarDays size={20} /><p>时间和集数来自公开资料整理；具体地区平台与上架时间请以官方公告为准。</p></div>
    </div>
  );
}
