import { ChevronLeft, ChevronRight, Database, ExternalLink, LoaderCircle, Search, ShieldCheck } from 'lucide-react';
import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import { AGE_CATEGORIES, useRegistry, useResourceRecords, type AgeCategoryKey } from '../dataRegistry';
import type { AuthorizationStatus, ResourceKind } from '../dataQuality';

const resourceLabels: Record<ResourceKind, string> = {
  detail: '详情', episode: '分集', media: '媒体', streaming: '播放', download: '下载', cloud_drive: '网盘', subtitle: '字幕', mirror: '镜像', anti_loss: '防走丢', official: '官网', pv: 'PV', reference: '资料',
};

export function ResourceCenterPage() {
  const { items, ageCount, ageCategories, siteResources, loadingAgePage, loadingAgeCategory, loadAgeCategoryPage, updatedAt } = useRegistry();
  const resources = useResourceRecords();
  const [keyword, setKeyword] = useState('');
  const [source, setSource] = useState<'all' | 'yuc' | 'age'>('all');
  const [authorization, setAuthorization] = useState<'all' | AuthorizationStatus>('all');
  const [kind, setKind] = useState<'all' | ResourceKind>('all');
  const [onlyWithResources, setOnlyWithResources] = useState(false);
  const [page, setPage] = useState(1);
  const [ageCategory, setAgeCategory] = useState<AgeCategoryKey>('japan');
  const [agePage, setAgePage] = useState(1);
  const pageSize = 36;

  const filtered = useMemo(() => {
    const tokens = keyword.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return items.filter((item) => {
      const kindResources = kind === 'all' ? item.resources : item.resources.filter((resource) => resource.kind === kind);
      const selectedResources = authorization === 'all' ? kindResources : kindResources.filter((resource) => resource.authorizationStatus === authorization);
      const haystack = [item.title, item.originalTitle, ...item.aliases, ...item.resources.flatMap((resource) => [resource.label ?? '', resource.url])].join(' ').toLowerCase();
      return tokens.every((token) => haystack.includes(token))
        && (source === 'all' || item.dataSources.includes(source))
        && (!onlyWithResources || selectedResources.length > 0)
        && (kind === 'all' || selectedResources.length > 0)
        && (authorization === 'all' || selectedResources.length > 0);
    });
  }, [authorization, items, keyword, kind, onlyWithResources, source]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  useEffect(() => { setPage(1); }, [authorization, keyword, kind, onlyWithResources, source]);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);

  const selectedCategory = ageCategories[ageCategory];
  const fetchAgePage = async () => {
    const target = Math.max(1, Math.min(selectedCategory.pageCount || 500, Math.floor(agePage)));
    await loadAgeCategoryPage(ageCategory, target);
  };

  return (
    <div className="container page-top page-bottom">
      <div className="page-title-grid"><div><span className="eyebrow">RESOURCE CENTER</span><h1>资源中心</h1><p>统一查看 YUC 与 AGE 的资料、播放、下载、网盘、镜像和防走丢入口；每条资源保留来源与核验状态。</p></div><Database size={36} /></div>
      <div className="stats-grid"><div className="stat-card"><strong>{items.length}</strong><span>已载入条目</span></div><div className="stat-card"><strong>{ageCount}</strong><span>已载入 AGE 条目</span></div><div className="stat-card"><strong>{Object.values(ageCategories).reduce((sum, entry) => sum + entry.loadedPages.length, 0)}</strong><span>AGE 已载入分类页</span></div><div className="stat-card"><strong>{resources.length + siteResources.length}</strong><span>资源记录</span></div></div>
      <div className="notice-panel"><ShieldCheck size={18} /><p>最近同步 {updatedAt ? new Date(updatedAt).toLocaleString() : '尚未完成'}。缺失字段保持为空；未知授权或未核验资源会明确标记，不会伪装为官方来源。</p></div>

      <div className="notice-panel"><ShieldCheck size={18} /><p>本站可索引公开资源，但不对资源授权状态和长期可用性作保证。所有资源均展示来源、抓取时间、授权状态和可用性状态；未知资源不得标记为官方或已授权。</p></div>
      <div className="archive-toolbar archive-toolbar-large resource-toolbar">
        <label className="search-field grow"><Search size={17} /><input value={keyword} onChange={(event: ChangeEvent<HTMLInputElement>) => setKeyword(event.target.value)} placeholder="搜索标题、别名、资源名称或地址" /></label>
        <label className="select-label">作品数据来源<select value={source} onChange={(event: ChangeEvent<HTMLSelectElement>) => setSource(event.target.value as 'all' | 'yuc' | 'age')}><option value="all">全部</option><option value="yuc">YUC</option><option value="age">AGE</option></select></label><label className="select-label">授权状态<select value={authorization} onChange={(event: ChangeEvent<HTMLSelectElement>) => setAuthorization(event.target.value as 'all' | AuthorizationStatus)}><option value="all">全部</option><option value="official">官方</option><option value="authorized">已授权</option><option value="unknown">未知</option><option value="unauthorized">未授权</option><option value="disputed">争议</option></select></label>
        <label className="select-label">资源类型<select value={kind} onChange={(event: ChangeEvent<HTMLSelectElement>) => setKind(event.target.value as 'all' | ResourceKind)}><option value="all">全部</option>{Object.entries(resourceLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="toggle-label"><input type="checkbox" checked={onlyWithResources} onChange={(event: ChangeEvent<HTMLInputElement>) => setOnlyWithResources(event.target.checked)} /><span aria-hidden="true" />只看有资源</label>
      </div>

      <div className="age-page-loader">
        <div><strong>按分类、按页载入 AGE 数据库</strong><p className="muted">支持日漫、国漫、动态漫、剧场、特摄和美漫。当前分类已载入：{selectedCategory.loadedPages.join('、') || '无'}。</p></div>
        <label className="select-label">分类<select value={ageCategory} onChange={(event: ChangeEvent<HTMLSelectElement>) => { setAgeCategory(event.target.value as AgeCategoryKey); setAgePage(1); }}>{AGE_CATEGORIES.map((category) => <option key={category.key} value={category.key}>{category.label}</option>)}</select></label>
        <label className="select-label">页码<input type="number" min="1" max={selectedCategory.pageCount || 500} value={agePage} onChange={(event: ChangeEvent<HTMLInputElement>) => setAgePage(Number(event.target.value))} /></label>
        <button className="button secondary" type="button" onClick={() => void fetchAgePage()} disabled={Boolean(loadingAgePage)}>{loadingAgePage ? <LoaderCircle className="spin" size={16} /> : null}{loadingAgePage ? `正在载入${ageCategories[loadingAgeCategory ?? ageCategory].label}第 ${loadingAgePage} 页` : '载入这一页'}</button>
      </div>
      <div className="age-category-summary">{AGE_CATEGORIES.map((category) => { const progress = ageCategories[category.key]; return <button type="button" key={category.key} className={ageCategory === category.key ? 'active' : ''} onClick={() => { setAgeCategory(category.key); setAgePage(1); }}><strong>{category.label}</strong><span>{progress.itemCount} 条 · {progress.loadedPages.length}/{progress.pageCount || '?'} 页</span></button>; })}</div>
      {siteResources.filter((resource) => kind === 'all' || resource.kind === kind).length > 0 && <section className="site-resource-panel"><div><span className="eyebrow">SITE RESOURCES</span><h2>站点级镜像与防走丢入口</h2></div><div className="resource-link-list horizontal">{siteResources.filter((resource) => kind === 'all' || resource.kind === kind).map((resource) => <a className="text-link" key={resource.id} href={resource.url} target="_blank" rel="noreferrer"><ExternalLink size={14} />{resourceLabels[resource.kind]} · {resource.label}</a>)}</div></section>}

      {visible.length ? <div className="anime-grid three-col">{visible.map((item) => {
        const kindResources = kind === 'all' ? item.resources : item.resources.filter((resource) => resource.kind === kind);
      const selectedResources = authorization === 'all' ? kindResources : kindResources.filter((resource) => resource.authorizationStatus === authorization);
        return <article className="anime-card" key={item.id}><div className="anime-card-body"><span className="eyebrow">{item.dataSources.map((value) => value.toUpperCase()).join(' + ')}</span><h3>{item.title}</h3><p>{item.year > 0 ? item.year : '年份未提供'} · {item.resources.length} 个入口</p><div className="resource-link-list">{selectedResources.slice(0, 8).map((resource) => <div key={resource.resourceId ?? resource.id}><a className="text-link" href={resource.originalUrl ?? resource.url} target="_blank" rel="noreferrer"><ExternalLink size={14} />{resourceLabels[resource.resourceType ?? resource.kind]} · {resource.label ?? '打开资源'}</a><small className="resource-meta">来源：{resource.source.toUpperCase()} · 授权：{resource.authorizationStatus ?? 'unknown'} · 可用性：{resource.availabilityStatus ?? 'unchecked'} · 抓取：{resource.capturedAt}{resource.verifiedAt ? ` · 验证：${resource.verifiedAt}` : ''}</small>{resource.sourcePage && <a className="resource-meta resource-source-link" href={resource.sourcePage} target="_blank" rel="noreferrer">来源页</a>}</div>)}</div><Link className="text-link" to={`/anime/${item.id}`}>查看条目</Link></div></article>;
      })}</div> : <div className="empty-panel large"><h2>没有符合条件的资源</h2><p>更换筛选条件，或者载入其他 AGE 页码。</p></div>}

      <div className="pagination-row"><button className="button secondary" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}><ChevronLeft size={16} />上一页</button><span>第 {page} / {totalPages} 页，共 {filtered.length} 条</span><button className="button secondary" disabled={page >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>下一页<ChevronRight size={16} /></button></div>
    </div>
  );
}
