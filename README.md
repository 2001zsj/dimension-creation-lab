# 次元生成局（Dimension Creation Lab）

基于 React、TypeScript、Vite 和 React Router 的动漫资料、放送日历、资源索引、写作与数据审查站点。

## 当前数据架构

前端只使用一个 `DataRegistryProvider`。YUC 与 AGE 数据统一进入同一注册表，首页、全局搜索、动漫档案、详情页、资源中心、写作中心和数据审查页读取同一份数据，避免重复请求和版本不一致。

- **YUC**：`/api/anime/current`，解析季度新番表、放送安排及页面中实际存在的 STAFF、CAST、官网和 PV 等字段。
- **AGE**：`/api/age/current?category=<分类>&page=<页码>`，按分类、按页读取，不会在一次前台请求中同步抓取全部分页。
- **AGE 详情**：`/api/age/detail/:id`。
- **AGE 播放页解析**：`/api/age/play?source=<URL>`，保留原始媒体地址、来源页、线路、集数、授权状态和可用性状态。
- **同步源快照**：`public/data/age-latest.json`。构建时由 `scripts/build-age-data.mjs` 生成分类页、作品索引、详情和播放资源分片；浏览器只按需读取小文件，不再下载整份 28 MB 快照。Worker 使用压缩快照提供分页与单条 API。

当前 AGE 分类映射：日漫、国漫、动态漫、剧场、特摄和美漫。

## 数据正确性规则

- 空字段直接留空，前台不使用“未公开”“资料待补全”等占位内容填充。
- 抓取失败、空数组和占位值不得覆盖已有有效字段。
- 所有资源保留作品 ID、资源类型、来源页、抓取时间、授权状态和可用性状态。
- 未确认来源或授权的数据可以记录，但必须标记为 `unknown`、`unverified` 或 `unchecked`，不得伪装成官方资源。
- 同一作品的 YUC 与 AGE 记录只在规范化标题一致且年份不冲突时自动合并；年份冲突会保留为独立条目并进入冲突报告。
- AGE 缺失年份不会自动写成当前年份。
- 公开资料不会自动生成个人追番状态、评分、进度或观看日志。

## 本地运行

```bash
npm ci
npm run dev
```

检查和构建：

```bash
npm run typecheck
npm test
npm run build
```

构建 YUC 指定资料期：

```bash
YUC_PERIOD=202607 npm run build
```

`YUC_PERIOD` 使用 `YYYYMM` 格式。

## AGE 快照同步

同步六类作品卡片、首页、周更、新番专题和热榜：

```bash
npm run sync:age
```

继续采集详情、分集线路和播放页：

```bash
npm run sync:age:full
```

常用参数：

```bash
node scripts/sync-age.mjs \
  --categories=japan,china \
  --concurrency=2 \
  --delay=250 \
  --max-pages=20 \
  --details \
  --max-details=200 \
  --play \
  --max-play=500
```

同步器支持断点续传、分页失败记录、重试、请求超时和原子快照写入。播放页候选采用跨作品轮询，避免先耗尽一部长篇作品。完整详情与播放页同步数据量较大，应根据上游站点承载能力设置并发、延迟和上限。

构建流程会生成 `public/data/age/` 分片；Worker 生成完成后会从最终 `dist` 删除未压缩的完整快照，避免静态部署同时携带两份大数据。

## 主要页面

- `/anime`：统一动漫档案。
- `/anime/:id`：YUC／AGE 统一详情；AGE 条目按需载入详情、线路和播放页资源。
- `/resources`：资源中心，支持来源、资源类型、分类、关键词和分页。
- `/writing`：从注册表真实字段生成作品资料、季度简报和更新公告草稿。
- `/audit`：检查字段覆盖、占位内容、日期、来源、资源绑定、URL 和跨来源冲突。

## 部署支持范围

- **本地开发**：`npm run dev` 使用同一套 `DataRegistryProvider`，支持 YUC、AGE 静态分片和回退快照。
- **Netlify / Vercel 静态部署**：支持浏览器端的 YUC 静态数据与 AGE 分页、详情、播放资源分片；不提供完整 API 代理能力，不能把它当作完整 API 部署。
- **Worker 部署**：运行 `scripts/create-sites-worker.mjs` 生成的 Worker，支持 YUC 和 AGE 的完整 API 路由，并以内嵌 gzip 形式提供完整快照；固定名 `/data/age-latest.json` 使用 `no-cache`，分片文件才使用 immutable 缓存。
- **快照体积**：浏览器不会请求完整 28 MB 未压缩快照；构建后的静态 `dist` 会移除未压缩完整快照，Worker 只嵌入 gzip 编码内容。

如果目标平台不能运行 Worker/API 代理，应明确标注为“静态分片模式”，不得宣称完整 API 功能可用。

## 验证说明

本次逻辑整改通过 19 项项目测试、解析器和构建脚本语法检查、真实 `npm ci`、TypeScript 类型检查、Vite 生产构建和 Worker 产物检查。完整实施情况、验证边界和交接结果见 [`DIMENSION_LAB_RECTIFIED_HANDOFF.md`](./DIMENSION_LAB_RECTIFIED_HANDOFF.md)。历史分报告保存在 `docs/archive/`。

## 仓库维护规则

- `public/data/age-latest.json` 是构建和 Worker API 使用的源快照，需要保留。
- `public/data/age/` 是可再生成的静态分片，不提交 Git；`npm run dev` 和 `npm run build` 会自动生成。
- `dist/`、浏览器截图、验证日志、临时 ZIP 和历史交接报告不进入主仓库。
- 当前项目状态只以 `PROJECT_DELIVERY_HANDOFF.md` 为准。
