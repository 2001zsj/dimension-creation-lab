const DEFAULT_ORIGIN = 'https://yuc.wiki';

function decodeHtml(value = '') {
  return String(value)
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#x2F;/gi, '/')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&#x27;/gi, "'")
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
    if (name === 'td' || name === 'p' || name === 'img') continue;
    attributes[name] = decodeHtml(match[2] ?? match[3] ?? match[4] ?? '');
  }
  return attributes;
}

function findTitleCell(block) {
  for (const match of String(block).matchAll(/(<td\b[^>]*>)([\s\S]*?)<\/td>/gi)) {
    const attributes = parseAttributes(match[1]);
    if ((attributes.class ?? '').includes('date_title_') && String(attributes.colspan ?? '') === '3') return decodeHtml(match[2]);
  }
  return '';
}

function htmlLines(value = '') {
  return String(value)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(?:p|div|td|tr|li|h\d)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&#x27;/gi, "'")
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function configForPeriod(period) {
  if (!/^\d{6}$/.test(period)) throw new Error('YUC period must use YYYYMM');
  const year = Number(period.slice(0, 4));
  const month = Number(period.slice(4, 6));
  const season = month <= 3 ? 'winter' : month <= 6 ? 'spring' : month <= 9 ? 'summer' : 'autumn';
  const seasonLabel = { winter: '冬季', spring: '春季', summer: '夏季', autumn: '秋季' }[season];
  return { period, year, month, season, seasonLabel, sourceUrl: `${DEFAULT_ORIGIN}/${period}/` };
}

function slugify(value, index) {
  return value.normalize('NFKD').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '').toLowerCase() || `yuc-${index + 1}`;
}

function sourceForText(value) {
  if (/原创动画/.test(value)) return 'original';
  if (/游戏改编/.test(value)) return 'game';
  if (/小说改编/.test(value)) return 'novel';
  if (/漫画改编/.test(value)) return 'manga';
  return 'other';
}

function statusForDate(dateText, year) {
  const dateMatch = String(dateText ?? '').match(/^\d{1,2}\/\d{1,2}/)?.[0];
  if (!dateMatch) return 'announced';
  const [month, day] = dateMatch.split('/').map(Number);
  const start = new Date(Date.UTC(year, month - 1, day));
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return start <= today ? 'airing' : 'scheduled';
}

