import { Check, Copy, Dice5, Fingerprint, Palette, RefreshCcw, Sparkles, Type } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { characterPresets, prompts, styleResearch } from '../data';
import { Badge } from '../components/Badge';
import { copyToClipboard } from '../utils';
import { Cover } from '../components/Cover';

type LabTab = 'prompts' | 'characters' | 'styles';

interface CharacterForm {
  name: string;
  identity: string;
  world: string;
  appearance: string;
  personality: string;
  ability: string;
  background: string;
}

const emptyForm: CharacterForm = { name: '', identity: '', world: '', appearance: '', personality: '', ability: '', background: '' };
const fieldLabels: Record<keyof CharacterForm, string> = {
  name: '姓名', identity: '身份', world: '世界观', appearance: '外貌', personality: '性格', ability: '能力', background: '背景故事',
};
const randomNames = ['星野', '凛川', '月见', '诺亚', '无名旅人'];
const randomTraits = {
  identity: ['轨道维修师', '遗迹译码员', '边境邮差', '异常气象观察员', '地下舞台导演'],
  world: ['云层之上的浮岛群', '近未来海底都市', '被植物覆盖的旧世界', '妖怪与人共居的小镇', '跨越星门的航海时代'],
  appearance: ['银灰短发、旧护目镜、轻型工作服', '黑色长发、琥珀瞳、深蓝斗篷', '茶色卷发、机械义肢、褪色夹克'],
  personality: ['冷静而好奇', '外向但害怕孤独', '谨慎毒舌却非常可靠', '温和、固执、记忆力惊人'],
  ability: ['读取机械留下的情绪', '短暂冻结声音', '绘制可供穿越的地图', '与城市照明系统对话'],
  background: ['从废弃车站醒来，只记得一串不存在的列车编号。', '为了寻找失踪的导师，开始收集各地异常天气档案。', '曾是城市维护队成员，离开后靠修理旧机器旅行。'],
};

