import type { AnimeSourceType, InformationStatus, SeasonName, WatchStatus, Weekday } from './types';

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

export const currentWeekday = (): Weekday => {
  const days: Weekday[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[new Date().getDay()] ?? 'monday';
};

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
