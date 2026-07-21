import { ArrowLeft, CalendarDays, ExternalLink, PlayCircle, ShieldAlert, Star, Users } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { animeList } from '../data';
import { Badge } from '../components/Badge';
import { Cover } from '../components/Cover';
import { formatSeason, informationLabels, safePercent, sourceLabels, watchLabels, weekdayLabels } from '../utils';

export function AnimeDetailPage() {
  const { id } = useParams();
  const anime = animeList.find((item) => item.id === id);

  if (!anime) {
    return <div className="container page-top page-bottom"><div className="empty-panel large"><h1>没有找到对应的动漫记录</h1><p>该条目可能已被移除，或地址不正确。</p><div className="row gap-md"><Link className="button secondary" to="/anime">返回动漫档案</Link><Link className="button primary" to="/">返回首页</Link></div></div></div>;
  }

  const scoreEntries = anime.scores ? Object.entries(anime.scores) : [];

  return (
    <div className="page-bottom">
      <section className="detail-hero">
        <Cover seed={anime.coverSeed + 20} className="detail-hero-cover" />
        <div className="detail-hero-overlay" />
        <div className="container detail-hero-content">
          <Link className="back-link light" to="/anime"><ArrowLeft size={16} />返回动漫档案</Link>
          <div className="detail-title-row">
            <Cover seed={anime.coverSeed} className="detail-poster"><span className="cover-code">ARCHIVE {anime.year}</span></Cover>
            <div className="detail-title-copy">
              <div className="row gap-sm wrap"><Badge tone="purple">{formatSeason(anime.year, anime.season)}</Badge><Badge tone="cyan">{sourceLabels[anime.sourceType]}</Badge><Badge tone={anime.informationStatus === 'airing' ? 'green' : 'gray'}>{informationLabels[anime.informationStatus]}</Badge></div>
              <h1>{anime.title}</h1><p className="detail-original">{anime.originalTitle}</p>{anime.englishTitle && <p>{anime.englishTitle}</p>}
              <div className="row gap-md wrap detail-quick"><span><CalendarDays size={16} />{anime.broadcast ? `${weekdayLabels[anime.broadcast.weekday]} ${anime.broadcast.time ?? '时间未定'}` : '放送时间未定'}</span><span><Star size={16} />{anime.rating?.toFixed(1) ?? '暂无评分'}</span><span><Users size={16} />{watchLabels[anime.watchStatus]}</span></div>
            </div>
          </div>
        </div>
      </section>

      <div className="container detail-layout">
        <aside className="detail-aside">
          <nav className="sticky-toc" aria-label="页面目录"><strong>页面目录</strong><a href="#archive">资料档案</a><a href="#broadcast">放送信息</a><a href="#staff">制作阵容</a><a href="#personal">我的记录</a><a href="#logs">观看日志</a></nav>
        </aside>
        <article className="detail-content">
          <section id="archive" className="detail-section">
            <span className="eyebrow">OFFICIAL PROFILE</span><h2>资料档案</h2><p className="lead-text">{anime.synopsis}</p>
            <dl className="definition-grid">
              <div><dt>播出季度</dt><dd>{formatSeason(anime.year, anime.season)}</dd></div><div><dt>原作类型</dt><dd>{sourceLabels[anime.sourceType]}</dd></div>
              <div><dt>题材标签</dt><dd>{anime.genres.join(' / ')}</dd></div><div><dt>情报状态</dt><dd>{informationLabels[anime.informationStatus]}</dd></div>
              <div><dt>最后更新</dt><dd>{anime.lastUpdated}</dd></div><div><dt>资料说明</dt><dd>{anime.sourceNote}</dd></div>
            </dl>
          </section>

          <section id="broadcast" className="detail-section">
            <span className="eyebrow">BROADCAST</span><h2>放送信息</h2>
            {anime.broadcast ? <dl className="definition-grid"><div><dt>首播日期</dt><dd>{anime.broadcast.startDate ?? '未定'}</dd></div><div><dt>星期与时间</dt><dd>{weekdayLabels[anime.broadcast.weekday]} {anime.broadcast.time ?? ''}</dd></div><div><dt>总集数</dt><dd>{anime.broadcast.episodeCount ?? '未公开'}</dd></div><div><dt>模拟平台</dt><dd>{anime.broadcast.platforms.join(' / ')}</dd></div></dl> : <div className="empty-panel">放送信息尚未公开。</div>}
            <div className="external-links">{anime.externalLinks.map((link) => <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer"><ExternalLink size={16} />{link.label}</a>)}</div>
          </section>

          <section id="staff" className="detail-section">
            <span className="eyebrow">STAFF & CAST</span><h2>制作阵容</h2>
            <dl className="definition-grid"><div><dt>动画制作</dt><dd>{anime.staff.studio.join(' / ')}</dd></div><div><dt>导演</dt><dd>{anime.staff.director ?? '未公开'}</dd></div><div><dt>系列构成</dt><dd>{anime.staff.seriesComposition ?? '未公开'}</dd></div><div><dt>人物设计</dt><dd>{anime.staff.characterDesign ?? '未公开'}</dd></div><div><dt>音乐</dt><dd>{anime.staff.music ?? '未公开'}</dd></div><div><dt>主要声优</dt><dd>{anime.staff.cast.join(' / ') || '未公开'}</dd></div></dl>
          </section>

          <section id="personal" className="detail-section personal-panel">
            <span className="eyebrow">MY WATCH RECORD</span><h2>我的记录</h2>
            <div className="watch-progress"><div><span>观看进度</span><strong>{anime.progress} / {anime.broadcast?.episodeCount ?? '?'}</strong></div><div className="progress-track"><span style={{ width: `${safePercent(anime.progress, anime.broadcast?.episodeCount)}%` }} /></div></div>
            {scoreEntries.length > 0 && <div className="score-grid">{scoreEntries.map(([label, score]) => <div key={label}><span>{label}</span><strong>{score}</strong><div><i style={{ width: `${Number(score) * 10}%` }} /></div></div>)}</div>}
            <div className="review-grid"><div><h3>无剧透短评</h3><p>{anime.shortComment ?? '暂无短评。'}</p></div><div><h3>推荐理由</h3><p>{anime.recommendation ?? '暂无。'}</p></div><div><h3>适合人群</h3><p>{anime.audience ?? '暂无。'}</p></div><div><h3><ShieldAlert size={17} />劝退点</h3><p>{anime.warning ?? '暂无。'}</p></div></div>
            {anime.spoilerReview && <details className="spoiler-box"><summary><PlayCircle size={18} />展开剧透感想</summary><p>{anime.spoilerReview}</p></details>}
          </section>

          <section id="logs" className="detail-section"><span className="eyebrow">WATCH LOG</span><h2>观看日志</h2>{anime.logs.length > 0 ? <div className="timeline">{anime.logs.map((log) => <div key={`${log.date}-${log.episode}`}><time>{log.date}</time><span /><article><strong>第 {log.episode} 话</strong><p>{log.note}</p></article></div>)}</div> : <div className="empty-panel">还没有观看日志。</div>}</section>
        </article>
      </div>
    </div>
  );
}
