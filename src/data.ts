import type { AIWork, Anime, Article, CharacterPreset, PromptItem, StyleResearch } from './types';

export const animeList: Anime[] = [
  {
    id: 'starlight-echoes', title: '星际余晖', originalTitle: 'スターライト・エコーズ', englishTitle: 'Starlight Echoes',
    year: 2026, season: 'summer', sourceType: 'original', genres: ['科幻', '机甲', '群像'],
    synopsis: '资源衰竭后的地球派出深空调查队，在一次跃迁事故中发现了会记录文明记忆的未知天体。',
    staff: { director: '藤原遥', seriesComposition: '北川澄', characterDesign: '结城真白', music: 'Aster Unit', studio: ['Nova Frame'], cast: ['朝仓凛', '森川朔', '白石遥'] },
    broadcast: { weekday: 'monday', time: '23:00', startDate: '2026-07-06', episodeCount: 12, platforms: ['模拟电视台 A', '模拟流媒体'], timezone: 'Asia/Tokyo' },
    externalLinks: [{ label: '模拟官网', url: 'https://example.com/starlight-echoes', type: 'official' }, { label: 'PV（模拟）', url: 'https://example.com/starlight-echoes/pv', type: 'pv' }],
    informationStatus: 'airing', lastUpdated: '2026-07-20', sourceNote: '本站原创模拟资料，不对应真实动画。',
    watchStatus: 'watching', progress: 3, rating: 8.7,
    scores: { story: 9, characters: 8, animation: 9, music: 8, direction: 9, emotion: 8 },
    shortComment: '世界观扎实，宇宙孤独感和团队冲突都很有张力。', spoilerReview: '第三话通过失真广播揭开前代调查队的线索，伏笔开始回收。',
    recommendation: '硬核设定与人物情感平衡得很好。', audience: '科幻迷、机甲爱好者、喜欢群像叙事的观众。', warning: '专有名词较多，前两话信息密度高。',
    logs: [{ date: '2026-07-20', episode: '03', note: '失真广播段落很惊艳，继续追。' }], coverSeed: 1, featured: true,
  },
  {
    id: 'kasukabe-story', title: '春日部物语', originalTitle: '春日部ものがたり', englishTitle: 'Kasukabe Story',
    year: 2026, season: 'summer', sourceType: 'manga', genres: ['日常', '治愈', '青春'],
    synopsis: '厌倦都市生活的青年回到小城，与旧友和新邻居重新建立生活节奏。',
    staff: { director: '小林灯', seriesComposition: '三浦叶', characterDesign: '佐野美月', music: '木漏日乐团', studio: ['Soda Pictures'], cast: ['水濑葵', '高桥悠', '松本千夏'] },
    broadcast: { weekday: 'tuesday', time: '22:30', startDate: '2026-07-07', episodeCount: 12, platforms: ['模拟频道 B'], timezone: 'Asia/Tokyo' },
    externalLinks: [{ label: '模拟官网', url: 'https://example.com/kasukabe-story', type: 'official' }],
    informationStatus: 'airing', lastUpdated: '2026-07-18', sourceNote: '本站原创模拟资料。', watchStatus: 'planned', progress: 0,
    shortComment: '画面清爽，适合作为每周放松番。', recommendation: '细碎生活和人物互动自然。', audience: '日常番爱好者。', warning: '剧情冲突较弱。', logs: [], coverSeed: 2, featured: true,
  },
  {
    id: 'detective-girl-absent', title: '侦探少女不在场', originalTitle: '探偵少女は不在です', englishTitle: 'The Detective Girl Is Absent',
    year: 2026, season: 'summer', sourceType: 'novel', genres: ['悬疑', '校园', '轻喜剧'],
    synopsis: '学校里的案件总能被一名从不现身的少女破解，学生会书记开始追查她是否真实存在。',
    staff: { director: '相泽诚', seriesComposition: '南雾真', characterDesign: '久野咲', music: 'MUTE CLOCK', studio: ['Paper Moon'], cast: ['伊藤杏', '山下律'] },
    broadcast: { weekday: 'wednesday', time: '24:00', startDate: '2026-07-08', episodeCount: 12, platforms: ['模拟流媒体'], timezone: 'Asia/Tokyo' },
    externalLinks: [{ label: '模拟官网', url: 'https://example.com/detective-girl', type: 'official' }],
    informationStatus: 'airing', lastUpdated: '2026-07-19', sourceNote: '本站原创模拟资料。', watchStatus: 'watching', progress: 2, rating: 7.9,
    scores: { story: 8, characters: 8, animation: 7, music: 7, direction: 8, emotion: 7 }, shortComment: '日常谜题和身份悬念结合得很有趣。',
    recommendation: '单元案件短小，主线伏笔持续推进。', audience: '校园推理爱好者。', warning: '案件规模偏小。', logs: [], coverSeed: 3,
  },
  {
    id: 'train-end-of-time', title: '时间尽头的列车', originalTitle: '時の果ての列車', englishTitle: 'Train at the End of Time',
    year: 2026, season: 'summer', sourceType: 'original', genres: ['奇幻', '公路片', '治愈'],
    synopsis: '只在午夜出现的列车会停靠于被遗忘的记忆站台，乘客必须在终点前做出选择。',
    staff: { director: '岸本雨', seriesComposition: '岸本雨', characterDesign: '青井遥', music: 'Lumen', studio: ['Blue Rail'], cast: ['川岛雫', '石田望'] },
    broadcast: { weekday: 'friday', time: '23:30', startDate: '2026-07-10', episodeCount: 13, platforms: ['模拟频道 C', '模拟流媒体'], timezone: 'Asia/Tokyo' },
    externalLinks: [{ label: '模拟官网', url: 'https://example.com/time-train', type: 'official' }, { label: 'PV（模拟）', url: 'https://example.com/time-train/pv', type: 'pv' }],
    informationStatus: 'airing', lastUpdated: '2026-07-20', sourceNote: '本站原创模拟资料。', watchStatus: 'watching', progress: 2, rating: 8.9,
    scores: { story: 9, characters: 8, animation: 9, music: 9, direction: 9, emotion: 10 }, shortComment: '每一站都像一篇关于告别的短篇小说。',
    spoilerReview: '第二站的“空座位”实际上是乘客被遗忘的自我，设定很动人。', recommendation: '画面和配乐极具沉浸感。', audience: '喜欢治愈、奇幻和慢节奏作品的观众。', warning: '叙事舒缓。', logs: [], coverSeed: 4, featured: true,
  },
  {
    id: 'iron-defense-line', title: '钢铁防线：零界', originalTitle: '鋼鉄防衛線 ゼロボーダー', englishTitle: 'Iron Defense Line: Zero Border',
    year: 2026, season: 'summer', sourceType: 'game', genres: ['机甲', '战争', '动作'],
    synopsis: '边境防卫队在失去卫星导航后，必须依靠旧式机甲守住最后的补给走廊。',
    staff: { director: '高木阵', seriesComposition: '松泽景', characterDesign: '浦田信', music: 'HARD SIGNAL', studio: ['Forge Animation'], cast: ['内田隼', '藤田澪'] },
    broadcast: { weekday: 'saturday', time: '25:00', startDate: '2026-07-11', episodeCount: 12, platforms: ['模拟频道 D'], timezone: 'Asia/Tokyo' },
    externalLinks: [{ label: '模拟官网', url: 'https://example.com/iron-defense', type: 'official' }],
    informationStatus: 'airing', lastUpdated: '2026-07-17', sourceNote: '本站原创模拟资料。', watchStatus: 'paused', progress: 1, rating: 8.1,
    shortComment: '机甲作画硬朗，但军事术语偏多。', recommendation: '动作演出和机械细节优秀。', audience: '机甲与战争题材爱好者。', warning: '人物线开局较慢。', logs: [], coverSeed: 5,
  },
  {
    id: 'rain-library', title: '雨声图书馆', originalTitle: '雨音図書館', englishTitle: 'Library of Rain',
    year: 2026, season: 'summer', sourceType: 'manga', genres: ['恋爱', '日常', '文学'],
    synopsis: '一间只在雨天开放的图书馆，让两个习惯独处的人在借书卡上开始对话。',
    staff: { director: '森野叶', seriesComposition: '白川纱', characterDesign: '长谷川灯', music: 'Quiet Room', studio: ['Mallow'], cast: ['早见澄', '古川岚'] },
    broadcast: { weekday: 'sunday', time: '21:30', startDate: '2026-07-12', episodeCount: 12, platforms: ['模拟流媒体'], timezone: 'Asia/Tokyo' },
    externalLinks: [{ label: '模拟官网', url: 'https://example.com/rain-library', type: 'official' }],
    informationStatus: 'airing', lastUpdated: '2026-07-16', sourceNote: '本站原创模拟资料。', watchStatus: 'planned', progress: 0,
    shortComment: '氛围感很强，台词克制。', recommendation: '适合喜欢慢热恋爱的人。', audience: '文学与治愈题材观众。', warning: '节奏非常慢。', logs: [], coverSeed: 6,
  },
  {
    id: 'orbital-garden', title: '轨道花园', originalTitle: 'オービタル・ガーデン', englishTitle: 'Orbital Garden',
    year: 2026, season: 'autumn', sourceType: 'original', genres: ['科幻', '生态', '冒险'],
    synopsis: '环绕地球的农业空间站失去控制，实习生们必须在氧气耗尽前修复生态循环。',
    staff: { director: '安藤泉', seriesComposition: '鸟海律', characterDesign: '若林绫', music: 'Orbit Notes', studio: ['Nova Frame'], cast: ['佐仓真', '小野津'] },
    broadcast: { weekday: 'thursday', time: '22:00', startDate: '2026-10-08', episodeCount: 12, platforms: ['模拟频道 A'], timezone: 'Asia/Tokyo' },
    externalLinks: [{ label: '模拟官网', url: 'https://example.com/orbital-garden', type: 'official' }],
    informationStatus: 'scheduled', lastUpdated: '2026-07-15', sourceNote: '本站原创模拟资料。', watchStatus: 'planned', progress: 0, coverSeed: 7, featured: true,
    recommendation: '生态设定和封闭空间危机值得期待。', audience: '近未来科幻爱好者。', warning: '尚未播出。', logs: [],
  },
  {
    id: 'witch-of-glass-city', title: '玻璃城的魔女', originalTitle: '硝子都市の魔女', englishTitle: 'Witch of the Glass City',
    year: 2026, season: 'autumn', sourceType: 'novel', genres: ['奇幻', '悬疑', '都市'],
    synopsis: '所有建筑都能映出过去的城市里，一名修复玻璃的少女被卷入记忆盗窃事件。',
    staff: { director: '木岛冬', seriesComposition: '一宫司', characterDesign: '苍井雪', music: 'Prism Echo', studio: ['Paper Moon'], cast: ['高桥澪', '东山陆'] },
    broadcast: { weekday: 'saturday', time: '23:30', startDate: '2026-10-10', episodeCount: 12, platforms: ['模拟流媒体'], timezone: 'Asia/Tokyo' },
    externalLinks: [{ label: '模拟官网', url: 'https://example.com/glass-witch', type: 'official' }],
    informationStatus: 'scheduled', lastUpdated: '2026-07-12', sourceNote: '本站原创模拟资料。', watchStatus: 'planned', progress: 0, coverSeed: 8,
    recommendation: '视觉概念突出。', audience: '都市奇幻观众。', warning: '尚未播出。', logs: [],
  },
  {
    id: 'after-school-orbit', title: '放学后的轨道', originalTitle: '放課後オービット', englishTitle: 'After-school Orbit',
    year: 2027, season: 'winter', sourceType: 'manga', genres: ['校园', '科幻', '社团'],
    synopsis: '废部边缘的天文社偶然接收到来自未来的校园广播。',
    staff: { director: '佐藤灯', seriesComposition: '远野优', characterDesign: '神谷蓝', music: 'Night Bell', studio: ['Soda Pictures'], cast: ['田中穗', '井上泉'] },
    broadcast: { weekday: 'wednesday', time: '22:30', startDate: '2027-01-06', episodeCount: 12, platforms: ['模拟频道 B'], timezone: 'Asia/Tokyo' },
    externalLinks: [{ label: '模拟官网', url: 'https://example.com/after-school-orbit', type: 'official' }],
    informationStatus: 'announced', lastUpdated: '2026-07-11', sourceNote: '本站原创模拟资料。', watchStatus: 'planned', progress: 0, coverSeed: 9,
    recommendation: '校园社团与时间通信题材。', audience: '青春科幻观众。', warning: '远期企划。', logs: [],
  },
  {
    id: 'nameless-citadel', title: '无名城塞', originalTitle: '名もなき城塞', englishTitle: 'The Nameless Citadel',
    year: 2027, season: 'undecided', sourceType: 'game', genres: ['暗黑奇幻', '冒险'],
    synopsis: '失去名字的人会被城塞接纳，也会逐渐忘记自己为何而来。',
    staff: { director: '未公开', seriesComposition: '未公开', characterDesign: '未公开', music: '未公开', studio: ['待公开'], cast: [] },
    externalLinks: [{ label: '概念页（模拟）', url: 'https://example.com/nameless-citadel', type: 'official' }],
    informationStatus: 'announced', lastUpdated: '2026-07-02', sourceNote: '本站原创模拟资料。', watchStatus: 'planned', progress: 0, coverSeed: 10,
    recommendation: '仅公开概念视觉。', audience: '暗黑奇幻观众。', warning: '档期和主创未定。', logs: [],
  },
  {
    id: 'void-sorcerer', title: '虚空魔法人', originalTitle: 'ヴォイド・ソーサラー', englishTitle: 'Void Sorcerer',
    year: 2025, season: 'autumn', sourceType: 'novel', genres: ['奇幻', '战斗', '悲剧'],
    synopsis: '魔法的代价不是体力，而是施术者未来可能拥有的记忆。',
    staff: { director: '黑泽诚', seriesComposition: '月岛玲', characterDesign: '江崎绫', music: 'DUSK', studio: ['Black Iris'], cast: ['神谷苍', '石川澪'] },
    broadcast: { weekday: 'thursday', time: '24:00', startDate: '2025-10-09', episodeCount: 24, platforms: ['模拟频道 E'], timezone: 'Asia/Tokyo' },
    externalLinks: [{ label: '模拟官网', url: 'https://example.com/void-sorcerer', type: 'official' }],
    informationStatus: 'finished', lastUpdated: '2026-01-08', sourceNote: '本站原创模拟资料。', watchStatus: 'completed', progress: 24, rating: 9.2,
    scores: { story: 9, characters: 9, animation: 9, music: 10, direction: 9, emotion: 10 }, shortComment: '设定与人物命运高度统一。',
    spoilerReview: '结局将“失去未来记忆”的规则回收到主角选择上，悲剧成立。', recommendation: '完整度极高的奇幻悲剧。', audience: '喜欢重剧情作品的观众。', warning: '后半段情绪沉重。', logs: [{ date: '2025-12-25', episode: '24', note: '完结后久久缓不过来。' }], coverSeed: 11,
  },
  {
    id: 'strange-city-tales', title: '异都异闻录', originalTitle: '異都異聞録', englishTitle: 'Tales of the Strange City',
    year: 2025, season: 'summer', sourceType: 'manga', genres: ['都市怪谈', '悬疑'],
    synopsis: '城市传说会在被足够多人相信后成为现实。',
    staff: { director: '真壁司', seriesComposition: '相原树', characterDesign: '柴崎澪', music: 'NOCT', studio: ['Black Iris'], cast: ['铃木一', '渡边叶'] },
    broadcast: { weekday: 'streaming', time: '20:00', startDate: '2025-07-05', episodeCount: 12, platforms: ['模拟流媒体'], timezone: 'Asia/Tokyo' },
    externalLinks: [{ label: '模拟官网', url: 'https://example.com/strange-city', type: 'official' }],
    informationStatus: 'finished', lastUpdated: '2025-09-28', sourceNote: '本站原创模拟资料。', watchStatus: 'paused', progress: 5, rating: 7.1,
    shortComment: '画风独特，叙事略晦涩。', recommendation: '怪谈气氛强。', audience: '意识流与都市怪谈观众。', warning: '隐喻较多。', logs: [], coverSeed: 12,
  },
];

