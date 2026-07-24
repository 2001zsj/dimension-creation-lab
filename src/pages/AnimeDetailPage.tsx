import { ArrowLeft, Bookmark, CalendarDays, ChevronLeft, ChevronRight, Database, ExternalLink, HardDrive, LoaderCircle, PlayCircle, RotateCcw, ShieldAlert, Star, Users } from 'lucide-react';
import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Badge } from '../components/Badge';
import { Cover } from '../components/Cover';
import { useRegistry, type AgeDetail, type AgePlayResult } from '../dataRegistry';
import { useLocalLibrary } from '../localLibrary';
import type { WatchStatus } from '../types';
import { formatSeason, informationLabels, isPersonalRecord, safePercent, sourceLabels, watchLabels, weekdayLabels } from '../utils';

function Field({ label, value }: { label: string; value: unknown }) {
  if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)) return null;
  return <div><dt>{label}</dt><dd>{Array.isArray(value) ? value.join(' / ') : String(value)}</dd></div>;
}

export function AnimeDetailPage() {
  const { items, status, loadAgeItem, loadAgeDetail, loadAgePlay } = useRegistry();
  const { getRecord, toggleFavorite, setStatus, setProgress, clearRecord } = useLocalLibrary();
  const { id } = useParams();
  const anime = items.find((item) => item.id === id);
  const [itemLoading, setItemLoading] = useState(false);
  const [ageDetail, setAgeDetail] = useState<AgeDetail | undefined>(undefined);
  const [detailLoading, setDetailLoading] = useState(false);
  const [playLoading, setPlayLoading] = useState<string | undefined>(undefined);
  const [playResults, setPlayResults] = useState<Record<string, AgePlayResult>>({});
  const [playUnavailable, setPlayUnavailable] = useState<Record<string, true>>({});
  const [selectedLine, setSelectedLine] = useState('');
  const [episodePage, setEpisodePage] = useState(1);
  const episodePageSize = 100;

  useEffect(() => {
    if (anime || !id?.startsWith('age-')) return;
    let active = true;
    setItemLoading(true);
    void loadAgeItem(id.slice(4)).finally(() => { if (active) setItemLoading(false); });
    return () => { active = false; };
  }, [anime, id, loadAgeItem]);

  useEffect(() => {
    if (!anime?.sourceIds.age) { setAgeDetail(undefined); return; }
    let active = true;
    setAgeDetail(undefined);
    setPlayResults({});
    setPlayUnavailable({});
    setSelectedLine('');
    setEpisodePage(1);
    setDetailLoading(true);
    void loadAgeDetail(anime.sourceIds.age).then((detail) => { if (active) setAgeDetail(detail); }).finally(() => { if (active) setDetailLoading(false); });
    return () => { active = false; };
  }, [anime?.sourceIds.age, loadAgeDetail]);

  const episodeLines = useMemo(() => {
    const grouped = new Map<string, NonNullable<AgeDetail['episodes']>>();
    for (const episode of ageDetail?.episodes ?? []) {
      const line = episode.line || '未标注';
      const entries = grouped.get(line) ?? [];
      entries.push(episode);
      grouped.set(line, entries);
    }
    return grouped;
  }, [ageDetail?.episodes]);
  const activeLine = selectedLine || [...episodeLines.keys()][0] || '';
  const lineEpisodes = episodeLines.get(activeLine) ?? [];
  const episodePages = Math.max(1, Math.ceil(lineEpisodes.length / episodePageSize));
  const visibleEpisodes = lineEpisodes.slice((episodePage - 1) * episodePageSize, episodePage * episodePageSize);

  useEffect(() => { setEpisodePage(1); }, [activeLine]);

  if (!anime && (status === 'loading' || itemLoading)) {
    return <div className="container page-top page-bottom"><div className="empty-panel large"><LoaderCircle className="spin" size={28} /><h1>正在载入动漫资料</h1><p>正在按 AGE 来源 ID 查询基础条目和详情。</p></div></div>;
  }

  if (!anime) {
    return <div className="container page-top page-bottom"><div className="empty-panel large"><h1>没有找到对应的动漫记录</h1><p>该来源 ID 在实时接口和静态索引中均未找到。</p><div className="row gap-md wrap"><Link className="button secondary" to="/resources">前往资源中心</Link><Link className="button primary" to="/anime">返回动漫档案</Link></div></div></div>;
  }

  const personalRecord = isPersonalRecord(anime);
  const localRecord = getRecord(anime.id);
  const scoreEntries = personalRecord && anime.scores ? Object.entries(anime.scores) : [];
  const mergedSynopsis = anime.synopsis || ageDetail?.synopsis || '';
  const director = anime.staff.director || ageDetail?.director;
  const hasStaff = anime.staff.studio.length > 0 || director || anime.staff.seriesComposition || anime.staff.characterDesign || anime.staff.music || anime.staff.cast.length > 0;
  const castDisplay = anime.staff.castCredits?.length
    ? anime.staff.castCredits.map((credit) => credit.character ? `${credit.character} / ${credit.actor}` : credit.actor)
    : anime.staff.cast;
  const allResources = anime.resources;
  const sourceEntries = Object.entries(anime.fieldSources);

  const resolvePlay = async (episodeUrl: string) => {
    setPlayLoading(episodeUrl);
    try {
      const result = await loadAgePlay(episodeUrl);
      if (result) {
        setPlayResults((current) => ({ ...current, [episodeUrl]: result }));
        setPlayUnavailable((current) => {
          if (!current[episodeUrl]) return current;
          const next = { ...current };
          delete next[episodeUrl];
          return next;
        });
      } else {
        setPlayUnavailable((current) => ({ ...current, [episodeUrl]: true }));
      }
    } finally {
      setPlayLoading(undefined);
    }
  };

  return (
    <div className="page-bottom">
      <section className="detail-hero">
        <Cover seed={anime.coverSeed + 20} imageUrl={anime.coverImage} className="detail-hero-cover" label={`${anime.title}背景封面`} />
        <div className="detail-hero-overlay" />
        <div className="container detail-hero-content">
          <Link className="back-link light" to="/anime"><ArrowLeft size={16} />返回动漫档案</Link>
          <div className="detail-title-row">
            <Cover seed={anime.coverSeed} imageUrl={anime.coverImage} className="detail-poster" label={`${anime.title}海报`}><span className="cover-code">{anime.year > 0 ? `ARCHIVE ${anime.year}` : 'YEAR UNKNOWN'}</span></Cover>
            <div className="detail-title-copy">
              <div className="row gap-sm wrap"><Badge tone="purple">{formatSeason(anime.year, anime.season)}</Badge><Badge tone="cyan">{sourceLabels[anime.sourceType]}</Badge><Badge tone={anime.informationStatus === 'airing' ? 'green' : 'gray'}>{informationLabels[anime.informationStatus]}</Badge>{anime.dataSources.map((source) => <Badge key={source} tone="gray">{source.toUpperCase()}</Badge>)}{localRecord?.favorite && <Badge tone="pink">已收藏</Badge>}</div>
              <h1>{anime.title}</h1>{anime.originalTitle && anime.originalTitle !== anime.title && <p className="detail-original">{anime.originalTitle}</p>}{anime.englishTitle && <p>{anime.englishTitle}</p>}
              <div className="row gap-md wrap detail-quick">
                <span><CalendarDays size={16} />{anime.broadcast ? `${weekdayLabels[anime.broadcast.weekday]} ${anime.broadcast.time ?? '时间未定'}（日本时间）` : '放送时间未提供'}</span>
                {anime.rating !== undefined && <span><Star size={16} />{anime.rating.toFixed(1)}</span>}
                {localRecord?.status ? <span><HardDrive size={16} />本地 · {watchLabels[localRecord.status]}</span> : personalRecord ? <span><Users size={16} />{watchLabels[anime.watchStatus]}</span> : <span><Database size={16} />公开资料条目</span>}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container detail-layout">
        <aside className="detail-aside"><nav className="sticky-toc" aria-label="页面目录"><div className="toc-heading"><span className="toc-kicker">INDEX</span><strong>资料索引</strong><small>{anime.dataSources.map((source) => source.toUpperCase()).join(' + ')} · {anime.lastUpdated}</small></div><div className="toc-links"><a className="toc-link" href="#archive"><span className="toc-index">01</span><span><strong>资料档案</strong><small>标题与状态</small></span></a>{anime.broadcast && <a className="toc-link" href="#broadcast"><span className="toc-index">02</span><span><strong>放送信息</strong><small>日期与平台</small></span></a>}{hasStaff && <a className="toc-link" href="#staff"><span className="toc-index">03</span><span><strong>制作阵容</strong><small>STAFF 与 CAST</small></span></a>}<a className="toc-link" href="#resources"><span className="toc-index">04</span><span><strong>资料与资源</strong><small>来源、分集与线路</small></span></a><a className="toc-link" href="#local-library"><span className="toc-index">05</span><span><strong>本地追番</strong><small>收藏与进度</small></span></a></div></nav></aside>
        <article className="detail-content">
          <section id="archive" className="detail-section"><span className="eyebrow">PUBLIC PROFILE</span><h2>资料档案</h2>{mergedSynopsis && <p className="lead-text">{mergedSynopsis}</p>}<dl className="definition-grid"><Field label="播出季度" value={formatSeason(anime.year, anime.season)} /><Field label="原作类型" value={sourceLabels[anime.sourceType]} /><Field label="题材标签" value={anime.genres} /><Field label="情报状态" value={informationLabels[anime.informationStatus]} /><Field label="地区" value={ageDetail?.region} /><Field label="语言" value={ageDetail?.language} /><Field label="最后更新" value={anime.lastUpdated} /><Field label="资料说明" value={anime.sourceNote} /></dl></section>

          {anime.broadcast && <section id="broadcast" className="detail-section"><span className="eyebrow">BROADCAST</span><h2>放送信息</h2><dl className="definition-grid"><Field label="首播日期" value={anime.broadcast.startDate} /><Field label="星期与时间" value={`${weekdayLabels[anime.broadcast.weekday]} ${anime.broadcast.time ?? ''}`.trim()} /><Field label="总集数" value={anime.broadcast.episodeCount} /><Field label="平台" value={anime.broadcast.platforms} /></dl></section>}

          {hasStaff && <section id="staff" className="detail-section"><span className="eyebrow">STAFF & CAST</span><h2>制作阵容</h2><dl className="definition-grid"><Field label="动画制作" value={anime.staff.studio} /><Field label="导演" value={director} /><Field label="系列构成" value={anime.staff.seriesComposition} /><Field label="人物设计" value={anime.staff.characterDesign} /><Field label="音乐" value={anime.staff.music} /><Field label="主要声优" value={castDisplay} /></dl></section>}

          <section id="resources" className="detail-section"><span className="eyebrow">SOURCES & RESOURCES</span><h2>资料与资源</h2>{detailLoading && <p className="muted"><LoaderCircle className="spin" size={16} />正在读取 AGE 详情……</p>}<div className="external-links">{allResources.slice(0, 30).map((resource) => <a key={resource.resourceId ?? resource.id} href={resource.url} target="_blank" rel="noopener noreferrer"><ExternalLink size={16} />{resource.label ?? resource.kind} · {resource.status}</a>)}{ageDetail?.siteResources?.map((resource) => <a key={`${resource.kind}-${resource.url}`} href={resource.url} target="_blank" rel="noopener noreferrer"><ExternalLink size={16} />{resource.label} · {resource.kind}</a>)}</div>
            {episodeLines.size > 0 ? <div className="episode-browser"><div className="row gap-sm wrap episode-line-tabs">{[...episodeLines.entries()].map(([line, episodes]) => <button type="button" key={line} className={activeLine === line ? 'button primary compact' : 'button secondary compact'} onClick={() => setSelectedLine(line)}>线路 {line}（{episodes.length}）</button>)}</div><div className="episode-resource-list">{visibleEpisodes.map((episode) => { const result = playResults[episode.url]; return <div className="episode-resource-row" key={episode.url}><div><strong>{episode.episode || `第 ${episode.episodeIndex ?? '?'} 集`}</strong><small>线路 {episode.line ?? '未标注'}</small></div><a className="button secondary compact" href={episode.url} target="_blank" rel="noreferrer">打开页面</a><button className="button secondary compact" onClick={() => void resolvePlay(episode.url)} disabled={playLoading === episode.url}>{playLoading === episode.url ? <LoaderCircle className="spin" size={14} /> : <PlayCircle size={14} />}解析媒体</button>{result?.resources?.map((resource, index) => resource.url ? <a key={`${resource.url}-${index}`} className="text-link" href={resource.url} target="_blank" rel="noreferrer">媒体地址 · {resource.authorizationStatus ?? 'unknown'}</a> : null)}{playUnavailable[episode.url] && <small className="muted">该分集尚未同步媒体地址，可打开来源页面查看。</small>}</div>; })}</div>{episodePages > 1 && <div className="pagination-row"><button className="button secondary" disabled={episodePage <= 1} onClick={() => setEpisodePage((page) => page - 1)}><ChevronLeft size={16} />上一页</button><span>第 {episodePage} / {episodePages} 页</span><button className="button secondary" disabled={episodePage >= episodePages} onClick={() => setEpisodePage((page) => page + 1)}>下一页<ChevronRight size={16} /></button></div>}</div> : anime.sourceIds.age && !detailLoading ? <div className="empty-panel">AGE 详情未提供可识别的分集列表。</div> : null}
            <div className="field-source-list"><strong>字段来源</strong>{sourceEntries.map(([field, sources]) => <div key={field}><span>{field}</span><small>{sources.map((source) => `${source.source.toUpperCase()}${source.inferred ? '（推断）' : ''}`).join('、')}</small></div>)}</div></section>

          <section id="local-library" className="detail-section local-library-panel"><span className="eyebrow">LOCAL LIBRARY</span><h2>本地收藏与追番</h2><p className="muted local-library-intro">状态只保存在当前浏览器，不会改写公开资料。</p><div className="local-library-actions"><button type="button" className={localRecord?.favorite ? 'button primary' : 'button secondary'} onClick={() => toggleFavorite(anime.id)} aria-pressed={localRecord?.favorite ?? false}><Bookmark size={17} fill={localRecord?.favorite ? 'currentColor' : 'none'} />{localRecord?.favorite ? '已收藏' : '加入收藏'}</button><label className="select-label local-field">追番状态<select value={localRecord?.status ?? ''} onChange={(event: ChangeEvent<HTMLSelectElement>) => setStatus(anime.id, (event.target.value || undefined) as WatchStatus | undefined)}><option value="">未设置</option>{Object.entries(watchLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="local-progress-field">观看进度<input type="number" min="0" max={anime.broadcast?.episodeCount} value={localRecord?.progress ?? 0} onChange={(event: ChangeEvent<HTMLInputElement>) => setProgress(anime.id, Number(event.target.value))} /><span>话</span></label>{localRecord && <button type="button" className="button secondary" onClick={() => clearRecord(anime.id)}><RotateCcw size={16} />清除记录</button>}</div>{(localRecord?.progress ?? 0) > 0 && <div className="watch-progress local-watch-progress"><div><span>本地观看进度</span><strong>{localRecord?.progress ?? 0} / {anime.broadcast?.episodeCount ?? '?'}</strong></div><div className="progress-track"><span style={{ width: `${safePercent(localRecord?.progress ?? 0, anime.broadcast?.episodeCount)}%` }} /></div></div>}</section>

          {personalRecord && <section className="detail-section personal-panel"><span className="eyebrow">PERSONAL WATCH RECORD</span><h2>项目内个人记录</h2>{scoreEntries.length > 0 && <div className="score-grid">{scoreEntries.map(([label, score]) => <div key={label}><span>{label}</span><strong>{score}</strong><div><i style={{ width: `${Number(score) * 10}%` }} /></div></div>)}</div>}{anime.shortComment && <p>{anime.shortComment}</p>}{anime.warning && <p><ShieldAlert size={17} />{anime.warning}</p>}</section>}
        </article>
      </div>
    </div>
  );
}
