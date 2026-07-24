import { Component, StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles.css';

class AppErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) return <div className="container page-top page-bottom"><div className="empty-panel large"><h1>页面暂时无法显示</h1><p>当前页面出现异常，请刷新后重试。</p><button className="button primary" type="button" onClick={() => window.location.reload()}>重新加载</button></div></div>;
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter><AppErrorBoundary><App /></AppErrorBoundary></BrowserRouter>
  </StrictMode>,
);
