# 次元生成局（Dimension Creation Lab）

动漫公开资料库、新番雷达、放送日历与 AI 创作实验站。项目使用 React、TypeScript、Vite 和 React Router。

## 本地运行

```bash
npm ci
npm run dev
```

生产构建：

```bash
npm run typecheck
npm run build
```

## 新番资料源

站点默认读取長門番堂 `202607` 新番表。OpenAI Sites Worker 的资料期可在构建时通过环境变量调整：

```bash
YUC_PERIOD=202607 npm run build
```

`YUC_PERIOD` 必须使用 `YYYYMM` 格式。前端统一请求 `/api/anime/current`，不再把具体资料期写入页面接口地址。

## 数据边界

- 公开资料条目标记为 `recordSource: "source"`，不会伪装成个人观看进度、个人评分或观看日志。
- 只有明确标记为 `recordSource: "personal"` 的条目才展示个人状态和日志。
- 本站不提供动画播放、下载或未经授权的资源。

## 交接

主要优化和后续验证事项见 [`CODEX_HANDOFF.md`](./CODEX_HANDOFF.md)。
