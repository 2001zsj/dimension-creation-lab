import { Menu, Moon, Search, Sparkles, Sun, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { aiWorks, animeList, articles, prompts } from '../data';
import { Badge } from './Badge';

interface LayoutProps {
  children: ReactNode;
}

interface SearchItem {
  key: string;
  title: string;
  description: string;
  type: '动漫' | '文章' | '作品' | '提示词';
  path: string;
}

const navItems = [
  ['首页', '/'], ['新番雷达', '/radar'], ['放送日历', '/calendar'], ['季度档案', '/seasons'],
  ['动漫档案', '/anime'], ['文章', '/articles'], ['AI 实验室', '/ai-lab'], ['作品集', '/works'], ['关于', '/about'],
] as const;

function SearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const navigate = useNavigate();

  const results = useMemo<SearchItem[]>(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return [];
    const items: SearchItem[] = [];
    animeList.forEach((anime) => {
      if ([anime.title, anime.originalTitle, anime.englishTitle ?? '', ...anime.genres].join(' ').toLowerCase().includes(keyword)) {
        items.push({ key: `anime-${anime.id}`, title: anime.title, description: `${anime.year} · ${anime.genres.join(' / ')}`, type: '动漫', path: `/anime/${anime.id}` });
      }
    });
    articles.forEach((article) => {
      if ([article.title, article.summary, ...article.tags].join(' ').toLowerCase().includes(keyword)) {
        items.push({ key: `article-${article.id}`, title: article.title, description: article.category, type: '文章', path: `/articles#${article.id}` });
      }
    });
    aiWorks.forEach((work) => {
      if ([work.title, work.type, work.style].join(' ').toLowerCase().includes(keyword)) {
        items.push({ key: `work-${work.id}`, title: work.title, description: `${work.type} · ${work.style}`, type: '作品', path: `/works/${work.id}` });
      }
    });
    prompts.forEach((prompt) => {
      if ([prompt.name, prompt.scene, prompt.style].join(' ').toLowerCase().includes(keyword)) {
        items.push({ key: `prompt-${prompt.id}`, title: prompt.name, description: prompt.scene, type: '提示词', path: `/ai-lab#prompt-${prompt.id}` });
      }
    });
    return items.slice(0, 12);
  }, [query]);

  useEffect(() => setActive(0), [query]);

  useEffect(() => {
    if (!open) return undefined;
    previousFocus.current = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';
    window.setTimeout(() => inputRef.current?.focus(), 0);

    const handleKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>('button, a, input, [tabindex]:not([tabindex="-1"])');
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
      previousFocus.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  const select = (item: SearchItem) => {
    onClose();
    navigate(item.path);
  };

  const handleInputKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' && results.length > 0) {
      event.preventDefault();
      setActive((current) => (current + 1) % results.length);
    }
    if (event.key === 'ArrowUp' && results.length > 0) {
      event.preventDefault();
      setActive((current) => (current - 1 + results.length) % results.length);
    }
    if (event.key === 'Enter' && results[active]) {
      event.preventDefault();
      select(results[active]);
    }
  };

  return (
    <div className="dialog-layer" role="presentation">
      <button className="dialog-backdrop" onClick={onClose} aria-label="关闭搜索" />
      <div ref={dialogRef} className="search-dialog" role="dialog" aria-modal="true" aria-labelledby="search-title">
        <div className="search-head">
          <div>
            <span className="eyebrow">全局检索</span>
            <h2 id="search-title">搜索资料库与创作内容</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="关闭搜索"><X size={20} /></button>
        </div>
        <div className="search-input-wrap">
          <Search size={20} aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleInputKey}
            placeholder="输入动漫、文章、作品或提示词"
            aria-controls="search-results"
            aria-activedescendant={results[active] ? `result-${results[active].key}` : undefined}
          />
        </div>
        <div id="search-results" className="search-results" role="listbox">
          {!query && <p className="empty-hint">可搜索标题、题材、风格和提示词名称。</p>}
          {query && results.length === 0 && <p className="empty-hint">没有找到匹配内容。</p>}
          {results.map((item, index) => (
            <button
              id={`result-${item.key}`}
              key={item.key}
              role="option"
              aria-selected={index === active}
              className={index === active ? 'search-result active' : 'search-result'}
              onMouseEnter={() => setActive(index)}
              onClick={() => select(item)}
            >
              <Badge tone={item.type === '动漫' ? 'purple' : item.type === '文章' ? 'cyan' : item.type === '作品' ? 'pink' : 'green'}>{item.type}</Badge>
              <span><strong>{item.title}</strong><small>{item.description}</small></span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Layout({ children }: LayoutProps) {
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark');
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="header-inner">
          <Link to="/" className="brand" aria-label="次元生成局首页">
            <span className="brand-mark"><Sparkles size={19} /></span>
            <span><strong>次元生成局</strong><small>Anime & AI Creative Lab</small></span>
          </Link>
          <nav className="desktop-nav" aria-label="主要导航">
            {navItems.map(([label, path]) => (
              <NavLink key={path} to={path} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>{label}</NavLink>
            ))}
          </nav>
          <div className="header-actions">
            <button className="icon-button" onClick={() => setSearchOpen(true)} aria-label="打开全局搜索"><Search size={19} /></button>
            <button className="icon-button" onClick={() => setDark((value) => !value)} aria-label="切换深浅色模式">{dark ? <Sun size={19} /> : <Moon size={19} />}</button>
            <button className="icon-button mobile-only" onClick={() => setMenuOpen((value) => !value)} aria-label="打开导航菜单">{menuOpen ? <X size={21} /> : <Menu size={21} />}</button>
          </div>
        </div>
        {menuOpen && (
          <nav className="mobile-nav" aria-label="移动端导航">
            {navItems.map(([label, path]) => <NavLink key={path} to={path} onClick={() => setMenuOpen(false)}>{label}</NavLink>)}
          </nav>
        )}
      </header>
      <main>{children}</main>
      <footer className="site-footer">
        <div>
          <strong>次元生成局</strong>
          <p>动漫资料库、新番观测、个人观看记录与 AI 创作实验室。</p>
        </div>
        <p>本站资料均为原创模拟数据，不提供动画播放、下载或未经授权的资源。</p>
      </footer>
      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
