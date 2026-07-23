import { Bookmark, Command, Menu, Moon, Search, Sparkles, Sun, X } from 'lucide-react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent, type ReactNode } from 'react';
import { Link, NavLink, useLocation, useNavigate, useNavigationType } from 'react-router-dom';
import { aiWorks, articles, prompts } from '../data';
import { useAnimeList } from '../liveAnime';
import { useLocalLibrary } from '../localLibrary';
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
  favorite?: boolean;
}

type SearchCategory = '全部' | SearchItem['type'];

const searchCategories: SearchCategory[] = ['全部', '动漫', '文章', '作品', '提示词'];

const navItems = [
  ['首页', '/'], ['新番雷达', '/radar'], ['放送日历', '/calendar'], ['季度档案', '/seasons'],
  ['资源中心', '/resources'], ['写作中心', '/writing'], ['数据审查', '/audit'],
  ['动漫档案', '/anime'], ['文章', '/articles'], ['AI 实验室', '/ai-lab'], ['作品集', '/works'], ['关于', '/about'],
] as const;

function matchesSearch(fields: string[], query: string): boolean {
  const haystack = fields.join(' ').toLowerCase();
  return query.trim().toLowerCase().split(/\s+/).filter(Boolean).every((token) => haystack.includes(token));
}

function RouteScrollManager() {
  const location = useLocation();
  const navigationType = useNavigationType();

  useLayoutEffect(() => {
    if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';
    const storageKey = `dimension-lab-scroll:${location.pathname}${location.search}`;
    const frame = window.requestAnimationFrame(() => {
      if (location.hash) {
        document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView({ block: 'start' });
        return;
      }
      const saved = navigationType === 'POP' ? Number(sessionStorage.getItem(storageKey)) : 0;
      window.scrollTo({ top: Number.isFinite(saved) ? saved : 0, left: 0, behavior: 'auto' });
    });

    return () => {
      window.cancelAnimationFrame(frame);
      sessionStorage.setItem(storageKey, String(window.scrollY));
    };
  }, [location.hash, location.pathname, location.search, navigationType]);

  return null;
}

function SearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const animeList = useAnimeList();
  const { records } = useLocalLibrary();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<SearchCategory>('全部');
  const [active, setActive] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const navigate = useNavigate();

  const results = useMemo<SearchItem[]>(() => {
    if (!query.trim()) return [];
    const items: SearchItem[] = [];
    animeList.forEach((anime) => {
      const fields = [
        anime.title,
        anime.originalTitle,
        anime.englishTitle ?? '',
        ...anime.genres,
        ...anime.staff.studio,
        anime.staff.director ?? '',
        anime.staff.seriesComposition ?? '',
        anime.staff.characterDesign ?? '',
        anime.staff.music ?? '',
        ...anime.staff.cast,
        ...(anime.broadcast?.platforms ?? []),
        anime.sourceNote,
        ...anime.externalLinks.map((link) => link.label),
      ];
      if (matchesSearch(fields, query)) {
        const context = [anime.year, anime.staff.studio[0], anime.broadcast?.platforms[0]].filter(Boolean).join(' · ');
        items.push({
          key: `anime-${anime.id}`,
          title: anime.title,
          description: context || anime.genres.join(' / '),
          type: '动漫',
          path: `/anime/${anime.id}`,
          favorite: records[anime.id]?.favorite,
        });
      }
    });
    articles.forEach((article) => {
      if (matchesSearch([article.title, article.summary, article.category, ...article.tags, ...article.sections.flatMap((section) => [section.heading, section.body])], query)) {
        items.push({ key: `article-${article.id}`, title: article.title, description: article.category, type: '文章', path: `/articles#${article.id}` });
      }
    });
    aiWorks.forEach((work) => {
      if (matchesSearch([work.title, work.type, work.style, work.tool, work.background, work.initialPrompt, work.finalPrompt], query)) {
        items.push({ key: `work-${work.id}`, title: work.title, description: `${work.type} · ${work.style}`, type: '作品', path: `/works/${work.id}` });
      }
    });
    prompts.forEach((prompt) => {
      if (matchesSearch([prompt.name, prompt.scene, prompt.style, prompt.prompt, prompt.negative, prompt.params], query)) {
        items.push({ key: `prompt-${prompt.id}`, title: prompt.name, description: prompt.scene, type: '提示词', path: `/ai-lab#prompt-${prompt.id}` });
      }
    });
    return items.filter((item) => category === '全部' || item.type === category).slice(0, 18);
  }, [animeList, category, query, records]);

  useEffect(() => setActive(0), [category, query]);
  useEffect(() => {
    if (!open) {
      setQuery('');
      setCategory('全部');
    }
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    previousFocus.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
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
      document.body.style.overflow = previousOverflow;
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
            onChange={(event: ChangeEvent<HTMLInputElement>) => setQuery(event.target.value)}
            onKeyDown={handleInputKey}
            placeholder="标题、制作公司、声优、平台或题材"
            aria-label="搜索动漫、文章、作品或提示词"
            aria-controls="search-results"
            aria-activedescendant={results[active] ? `result-${results[active].key}` : undefined}
          />
          <kbd>ESC</kbd>
        </div>
        <div className="search-category-row" aria-label="搜索类别">
          {searchCategories.map((item) => (
            <button key={item} type="button" aria-pressed={category === item} className={category === item ? 'active' : ''} onClick={() => setCategory(item)}>{item}</button>
          ))}
        </div>
        <div id="search-results" className="search-results" role="listbox" aria-label="搜索结果">
          {!query && <div className="search-empty-state"><Command size={22} /><p>支持多关键词检索，例如“动画工房 恋爱”或“港台 周日”。</p><small>快捷键：Ctrl/⌘ + K，或在非输入状态下按 /</small></div>}
          {query && results.length === 0 && <p className="empty-hint">没有找到匹配内容，请尝试减少关键词或切换类别。</p>}
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
              <span><strong>{item.title}{item.favorite && <Bookmark className="search-favorite" size={14} aria-label="已收藏" />}</strong><small>{item.description}</small></span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  useEffect(() => setMenuOpen(false), [location.pathname, location.search, location.hash]);

  useEffect(() => {
    const handleShortcut = (event: globalThis.KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping = target?.matches('input, textarea, select, [contenteditable="true"]');
      const commandSearch = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k';
      const slashSearch = event.key === '/' && !isTyping && !event.ctrlKey && !event.metaKey && !event.altKey;
      if (!commandSearch && !slashSearch) return;
      event.preventDefault();
      setSearchOpen(true);
    };
    document.addEventListener('keydown', handleShortcut);
    return () => document.removeEventListener('keydown', handleShortcut);
  }, []);

  return (
    <div className="app-shell">
      <RouteScrollManager />
      <header className="site-header">
        <div className="header-inner">
          <Link to="/" className="brand" aria-label="次元生成局首页">
            <span className="brand-mark"><Sparkles size={19} /></span>
            <span><strong>次元生成局</strong><small>Anime & AI Creative Lab</small></span>
          </Link>
          <nav className="desktop-nav" aria-label="主要导航">
            {navItems.map(([label, path]) => (
              <NavLink key={path} to={path} end={path === '/'} className={({ isActive }: { isActive: boolean }) => isActive ? 'nav-link active' : 'nav-link'}>{label}</NavLink>
            ))}
          </nav>
          <div className="header-actions">
            <button className="icon-button search-trigger" onClick={() => setSearchOpen(true)} aria-label="打开全局搜索" title="搜索（Ctrl/⌘ + K）"><Search size={19} /><span>⌘K</span></button>
            <button className="icon-button" onClick={() => setDark((value) => !value)} aria-label={dark ? '切换到浅色模式' : '切换到深色模式'}>{dark ? <Sun size={19} /> : <Moon size={19} />}</button>
            <button
              className="icon-button mobile-only"
              onClick={() => setMenuOpen((value) => !value)}
              aria-label={menuOpen ? '关闭导航菜单' : '打开导航菜单'}
              aria-expanded={menuOpen}
              aria-controls="mobile-navigation"
            >
              {menuOpen ? <X size={21} /> : <Menu size={21} />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <nav id="mobile-navigation" className="mobile-nav" aria-label="移动端导航">
            {navItems.map(([label, path]) => <NavLink key={path} to={path} end={path === '/'} className={({ isActive }: { isActive: boolean }) => isActive ? 'active' : undefined}>{label}</NavLink>)}
          </nav>
        )}
      </header>
      <main>{children}</main>
      <footer className="site-footer">
        <div>
          <strong>次元生成局</strong>
          <p>动漫公开资料库、新番观测、放送日历与 AI 创作实验室。</p>
        </div>
        <p>本站记录资料与资源的原始来源、核验状态和授权状态；本地收藏和追番状态仅保存在当前浏览器。</p>
      </footer>
      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
