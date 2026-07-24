import { ChevronLeft, ChevronRight, Database, ExternalLink, FilterX, Layers3, LoaderCircle, Search, ShieldCheck } from 'lucide-react';
import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import { AGE_CATEGORIES, useRegistry, useResourceRecords, type AgeCategoryKey, type RegistryItem } from '../dataRegistry';
import type { AuthorizationStatus, ResourceKind, ResourceRecord } from '../dataQuality';

const resourceLabels: Record<ResourceKind, string> = {
  detail: '详情', episode: '分集', media: '媒体', streaming: '播放', download: '下载', cloud_drive: '网盘', subtitle: '字幕', mirror: '镜像', anti_loss: '防走丢', official: '官网', pv: 'PV', reference: '资料',
};

const authorizationLabels: Record<AuthorizationStatus, string> = {
  official: '官方', authorized: '已授权', unknown: '授权未知', unverified: '未核验', unauthorized: '未授权', disputed: '有争议',
};

const kindOptions = Object.entries(resourceLabels) as Array<[ResourceKind, string]>;

function resourcesForItem(item: RegistryItem, kind: 'all' | ResourceKind, authorization: 'all' | AuthorizationStatus): ResourceRecord[] {
  return item.resources.filter((resource) => (kind === 'all' || resource.kind === kind)
    && (authorization === 'all' || resource.authorizationStatus === authorization));
}

