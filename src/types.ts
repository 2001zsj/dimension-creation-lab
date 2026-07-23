export type AnimeSourceType = 'original' | 'manga' | 'novel' | 'game' | 'other';
export type SeasonName = 'winter' | 'spring' | 'summer' | 'autumn' | 'undecided';
export type Weekday = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday' | 'streaming';
export type WatchStatus = 'planned' | 'watching' | 'completed' | 'paused' | 'dropped';
export type InformationStatus = 'announced' | 'scheduled' | 'airing' | 'finished' | 'delayed';
export type RecordSource = 'source' | 'personal';

export interface ExternalLink {
  label: string;
  url: string;
  type: 'official' | 'pv' | 'streaming' | 'reference';
}

export interface AnimeScores {
  story: number;
  characters: number;
  animation: number;
  music: number;
  direction: number;
  emotion: number;
}

export interface WatchLog {
  date: string;
  episode: string;
  note: string;
}

export interface AnimeStaff {
  director?: string;
  seriesComposition?: string;
  characterDesign?: string;
  music?: string;
  studio: string[];
  cast: string[];
}

export interface BroadcastInfo {
  weekday: Weekday;
  time?: string;
  startDate?: string;
  episodeCount?: number;
  platforms: string[];
  timezone: 'Asia/Tokyo';
}

export interface Anime {
  id: string;
  title: string;
  originalTitle: string;
  englishTitle?: string;
  year: number;
  season: SeasonName;
  sourceType: AnimeSourceType;
  genres: string[];
  synopsis: string;
  staff: AnimeStaff;
  broadcast?: BroadcastInfo;
  externalLinks: ExternalLink[];
  informationStatus: InformationStatus;
  lastUpdated: string;
  sourceNote: string;
  /** source 表示公开资料条目；personal 才能展示个人观看进度、评分与日志。 */
  recordSource?: RecordSource;
  watchStatus: WatchStatus;
  progress: number;
  rating?: number;
  scores?: AnimeScores;
  shortComment?: string;
  spoilerReview?: string;
  recommendation?: string;
  audience?: string;
  warning?: string;
  logs: WatchLog[];
  coverSeed: number;
  coverImage?: string;
  featured?: boolean;
}

export interface Article {
  id: string;
  title: string;
  summary: string;
  category: string;
  date: string;
  readTime: string;
  tags: string[];
  sections: Array<{ heading: string; body: string }>;
}

export interface AIWork {
  id: string;
  title: string;
  type: string;
  tool: string;
  style: string;
  date: string;
  coverSeed: number;
  background: string;
  initialPrompt: string;
  problem: string;
  adjustments: string[];
  finalPrompt: string;
  relatedWorkIds: string[];
}

export interface PromptItem {
  id: string;
  name: string;
  scene: string;
  prompt: string;
  negative: string;
  params: string;
  style: string;
  seed: number;
}

export interface CharacterPreset {
  id: string;
  name: string;
  identity: string;
  world: string;
  appearance: string;
  personality: string;
  ability: string;
  background: string;
  seed: number;
}

export interface StyleResearch {
  name: string;
  visual: string;
  colors: string;
  composition: string;
  tags: string[];
  prompt: string;
  seed: number;
}