function absoluteUrl(value, sourceUrl) {
  if (!value || /^(?:javascript:|#|mailto:)/i.test(value)) return undefined;
  try { return new URL(value, sourceUrl).toString(); } catch { return undefined; }
}

function parseLinks(block, sourceUrl) {
  const links = [];
  for (const match of String(block).matchAll(/<a\b[^>]*href=(?:"([^"]+)"|'([^']+)')[^>]*>([\s\S]*?)<\/a>/gi)) {
    const url = absoluteUrl(match[1] ?? match[2], sourceUrl);
    const body = match[3];
    const label = decodeHtml(body.match(/<p\b[^>]*class=(?:"[^"]*area[^"]*"|'[^']*area[^']*')[^>]*>([\s\S]*?)<\/p>/i)?.[1] ?? body);
    if (!url || !label || /^Image$/i.test(label)) continue;
    const type = /动画官网|官网|公式/.test(label) ? 'official' : /\bPV\b|预告/.test(label) ? 'pv' : /大陆|港台|台湾|环大陆|Netflix|bilibili|巴哈|Crunchyroll/i.test(label) ? 'streaming' : 'reference';
    if (!links.some((link) => link.url === url)) links.push({ label, url, type });
  }
  return links;
}

function readLabeledLine(lines, labels) {
  for (const label of labels) {
    const line = lines.find((entry) => entry.startsWith(`${label}：`) || entry.startsWith(`${label}:`));
    if (line) return line.slice(label.length + 1).trim() || undefined;
  }
  return undefined;
}

function splitNames(value) {
  return value ? value.split(/[、,&＆/／]/).map((entry) => entry.trim()).filter(Boolean) : [];
}

function decodeCastText(value = '') {
  return String(value)
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#x2F;/gi, '/')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&#x27;/gi, "'");
}

export function parseCastCredits(value) {
  const credits = [];
  const castLines = String(value)
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .split(/\n+/)
    .map((line) => decodeCastText(line).trim())
    .filter(Boolean);
  for (const rawLine of castLines) {
    const line = rawLine.replace(/^[|｜•·\-]+|[|｜•·\-]+$/g, '').replace(/\s*[/|｜]\s*/g, '  ').trim();
    if (!line) continue;
    let character;
    let actor;
    const actorOnly = line.match(/^(?:演员|声优|聲優|CV)\s*[:：]\s*(.+)$/i);
    const characterOnly = line.match(/^(?:角色|人物)\s*[:：]\s*(.+)$/i);
    const labelled = line.match(/^(?:角色|人物)\s*[:：]\s*(.*?)\s{2,}(?:演员|声优|聲優|CV)\s*[:：]\s*(.+)$/i)
      ?? line.match(/^(?:演员|声优|聲優|CV)\s*[:：]\s*(.*?)\s{2,}(?:角色|人物)\s*[:：]\s*(.+)$/i);
    if (labelled) {
      if (/^(?:角色|人物)/i.test(line)) ({ 1: character, 2: actor } = labelled);
      else ({ 1: actor, 2: character } = labelled);
    } else if (actorOnly) actor = actorOnly[1].trim();
    else if (characterOnly) character = characterOnly[1].trim();
    else {
      const explicitPair = line.match(/^(.+?)\s*(?:→|=>|⇒|：|:)\s*(.+)$/);
      if (explicitPair) {
        character = explicitPair[1].trim();
        actor = explicitPair[2].trim();
      } else {
        // YUC 的 cast_r 无标签双列通常是两个声优姓名，而不是“声优 / 角色”。
        const actors = line.split(/\s{2,}|[　|｜]+/).map((part) => part.trim()).filter(Boolean);
        for (const name of actors) {
          if (!credits.some((entry) => entry.actor === name && !entry.character)) credits.push({ actor: name });
        }
        continue;
      }
    }
    if (!actor) continue;
    const credit = { actor, ...(character ? { character } : {}) };
    if (!credits.some((entry) => entry.actor === credit.actor && entry.character === credit.character)) credits.push(credit);
  }
  return credits;
}

function castFromChunk(html) {
  const blocks = [...String(html).matchAll(/<td\b[^>]*class=(?:"[^"]*\bcast[^\"]*"|'[^']*\bcast[^']*')[^>]*>([\s\S]*?)<\/td>/gi)].map((match) => match[1]);
  const credits = blocks.flatMap((block) => parseCastCredits(block));
  return credits.filter((credit, index) => credits.findIndex((entry) => entry.actor === credit.actor && entry.character === credit.character) === index);
}

function detailChunks(detailHtml, items) {
  const positions = [];
  for (const item of items) {
    const position = detailHtml.indexOf(item.title);
    if (position >= 0) positions.push({ position, item });
  }
  positions.sort((left, right) => left.position - right.position);
  return positions.map((entry, index) => ({ item: entry.item, html: detailHtml.slice(entry.position, positions[index + 1]?.position ?? detailHtml.length) }));
}

function enrichDetails(postBody, items, config) {
  const summaryMarker = postBody.search(/本期[\s\S]{0,120}共收录/);
  if (summaryMarker < 0) return items;
  const detailHtml = postBody.slice(summaryMarker);
  for (const chunk of detailChunks(detailHtml, items)) {
    const lines = htmlLines(chunk.html);
    const sourceLine = lines.find((line) => /(?:原创动画|漫画改编动画|小说改编动画|游戏改编动画)/.test(line));
    const sourceIndex = sourceLine ? lines.indexOf(sourceLine) : -1;
    const possibleOriginal = lines.find((line, index) => index > 0 && index < Math.max(5, sourceIndex) && line !== chunk.item.title && !/Image|原创动画|改编动画/.test(line));
    const studio = readLabeledLine(lines, ['动画制作']);
    const director = readLabeledLine(lines, ['导演', '监督']);
    const seriesComposition = readLabeledLine(lines, ['系列构成', '编剧', '脚本']);
    const characterDesign = readLabeledLine(lines, ['动画人设', '人物设计', '人设']);
    const music = readLabeledLine(lines, ['音乐']);
    const cast = readLabeledLine(lines, ['主要声优', '声优', 'CAST']);
    const castCredits = castFromChunk(chunk.html);
    const links = parseLinks(chunk.html, config.sourceUrl).filter((link) => link.type === 'official' || link.type === 'pv');
    const genreLine = sourceIndex >= 0 ? lines.slice(sourceIndex + 1).find((line) => !/[：:]|官网|PV|\d+\/\d+/.test(line)) : undefined;
    chunk.item.originalTitle = possibleOriginal || chunk.item.originalTitle;
    chunk.item.sourceType = sourceForText(sourceLine ?? '');
    chunk.item.genres = Array.from(new Set(['新番', 'TV 动画', `${config.year} ${config.seasonLabel}`, ...(genreLine ? genreLine.split(/[\/／]/).map((value) => value.trim()).filter(Boolean) : [])]));
    chunk.item.staff = {
      studio: splitNames(studio),
      cast: castCredits.length ? castCredits.map((credit) => credit.actor) : splitNames(cast),
      castCredits,
      director,
      seriesComposition,
      characterDesign,
      music,
    };
    chunk.item.externalLinks = [...chunk.item.externalLinks, ...links.filter((link) => !chunk.item.externalLinks.some((entry) => entry.url === link.url))];
  }
  return items;
}

export function parseYucAnime(html, { period = '202607' } = {}) {
  const config = configForPeriod(period);
  const weekdaySections = [['monday', '周一'], ['tuesday', '周二'], ['wednesday', '周三'], ['thursday', '周四'], ['friday', '周五'], ['saturday', '周六'], ['sunday', '周日'], ['streaming', '网络']];
  const postBodyStart = html.indexOf('<div class="post-body"');
  const postBody = postBodyStart < 0 ? html : html.slice(postBodyStart);
  const items = [];
  const today = new Date().toISOString().slice(0, 10);

  for (let sectionIndex = 0; sectionIndex < weekdaySections.length; sectionIndex += 1) {
    const [weekday, marker] = weekdaySections[sectionIndex];
    const start = postBody.indexOf(`<!--${marker}-->`);
    if (start < 0) continue;
    const following = weekdaySections.slice(sectionIndex + 1).map(([, next]) => postBody.indexOf(`<!--${next}-->`, start + marker.length)).filter((position) => position >= 0);
    const end = following.length ? Math.min(...following) : postBody.length;
    const section = postBody.slice(start, end);
    for (const match of section.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
      const block = match[1];
      const time = block.match(/<p\b[^>]*class=(?:"[^"]*imgtext3[^"]*"|'[^']*imgtext3[^']*')[^>]*>([\s\S]*?)<\/p>/i)?.[1];
      const date = block.match(/<p\b[^>]*class=(?:"[^"]*imgtext4[^"]*"|'[^']*imgtext4[^']*')[^>]*>([\s\S]*?)<\/p>/i)?.[1]
        ?? block.match(/<p\b[^>]*class=(?:"[^"]*imgep[^"]*"|'[^']*imgep[^']*')[^>]*>([\s\S]*?)<\/p>/i)?.[1];
      const title = findTitleCell(block);
      if (!title) continue;
      const image = absoluteUrl(block.match(/<img[^>]+(?:data-src|src)=(?:"([^"]+)"|'([^']+)')/i)?.[1] ?? block.match(/<img[^>]+(?:data-src|src)=(?:"([^"]+)"|'([^']+)')/i)?.[2], config.sourceUrl);
      const links = parseLinks(block, config.sourceUrl);
      const decodedDate = decodeHtml(date ?? '');
      const dateMatch = decodedDate.match(/^\d{1,2}\/\d{1,2}/)?.[0];
      const startDate = dateMatch ? `${config.year}-${dateMatch.split('/').map((part) => part.padStart(2, '0')).join('-')}` : undefined;
      const episodeCount = Number(decodedDate.match(/(?:全|P\d+=)\s*(\d+)\s*话/)?.[1]) || undefined;
      const decodedTime = time ? decodeHtml(time).replace('~', '') : undefined;
      items.push({
        id: slugify(title, items.length),
        title,
        originalTitle: title,
        year: config.year,
        season: config.season,
        sourceType: 'other',
        genres: ['新番', 'TV 动画', `${config.year} ${config.seasonLabel}`],
        synopsis: '',
        staff: { studio: [], cast: [], castCredits: [] },
        broadcast: { weekday, time: decodedTime, startDate, episodeCount, platforms: links.filter((link) => link.type === 'streaming').map((link) => link.label), timezone: 'Asia/Tokyo' },
        externalLinks: [{ label: `長門番堂 ${config.year}年${config.month}月新番表`, url: config.sourceUrl, type: 'reference' }, ...links],
        informationStatus: statusForDate(decodedDate, config.year),
        lastUpdated: today,
        sourceNote: `主资料来自長門番堂（Yuc's Anime List）${config.year}年${config.month}月新番表。`,
        recordSource: 'source',
        watchStatus: 'planned',
        progress: 0,
        logs: [],
        coverSeed: image ? [...image].reduce((sum, character) => sum + character.charCodeAt(0), 0) % 97 : items.length + 1,
        coverImage: image,
        featured: items.length < 6,
      });
    }
  }
  return enrichDetails(postBody, items, config);
}

export const yucParser = { parseYucAnime };
