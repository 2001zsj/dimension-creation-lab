import { ClipboardCheck } from 'lucide-react';
import { auditRecord } from '../dataQuality';
import { useRegistry } from '../dataRegistry';

export function DataAuditPage() {
  const { items, conflicts, status } = useRegistry();
  const rows = items.map((item) => ({ item, audit: auditRecord(item, ['id', 'title', 'sourceNote']) }));
  const average = rows.length ? Math.round(rows.reduce((sum, row) => sum + row.audit.coverage, 0) / rows.length * 100) : 0;
  return <div className="container page-top page-bottom"><span className="eyebrow">DATA AUDIT</span><h1>数据审查</h1><p className="lead-text">状态：{status} · 条目覆盖率：{average}% · 冲突：{conflicts.length}</p><div className="notice-panel"><ClipboardCheck size={18} /><p>审查只接受有身份和来源的记录，空字段保持隐藏；失败或部分解析不会覆盖旧有效数据。</p></div><div className="table-wrap"><table><thead><tr><th>来源</th><th>标题</th><th>字段覆盖率</th><th>缺失字段</th></tr></thead><tbody>{rows.slice(0, 100).map(({ item, audit }) => <tr key={`${item.dataSource}-${item.id}`}><td>{item.dataSource}</td><td>{item.title}</td><td>{Math.round(audit.coverage * 100)}%</td><td>{audit.missing.join('、') || '无'}</td></tr>)}</tbody></table></div></div>;
}
