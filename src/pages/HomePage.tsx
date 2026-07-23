import { ArrowRight, Bookmark, CalendarClock, Clock3, Database, Eye, RadioTower, Sparkles, Tv2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { aiWorks, articles } from '../data';
import { AnimeCard } from '../components/AnimeCard';
import { Cover } from '../components/Cover';
import { SectionHeader } from '../components/SectionHeader';
import { StatCard } from '../components/StatCard';
import { useAnimeList, useAnimeMeta } from '../liveAnime';
import { useLocalLibrary } from '../localLibrary';
import { currentWeekday, formatBroadcastEpisode, formatSeason, getActiveSeason, isPersonalRecord, seasonMonths, weekdayLabels } from '../utils';

export function HomePage() {
  const animeList = useAnimeList();
  const animeMeta = useAnimeMeta();
  const { records } = useLocalLibrary();
  const activeSeason = getActiveSeason(animeList);
  const todayKey = currentWeekday('Asia/Tokyo');
  const currentSeason = animeList.filter((anime) => anime.year === activeSeason.year && anime.season === activeSeason.season);
  const todayAnime = currentSeason.filter((anime) => anime.informationStatus === 'airing' && anime.broadcast?.weekday === todayKey);
  const upcomingTargets = animeList.filter((anime) => ['scheduled', 'announced', 'delayed'].includes(anime.informationStatus));
  const upcomingPreview = upcomingTargets.slice(0, 4);
  const featuredCandidates = currentSeason.filter((anime) => anime.featured);
  const featured = (featuredCandidates.length ? featuredCandidates : currentSeason).slice(0, 3);
  const latestPersonalLog = animeList
    .filter(isPersonalRecord)
    .flatMap((anime) => anime.logs.map((log) => ({ ...log, anime })))
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  const latestUpdated = [...animeList].sort((a, b) => b.lastUpdated.localeCompare(a.lastUpdated))[0];
  const syncLabel = animeMeta.status === 'live' ? '实时资料已更新' : animeMeta.status === 'loading' ? '正在连接资料源' : '当前显示本地缓存';
  const seasonTitle = formatSeason(activeSeason.year, activeSeason.season);
  const sourcePeriod = `${activeSeason.year} 年 ${seasonMonths[activeSeason.season]}`;
  const localRecords = Object.values(records);
  const favoriteCount = localRecords.filter((record) => record.favorite).length;
  const watchingCount = localRecords.filter((record) => record.status === 'watching').length;

  return (
    <>
      <section className="hero page-pad">
        <div className="hero-orb hero-orb-a" />
        <div className="hero-orb hero-orb-b" />
        <div className="container hero-grid">
          <div className="hero-copy">
            <span className="live-pill"><span />{seasonTitle}观测中</span>
            <h1>把每一季新番，整理成一座会持续生长的资料库。</h1>
            <p>记录放送时间、制作资料和公开来源，也保存文章、提示词与 AI 创作过程。</p>
            <div className="hero-actions">
              <Link className="button primary" to={`/season/${activeSeason.year}/${activeSeason.season}`}>进入本季档案 <ArrowRight size={17} /></Link>
              <Link className="button secondary" to="/calendar">查看今日放送</Link>
            </div>
          </div>
          <div className="season-console">
            <div className="console-top"><span>SEASON CONSOLE</span><strong>{activeSeason.year} / {activeSeason.season.toUpperCase()}</strong></div>
            <div className="console-radar"><span className="radar-ring ring-a" /><span className="radar-ring ring-b" /><span className="radar-sweep" /><Sparkles size={28} /></div>
            <div className="console-row"><span>资料更新时间</span><strong>{animeMeta.updatedAt?.slice(0, 10) ?? '同步中'}</strong></div>
            <div className="console-row"><span>日本星期</span><strong>{weekdayLabels[todayKey]}</strong></div>
          </div>
        </div>
      </section>

      <section className="container stats-grid section-space-tight">
        <StatCard label="本季收录" value={currentSeason.length} note="公开资料条目" icon={Tv2} />
        <StatCard label="正在放送" value={animeList.filter((anime) => anime.informationStatus === 'airing').length} note="按资料状态统计" icon={Database} />
        <StatCard label="今日放送" value={todayAnime.length} note={`${weekdayLabels[todayKey]} · 日本时间`} icon={CalendarClock} />
        <StatCard label="雷达目标" value={upcomingTargets.length} note="已公开、已定档或延期" icon={RadioTower} />
      </section>

      <section className="container local-home-panel">
        <div><span className="eyebrow">MY LOCAL LIBRARY</span><h2>我的本地追番</h2><p>收藏和追番状态只保存在当前浏览器，不会改写公开资料。</p></div>
        <div className="local-home-stats"><span><Bookmark size={18} /><strong>{favoriteCount}</strong><small>已收藏</small></span><span><Eye size={18} /><strong>{watchingCount}</strong><small>在追</small></span></div>
        <Link className="button secondary" to="/anime">管理收藏与状态 <ArrowRight size={16} /></Link>
      </section>

      <section className="container section-space">
        <SectionHeader eyebrow="ON AIR TODAY" title="今日放送" description="按日本星期与公开表记时间快速查看。" action={<Link className="text-link" to="/calendar">完整放送表 <ArrowRight size={15} /></Link>} />
        {todayAnime.length > 0 ? (
          <div className="today-list">
            {todayAnime.map((anime) => (
              <Link to={`/anime/${anime.id}`} key={anime.id} className="today-item">
                <span className="today-time">{anime.broadcast?.time ?? '未定'}</span>
                <Cover seed={anime.coverSeed} imageUrl={anime.coverImage} className="today-cover" label={`${anime.title}封面`} />
                <span className="today-copy"><strong>{anime.title}</strong><small>{formatBroadcastEpisode(anime)} · {anime.broadcast?.platforms.join(' / ')}</small></span>
                <span className={records[anime.id]?.favorite ? 'status-dot favorite' : 'status-dot'}><span />{records[anime.id]?.favorite ? '已收藏' : '放送中'}</span>
                <ArrowRight size={18} />
              </Link>
            ))}
          </div>
        ) : <div className="empty-panel">今天没有已收录的公开放送条目。</div>}
      </section>

      <section className="container section-space">
        <SectionHeader eyebrow="SEASON PICKS" title="本季重点关注" description="根据资料完整度与站内标记展示重点条目，不代表个人评分。" action={<Link className="text-link" to="/anime">浏览全部 <ArrowRight size={15} /></Link>} />
        {featured.length > 0 ? <div className="anime-grid three-col">{featured.map((anime) => <AnimeCard key={anime.id} anime={anime} />)}</div> : <div className="empty-panel">本季度暂无条目。</div>}
      </section>

      <section className="band-section section-space">
        <div className="container">
          <SectionHeader eyebrow="SATELLITE RADAR" title="新番雷达" description="把已公开、已定档、延期和档期未定项目分层观察。" action={<Link className="button secondary compact" to="/radar">打开雷达</Link>} />
          {upcomingPreview.length > 0 ? <div className="radar-strip">
            {upcomingPreview.map((anime) => (
              <Link to={`/anime/${anime.id}`} key={anime.id} className="radar-mini-card">
                <Cover seed={anime.coverSeed} imageUrl={anime.coverImage} className="radar-mini-cover" label={`${anime.title}封面`}><span>{anime.year}</span></Cover>
                <div><span className="mini-label">{formatSeason(anime.year, anime.season)}</span><strong>{anime.title}</strong><small>{anime.staff.studio.join(' / ')}</small></div>
              </Link>
            ))}
          </div> : <div className="empty-panel">当前没有远期雷达条目。</div>}
        </div>
      </section>

      <section className="container section-space two-column-home">
        <div>
          <SectionHeader eyebrow={latestPersonalLog ? 'WATCH LOG' : 'DATA UPDATE'} title={latestPersonalLog ? '最近观看记录' : '最近资料更新'} />
          {latestPersonalLog ? (
            <Link to={`/anime/${latestPersonalLog.anime.id}`} className="log-card">
              <Cover seed={latestPersonalLog.anime.coverSeed} imageUrl={latestPersonalLog.anime.coverImage} className="log-cover" label={`${latestPersonalLog.anime.title}封面`} />
              <div><span>{latestPersonalLog.date} · 第 {latestPersonalLog.episode} 话</span><h3>{latestPersonalLog.anime.title}</h3><p>{latestPersonalLog.note}</p></div>
            </Link>
          ) : latestUpdated ? (
            <Link to={`/anime/${latestUpdated.id}`} className="log-card">
              <Cover seed={latestUpdated.coverSeed} imageUrl={latestUpdated.coverImage} className="log-cover" label={`${latestUpdated.title}封面`} />
              <div><span>{latestUpdated.lastUpdated} · 公开资料</span><h3>{latestUpdated.title}</h3><p>{latestUpdated.sourceNote}</p></div>
            </Link>
          ) : <div className="empty-panel">暂无资料更新。</div>}
        </div>
        <div>
          <SectionHeader eyebrow="LATEST NOTES" title="最新文章" />
          <div className="article-mini-list">
            {articles.slice(0, 3).map((article) => (
              <Link to={`/articles#${article.id}`} key={article.id}><span>{article.category}</span><strong>{article.title}</strong><small>{article.date} · {article.readTime}</small></Link>
            ))}
          </div>
        </div>
      </section>

      <section className="container section-space">
        <SectionHeader eyebrow="CREATIVE OUTPUT" title="最近 AI 创作" description="不仅展示结果，也记录问题与调整过程。" action={<Link className="text-link" to="/works">查看作品集 <ArrowRight size={15} /></Link>} />
        <div className="work-preview-grid">
          {aiWorks.map((work) => (
            <Link to={`/works/${work.id}`} key={work.id} className="work-preview">
              <Cover seed={work.coverSeed} className="work-preview-cover" label={`${work.title}视觉占位图`} />
              <div><span>{work.type}</span><h3>{work.title}</h3><p>{work.background}</p></div>
            </Link>
          ))}
        </div>
      </section>

      <section className="container notice-panel section-space-tight">
        <Clock3 size={20} /><p><strong>{syncLabel}：</strong>本季新番、放送日历与资料入口根据 <a href={animeMeta.sourceUrl} target="_blank" rel="noopener noreferrer">長門番堂 {sourcePeriod}新番表</a> 整理；资源入口会保留来源、核验状态和授权状态，使用前请自行确认可用性。</p>
      </section>
    </>
  );
}
