import { BookOpen, Clock3 } from 'lucide-react';
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { articles } from '../data';
import { Badge } from '../components/Badge';

export function ArticlesPage() {
  const location = useLocation();

  useEffect(() => {
    if (!location.hash) return;
    const timer = window.setTimeout(() => document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 20);
    return () => window.clearTimeout(timer);
  }, [location.hash]);

  return (
    <div className="container page-top page-bottom article-page">
      <div className="page-title-grid"><div><span className="eyebrow">EDITORIAL NOTES</span><h1>文章与观察</h1><p>把季度观察、资料维护方法和 AI 创作实验整理成可回看的笔记。</p></div><div className="page-title-icon"><BookOpen size={34} /></div></div>
      <div className="article-list">
        {articles.map((article) => (
          <article id={article.id} key={article.id} className="article-card-full">
            <div className="article-meta"><Badge tone="cyan">{article.category}</Badge><span><Clock3 size={14} />{article.date} · {article.readTime}</span></div>
            <h2>{article.title}</h2><p className="lead-text">{article.summary}</p>
            <div className="row gap-sm wrap">{article.tags.map((tag) => <span key={tag} className="text-tag">#{tag}</span>)}</div>
            <div className="article-body">{article.sections.map((section) => <section key={section.heading}><h3>{section.heading}</h3><p>{section.body}</p></section>)}</div>
          </article>
        ))}
      </div>
    </div>
  );
}
