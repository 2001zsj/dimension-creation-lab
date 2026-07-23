import type { Anime, AnimeSourceType, BroadcastInfo, InformationStatus, SeasonName, WatchStatus, Weekday } from './types';

export const seasonLabels: Record<SeasonName, string> = {
  winter: '冬季',
  spring: '春季',
  summer: '夏季',
  autumn: '秋季',
  undecided: '未定档',
};

export const seasonMonths: Record<Exclude<SeasonName, 'undecided'>, string> = {
  winter: '1 月',
  spring: '4 月',
  summer: '7 月',
  autumn: '10 月',
};

export const seasonOrder: SeasonName[] = ['winter', 'spring', 'summer', 'autumn', 'undecided'];

export const sourceLabels: Record<AnimeSourceType, string> = {
  original: '原创',
  manga: '漫画改编',
  novel: '小说改编',
  game: '游戏改编',
  other: '其他',
};

export const weekdayLabels: Record<Weekday, string> = {
  monday: '周一',
  tuesday: '周二',
  wednesday: '周三',
  thursday: '周四',
  friday: '周五',
  saturday: '周六',
  sunday: '周日',
  streaming: '网络放送',
};

export const weekdayOrder: Weekday[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'streaming'];

export const watchLabels: Record<WatchStatus, string> = {
  planned: '想看',
  watching: '在追',
  completed: '已看完',
  paused: '暂停',
  dropped: '弃番',
};

export const informationLabels: Record<InformationStatus, string> = {
  announced: '已公开',
  scheduled: '已定档',
  airing: '放送中',
  finished: '已完结',
  delayed: '延期',
};

const dayByShortName: Record<string, Weekday> = {
  Mon: 'monday', Tue: 'tuesday', Wed: 'wednesday', Thu: 'thursday',
  Fri: 'friday', Sat: 'saturday', Sun: 'sunday',
};

export const currentWeekday = (timeZone?: string): Weekday => {
  if (!timeZone) {
    const days: Weekday[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[new Date().getDay()] ?? 'monday';
  }
  const shortName = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone }).format(new Date());
  return dayByShortName[shortName] ?? 'monday';
};

export const seasonFromMonth = (month: number): Exclude<SeasonName, 'undecided'> => {
  if (month <= 3) return 'winter';
  if (month <= 6) return 'spring';
  if (month <= 9) return 'summer';
  return 'autumn';
};

export const seasonSortValue = (year: number, season: SeasonName): number => {
  if (season === 'undecided') return year * 10 + 9;
  return year * 10 + seasonOrder.indexOf(season);
};

export function getActiveSeason(animeList: Anime[]): { year: number; season: Exclude<SeasonName, 'undecided'> } {
  const nowParts = new Intl.DateTimeFormat('en-US', {
    year: 'numeric', month: 'numeric', timeZone: 'Asia/Tokyo',
  }).formatToParts(new Date());
  const currentYear = Number(nowParts.find((part) => part.type === 'year')?.value ?? new Date().getFullYear());
  const currentMonth = Number(nowParts.find((part) => part.type === 'month')?.value ?? new Date().getMonth() + 1);
  const currentSeason = seasonFromMonth(currentMonth);
  if (animeList.some((anime) => anime.year === currentYear && anime.season === currentSeason)) {
    return { year: currentYear, season: currentSeason };
  }

  const latest = [...animeList]
    .filter((anime): anime is Anime & { season: Exclude<SeasonName, 'undecided'> } => anime.season !== 'undecided')
    .sort((a, b) => seasonSortValue(b.year, b.season) - seasonSortValue(a.year, a.season))[0];
  return latest ? { year: latest.year, season: latest.season } : { year: currentYear, season: currentSeason };
}

export function isPersonalRecord(anime: Anime): boolean {
  return anime.recordSource === 'personal';
}

export function formatBroadcastEpisode(anime: Anime): string {
  if (isPersonalRecord(anime) && anime.progress > 0) return `已看到第 ${anime.progress} 话`;
  if (anime.broadcast?.startDate) return `首播 ${anime.broadcast.startDate}`;
  return anime.informationStatus === 'airing' ? '本周放送' : '集数待公开';
}

interface BroadcastDisplay {
  weekday: Weekday;
  time?: string;
  timeZoneLabel: string;
}

function parseBroadcastTime(time?: string): { hour: number; minute: number; dayOffset: number } | undefined {
  const match = time?.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return undefined;
  const rawHour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isFinite(rawHour) || !Number.isFinite(minute)) return undefined;
  return { hour: rawHour % 24, minute, dayOffset: Math.floor(rawHour / 24) };
}

export function formatBroadcastForZone(broadcast: BroadcastInfo, mode: 'jst' | 'local'): BroadcastDisplay {
  if (broadcast.weekday === 'streaming') {
    return {
      weekday: 'streaming',
      time: broadcast.time,
      timeZoneLabel: mode === 'jst' ? 'Asia/Tokyo' : Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  }

  const parsed = parseBroadcastTime(broadcast.time);
  if (mode === 'jst') {
    return { weekday: broadcast.weekday, time: broadcast.time, timeZoneLabel: 'Asia/Tokyo' };
  }
  if (!parsed) {
    return { weekday: broadcast.weekday, time: broadcast.time, timeZoneLabel: Intl.DateTimeFormat().resolvedOptions().timeZone };
  }

  const baseIndex = weekdayOrder.indexOf(broadcast.weekday);
  const anchorUtc = Date.UTC(2024, 0, 1 + baseIndex + parsed.dayOffset, parsed.hour - 9, parsed.minute);
  const date = new Date(anchorUtc);
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date);
  const weekday = dayByShortName[parts.find((part) => part.type === 'weekday')?.value ?? 'Mon'] ?? broadcast.weekday;
  const hour = parts.find((part) => part.type === 'hour')?.value ?? '00';
  const minute = parts.find((part) => part.type === 'minute')?.value ?? '00';
  return { weekday, time: `${hour}:${minute}`, timeZoneLabel: timeZone };
}

export async function copyToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Continue to the textarea fallback.
    }
  }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  let copied = false;
  try {
    copied = document.execCommand('copy');
  } finally {
    textarea.remove();
  }
  return copied;
}

export const seasonKey = (year: number, season: SeasonName): string => `${year}-${season}`;

export const formatSeason = (year: number, season: SeasonName): string =>
  season === 'undecided' ? `${year} 档期未定` : `${year} ${seasonLabels[season]}`;

export const safePercent = (progress: number, total?: number): number => {
  if (!total || total <= 0) return 0;
  return Math.min(100, Math.max(0, (progress / total) * 100));
};
