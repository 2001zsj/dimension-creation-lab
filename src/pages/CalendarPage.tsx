import { Bookmark, CalendarDays, Clock3, Download, LayoutGrid, List, Radio, RotateCcw, Search } from 'lucide-react';
import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '../components/Badge';
import { Cover } from '../components/Cover';
import { useAnimeList } from '../liveAnime';
import { useLocalLibrary } from '../localLibrary';
import type { Weekday } from '../types';
import {
  buildWeeklyBroadcastIcs,
  currentWeekday,
  downloadTextFile,
  formatBroadcastEpisode,
  formatBroadcastForZone,
  formatCountdown,
  informationLabels,
  nextBroadcastDate,
  watchLabels,
  weekdayLabels,
  weekdayOrder,
} from '../utils';

export function CalendarPage() {
  const animeList = useAnimeList();
  const { records } = useLocalLibrary();
  const [timezone, setTimezone] = useState<'jst' | 'local'>('jst');
  const [activeDay, setActiveDay] = useState<Weekday>(() => currentWeekday('Asia/Tokyo'));
  const [keyword, setKeyword] = useState('');
  const [platform, setPlatform] = useState('all');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [compact, setCompact] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const zone = timezone === 'jst' ? 'Asia/Tokyo' : Intl.DateTimeFormat().resolvedOptions().timeZone;
    setActiveDay(currentWeekday(zone));
  }, [timezone]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  const airingItems = useMemo(() => animeList.filter((anime) => anime.informationStatus === 'airing' && anime.broadcast), [animeList]);
  const platformOptions = useMemo(() => [...new Set(airingItems.flatMap((anime) => anime.broadcast?.platforms ?? []))].sort((a, b) => a.localeCompare(b, 'zh-CN')), [airingItems]);

  const filteredItems = useMemo(() => {
    const tokens = keyword.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return airingItems.filter((anime) => {
      const haystack = [anime.title, anime.originalTitle, anime.englishTitle ?? '', ...anime.genres, ...anime.staff.studio, ...(anime.broadcast?.platforms ?? [])].join(' ').toLowerCase();
      return tokens.every((token) => haystack.includes(token))
        && (platform === 'all' || anime.broadcast?.platforms.includes(platform))
        && (!onlyFavorites || records[anime.id]?.favorite);
    });
  }, [airingItems, keyword, onlyFavorites, platform, records]);

  const items = useMemo(() => filteredItems
    .map((anime) => ({ anime, display: formatBroadcastForZone(anime.broadcast!, timezone) }))
    .filter(({ display }) => display.weekday === activeDay)
    .sort((a, b) => (a.display.time ?? '').localeCompare(b.display.time ?? '')), [activeDay, filteredItems, timezone]);

  const nextItem = useMemo(() => filteredItems
    .map((anime) => ({ anime, date: nextBroadcastDate(anime.broadcast!, now) }))
    .filter((item): item is { anime: (typeof filteredItems)[number]; date: Date } => Boolean(item.date))
    .sort((a, b) => a.date.getTime() - b.date.getTime())[0], [filteredItems, now]);

  const zone = timezone === 'jst' ? 'Asia/Tokyo' : Intl.DateTimeFormat().resolvedOptions().timeZone;
  const zoneLabel = timezone === 'jst' ? 'Asia/Tokyo' : zone;
  const today = currentWeekday(zone);
  const exportableItems = filteredItems.filter((anime) => anime.broadcast?.weekday !== 'streaming' && anime.broadcast?.time);

  const resetFilters = () => {
    setKeyword('');
    setPlatform('all');
    setOnlyFavorites(false);
  };

  const exportCalendar = () => {
    const content = buildWeeklyBroadcastIcs(exportableItems);
    downloadTextFile('dimension-lab-weekly-anime.ics', content, 'text/calendar;charset=utf-8');
  };

  return (
    <div className="container page-top page-bottom">
      <div className="page-title-grid">
        <div><span className="eyebrow">WEEKLY BROADCAST</span><h1>每周放送表</h1><p>搜索、筛选、收藏联动与日历导出，让公开放送资料可以直接用于日常追番。</p></div>
        <div className="page-title-icon"><CalendarDays size={34} /></div>
      </div>

      {nextItem && <section className="next-broadcast-panel" aria-live="polite">
        <div className="next-broadcast-icon"><Radio size={20} /></div>
        <div><span>下一部放送</span><strong>{nextItem.anime.title}</strong><small>{new Intl.DateTimeFormat('zh-CN', { timeZone: zone, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(nextItem.date)} · 距离现在 {formatCountdown(nextItem.date, now)}</small></div>
        <Link className="button secondary compact" to={`/anime/${nextItem.anime.id}`}>查看资料</Link>
      </section>}

      <div className="calendar-filter-panel">
        <label className="search-field grow"><Search size={17} /><input value={keyword} onChange={(event: ChangeEvent<HTMLInputElement>) => setKeyword(event.target.value)} placeholder="搜索标题、制作公司、平台或题材" aria-label="搜索放送日历" /></label>
        <label className="select-label">平台/地区<select value={platform} onChange={(event: ChangeEvent<HTMLSelectElement>) => setPlatform(event.target.value)}><option value="all">全部</option>{platformOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <label className="toggle-label calendar-favorite-toggle"><input type="checkbox" checked={onlyFavorites} onChange={(event: ChangeEvent<HTMLInputElement>) => setOnlyFavorites(event.target.checked)} /><span aria-hidden="true" /><Bookmark size={15} />只看收藏</label>
        <button type="button" className="button secondary compact" onClick={resetFilters}><RotateCcw size={15} />清除筛选</button>
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
            {weekdayLabels[day]}{day === today && <small>今天</small>}
          </button>
        ))}
      </div>

      <div className="calendar-toolbar">
        <button type="button" className="button secondary compact" onClick={() => setActiveDay(today)}><CalendarDays size={15} />回到今天</button>
        <div className="segmented" aria-label="选择时区">
          <button aria-pressed={timezone === 'jst'} className={timezone === 'jst' ? 'active' : ''} onClick={() => setTimezone('jst')}>日本时间</button>
          <button aria-pressed={timezone === 'local'} className={timezone === 'local' ? 'active' : ''} onClick={() => setTimezone('local')}>本地时间</button>
        </div>
        <div className="segmented icon-segment" aria-label="选择列表密度">
          <button aria-label="卡片模式" aria-pressed={!compact} className={!compact ? 'active' : ''} onClick={() => setCompact(false)}><LayoutGrid size={16} /></button>
          <button aria-label="紧凑模式" aria-pressed={compact} className={compact ? 'active' : ''} onClick={() => setCompact(true)}><List size={16} /></button>
        </div>
        <button type="button" className="button primary compact" onClick={exportCalendar} disabled={exportableItems.length === 0}><Download size={15} />导出筛选结果 ICS（{exportableItems.length}）</button>
      </div>

      <div className="calendar-headline"><div><Radio size={17} /><strong>{weekdayLabels[activeDay]}</strong><span>{items.length} 部作品</span></div><small>{zoneLabel}</small></div>

      <div id="broadcast-schedule" role="tabpanel" aria-labelledby={`weekday-tab-${activeDay}`}>
        {items.length > 0 ? (
          <div className={compact ? 'schedule-list compact' : 'schedule-list'}>
            {items.map(({ anime, display }) => {
              const localRecord = records[anime.id];
              return (
                <Link to={`/anime/${anime.id}`} className="schedule-item" key={anime.id}>
                  <time><Clock3 size={15} />{display.time ?? '未定'}</time>
                  <Cover seed={anime.coverSeed} imageUrl={anime.coverImage} className="schedule-cover" label={`${anime.title}封面`} />
                  <div className="schedule-copy">
                    <span className="row gap-sm wrap"><Badge tone="green">{informationLabels[anime.informationStatus]}</Badge>{localRecord?.favorite && <Badge tone="pink">已收藏</Badge>}{localRecord?.status && <Badge>本地 · {watchLabels[localRecord.status]}</Badge>}</span>
                    <h3>{anime.title}</h3><p>{anime.originalTitle}</p>
                  </div>
                  <div className="schedule-detail"><strong>{formatBroadcastEpisode(anime)}</strong><span>{anime.broadcast?.platforms.join(' / ')}</span><small>总计 {anime.broadcast?.episodeCount ?? '未公开'} 话</small></div>
                </Link>
              );
            })}
          </div>
        ) : <div className="empty-panel large">当前星期与筛选条件下没有放送条目。</div>}
      </div>

      <div className="notice-panel"><CalendarDays size={20} /><p>时间来自公开新番表并以日本时间为基准；ICS 使用实际放送时刻生成每周重复事件。地区平台、延期与上架安排仍请以官方公告为准。</p></div>
    </div>
  );
}
