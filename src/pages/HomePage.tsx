import { ArrowRight, CalendarClock, Clock3, Eye, RadioTower, Sparkles, Tv2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { aiWorks, animeList, articles } from '../data';
import { AnimeCard } from '../components/AnimeCard';
import { Cover } from '../components/Cover';
import { SectionHeader } from '../components/SectionHeader';
import { StatCard } from '../components/StatCard';
import { currentWeekday, weekdayLabels } from '../utils';

const currentSeason = animeList.filter((anime) => anime.year === 2026 && anime.season === 'summer');
const todayKey = currentWeekday();
const todayAnime = currentSeason.filter((anime) => anime.broadcast?.weekday === todayKey);
const upcoming = animeList.filter((anime) => anime.informationStatus === 'scheduled' || anime.informationStatus === 'announced').slice(0, 4);
const featured = currentSeason.filter((anime) => anime.featured).slice(0, 3);

export function HomePage() {
  const latestLog = animeList.flatMap((anime) => anime.logs.map((log) => ({ ...log, anime }))).sort((a, b) => b.date.localeCompare(a.date))[0];

  return (
    <>
      <section className="hero page-pad">
        <div className="hero-orb hero-orb-a" />
        <div className="hero-orb hero-orb-b" />
        <div className="container hero-grid">
          <div className="hero-copy">
            <span className="live-pill"><span />2026 夏季观测中</span>
            <h1>把每一季新番，整理成一座会持续生长的资料库。</h1>
            <p>记录放送时间、制作资料和观看进度，也保存文章、提示词与 AI 创作过程。</p>
            <div className="hero-actions">
              <Link className="button primary" to="/season/2026/summer">进入本季档案 <ArrowRight size={17} /></Link>
              <Link className="button secondary" to="/calendar">查看今日放送</Link>
            </div>
          </div>
          <div className="season-console">
            <div className="console-top"><span>SEASON CONSOLE</span><strong>2026 / SUMMER</strong></div>
            <div className="console-radar"><span className="radar-ring ring-a" /><span className="radar-ring ring-b" /><span className="radar-sweep" /><Sparkles size={28} /></div>
            <div className="console-row"><span>资料更新时间</span><strong>2026.07.20</strong></div>
            <div className="console-row"><span>今日星期</span><strong>{weekdayLabels[todayKey]}</strong></div>
          </div>
        </div>
      </section>

      <section className="container stats-grid section-space-tight">
        <StatCard label="本季收录" value={currentSeason.length} note="公开资料条目" icon={Tv2} />
        <StatCard label="正在追番" value={animeList.filter((anime) => anime.watchStatus === 'watching').length} note="资料同步状态" icon={Eye} />
        <StatCard label="今日放送" value={todayAnime.length} note={`${weekdayLabels[todayKey]}更新`} icon={CalendarClock} />
        <StatCard label="雷达目标" value={upcoming.length} note="已公开或已定档" icon={RadioTower} />
      </section>

      <section className="container section-space">
        <SectionHeader eyebrow="ON AIR TODAY" title="今日放送" description="按星期与时间快速查看，不必在长列表里寻找。" action={<Link className="text-link" to="/calendar">完整放送表 <ArrowRight size={15} /></Link>} />
        {todayAnime.length > 0 ? (
          <div className="today-list">
            {todayAnime.map((anime) => (
              <Link to={`/anime/${anime.id}`} key={anime.id} className="today-item">
                <span className="today-time">{anime.broadcast?.time}</span>
                <Cover seed={anime.coverSeed} imageUrl={anime.coverImage} className="today-cover" />
                <span className="today-copy"><strong>{anime.title}</strong><small>第 {anime.progress + 1} 话 · {anime.broadcast?.platforms.join(' / ')}</small></span>
                <span className="status-dot"><span />即将放送</span>
                <ArrowRight size={18} />
              </Link>
            ))}
          </div>
        ) : <div className="empty-panel">今日没有公开放送条目。</div>}
      </section>

      <section className="container section-space">
        <SectionHeader eyebrow="SEASON PICKS" title="本季重点关注" description="按公开评分、热度与资料完整度挑选的重点条目。" action={<Link className="text-link" to="/anime">浏览全部 <ArrowRight size={15} /></Link>} />
        <div className="anime-grid three-col">{featured.map((anime) => <AnimeCard key={anime.id} anime={anime} />)}</div>
      </section>

      <section className="band-section section-space">
        <div className="container">
          <SectionHeader eyebrow="SATELLITE RADAR" title="新番雷达" description="把下一季、远期企划和档期未定项目分层观察。" action={<Link className="button secondary compact" to="/radar">打开雷达</Link>} />
          <div className="radar-strip">
            {upcoming.map((anime) => (
              <Link to={`/anime/${anime.id}`} key={anime.id} className="radar-mini-card">
                <Cover seed={anime.coverSeed} imageUrl={anime.coverImage} className="radar-mini-cover"><span>{anime.year}</span></Cover>
                <div><span className="mini-label">{anime.season === 'undecided' ? '档期未定' : `${anime.year} ${anime.season}`}</span><strong>{anime.title}</strong><small>{anime.staff.studio.join(' / ')}</small></div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="container section-space two-column-home">
        <div>
          <SectionHeader eyebrow="WATCH LOG" title="最近观看记录" />
          {latestLog ? (
            <Link to={`/anime/${latestLog.anime.id}`} className="log-card">
              <Cover seed={latestLog.anime.coverSeed} imageUrl={latestLog.anime.coverImage} className="log-cover" />
              <div><span>{latestLog.date} · 第 {latestLog.episode} 话</span><h3>{latestLog.anime.title}</h3><p>{latestLog.note}</p></div>
            </Link>
          ) : <div className="empty-panel">暂无观看日志。</div>}
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
              <Cover seed={work.coverSeed} className="work-preview-cover" />
              <div><span>{work.type}</span><h3>{work.title}</h3><p>{work.background}</p></div>
            </Link>
          ))}
        </div>
      </section>

      <section className="container notice-panel section-space-tight">
        <Clock3 size={20} /><p><strong>资料说明：</strong>本站动漫条目来自 AniList 公开 API 与资料页链接整理；播出平台请以官方公告为准，本站不提供播放或下载资源。</p>
      </section>
    </>
  );
}
