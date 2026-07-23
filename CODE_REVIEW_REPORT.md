# V3 第二阶段验证报告

## 验证结论

本轮已完成真实依赖安装、类型检查、测试、生产构建，以及 AGE 首页、分类页、周更表、新番表、详情页和播放页的 Playwright HTML fixtures 采集。AGE 解析器独立位于 `scripts/age-parser.mjs`，只根据已保存 fixture 验证过的结构提取数据。

播放页中的媒体地址只保留为 `unknown` 授权、`unchecked` 可用性，并带有作品 ID、来源站点和来源页面；解析器不会把它们注册为本站播放入口。

## 已执行命令

```text
npm ci
npm run typecheck
npm run test
npm run build
node --check scripts/age-parser.mjs
node --check scripts/create-sites-worker.mjs
```

结果：以上命令均通过。项目新增正式 `npm run test` 入口，覆盖 5 个测试场景。

## Fixture

真实 fixture 位于 `tests/fixtures/age/`：

- `home.html`
- `category.html`
- `week.html`
- `topic.html`
- `detail.html`
- `play.html`

采集页面的源站均为 `https://cn.agekkkk.com`，详情 fixture 使用作品 ID `38241bf798cf918917082c8e`，播放 fixture 使用真实的第 1 集、第 3 线路地址。

## 解析与安全检查

- 作品卡从真实 `href`、`title` 和 `data-original` 提取，保留来源页和源站。
- 周更表按真实 `data-key` 区块映射星期，不猜测缺失的星期。
- 详情页按作品 ID约束线路和分集地址，避免相邻作品串位。
- 详情页提取真实年份、语言、地区、导演、线路和分集。
- 播放页提取当前集数、线路、下一集和媒体地址，但默认标记为未验证，不进入正式播放功能。
- 缺少作品身份、播放器对象或必要字段时返回空结果，不生成占位数据。

## 成品数据接口

`scripts/create-sites-worker.mjs` 已将通过 fixture 测试的 AGE 解析器接入只读接口 `/api/age/current`。接口实时读取 AGE 日漫分类页，只返回作品元数据、详情链接、封面、语言、年份、集数标记、状态和来源页；解析结果为空或失败时返回 502，不覆盖现有 yuc 数据，也不向正式页面提供播放或下载入口。

## 本轮修复

- 增加 `npm run test` 脚本，避免测试命令缺失。
- 新增独立 AGE 解析器和 fixture 单元测试。
- 按真实页面结构处理 AGE 新番表的 `topicdetail-*` 条目。
- 按真实周更页的实际星期覆盖范围修正回归断言。
- 按真实详情页四线路合计 61 个分集链接修正资源数量断言。
- 修复 Worker 打包时 AGE 解析器与 yuc 解析器函数名冲突，并移除多余模板字面量转义；生成的 `dist/server/index.js` 已通过 Node 语法检查。

## V3 第一阶段恢复与 AGE 第二阶段合并

本次以当前工作区可追溯的 V3/AGE 源码为基础恢复了第一阶段能力边界：

- `src/dataQuality.ts`：资源状态、热度指标、字段来源、占位过滤、字段覆盖率和安全合并。
- `src/dataRegistry.tsx`：YUC/AGE 统一注册表；AGE 条目使用 `age-` 命名空间，避免与 YUC ID 串位。
- `ResourceCenterPage`、`WritingStudioPage`、`DataAuditPage` 及 `/resources`、`/writing`、`/audit` 路由。
- `tests/data-quality.test.mjs` 和 AGE 分页断言；已有 YUC 详情解析与 AGE 六类真实 fixtures 未删除。

AGE Worker 现在先读取日漫分类第一页获取分页总数，再以 8 页批次采集 `/type/1.html` 至 `/type/1-181.html`，并额外采集首页、周更表和新番表。详情与播放通过独立只读接口采集；播放媒体只保留 `unverified` 审查状态并移除可用 URL，不进入前台播放功能。

### 真实覆盖统计

2026-07-23 通过真实网络采集验证：181/181 页，原始卡片 6494 条，按 AGE ID 去重后 6479 条；标题 6479/6479，封面 6479/6479，来源页 181/181。首页、周更、新番、详情、播放 fixtures 均有覆盖；当前统一合并冲突为 0，AGE 使用独立命名空间，不覆盖 YUC 有效记录。

### 未完成项

- 当前 AGE 采集为请求时实时抓取，未增加持久化数据库；单次源站不可用时接口返回 502，前端继续保留旧 YUC 数据。
- 热度指标类型已恢复，但 AGE 当前页面没有可验证热度字段，因此不填入热度数值。
- 播放页仅做来源、身份和线路审查，不提供播放、下载或盗版资源。
