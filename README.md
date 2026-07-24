# Dimension Creation Lab

Dimension Creation Lab 是一个 YUC + AGE 的动漫资料与创作工作台。当前代码以 GitHub `main` 最新合并结果为基线；数据层由 `DataRegistryProvider` 统一管理。

## 当前数据快照

`public/data/age-latest.json` 当前统计：

- `itemCount`: 15,751
- 分类分页: 440
- `detailCount`: 200
- `playPageCount`: 199
- `playAnimeCount`: 199
- `playSamplingStatus`: `distributed`

构建会生成 AGE 分类分页、条目分片、详情元数据分片、分集分片、播放分组和轻量搜索索引。浏览器按需加载，不在启动时读取完整 AGE 快照。

## 本地命令

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm run build
npm run test:worker
npm run test:e2e
npm run dev
```

`npm run build` 会尝试把固定的 YUC `i0.hdslb.com` 封面缓存到 `public/assets/covers/yuc/`；缓存失败时不会阻断构建，浏览器仍按“站内缓存 → Worker 图片代理 → 原图 → 渐变占位”顺序降级。

## 数据与 API

- YUC: `/api/anime/current`
- AGE 分类: `/api/age/current?category=japan&page=1`
- AGE 条目: `/api/age/item/:id`
- AGE 详情: `/api/age/detail/:id`
- AGE 播放: `/api/age/play?source=...`
- 图片代理: `/api/image?url=...`

图片代理只接受 HTTPS、白名单域名和 JPEG/PNG/WebP/AVIF/GIF，禁止 SVG；重定向逐跳重新校验，响应流有 8 MiB 上限、超时、`nosniff` 和缓存控制。

## 部署能力边界

- OpenAI Sites Worker：支持完整 YUC/AGE API、图片代理和 gzip AGE 快照。
- Vercel / Netlify 静态模式：支持前端、YUC 本地数据和 AGE 静态分片；不等同于 Worker API，也不能据此证明图片代理可用。
- `dist/server/index.js` 是 Worker 构建产物；完整快照只以 gzip 形式嵌入 Worker。静态构建会移除 `dist/data/age-latest.json`，固定数据文件使用 `no-cache`，不使用一年 immutable 缓存。

当前主交接文档为 [`PROJECT_DELIVERY_HANDOFF.md`](./PROJECT_DELIVERY_HANDOFF.md)。`PROJECT_HANDOFF.md` 仅保留为兼容指针，不是另一份独立验收结论。
