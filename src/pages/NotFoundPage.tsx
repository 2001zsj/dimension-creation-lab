import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return <div className="container page-top page-bottom"><div className="empty-panel large not-found"><span>404</span><h1>信号没有抵达这里</h1><p>页面可能已经移动，或者地址输入有误。</p><Link className="button primary" to="/">返回首页</Link></div></div>;
}
