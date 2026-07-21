import { Database, Palette, RadioTower, ShieldCheck } from 'lucide-react';

export function AboutPage() {
  return (
    <div className="container page-top page-bottom about-page">
      <div className="page-title-grid"><div><span className="eyebrow">ABOUT THE LAB</span><h1>关于次元生成局</h1><p>一个匿名的动漫兴趣资料库与 AI 创作记录站。</p></div><div className="page-title-icon"><ShieldCheck size={34} /></div></div>
      <div className="about-grid"><article><Database /><h2>资料档案</h2><p>把季度、放送、制作信息和个人观看记录分层保存，便于长期维护。</p></article><article><RadioTower /><h2>新番观测</h2><p>按当前季度、下一季度、远期企划和档期未定进行分组。</p></article><article><Palette /><h2>创作实验</h2><p>整理提示词、角色设定、风格研究与作品复盘，不只展示最终图片。</p></article></div>
      <section className="privacy-card"><h2>隐私与版权原则</h2><p>本站不展示真实姓名、年龄、所在地、工作单位、联系方式或个人照片。动漫资料与播出安排均为原创模拟数据；不提供动画播放、下载或未经授权的资源。</p></section>
    </div>
  );
}
