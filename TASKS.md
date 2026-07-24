# TASKS

## 已完成

- [x] AGE 当前快照统计统一为 15,751 条、440 个分类分页、200 个详情、199 个播放页、199 个播放作品，采样状态 `distributed`。
- [x] AGE 分集按 URL 去重，详情元数据和分集列表拆分，保留线路与分页。
- [x] 静态请求失败后清理缓存并可重试；Registry 刷新清理 AGE 静态缓存。
- [x] 全局搜索接入轻量 AGE 搜索索引，命中后按 ID 按需加载。
- [x] 图片代理 HTTPS 白名单、逐跳重定向校验、MIME 白名单、流式大小限制、超时和安全头。
- [x] Worker API 自动冒烟、图片代理六类场景自动测试。
- [x] ESLint、Playwright 配置和全局 Error Boundary 已加入。
- [x] 24/24 单元与解析器测试通过；typecheck、lint（0 warning）、build 和 node --check 通过。

## 待完成

- [ ] 在可访问 i0.hdslb.com 的网络中成功缓存 72 个 YUC 封面。
- [ ] 安装 Chromium 并完成六种尺寸的 Playwright 回归，保存 HTML 报告和截图。
- [ ] 分别验证 OpenAI Sites Worker、Vercel 静态预览、Netlify 静态部署的线上能力边界。
- [ ] 在 TypeScript 6 兼容 parser 可用后扩大 ESLint 到 TS/TSX。