export function ResourceCenterPage() {
  const { items, ageCount, ageCategories, siteResources, loadingAgePage, loadingAgeCategory, loadAgeCategoryPage, updatedAt } = useRegistry();
  const resources = useResourceRecords();
  const [keyword, setKeyword] = useState('');
  const [source, setSource] = useState<'all' | 'yuc' | 'age'>('all');
  const [authorization, setAuthorization] = useState<'all' | AuthorizationStatus>('all');
  const [kind, setKind] = useState<'all' | ResourceKind>('all');
  const [onlyWithResources, setOnlyWithResources] = useState(true);
  const [page, setPage] = useState(1);
  const [ageCategory, setAgeCategory] = useState<AgeCategoryKey>('japan');
  const [agePage, setAgePage] = useState(1);
  const pageSize = 24;

  const kindCounts = useMemo(() => {
    const counts = new Map<ResourceKind, number>();
    for (const resource of resources) counts.set(resource.kind, (counts.get(resource.kind) ?? 0) + 1);
    for (const resource of siteResources) counts.set(resource.kind, (counts.get(resource.kind) ?? 0) + 1);
    return counts;
  }, [resources, siteResources]);

  const filtered = useMemo(() => {
    const tokens = keyword.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return items.filter((item) => {
      const selectedResources = resourcesForItem(item, kind, authorization);
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
  const activeFilterCount = [keyword.trim(), source !== 'all', authorization !== 'all', kind !== 'all', !onlyWithResources].filter(Boolean).length;

  const fetchAgePage = async () => {
    const target = Math.max(1, Math.min(selectedCategory.pageCount || 500, Math.floor(agePage) || 1));
    await loadAgeCategoryPage(ageCategory, target);
  };

  const resetFilters = () => {
    setKeyword('');
    setSource('all');
    setAuthorization('all');
    setKind('all');
    setOnlyWithResources(true);
  };

  return (
    <div className="container page-top page-bottom resource-center-page">
      <div className="page-title-grid">
        <div><span className="eyebrow">RESOURCE LIBRARY</span><h1>资源中心</h1><p>按作品归档、按类型筛选，只在需要时展开具体入口，减少重复信息和无效链接造成的视觉干扰。</p></div>
        <div className="page-title-icon"><Database size={34} /></div>
      </div>

      <section className="resource-overview" aria-label="资源概览">
        <div><span>已载入作品</span><strong>{items.length}</strong><small>当前会话资料库</small></div>
        <div><span>AGE 条目</span><strong>{ageCount}</strong><small>{Object.values(ageCategories).reduce((sum, entry) => sum + entry.loadedPages.length, 0)} 个分类页已载入</small></div>
        <div><span>可筛选入口</span><strong>{resources.length + siteResources.length}</strong><small>已自动去重</small></div>
        <div><span>同步状态</span><strong className="overview-status">{updatedAt ? '已连接' : '本地模式'}</strong><small>{updatedAt ? new Date(updatedAt).toLocaleString() : '等待资料源响应'}</small></div>
      </section>

      <div className="resource-trust-note"><ShieldCheck size={18} /><p>资源仅按公开来源整理。授权未知、未核验或不可用状态会保留原标记；打开外部入口前请自行确认安全性与合法性。</p></div>

      <section className="resource-filter-shell" aria-label="资源筛选">
        <div className="resource-search-row">
          <label className="search-field grow"><Search size={17} /><input value={keyword} onChange={(event: ChangeEvent<HTMLInputElement>) => setKeyword(event.target.value)} placeholder="搜索作品、别名、资源名称或地址" /></label>
          <button className="button secondary compact" type="button" onClick={resetFilters} disabled={activeFilterCount === 0}><FilterX size={15} />重置{activeFilterCount ? `（${activeFilterCount}）` : ''}</button>
        </div>

        <div className="resource-kind-chips" aria-label="资源类型">
          <button type="button" className={kind === 'all' ? 'active' : ''} onClick={() => setKind('all')}><Layers3 size={14} />全部 <span>{resources.length + siteResources.length}</span></button>
          {kindOptions.filter(([value]) => (kindCounts.get(value) ?? 0) > 0).map(([value, label]) => (
            <button type="button" key={value} className={kind === value ? 'active' : ''} onClick={() => setKind(value)}>{label}<span>{kindCounts.get(value) ?? 0}</span></button>
          ))}
        </div>

        <div className="resource-select-row">
          <label className="select-label">数据来源<select value={source} onChange={(event: ChangeEvent<HTMLSelectElement>) => setSource(event.target.value as 'all' | 'yuc' | 'age')}><option value="all">全部来源</option><option value="yuc">YUC</option><option value="age">AGE</option></select></label>
          <label className="select-label">授权状态<select value={authorization} onChange={(event: ChangeEvent<HTMLSelectElement>) => setAuthorization(event.target.value as 'all' | AuthorizationStatus)}><option value="all">全部状态</option>{Object.entries(authorizationLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="toggle-label"><input type="checkbox" checked={onlyWithResources} onChange={(event: ChangeEvent<HTMLInputElement>) => setOnlyWithResources(event.target.checked)} /><span aria-hidden="true" />隐藏空条目</label>
        </div>
      </section>

      <details className="source-loader-panel">
        <summary><span><strong>载入更多 AGE 数据</strong><small>仅在需要浏览历史分类页时使用</small></span><ChevronRight size={18} /></summary>
        <div className="source-loader-content">
          <div className="age-category-summary">{AGE_CATEGORIES.map((category) => { const progress = ageCategories[category.key]; return <button type="button" key={category.key} className={ageCategory === category.key ? 'active' : ''} onClick={() => { setAgeCategory(category.key); setAgePage(1); }}><strong>{category.label}</strong><span>{progress.itemCount} 条 · {progress.loadedPages.length}/{progress.pageCount || '?'} 页</span></button>; })}</div>
          <div className="age-page-loader compact-loader">
            <label className="select-label">分类<select value={ageCategory} onChange={(event: ChangeEvent<HTMLSelectElement>) => { setAgeCategory(event.target.value as AgeCategoryKey); setAgePage(1); }}>{AGE_CATEGORIES.map((category) => <option key={category.key} value={category.key}>{category.label}</option>)}</select></label>
            <label className="select-label">页码<input type="number" min="1" max={selectedCategory.pageCount || 500} value={agePage} onChange={(event: ChangeEvent<HTMLInputElement>) => setAgePage(Number(event.target.value))} /></label>
            <button className="button secondary" type="button" onClick={() => void fetchAgePage()} disabled={Boolean(loadingAgePage)}>{loadingAgePage ? <LoaderCircle className="spin" size={16} /> : null}{loadingAgePage ? `正在载入${ageCategories[loadingAgeCategory ?? ageCategory].label}第 ${loadingAgePage} 页` : '载入这一页'}</button>
          </div>
        </div>
      </details>

      {siteResources.filter((resource) => kind === 'all' || resource.kind === kind).length > 0 && (
        <section className="site-resource-panel streamlined-site-resources">
          <div><span className="eyebrow">SITE LINKS</span><h2>站点级入口</h2><p>镜像与防走丢链接单独归档，不与作品资源混排。</p></div>
          <div className="resource-link-list horizontal">{siteResources.filter((resource) => kind === 'all' || resource.kind === kind).map((resource) => <a className="resource-inline-link" key={resource.id} href={resource.url} target="_blank" rel="noopener noreferrer"><span>{resourceLabels[resource.kind]}</span><strong>{resource.label}</strong><ExternalLink size={14} /></a>)}</div>
        </section>
      )}

      <div className="resource-results-head"><div><span className="eyebrow">RESULTS</span><h2>{filtered.length} 部作品</h2></div><span>第 {page} / {totalPages} 页</span></div>

      {visible.length ? (
        <div className="resource-card-grid">
          {visible.map((item) => {
            const selectedResources = resourcesForItem(item, kind, authorization);
            const preview = selectedResources.slice(0, 4);
            const remaining = selectedResources.slice(4);
            return (
              <article className="resource-card" key={item.id}>
                <header>
                  <div><span className="resource-source-label">{item.dataSources.map((value) => value.toUpperCase()).join(' + ')}</span><Link to={`/anime/${item.id}`}>{item.title}</Link><small>{item.year > 0 ? item.year : '年份未提供'} · 共 {item.resources.length} 个入口</small></div>
                  <Link className="resource-detail-link" to={`/anime/${item.id}`}>资料页<ChevronRight size={15} /></Link>
                </header>
                {preview.length ? <div className="resource-entry-list">{preview.map((resource) => <ResourceEntry key={resource.resourceId ?? resource.id} resource={resource} />)}</div> : <p className="resource-empty">当前筛选条件下没有可展示入口。</p>}
                {remaining.length > 0 && <details className="resource-more"><summary>展开其余 {remaining.length} 个入口</summary><div className="resource-entry-list">{remaining.map((resource) => <ResourceEntry key={resource.resourceId ?? resource.id} resource={resource} />)}</div></details>}
              </article>
            );
          })}
        </div>
      ) : <div className="empty-panel large"><h2>没有匹配的资源</h2><p>可以调整资源类型、授权状态或清除搜索词。</p><button className="button secondary" type="button" onClick={resetFilters}>清除筛选</button></div>}

      {filtered.length > pageSize && <div className="pagination-row"><button className="button secondary" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}><ChevronLeft size={16} />上一页</button><span>第 {page} / {totalPages} 页</span><button className="button secondary" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)}>下一页<ChevronRight size={16} /></button></div>}
    </div>
  );
}

function ResourceEntry({ resource }: { resource: ResourceRecord }) {
  const url = resource.originalUrl ?? resource.url;
  const authorization = resource.authorizationStatus ?? 'unknown';
  return (
    <a className="resource-entry" href={url} target="_blank" rel="noopener noreferrer">
      <span className="resource-kind-label">{resourceLabels[resource.kind]}</span>
      <span className="resource-entry-copy"><strong>{resource.label || resource.episode || '打开资源'}</strong><small>{resource.episode ? `${resource.episode}${resource.line ? ` · 线路 ${resource.line}` : ''}` : resource.status}</small></span>
      <span className={`authorization-label auth-${authorization}`}>{authorizationLabels[authorization]}</span>
      <ExternalLink size={15} />
    </a>
  );
}

