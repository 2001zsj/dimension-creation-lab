import { BookOpen, Copy } from 'lucide-react';
import { useState } from 'react';
import { copyToClipboard } from '../utils';

export function WritingStudioPage() {
  const [draft, setDraft] = useState('');
  return <div className="container page-top page-bottom"><span className="eyebrow">WRITING STUDIO</span><h1>写作中心</h1><p className="lead-text">基于已审查的资料字段起草文章，不自动填充缺失信息。</p><label className="search-field"><BookOpen size={17} /><textarea value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="输入你的文章草稿" rows={12} aria-label="文章草稿" /></label><button className="button secondary" type="button" onClick={() => void copyToClipboard(draft)}><Copy size={16} />复制草稿</button></div>;
}