export const articles: Article[] = [
  { id: 'summer-observation', title: '2026 夏季新番观察：先看设定，再看执行', summary: '从题材分布、原创比例和前三话表现整理本季观测重点。', category: '季度观察', date: '2026-07-18', readTime: '8 分钟', tags: ['新番', '观察'], sections: [
    { heading: '本季概览', body: '科幻与日常题材表现突出，原创项目数量不多，但设定辨识度较高。' },
    { heading: '观察方法', body: '不只看第一话作画，还要关注三话内人物目标、冲突结构和制作稳定性。' },
  ] },
  { id: 'prompt-lighting', title: '动漫角色光影提示词：从光源位置开始', summary: '用光源方向、软硬程度和环境反射替代形容词堆砌。', category: 'AI 创作', date: '2026-07-12', readTime: '10 分钟', tags: ['提示词', '光影'], sections: [
    { heading: '先描述物理关系', body: '明确主光来自哪里、是否有遮挡，以及人物与背景的明暗关系。' },
    { heading: '再描述情绪', body: '在物理光照成立后，加入宁静、紧张或梦幻等氛围词。' },
  ] },
  { id: 'archive-method', title: '怎样维护一个真正会继续更新的动漫档案', summary: '把资料字段、个人记录和更新时间分开，降低长期维护成本。', category: '建站记录', date: '2026-07-05', readTime: '6 分钟', tags: ['资料库', '方法'], sections: [
    { heading: '资料和观点分层', body: '官方资料可能更新，个人评价也会变化，二者应独立维护。' },
    { heading: '记录来源和日期', body: '每次调整档期、集数和主创信息时，保留更新时间与来源说明。' },
  ] },
];

