const AGE_ORIGIN = "https://cn.agekkkk.com";

function decodeHtml(value = "") {
  return String(value).replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&quot;/gi, '"').replace(/&#39;/gi, "'").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

function absoluteUrl(url, sourcePage) {
  if (!url || /^(?:javascript:|#|mailto:)/i.test(url)) return undefined;
  return new URL(url, sourcePage || AGE_ORIGIN).toString();
}

function parseStatus(value = "") {
  if (/\u5b8c\u7ed3|\u5df2\u5b8c\u7ed3/i.test(value)) return "finished";
  if (/\u66f4\u65b0|\u8fde\u8f7d|\u96c6$/i.test(value)) return "airing";
  return "announced";
}

function parseCardItems(html, sourcePage) {
  const items = [];
  const cardRe = /<a\b[^>]*class=(?:"[^\"]*bCBBJ[^\"]*"|'[^']*bCBBJ[^']*')[^>]*href=(?:"([^\"]+)"|'([^']+)')[^>]*title=(?:"([^\"]*)"|'([^']*)')[^>]*data-original=(?:"([^\"]*)"|'([^']*)')[^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(cardRe)) {
    const href = match[1] ?? match[2];
    const title = decodeHtml(match[3] ?? match[4] ?? "");
    const id = href?.match(/\/anime\/([^/]+?)(?:\.html)?$/i)?.[1];
    if (!id || !title) continue;
    const labels = [...(match[7] ?? "").matchAll(/<span\b[^>]*>([\s\S]*?)<\/span>/gi)].map((entry) => decodeHtml(entry[1])).filter(Boolean);
    const info = labels.find((label) => /\d{4}/.test(label));
    const year = Number(info?.match(/\b(?:19|20)\d{2}\b/)?.[0]);
    const lastLabel = labels.at(-1);
    items.push({ id, title, detailUrl: absoluteUrl(href, sourcePage), coverImage: absoluteUrl(match[5] ?? match[6], sourcePage), language: info?.split("/")[0], year: Number.isFinite(year) ? year : undefined, episodeLabel: lastLabel, status: parseStatus(lastLabel), sourceSite: "cn.agekkkk.com", sourcePage });
  }
  return items;
}

function parsePagination(html) {
  const match = html.match(/class=(?:"active num"|'active num')[^>]*>[\s\S]*?<a[^>]*>(\d+)\s*\/\s*(\d+)/i);
  return match ? { page: Number(match[1]), pageCount: Number(match[2]) } : undefined;
}

function parseCollection(html, sourcePage, kind) {
  return { kind, sourceSite: "cn.agekkkk.com", sourcePage, items: parseCardItems(html, sourcePage), pagination: parsePagination(html) };
}

export function parseAgeHome(html, sourcePage = `${AGE_ORIGIN}/`) { return parseCollection(html, sourcePage, "home"); }
export function parseAgeCategory(html, sourcePage) { return parseCollection(html, sourcePage, "category"); }

export function parseAgeTopic(html, sourcePage) {
  const items = [];
  const topicRe = /<a\b[^>]*class=(?:"[^\"]*bCBBJ[^\"]*"|'[^']*bCBBJ[^']*')[^>]*href=(?:"([^\"]*topicdetail-\d+\.html)"|'([^']*topicdetail-\d+\.html)')[^>]*title=(?:"([^\"]*)"|'([^']*)')[^>]*data-original=(?:"([^\"]*)"|'([^']*)')[^>]*>/gi;
  for (const match of html.matchAll(topicRe)) {
    const href = match[1] ?? match[2];
    const id = href.match(/topicdetail-(\d+)/i)?.[1];
    const title = decodeHtml(match[3] ?? match[4] ?? "");
    if (id && title) items.push({ id, title, detailUrl: absoluteUrl(href, sourcePage), coverImage: absoluteUrl(match[5] ?? match[6], sourcePage), sourceSite: "cn.agekkkk.com", sourcePage });
  }
  return { kind: "topic", sourceSite: "cn.agekkkk.com", sourcePage, items, pagination: parsePagination(html) };
}

export function parseAgeWeek(html, sourcePage) {
  const weekdays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  const items = [];
  const sectionRe = /<ul\b[^>]*class=(?:"week-content[^\"]*"|'week-content[^']*')[^>]*data-key=(?:"(\d+)"|'(\d+)')[^>]*>([\s\S]*?)<\/ul>/gi;
  for (const section of html.matchAll(sectionRe)) {
    const key = Number(section[1] ?? section[2]);
    items.push(...parseCardItems(section[3], sourcePage).map((item) => ({ ...item, weekday: weekdays[key] ?? "streaming" })));
  }
  return { kind: "week", sourceSite: "cn.agekkkk.com", sourcePage, items, pagination: undefined };
}

