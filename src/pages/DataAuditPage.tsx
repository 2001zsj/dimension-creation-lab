import { AlertTriangle, CheckCircle2, ClipboardCheck, ExternalLink, Search } from 'lucide-react';
import { useMemo, useState, type ChangeEvent } from 'react';
import { auditResourceBindings, isHttpUrl, isPlaceholder } from '../dataQuality';
import { useRegistry, type RegistryItem } from '../dataRegistry';

interface AuditRow {
  item: RegistryItem;
  coverage: number;
  issues: string[];
  severity: 'ok' | 'warning' | 'error';
}

function inspectItem(item: RegistryItem): AuditRow {
  const fields: Array<[string, unknown]> = [
    ['标题', item.title],
    ['来源说明', item.sourceNote],
    ['年份', item.year > 0 ? item.year : undefined],
    ['封面', item.coverImage],
    ['简介', item.synopsis],
    ['制作公司', item.staff.studio],
    ['导演', item.staff.director],
    ['主要声优', item.staff.cast],
    ['放送信息', item.broadcast],
    ['外部资源', item.resources],
    ['字段来源', item.fieldSources],
  ];
  const issues: string[] = [];
  if (isPlaceholder(item.id) || isPlaceholder(item.title)) issues.push('缺少稳定身份或标题');
  if (item.year < 0 || item.year > 2100) issues.push('年份超出合理范围');
  if (item.broadcast?.startDate && Number.isNaN(new Date(item.broadcast.startDate).getTime())) issues.push('首播日期格式无效');
  if (item.broadcast?.episodeCount !== undefined && item.broadcast.episodeCount <= 0) issues.push('集数必须大于 0');
  if (item.externalLinks.some((link) => !isHttpUrl(link.url))) issues.push('存在无效外部链接');
  if (item.resources.some((resource) => resource.animeId !== item.id)) issues.push('资源绑定到错误作品 ID');
  if (item.resources.some((resource) => !isHttpUrl(resource.url))) issues.push('存在无效资源 URL');
  if (item.dataSources.includes('age') && !item.sourceIds.age) issues.push('AGE 条目缺少来源 ID');
  if (item.dataSources.includes('yuc') && !item.sourceIds.yuc) issues.push('YUC 条目缺少来源 ID');
  if (item.staff.studio.some(isPlaceholder) || item.staff.cast.some(isPlaceholder)) issues.push('STAFF/CAST 中存在占位值');
  if (isPlaceholder(item.synopsis) && item.synopsis) issues.push('简介为占位内容');
  const required = fields.filter(([label]) => ['标题', '来源说明', '字段来源'].includes(label));
  const requiredMissing = required.filter(([, value]) => isPlaceholder(value));
  if (requiredMissing.length) issues.push(`必填缺失：${requiredMissing.map(([label]) => label).join('、')}`);
  const present = fields.filter(([, value]) => !isPlaceholder(value)).length;
  const coverage = present / fields.length;
  return { item, coverage, issues, severity: issues.some((issue) => /错误|无效|缺少稳定|错误作品/.test(issue)) ? 'error' : issues.length ? 'warning' : 'ok' };
}

export function DataAuditPage() {
  const { items, conflicts, status, loadedAgePages, agePages } = useRegistry();
  const [keyword, setKeyword] = useState('');
  const [onlyIssues, setOnlyIssues] = useState(true);
  const rows = useMemo(() => items.map(inspectItem), [items]);
  const filtered = useMemo(() => rows.filter((row) => {
    const token = keyword.trim().toLowerCase();
    return (!onlyIssues || row.issues.length > 0) && (!token || `${row.item.title} ${row.issues.join(' ')}`.toLowerCase().includes(token));
  }), [keyword, onlyIssues, rows]);
  const average = rows.length ? Math.round(rows.reduce((sum, row) => sum + row.coverage, 0) / rows.length * 100) : 0;
  const resourceIssues = useMemo(() => auditResourceBindings(items.flatMap((item) => item.resources)), [items]);
  const errorCount = rows.filter((row) => row.severity === 'error').length;
  const warningCount = rows.filter((row) => row.severity === 'warning').length;

  return (
    <div className="container page-top page-bottom">
      <div className="page-title-grid"><div><span className="eyebrow">DATA AUDIT</span><h1>数据与代码结果审查</h1><p>检查身份、来源、日期、STAFF、CAST、资源绑定、URL 与字段覆盖，不用三个基础字段冒充完整数据。</p></div><ClipboardCheck size={36} /></div>
      <div className="stats-grid"><div className="stat-card"><strong>{average}%</strong><span>平均字段覆盖</span></div><div className="stat-card"><strong>{errorCount}</strong><span>错误级条目</span></div><div className="stat-card"><strong>{warningCount}</strong><span>警告级条目</span></div><div className="stat-card"><strong>{conflicts.length + resourceIssues.length}</strong><span>冲突与资源异常</span></div></div>
      <div className="notice-panel"><ClipboardCheck size={18} /><p>状态：{status}。AGE 已载入 {loadedAgePages.length} / {agePages || '?'} 页。空字段允许存在，但占位字段、错误绑定和无效 URL 会被报告。</p></div>
      <div className="archive-toolbar"><label className="search-field grow"><Search size={16} /><input value={keyword} onChange={(event: ChangeEvent<HTMLInputElement>) => setKeyword(event.target.value)} placeholder="搜索标题或问题" /></label><label className="toggle-label"><input type="checkbox" checked={onlyIssues} onChange={(event: ChangeEvent<HTMLInputElement>) => setOnlyIssues(event.target.checked)} /><span aria-hidden="true" />只看有问题</label></div>

      {(conflicts.length > 0 || resourceIssues.length > 0) && <section className="audit-conflicts"><h2><AlertTriangle size={20} />全局冲突</h2>{[...conflicts, ...resourceIssues].map((issue, index) => <p key={`${issue}-${index}`}>{issue}</p>)}</section>}

      <div className="table-wrap"><table><thead><tr><th>状态</th><th>来源</th><th>标题</th><th>覆盖率</th><th>问题</th><th>资源</th></tr></thead><tbody>{filtered.slice(0, 500).map((row) => <tr key={row.item.id}><td>{row.severity === 'ok' ? <CheckCircle2 size={17} /> : <AlertTriangle size={17} />}</td><td>{row.item.dataSources.join('+')}</td><td>{row.item.title}</td><td>{Math.round(row.coverage * 100)}%</td><td>{row.issues.join('；') || '通过'}</td><td>{row.item.resources.slice(0, 2).map((resource) => <a key={resource.id} href={resource.url} target="_blank" rel="noreferrer" title={resource.kind}><ExternalLink size={14} /></a>)}</td></tr>)}</tbody></table></div>
      {filtered.length > 500 && <p className="muted">当前仅显示前 500 条审查结果，请使用搜索缩小范围。</p>}
    </div>
  );
}