export const aiWorks: AIWork[] = [
  { id: 'star-watcher', title: '星海守望者', type: '角色设计', tool: '图像生成模型', style: '赛博朋克', date: '2026-07-16', coverSeed: 31, background: '将天文观测员与城市夜景结合。', initialPrompt: 'anime girl, cyber city, telescope', problem: '背景信息过多，人物轮廓不清晰。', adjustments: ['降低背景细节权重', '加入轮廓光', '明确望远镜位于前景'], finalPrompt: 'anime observatory keeper, clear silhouette, glowing rim light, restrained neon city, cinematic night atmosphere', relatedWorkIds: ['rain-platform'] },
  { id: 'rain-platform', title: '雨夜站台', type: '场景概念', tool: '图像生成模型', style: '清新电影感', date: '2026-07-10', coverSeed: 32, background: '练习雨水反射与留白构图。', initialPrompt: 'train station in rain, anime', problem: '画面过度拥挤，缺乏视觉中心。', adjustments: ['减少人物数量', '增加单一暖色光源', '使用大面积暗部'], finalPrompt: 'empty suburban train platform in rain, one warm vending machine light, wet reflections, quiet anime cinematic composition', relatedWorkIds: ['star-watcher'] },
  { id: 'mechanical-girl', title: '废土外骨骼少女', type: '角色设计', tool: '扩散模型', style: '工业废土', date: '2026-06-28', coverSeed: 33, background: '测试机械结构与服装的连接逻辑。', initialPrompt: 'mecha girl, wasteland, detailed armor', problem: '机械部件像装饰，缺少关节和承重逻辑。', adjustments: ['加入液压关节', '强调背部承重框架', '减少无意义装饰'], finalPrompt: 'wasteland scout wearing a practical lightweight exoskeleton, hydraulic joints, load-bearing back frame, chipped matte metal', relatedWorkIds: [] },
];