export function AILabPage() {
  const location = useLocation();
  const [tab, setTab] = useState<LabTab>('prompts');
  const [copied, setCopied] = useState<string | null>(null);
  const [form, setForm] = useState<CharacterForm>(emptyForm);
  const [generated, setGenerated] = useState<CharacterForm | null>(null);

  useEffect(() => {
    if (!location.hash.startsWith('#prompt-')) return;
    setTab('prompts');
    const timer = window.setTimeout(() => document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
    return () => window.clearTimeout(timer);
  }, [location.hash]);

  const pick = <T,>(items: T[]): T => items[Math.floor(Math.random() * items.length)];
  const completeCharacter = (): CharacterForm => ({
    name: form.name || pick(randomNames),
    identity: form.identity || pick(randomTraits.identity),
    world: form.world || pick(randomTraits.world),
    appearance: form.appearance || pick(randomTraits.appearance),
    personality: form.personality || pick(randomTraits.personality),
    ability: form.ability || pick(randomTraits.ability),
    background: form.background || pick(randomTraits.background),
  });
  const randomFill = () => setForm(completeCharacter());
  const generate = () => {
    const completed = completeCharacter();
    setForm(completed);
    setGenerated(completed);
  };
  const copyText = async (id: string, text: string) => {
    if (await copyToClipboard(text)) {
      setCopied(id);
      window.setTimeout(() => setCopied(null), 1600);
    }
  };
  const generatedText = useMemo(() => generated
    ? (Object.entries(generated) as Array<[keyof CharacterForm, string]>).map(([key, value]) => `${fieldLabels[key]}：${value}`).join('\n')
    : '', [generated]);

  const tabs = [
    { id: 'prompts', label: '提示词研究', icon: Type },
    { id: 'characters', label: '角色设定组合器', icon: Fingerprint },
    { id: 'styles', label: '风格图鉴', icon: Palette },
  ] as const;

  return (
    <div className="container page-top page-bottom">
      <div className="page-title-grid"><div><span className="eyebrow">AI CREATIVE LAB</span><h1>AI 创作实验室</h1><p>提示词、角色设定组合与视觉风格研究集中在同一工作台；角色功能为本地随机组合，不冒充真实 AI 生成。</p></div><div className="page-title-icon"><Sparkles size={34} /></div></div>
      <div className="lab-tabs" role="tablist" aria-label="选择实验室功能">{tabs.map((item) => (
        <button
          id={`lab-tab-${item.id}`}
          role="tab"
          aria-selected={tab === item.id}
          aria-controls={`lab-panel-${item.id}`}
          tabIndex={tab === item.id ? 0 : -1}
          className={tab === item.id ? 'active' : ''}
          onClick={() => setTab(item.id)}
          key={item.id}
        ><item.icon size={17} />{item.label}</button>
      ))}</div>

      {tab === 'prompts' && <div id="lab-panel-prompts" role="tabpanel" aria-labelledby="lab-tab-prompts" className="prompt-list">{prompts.map((prompt) => <article id={`prompt-${prompt.id}`} key={prompt.id} className="prompt-card"><Cover seed={prompt.seed} className="prompt-cover" label={`${prompt.name}提示词视觉占位图`} /><div><div className="row between wrap"><div><Badge tone="purple">{prompt.style}</Badge><h2>{prompt.name}</h2><p>{prompt.scene}</p></div><button className="button secondary compact" onClick={() => copyText(prompt.id, prompt.prompt)}>{copied === prompt.id ? <Check size={16} /> : <Copy size={16} />}{copied === prompt.id ? '已复制' : '复制提示词'}</button></div><h3>正向提示词</h3><pre>{prompt.prompt}</pre><h3>负面提示词</h3><pre className="negative">{prompt.negative}</pre><small>{prompt.params}</small></div></article>)}</div>}

      {tab === 'characters' && <div id="lab-panel-characters" role="tabpanel" aria-labelledby="lab-tab-characters" className="character-lab">
        <section className="character-form card-panel">
          <div className="row between"><div><span className="eyebrow">CHARACTER COMPOSER</span><h2>原创角色设定</h2><p className="muted">根据本地预设随机组合字段，不会调用外部模型。</p></div><Dice5 /></div>
          {(Object.keys(emptyForm) as Array<keyof CharacterForm>).map((key) => <label key={key}><span>{fieldLabels[key]}</span>{key === 'background' ? <textarea value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} placeholder={`输入${fieldLabels[key]}`} /> : <input value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} placeholder={`输入${fieldLabels[key]}`} />}</label>)}
          <div className="row gap-sm wrap"><button className="button secondary" onClick={randomFill}><Dice5 size={16} />随机补全</button><button className="button secondary" onClick={() => { setForm(emptyForm); setGenerated(null); }}><RefreshCcw size={16} />清空</button><button className="button primary" onClick={generate}>组合角色设定</button></div>
        </section>
        <section className="character-preview card-panel">{generated ? <><Cover seed={generated.name.length * 7} className="character-cover" label={`${generated.name}角色视觉占位图`} /><div className="row between"><div><span className="eyebrow">COMPOSED PROFILE</span><h2>{generated.name}</h2></div><button className="icon-button" aria-label={copied === 'character' ? '角色设定已复制' : '复制角色设定'} onClick={() => copyText('character', generatedText)}>{copied === 'character' ? <Check /> : <Copy />}</button></div><div className="character-data"><p><strong>身份</strong>{generated.identity}</p><p><strong>世界</strong>{generated.world}</p><p><strong>外貌</strong>{generated.appearance}</p><p><strong>性格</strong>{generated.personality}</p><p><strong>能力</strong>{generated.ability}</p><p><strong>背景</strong>{generated.background}</p></div></> : <div className="empty-panel large">填写部分信息，或使用随机补全后组合角色设定。</div>}</section>
        <section className="preset-section"><h2>原创角色示例</h2><div className="preset-grid">{characterPresets.map((character) => <article key={character.id}><Cover seed={character.seed} className="preset-cover" label={`${character.name}示例视觉占位图`} /><h3>{character.name}</h3><span>{character.identity}</span><p>{character.background}</p></article>)}</div></section>
      </div>}

      {tab === 'styles' && <div id="lab-panel-styles" role="tabpanel" aria-labelledby="lab-tab-styles" className="style-grid">{styleResearch.map((style) => <article key={style.name} className="style-card"><Cover seed={style.seed} className="style-cover" label={`${style.name}风格视觉占位图`} /><div><h2>{style.name}</h2><p><strong>视觉</strong>{style.visual}</p><p><strong>配色</strong>{style.colors}</p><p><strong>构图</strong>{style.composition}</p><div className="row gap-sm wrap">{style.tags.map((tag) => <Badge key={tag}>{tag}</Badge>)}</div><pre>{style.prompt}</pre></div></article>)}</div>}
    </div>
  );
}
