import { Database, ExternalLink, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useRegistry, useResourceRecords } from '../dataRegistry';

export function ResourceCenterPage() {
  const { items, ageCount, agePages, updatedAt } = useRegistry();
  const resources = useResourceRecords();
  return <div className="container page-top page-bottom"><div className="page-title-grid"><div><span className="eyebrow">RESOURCE CENTER</span><h1>资源中心</h1><p>统一查看 YUC 与 AGE 的公开资料入口；未验证播放资源不会进入本站播放功能。</p></div><Database size={36} /></div><div className="stats-grid"><div className="stat-card"><strong>{items.length}</strong><span>统一入库条目</span></div><div className="stat-card"><strong>{ageCount}</strong><span>AGE 分页条目</span></div><div className="stat-card"><strong>{agePages}</strong><span>AGE 页数</span></div><div className="stat-card"><strong>{resources.length}</strong><span>审查资源</span></div></div><div className="notice-panel"><ShieldCheck size={18} /><p>最近同步 {updatedAt ? new Date(updatedAt).toLocaleString() : '尚未完成'}。资料缺失时保持为空，不生成通用简介或“待补全”占位。</p></div><div className="anime-grid three-col">{items.slice(0, 36).map((item) => <article className="anime-card" key={`${item.dataSource}-${item.id}`}><div className="anime-card-body"><span className="eyebrow">{item.dataSource.toUpperCase()}</span><h3>{item.title}</h3><p>{item.year} · {item.resources.length} 个公开入口</p>{item.resources.map((resource) => <a className="text-link" key={resource.id} href={resource.url} target="_blank" rel="noreferrer"><ExternalLink size={14} />{resource.label ?? '来源'}</a>)}<Link className="text-link" to={`/anime/${item.id}`}>查看条目</Link></div></article>)}</div></div>;
}