export const prompts: PromptItem[] = [
  { id: 'natural-light', name: '清新自然光', scene: '校园与日常角色', prompt: 'soft anime illustration, warm natural sunlight from side window, gentle bounced light, pastel palette, quiet everyday atmosphere', negative: 'harsh contrast, neon light, cluttered background, text, watermark', params: '4:5 · soft contrast', style: '清新日常', seed: 41 },
  { id: 'night-rain', name: '赛博朋克夜雨', scene: '都市科幻场景', prompt: 'cyberpunk street in heavy rain, restrained cyan and magenta neon, wet asphalt reflections, clear character silhouette, low angle', negative: 'daylight, oversaturated, unreadable signs, distorted hands', params: '16:9 · cinematic', style: '科幻都市', seed: 42 },
  { id: 'watercolor-book', name: '水彩绘本', scene: '童话与治愈场景', prompt: 'traditional watercolor storybook, visible paper grain, soft color bleeding, cozy forest cabin, warm window light', negative: '3d render, sharp digital edges, photorealistic', params: '1:1 · low detail', style: '水彩绘本', seed: 43 },
];

export const characterPresets: CharacterPreset[] = [
  { id: 'aria', name: '艾莉亚', identity: '遗迹守望者', world: '高魔奇幻大陆', appearance: '银白长发、异色瞳、符文长袍', personality: '冷静专注，对日常生活缺乏常识', ability: '空间折叠', background: '从失落遗迹苏醒，寻找曾与自己共同守护文明的人。', seed: 51 },
  { id: 'rayne', name: '雷恩', identity: '地下情报商', world: '近未来都市', appearance: '黑色短发、机械义肢、旧战术风衣', personality: '谨慎毒舌，但会保护弱者', ability: '神经接口追踪', background: '在企业战争后隐姓埋名，收集被删除的城市档案。', seed: 52 },
  { id: 'yuzuha', name: '柚叶', identity: '妖怪画师', world: '现代灵异小镇', appearance: '茶色双马尾、旧画板、校服外套', personality: '好奇而乐观', ability: '将看见的妖怪短暂画成实体', background: '用速写记录日常缝隙里的异常，试图找到失踪的童年朋友。', seed: 53 },
];

