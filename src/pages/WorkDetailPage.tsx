import { ArrowLeft, ArrowRight, CheckCircle2, Copy, ImageIcon, WandSparkles } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { aiWorks } from '../data';
import { Badge } from '../components/Badge';
import { Cover } from '../components/Cover';
import { copyToClipboard } from '../utils';

export function WorkDetailPage() {
  const { id } = useParams();
  const work = aiWorks.find((item) => item.id === id);
  const [copied, setCopied] = useState(false);
  if (!work) return <div className="container page-top page-bottom"><div className="empty-panel large"><h1>没有找到对应作品</h1><Link className="button primary" to="/works">返回作品集</Link></div></div>;
  const related = aiWorks.filter((item) => work.relatedWorkIds.includes(item.id));
  const copyFinal = async () => { if (await copyToClipboard(work.finalPrompt)) { setCopied(true); window.setTimeout(() => setCopied(false), 1600); } };
  return (
    <div className="container page-top page-bottom">
      <Link className="back-link" to="/works"><ArrowLeft size={16} />返回作品集</Link>
      <div className="work-detail-grid"><Cover seed={work.coverSeed} className="work-detail-cover"><ImageIcon size={40} /></Cover><div className="work-detail-intro"><div className="row gap-sm wrap"><Badge tone="pink">{work.type}</Badge><Badge tone="purple">{work.style}</Badge><Badge>{work.tool}</Badge></div><h1>{work.title}</h1><p>{work.background}</p><small>完成于 {work.date}</small></div></div>
      <div className="process-grid section-space-tight"><section><span className="step-number">01</span><h2>初始提示词</h2><pre>{work.initialPrompt}</pre></section><section><span className="step-number">02</span><h2>发现的问题</h2><p>{work.problem}</p></section><section><span className="step-number">03</span><h2>调整过程</h2><ol>{work.adjustments.map((item) => <li key={item}><CheckCircle2 size={17} />{item}</li>)}</ol></section><section className="final-prompt"><span className="step-number">04</span><div className="row between"><h2>最终提示词</h2><button className="button secondary compact" onClick={copyFinal}>{copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}{copied ? '已复制' : '复制'}</button></div><pre>{work.finalPrompt}</pre></section></div>
      {related.length > 0 && <section className="section-space-tight"><h2>相关作品</h2><div className="related-work-grid">{related.map((item) => <Link key={item.id} to={`/works/${item.id}`}><Cover seed={item.coverSeed} className="related-cover" /><div><strong>{item.title}</strong><span>{item.style}</span></div><ArrowRight size={16} /></Link>)}</div></section>}
      <div className="notice-panel"><WandSparkles size={20} /><p>本页展示的是创作复盘结构，所有提示词和作品描述均为原创演示内容。</p></div>
    </div>
  );
}
