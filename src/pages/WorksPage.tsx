import { ArrowRight, ImageIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { aiWorks } from '../data';
import { Badge } from '../components/Badge';
import { Cover } from '../components/Cover';

export function WorksPage() {
  return (
    <div className="container page-top page-bottom">
      <div className="page-title-grid"><div><span className="eyebrow">CREATIVE ARCHIVE</span><h1>AI 作品集</h1><p>每件作品不仅保留成品，还记录初始问题和调整路径。</p></div><div className="page-title-icon"><ImageIcon size={34} /></div></div>
      <div className="works-grid">{aiWorks.map((work) => <Link to={`/works/${work.id}`} key={work.id} className="work-card"><Cover seed={work.coverSeed} className="work-card-cover" /><div><div className="row gap-sm wrap"><Badge tone="pink">{work.type}</Badge><Badge>{work.style}</Badge></div><h2>{work.title}</h2><p>{work.background}</p><span className="text-link">查看创作过程 <ArrowRight size={15} /></span></div></Link>)}</div>
    </div>
  );
}