export const styleResearch: StyleResearch[] = [
  { name: '清新日常', visual: '柔和、明亮、低对比', colors: '低饱和蓝绿与暖白', composition: '平视、半身、人与环境互动', tags: ['治愈', '日常'], prompt: 'soft slice-of-life anime illustration, warm natural light, pastel palette', seed: 61 },
  { name: '青春校园', visual: '通透空气感与强季节特征', colors: '天空蓝、樱粉、制服中性色', composition: '走廊纵深、逆光人物', tags: ['校园', '青春'], prompt: 'youthful school anime scene, airy atmosphere, backlit corridor', seed: 62 },
  { name: '科幻都市', visual: '尺度感、光源层级、技术细节', colors: '深蓝、青色、少量霓虹', composition: '广角低机位、建筑压迫感', tags: ['科幻', '都市'], prompt: 'futuristic anime city, restrained neon, wide angle, layered lighting', seed: 63 },
  { name: '赛博朋克', visual: '高对比、雨夜反光、密集标识', colors: '青、洋红、深黑', composition: '低视点与透视汇聚', tags: ['赛博', '夜景'], prompt: 'cyberpunk anime street, rain reflections, strong silhouette', seed: 64 },
  { name: '奇幻冒险', visual: '宏大远景、遗迹和自然奇观', colors: '大地色、蓝绿、金色光源', composition: '人物小比例展示世界', tags: ['奇幻', '冒险'], prompt: 'epic anime fantasy landscape, ancient ruins, majestic light', seed: 65 },
  { name: '暗黑幻想', visual: '阴冷、哥特、强明暗分区', colors: '黑、暗红、冷灰', composition: '居中与对称增强宿命感', tags: ['暗黑', '悲剧'], prompt: 'dark fantasy anime, gothic architecture, dramatic rim light', seed: 66 },
  { name: '水彩绘本', visual: '纸张纹理、色彩晕染、边缘柔软', colors: '透明暖色与植物绿', composition: '扁平块面、留白', tags: ['绘本', '童话'], prompt: 'traditional watercolor storybook, visible paper texture', seed: 67 },
  { name: '复古动画', visual: '赛璐璐平涂、录像噪点、清晰线稿', colors: '高饱和平涂色', composition: '4:3 镜头和强特写', tags: ['怀旧', '复古'], prompt: '1990s retro anime, cel shading, vhs texture, flat colors', seed: 68 },
];
