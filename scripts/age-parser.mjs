const AGE_ORIGIN = 'https://cn.agekkkk.com';

function decodeHtml(value = '') {
  return String(value)
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&#x27;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseAttributes(tag = '') {
  const attributes = {};
  const attributeRe = /([:\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  for (const match of tag.matchAll(attributeRe)) {
    const name = match[1].toLowerCase();
    if (name === 'a' || name === 'img' || name === 'span') continue;
    attributes[name] = decodeHtml(match[2] ?? match[3] ?? match[4] ?? '');
  }
  return attributes;
}

function absoluteUrl(url, sourcePage) {
  if (!url || /^(?:javascript:|#|mailto:)/i.test(url)) return undefined;
  try {
    return new URL(url, sourcePage || AGE_ORIGIN).toString();
  } catch {
    return undefined;
  }
}

function safeDecodeURIComponent(value) {
  if (!value) return undefined;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function parseStatus(value = '') {
  if (/完结|已完结|全\s*\d+\s*集/i.test(value)) return 'finished';
  if (/更新|连载|更新至|第\s*\d+\s*集/i.test(value)) return 'airing';
  return 'announced';
}

function anchorBlocks(html) {
  return [...String(html).matchAll(/(<a\b[^>]*>)([\s\S]*?)<\/a>/gi)].map((match) => ({
    tag: match[1],
    body: match[2],
    attrs: parseAttributes(match[1]),
  }));
}

function parseCardItems(html, sourcePage) {
  const items = [];
  for (const anchor of anchorBlocks(html)) {
    const className = anchor.attrs.class ?? '';
    if (!className.includes('bCBBJ')) continue;
    const href = anchor.attrs.href;
    const title = decodeHtml(anchor.attrs.title ?? '');
    const id = href?.match(/\/anime\/([^/?#]+?)(?:\.html)?(?:[?#]|$)/i)?.[1];
    if (!id || !title) continue;
    const labels = [...anchor.body.matchAll(/<span\b[^>]*>([\s\S]*?)<\/span>/gi)]
      .map((entry) => decodeHtml(entry[1]))
      .filter(Boolean);
    const info = labels.find((label) => /\b(?:19|20)\d{2}\b/.test(label));
    const year = Number(info?.match(/\b(?:19|20)\d{2}\b/)?.[0]);
    const lastLabel = labels.at(-1);
    items.push({
      id,
      title,
      detailUrl: absoluteUrl(href, sourcePage),
      coverImage: absoluteUrl(anchor.attrs['data-original'] || anchor.attrs['data-src'], sourcePage),
      language: info?.split('/')[0],
      year: Number.isFinite(year) ? year : undefined,
      episodeLabel: lastLabel,
      status: parseStatus(lastLabel),
      sourceSite: 'cn.agekkkk.com',
      sourcePage,
    });
  }
  return items;
}

function parsePagination(html) {
  const activeBlock = String(html).match(/<li\b[^>]*class=(?:"[^"]*active\s+num[^"]*"|'[^']*active\s+num[^']*')[^>]*>([\s\S]*?)<\/li>/i)?.[1] ?? '';
  const pageMatch = decodeHtml(activeBlock).match(/(\d+)\s*\/\s*(\d+)/);
  if (!pageMatch) return undefined;
  const nextAnchor = anchorBlocks(html).find((anchor) => /下一页/.test(decodeHtml(anchor.body)));
  return {
    page: Number(pageMatch[1]),
    pageCount: Number(pageMatch[2]),
    nextUrl: nextAnchor?.attrs.href,
  };
}

function parseSiteResources(html, sourcePage) {
  const resources = [];
  for (const anchor of anchorBlocks(html)) {
    const label = decodeHtml(anchor.body);
    const url = absoluteUrl(anchor.attrs.href, sourcePage);
    if (!url || !label) continue;
    let kind;
    let hostname = '';
    try { hostname = new URL(url).hostname.toLowerCase(); } catch { hostname = ''; }
    if (/防走丢|发布页|最新网址/i.test(label) || hostname === 'fb.omoo.tv') kind = 'anti_loss';
    else if (/镜像|备用|备用站|备用网址/i.test(label)
      || (/^(?:https?:\/\/)?[a-z0-9.-]+\.[a-z]{2,}/i.test(label) && hostname && hostname !== 'cn.agekkkk.com')) kind = 'mirror';
    else continue;
    resources.push({ label, url, kind, sourceSite: 'cn.agekkkk.com', sourcePage, authorizationStatus: 'unknown', availability: 'unchecked' });
  }
  return resources;
}

function parseCollection(html, sourcePage, kind) {
  return {
    kind,
    sourceSite: 'cn.agekkkk.com',
    sourcePage,
    items: parseCardItems(html, sourcePage),
    pagination: parsePagination(html),
    siteResources: parseSiteResources(html, sourcePage),
  };
}

export function parseAgeHome(html, sourcePage = `${AGE_ORIGIN}/`) {
  return parseCollection(html, sourcePage, 'home');
}

export function parseAgeHot(html, sourcePage = `${AGE_ORIGIN}/dayhot`) {
  const collection = parseCollection(html, sourcePage, 'hot');
  return { ...collection, items: collection.items.map((item, index) => ({ ...item, rank: index + 1, popularityLabel: 'AGE 热播榜' })) };
}

export function parseAgeCategory(html, sourcePage) {
  return parseCollection(html, sourcePage, 'category');
}

export function parseAgeTopic(html, sourcePage) {
  const items = [];
  for (const anchor of anchorBlocks(html)) {
    const className = anchor.attrs.class ?? '';
    const href = anchor.attrs.href ?? '';
    if (!className.includes('bCBBJ') || !/topicdetail-\d+\.html/i.test(href)) continue;
    const id = href.match(/topicdetail-(\d+)/i)?.[1];
    const title = decodeHtml(anchor.attrs.title ?? anchor.body);
    if (!id || !title) continue;
    items.push({
      id,
      title,
      detailUrl: absoluteUrl(href, sourcePage),
      coverImage: absoluteUrl(anchor.attrs['data-original'] || anchor.attrs['data-src'], sourcePage),
      sourceSite: 'cn.agekkkk.com',
      sourcePage,
    });
  }
  return { kind: 'topic', sourceSite: 'cn.agekkkk.com', sourcePage, items, pagination: parsePagination(html), siteResources: parseSiteResources(html, sourcePage) };
}

export function parseAgeWeek(html, sourcePage) {
  const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const items = [];
  const sectionRe = /<ul\b([^>]*)>([\s\S]*?)<\/ul>/gi;
  for (const section of html.matchAll(sectionRe)) {
    const attrs = parseAttributes(`<ul ${section[1]}>`);
    if (!(attrs.class ?? '').includes('week-content')) continue;
    const key = Number(attrs['data-key']);
    items.push(...parseCardItems(section[2], sourcePage).map((item) => ({ ...item, weekday: weekdays[key] ?? 'streaming' })));
  }
  return { kind: 'week', sourceSite: 'cn.agekkkk.com', sourcePage, items, pagination: undefined };
}

function parseEpisodeLinks(html, sourcePage, animeId) {
  const links = new Map();
  for (const anchor of anchorBlocks(html)) {
    const url = absoluteUrl(anchor.attrs.href, sourcePage);
    if (!url || !url.includes(`/anime/${animeId}/play/`)) continue;
    const route = url.match(/\/play\/(\d+)\/(\d+)\.html/i);
    const entry = {
      episode: decodeHtml(anchor.body),
      url,
      line: route?.[1],
      episodeIndex: route ? Number(route[2]) : undefined,
      sourceSite: 'cn.agekkkk.com',
      sourcePage,
      authorizationStatus: 'unknown',
      availability: 'unchecked',
    };
    const previous = links.get(url);
    const generic = /立即播放|播放$/i.test(entry.episode);
    if (!previous || (/立即播放|播放$/i.test(previous.episode) && !generic)) links.set(url, entry);
  }
  return [...links.values()];
}

function parseDataField(html, label) {
  const paragraphs = [...String(html).matchAll(/<p\b([^>]*)>([\s\S]*?)<\/p>/gi)];
  for (const paragraph of paragraphs) {
    const attrs = parseAttributes(`<p ${paragraph[1]}>`);
    if (!(attrs.class ?? '').split(/\s+/).some((name) => name.startsWith('data'))) continue;
    const text = decodeHtml(paragraph[2]);
    const match = text.match(new RegExp(`^${label}[：:]\\s*(.+)$`, 'i'));
    if (match) return match[1].trim();
  }
  return undefined;
}

function parseMeta(html, name) {
  for (const match of String(html).matchAll(/<meta\b([^>]*)>/gi)) {
    const attrs = parseAttributes(`<meta ${match[1]}>`);
    if ((attrs.name ?? '').toLowerCase() === name.toLowerCase()) return attrs.content;
  }
  return undefined;
}

export function parseAgeDetail(html, sourcePage) {
  const title = decodeHtml(html.match(/<title>([\s\S]*?)(?:免费观看|在线观看|\s*-\s*4K动漫)/i)?.[1] ?? '');
  const animeId = sourcePage.match(/\/anime\/([^/?#]+?)(?:\.html)?(?:[?#]|$)/i)?.[1];
  if (!animeId || !title || title === '暂无') return undefined;
  const yearText = parseDataField(html, '年份');
  const director = parseDataField(html, '导演');
  const language = parseDataField(html, '语言');
  const region = parseDataField(html, '地区');
  const type = parseDataField(html, '类型');
  const episodeText = html.match(/<span[^>]*style=(?:"[^"]*color\s*:\s*red[^"]*"|'[^']*color\s*:\s*red[^']*')[^>]*>([^<]+)<\/span>/i)?.[1];
  const episodes = parseEpisodeLinks(html, sourcePage, animeId);
  const channels = [];
  for (const anchor of anchorBlocks(html)) {
    if (!/^#playlist/i.test(anchor.attrs.href ?? '')) continue;
    const count = Number(anchor.body.match(/<span>(\d+)<\/span>/i)?.[1]);
    channels.push({ name: decodeHtml(anchor.body.replace(/<span>[\s\S]*$/i, '')), episodeCount: Number.isFinite(count) ? count : undefined, id: (anchor.attrs.href ?? '').slice(1) });
  }
  return {
    kind: 'detail',
    id: animeId,
    title,
    year: yearText && /^\d{4}$/.test(yearText) ? Number(yearText) : undefined,
    language,
    region,
    type,
    director: director && !/^未知$/.test(director) ? director : undefined,
    synopsis: parseMeta(html, 'description'),
    episodeLabel: decodeHtml(episodeText),
    channels,
    episodes,
    siteResources: parseSiteResources(html, sourcePage),
    sourceSite: 'cn.agekkkk.com',
    sourcePage,
  };
}

function parsePlayerObject(html) {
  const match = html.match(/var\s+player_aaaa\s*=\s*(\{[\s\S]*?\})\s*<\/script>/i);
  if (!match) return undefined;
  try {
    return JSON.parse(match[1].replace(/\\\//g, '/'));
  } catch {
    return undefined;
  }
}

export function parseAgePlay(html, sourcePage) {
  const player = parsePlayerObject(html);
  const animeId = sourcePage.match(/\/anime\/([^/]+?)\/play\//i)?.[1];
  const episode = decodeHtml(html.match(/正在播放：([^<&]+)/i)?.[1]);
  if (!player || !animeId) return undefined;
  const mediaUrl = safeDecodeURIComponent(player.url);
  const resources = mediaUrl && absoluteUrl(mediaUrl, sourcePage)
    ? [{ animeId, episode, kind: 'streaming', url: absoluteUrl(mediaUrl, sourcePage), line: player.from, sourceSite: 'cn.agekkkk.com', sourcePage, authorizationStatus: 'unknown', availability: 'unchecked' }]
    : [];
  const channels = [];
  for (const anchor of anchorBlocks(html)) {
    if (!(anchor.attrs.class ?? '').includes('play-channel-item')) continue;
    channels.push({
      url: absoluteUrl(anchor.attrs.href, sourcePage),
      episodeCount: Number(anchor.attrs['data-count']) || undefined,
      sourceId: Number(anchor.attrs['data-sid']) || undefined,
      name: decodeHtml(anchor.body),
    });
  }
  return {
    kind: 'play',
    animeId,
    episode,
    line: player.from,
    nextUrl: absoluteUrl(player.link_next, sourcePage),
    channels,
    resources,
    sourceSite: 'cn.agekkkk.com',
    sourcePage,
  };
}

export const ageParser = { parseAgeHome, parseAgeHot, parseAgeCategory, parseAgeWeek, parseAgeTopic, parseAgeDetail, parseAgePlay };
