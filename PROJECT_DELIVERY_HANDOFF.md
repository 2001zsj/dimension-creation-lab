# PROJECT DELIVERY HANDOFF

更新时间：2026-07-24。本文是当前唯一主交接文档，依据 GitHub `main` 最新代码和 `public/data/age-latest.json` 编写。旧版“播放数据集中于单一作品、需要重新同步”的结论已归档为过期背景，不适用于当前快照。

## 当前快照

| 指标 | 当前值 |
| --- | ---: |
| AGE itemCount | 15,751 |
| 分类分页 | 440 |
| detailCount | 200 |
| playPageCount | 199 |
| playAnimeCount | 199 |
| playSamplingStatus | distributed |

## 本次实际修改

- `scripts/age-parser.mjs`：分集 URL 去重；重复“立即播放”与规范分集时保留规范条目。
- `scripts/build-age-data.mjs`：生成轻量 AGE 搜索索引；详情元数据与分集拆分为独立分片。
- `src/ageStaticData.ts`：静态请求失败、网络异常、JSON 损坏均清理缓存；详情按需加载分集分片。
- `src/dataRegistry.tsx`：状态区分 `loading`、`live-api`、`static-snapshot`、`offline-fallback`、`error`；刷新清理 AGE 静态缓存；接入按需搜索索引。
- `src/components/Cover.tsx`、`scripts/cache-yuc-covers.mjs`：固定 YUC 封面构建缓存；保留站内缓存、代理、原图和渐变占位降级。
- `scripts/create-sites-worker.mjs`：图片代理仅允许 HTTPS 白名单；逐跳手动重定向校验；限制图片 MIME、禁止 SVG、限制实际响应流 8 MiB、保留超时和安全响应头。
- `src/main.tsx`：增加全局 React Error Boundary。
- `eslint.config.js`、`playwright.config.mjs`、`tests/e2e/smoke.spec.mjs`：增加 lint 和 Playwright 回归入口。
- `scripts/test-worker.mjs`、`scripts/test-image-proxy.mjs`：增加 Worker API 和图片代理自动冒烟测试。
- `README.md`、`PROJECT_HANDOFF.md`、`TASKS.md`：统一当前数据、测试数量和部署边界。

## 验证结果

- `npm ci`：本次依赖变更使用固定的本地 npm cache 完成安装；应在干净网络环境再次执行并保存完整原始输出。
- `npm run typecheck`：通过。
- `npm run lint`：通过，0 error、0 warning。
- `npm test`：通过，24/24。
- `npm run build`：通过；生成 440 分类页、256 条目分片、200 详情元数据、199 播放组。
- 所有要求的 `node --check`：通过，包括 `dist/server/index.js`。
- `npm run test:worker`：通过；检查 AGE 快照 API、详情路由、非法图片域名和方法限制。
- `node scripts/test-image-proxy.mjs`：通过；覆盖正常图片、非法域名、越权重定向、非图片、超大实际响应和超时。
- `npm run test:e2e`：尚未完成浏览器安装和完整多尺寸回归，不能记录为通过。

## 图片状态

本次构建尝试缓存 72 个 YUC 封面，但当前执行环境访问 `i0.hdslb.com` 全部失败（0 成功、72 不可用）。因此“构建时缓存”代码已落地，但 72 个静态文件尚未形成；这是尚存风险，不应写成图片问题已全部解决。AGE 图片仍使用 Worker 白名单代理与最终占位图降级。

## 部署边界

- OpenAI Sites Worker：已完成本地生成和 Worker API 自动测试；线上 Worker 尚未在本次变更中验证。
- Vercel / Netlify：只验证静态构建产物能力；不能把静态预览当作图片代理或完整 Worker API 已通过。
- `dist/data/age-latest.json`：构建后不存在；完整快照仅由 Worker 以 gzip 资产形式使用。
- `dist/server/index.js`：2,944,746 字节。
- 固定数据文件不使用一年 immutable 缓存；动态或固定 `/data/` 资源应使用 no-cache 策略。

## 未完成事项与风险

1. 需要在可访问 `i0.hdslb.com` 的网络环境执行 `npm run cache:covers`，确认 72 个封面实际生成，并再次完整验证。
2. 需要安装 Playwright Chromium，完成 1440×900、1280×800、768×1024、430×932、390×844、375×812 以及首页、搜索、档案、YUC/AGE 详情、资源、写作、审查和移动菜单回归。
3. 需要在 OpenAI Sites Worker、Vercel 预览和 Netlify 静态环境分别做线上冒烟；当前不能据此宣布正式发布。
4. ESLint 当前覆盖 JavaScript/MJS 脚本与测试；TS/TSX 由 typecheck 覆盖，后续可在 TypeScript 6 兼容的 ESLint parser 可用后扩大 lint 范围。

## 发布判断

当前可以进入本地/测试部署，但不能记录为“正式发布成功”。正式发布前必须补齐 Playwright 多尺寸回归、线上 Worker/API 验证和 YUC 封面缓存成功证据。
