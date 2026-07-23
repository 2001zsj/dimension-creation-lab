# 次元生成局（Dimension Creation Lab）

基于 React、TypeScript、Vite 和 React Router 的动漫资料、放送日历、资源索引、写作与数据审查站点。

## 当前数据架构

前端只使用一个 `DataRegistryProvider`。YUC 与 AGE 数据统一进入同一注册表，首页、全局搜索、动漫档案、详情页、资源中心、写作中心和数据审查页读取同一份数据，避免重复请求和版本不一致。

- **YUC**：`/api/anime/current`，解析季度新番表、放送安排及页面中实际存在的 STAFF、CAST、官网和 PV 等字段。
- **AGE**：`/api/age/current?category=<分类>&page=<页码>`，按分类、按页读取，不会在一次前台请求中同步抓取全部分页。
- **AGE 详情**：`/api/age/detail/:id`。
- **AGE 播放页解析**：`/api/age/play?source=<URL>`，保留原始媒体地址、来源页、线路、集数、授权状态和可用性状态。
- **可选离线快照**：`public/data/age-latest.json`。Worker 优先读取已成功同步的快照，缺页时再按页读取上游。

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

同步器支持断点续传、分页失败记录、重试、请求超时和原子快照写入。完整详情与播放页同步数据量较大，应根据上游站点承载能力设置并发、延迟和上限。

## 主要页面

- `/anime`：统一动漫档案。
- `/anime/:id`：YUC／AGE 统一详情；AGE 条目按需载入详情、线路和播放页资源。
- `/resources`：资源中心，支持来源、资源类型、分类、关键词和分页。
- `/writing`：从注册表真实字段生成作品资料、季度简报和更新公告草稿。
- `/audit`：检查字段覆盖、占位内容、日期、来源、资源绑定、URL 和跨来源冲突。

## 验证说明

本次修改已通过项目脚本测试、解析器语法检查、Worker 生成与语法检查，以及不依赖第三方包的临时严格 TypeScript 内部检查。当前执行环境无法从 npm 镜像下载依赖，因此真实 Vite 构建仍需在网络正常环境执行。完整实施情况、验证边界和 Codex 后续任务统一见 [`PROJECT_DELIVERY_HANDOFF.md`](./PROJECT_DELIVERY_HANDOFF.md)。历史分报告保存在 `docs/archive/`。
