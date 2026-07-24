import { BookOpen, ClipboardCheck, Copy, FileText, RefreshCcw, Search } from 'lucide-react';
import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { useRegistry } from '../dataRegistry';
import { isPlaceholder } from '../dataQuality';
import { copyToClipboard, formatSeason, informationLabels, sourceLabels, weekdayLabels } from '../utils';

type TemplateKind = 'profile' | 'season' | 'update';

function generateDraft(item: ReturnType<typeof useRegistry>['items'][number], template: TemplateKind): string {
  const lines: string[] = [];
  const add = (label: string, value: unknown) => {
    if (isPlaceholder(value)) return;
    const text = Array.isArray(value) ? value.filter((entry) => !isPlaceholder(entry)).join('、') : String(value);
    if (text) lines.push(`${label}：${text}`);
  };

  if (template === 'profile') {
    lines.push(`# ${item.title}`);
    if (item.originalTitle && item.originalTitle !== item.title) lines.push(`\n原名：${item.originalTitle}`);
    if (item.year > 0) lines.push(`\n季度：${formatSeason(item.year, item.season)}`);
    add('原作类型', sourceLabels[item.sourceType]);
    add('题材', item.genres);
    if (item.synopsis) lines.push(`\n## 简介\n${item.synopsis}`);
    const staff: string[] = [];
    if (item.staff.studio.length) staff.push(`动画制作：${item.staff.studio.join('、')}`);
    if (item.staff.director) staff.push(`导演：${item.staff.director}`);
    if (item.staff.seriesComposition) staff.push(`系列构成：${item.staff.seriesComposition}`);
    if (item.staff.characterDesign) staff.push(`人物设计：${item.staff.characterDesign}`);
    if (item.staff.music) staff.push(`音乐：${item.staff.music}`);
    if (item.staff.cast.length) staff.push(`主要声优：${item.staff.cast.join('、')}`);
    if (staff.length) lines.push(`\n## 制作阵容\n${staff.join('\n')}`);
    if (item.broadcast) {
      const broadcast = [item.broadcast.startDate, weekdayLabels[item.broadcast.weekday], item.broadcast.time, item.broadcast.platforms.join('、')].filter(Boolean).join(' · ');
      if (broadcast) lines.push(`\n## 放送信息\n${broadcast}`);
    }
    if (item.resources.length) lines.push(`\n## 资料与资源\n${item.resources.map((resource) => `- ${resource.label ?? resource.kind}：${resource.url}（${resource.source}／${resource.status}）`).join('\n')}`);
  } else if (template === 'season') {
    lines.push(`# ${item.year > 0 ? formatSeason(item.year, item.season) : '档期未定'}新番：${item.title}`);
    lines.push(`\n状态：${informationLabels[item.informationStatus]}`);
    if (item.broadcast) lines.push(`\n放送：${weekdayLabels[item.broadcast.weekday]} ${item.broadcast.time ?? ''} ${item.broadcast.platforms.join('、')}`.trim());
    if (item.staff.studio.length) lines.push(`\n制作：${item.staff.studio.join('、')}`);
    if (item.synopsis) lines.push(`\n${item.synopsis}`);
  } else {
    lines.push(`# ${item.title} 资料更新`);
    lines.push(`\n更新时间：${item.lastUpdated}`);
    lines.push(`\n当前状态：${informationLabels[item.informationStatus]}`);
    if (item.dataSources.length) lines.push(`\n数据来源：${item.dataSources.map((source) => source.toUpperCase()).join('、')}`);
    if (item.resources.length) lines.push(`\n新增或现有入口：\n${item.resources.map((resource) => `- ${resource.label ?? resource.kind}：${resource.url}`).join('\n')}`);
  }

  lines.push(`\n## 来源说明\n${item.sourceNote}`);
  const citations = new Set<string>();
  Object.values(item.fieldSources).flat().forEach((source) => { if (source.url) citations.add(`${source.source.toUpperCase()} · ${source.url} · 抓取：${source.capturedAt}`); });
  item.resources.forEach((resource) => { const sourcePage = resource.sourcePage ?? resource.sourceUrl; if (sourcePage) citations.add(`${resource.source.toUpperCase()} · ${sourcePage} · 抓取：${resource.capturedAt}`); });
  if (citations.size) lines.push(`\n## 引用来源\n${[...citations].map((citation) => `- ${citation}`).join('\n')}`);
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

export function WritingStudioPage() {
  const { items, conflicts } = useRegistry();
  const [selectedId, setSelectedId] = useState(items[0]?.id ?? '');
  const [query, setQuery] = useState('');
  const [template, setTemplate] = useState<TemplateKind>('profile');
  const selectableItems = useMemo(() => {
    const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return items.filter((item) => {
      const haystack = [item.title, item.originalTitle, ...item.aliases, ...item.dataSources].join(' ').toLowerCase();
      return tokens.every((token) => haystack.includes(token));
    }).slice(0, 200);
  }, [items, query]);
  useEffect(() => {
    if (!items.length) return;
    if (!items.some((item) => item.id === selectedId)) setSelectedId(items[0].id);
  }, [items, selectedId]);
  const selected = items.find((item) => item.id === selectedId) ?? items[0];
  const generated = useMemo(() => selected ? generateDraft(selected, template) : '', [selected, template]);
  const [draft, setDraft] = useState<string | null>(null);
  const activeDraft = draft ?? generated;
  const missing = selected ? [
    !selected.synopsis && '简介',
    selected.staff.studio.length === 0 && '制作公司',
    !selected.staff.director && '导演',
    selected.staff.cast.length === 0 && '声优',
    selected.resources.length === 0 && '资源入口',
  ].filter(Boolean) as string[] : [];
  const relatedConflicts = selected ? conflicts.filter((conflict) => conflict.includes(selected.title)) : [];
  const regenerate = () => setDraft(generated);

  return (
    <div className="container page-top page-bottom">
      <div className="page-title-grid"><div><span className="eyebrow">WRITING STUDIO</span><h1>写作中心</h1><p>从统一资料库选择作品，按真实字段生成草稿；缺失信息保持为空，不自动编造。</p></div><BookOpen size={36} /></div>
      <div className="writing-layout">
        <aside className="writing-sidebar">
          <label className="search-field"><Search size={16} /><input value={query} onChange={(event: ChangeEvent<HTMLInputElement>) => setQuery(event.target.value)} placeholder="先搜索标题或来源" aria-label="搜索写作作品" /></label>
          <label className="select-label">选择作品<select value={selected?.id ?? ''} onChange={(event: ChangeEvent<HTMLSelectElement>) => { setSelectedId(event.target.value); setDraft(null); }}>{selectableItems.map((item) => <option key={item.id} value={item.id}>{item.title} · {item.dataSources.join('+')}</option>)}</select><small>最多展示前 200 个匹配结果，请先输入关键词缩小范围。</small></label>
          <label className="select-label">文章模板<select value={template} onChange={(event: ChangeEvent<HTMLSelectElement>) => { setTemplate(event.target.value as TemplateKind); setDraft(null); }}><option value="profile">作品资料介绍</option><option value="season">季度新番简报</option><option value="update">资料更新公告</option></select></label>
          {selected && <div className="audit-summary-card"><strong>{selected.title}</strong><span>来源：{selected.dataSources.map((source) => source.toUpperCase()).join(' + ')}</span><span>已记录字段来源：{Object.keys(selected.fieldSources).length}</span><span>资源：{selected.resources.length}</span></div>}
          <div className="audit-summary-card"><strong>生成前检查</strong><span>缺失：{missing.join('、') || '无关键缺失'}</span><span>冲突：{relatedConflicts.length}</span>{relatedConflicts.map((conflict) => <small key={conflict}>{conflict}</small>)}</div>
          {selected && <div className="field-source-list"><strong>字段来源</strong>{Object.entries(selected.fieldSources).map(([field, sources]) => <div key={field}><span>{field}</span><small>{sources.map((source) => `${source.source.toUpperCase()}${source.inferred ? '（推断）' : ''}`).join('、')}</small></div>)}</div>}
        </aside>
        <section className="writing-editor">
          <div className="writing-editor-head"><div><FileText size={18} /><strong>草稿编辑器</strong></div><div className="row gap-sm wrap"><button className="button secondary compact" type="button" onClick={regenerate}><RefreshCcw size={15} />重新生成</button><button className="button secondary compact" type="button" onClick={() => void copyToClipboard(activeDraft)}><Copy size={15} />复制</button></div></div>
          <textarea value={activeDraft} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setDraft(event.target.value)} rows={28} aria-label="文章草稿" />
          <div className="notice-panel"><ClipboardCheck size={18} /><p>草稿只引用当前数据库中存在的字段。发布前仍应核对标题、日期、STAFF、CAST、平台和资源来源。</p></div>
        </section>
      </div>
    </div>
  );
}