function parseEpisodeLinks(block, sourcePage, animeId) {
  const links = [];
  const linkRe = /<a\b[^>]*href=(?:"([^\"]*\/anime\/[^\"]*\/play\/[^\"]+)"|'([^']*\/anime\/[^']*\/play\/[^']+)')[^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of block.matchAll(linkRe)) {
    const url = absoluteUrl(match[1] ?? match[2], sourcePage);
    if (!url || !url.includes(`/anime/${animeId}/play/`)) continue;
    links.push({ episode: decodeHtml(match[3]), url, sourceSite: "cn.agekkkk.com", sourcePage, authorizationStatus: "unknown", availability: "unchecked" });
  }
  return links;
}

function parseDataField(html, label) {
  const match = html.match(new RegExp(`<p[^>]*class=(?:"data[^\"]*"|'data[^']*')[^>]*>\\s*${label}\\uff1a([\\s\\S]*?)<\\/p>`, "i"));
  return match ? decodeHtml(match[1]) : undefined;
}

export function parseAgeDetail(html, sourcePage) {
  const title = decodeHtml(html.match(/<title>([\s\S]*?)(?:\u514d\u8d39\u89c2\u770b|\u5728\u7ebf\u89c2\u770b|\s*-\s*4K\u52a8\u6f2b)/i)?.[1] ?? "");
  const animeId = sourcePage.match(/\/anime\/([^/]+?)(?:\.html)?$/i)?.[1];
  if (!animeId || !title) return undefined;
  const yearText = parseDataField(html, "\u5e74\u4efd");
  const director = parseDataField(html, "\u5bfc\u6f14");
  const language = parseDataField(html, "\u8bed\u8a00");
  const region = parseDataField(html, "\u5730\u533a");
  const episodeText = html.match(/<span[^>]*style=(?:"color:\s*red;"|'color:\s*red;')[^>]*>([^<]+)<\/span>/i)?.[1];
  const episodes = parseEpisodeLinks(html, sourcePage, animeId);
  const channels = [...html.matchAll(/<a\b[^>]*href=(?:"#playlist[^\"]+"|'#playlist[^']+')[^>]*>([^<]+)<span>(\d+)<\/span>/gi)].map((match) => ({ name: decodeHtml(match[1]), episodeCount: Number(match[2]) }));
  return { kind: "detail", id: animeId, title, year: yearText && /^\d{4}$/.test(yearText) ? Number(yearText) : undefined, language, region, director: director && !/^\u672a\u77e5$/.test(director) ? director : undefined, episodeLabel: decodeHtml(episodeText), channels, episodes, sourceSite: "cn.agekkkk.com", sourcePage };
}

function parsePlayerObject(html) {
  const match = html.match(/var\s+player_aaaa\s*=\s*(\{[\s\S]*?\})<\/script>/i);
  if (!match) return undefined;
  try { return JSON.parse(match[1].replace(/\\\//g, "/")); } catch { return undefined; }
}

export function parseAgePlay(html, sourcePage) {
  const player = parsePlayerObject(html);
  const animeId = sourcePage.match(/\/anime\/([^/]+?)\/play\//i)?.[1];
  const episode = decodeHtml(html.match(/\u6b63\u5728\u64ad\u653e\uff1a([^<&]+)/i)?.[1]);
  if (!player || !animeId) return undefined;
  const mediaUrl = player.url ? decodeURIComponent(player.url) : undefined;
  const resources = mediaUrl ? [{ animeId, episode, kind: "stream", url: mediaUrl, sourceSite: "cn.agekkkk.com", sourcePage, authorizationStatus: "unknown", availability: "unchecked" }] : [];
  const channels = [...html.matchAll(/<a\b[^>]*class=(?:"play-channel-item[^\"]*"|'play-channel-item[^']*')[^>]*href=(?:"([^\"]+)"|'([^']+)')[^>]*data-count=(?:"(\d+)"|'(\d+)')[^>]*data-sid=(?:"(\d+)"|'(\d+)')[^>]*>([^<]+)<\/a>/gi)].map((match) => ({ url: absoluteUrl(match[1] ?? match[2], sourcePage), episodeCount: Number(match[3] ?? match[4]), sourceId: Number(match[5] ?? match[6]), name: decodeHtml(match[7]) }));
  return { kind: "play", animeId, episode, line: player.from, nextUrl: absoluteUrl(player.link_next, sourcePage), channels, resources, sourceSite: "cn.agekkkk.com", sourcePage };
}

export const ageParser = { parseAgeHome, parseAgeCategory, parseAgeWeek, parseAgeTopic, parseAgeDetail, parseAgePlay };
