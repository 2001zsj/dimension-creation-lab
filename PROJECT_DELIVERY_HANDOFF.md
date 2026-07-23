# 次元生成局：项目总交付与后续交接说明

更新时间：2026-07-23  
适用项目：Dimension Creation Lab  
本文件是当前项目的**唯一主交接文档**。实施情况、代码审查、验证结果、已知限制和后续任务均以此文件为准。历史分报告已移至 `docs/archive/`，仅用于追溯。

---

## 一、项目定位

本项目基于 React、TypeScript、Vite 和 React Router，目标是建设一个统一的动漫资料、放送日历、资源索引、写作辅助和数据质量审查站点。

当前接入的主要公开数据来源：

- **YUC**：季度新番、放送安排、STAFF、CAST、官网、PV 等资料。
- **AGE**：动漫分类、周更表、新番专题、详情、线路、分集及播放资源等资料。

允许纳入的数据范围包括：

- 播放地址；
- 下载地址；
- 网盘资源；
- 字幕资源；
- 镜像及防走丢链接；
- 来源或授权状态尚未确认的媒体资源；
- 来源和统计口径不完全明确的热度数据。

上述数据不得伪装成官方、已授权或已验证内容，必须保留来源、抓取时间、授权状态和可用性状态。

---

## 二、当前统一架构

### 1. 单一数据层

项目以 `DataRegistryProvider` 作为唯一网络数据入口：

- 首页；
- 全局搜索；
- 动漫档案；
- 动漫详情；
- 季度档案；
- 放送日历；
- 资源中心；
- 写作中心；
- 数据审查页；

均读取统一注册表，不再分别维护 YUC 和 AGE 两套互不一致的数据源。

`useAnimeList()` 仅作为兼容入口读取注册表，不再额外请求 YUC。

### 2. 统一作品与来源记录

数据模型支持：

- 作品基础信息；
- 中文名、日文名、英文名和别名；
- 年份、季度、首播日期、星期和时间；
- STAFF、CAST、平台和题材；
- 字段级来源；
- 资源级来源；
- 热度数据及统计口径；
- 授权状态；
- 可用性状态；
- 抓取时间和验证时间；
- 字段冲突与数据质量问题。

跨来源合并采用保守策略：

- 标题规范化后相同；
- 年份不存在冲突；

才自动合并。年份冲突时保留独立记录并进入冲突报告。缺失年份保持未知，不使用当前年份填充。

---

## 三、已经完成的修改

### 1. YUC 与 AGE 主站接入

- AGE 数据进入统一动漫档案、全局搜索、收藏、详情、资源、写作和审查流程。
- AGE 条目可以正常进入 `/anime/:id`，不再显示“找不到对应记录”。
- YUC 与 AGE 数据由统一注册表管理，避免重复请求和页面版本不一致。

### 2. YUC 解析器

新增独立 `scripts/yuc-parser.mjs`，用于解析页面中实际存在的：

- 星期和放送时间；
- 首播日期；
- 播放平台；
- 原名；
- 原作类型和题材；
- 制作公司；
- 导演；
- 系列构成；
- 人物设计；
- 音乐；
- CAST；
- 官方网站；
- PV。

规则：

- 抓不到时保持空值；
- 不生成“公开资料待补全”；
- 不生成“平台请以官方公告为准”；
- 不生成通用假简介、通用推荐或虚构 STAFF；
- 前台只展示真实有值字段。

### 3. AGE 解析器

重写 `scripts/age-parser.mjs`，支持：

- 首页；
- 热榜；
- 分类页；
- 周更表；
- 新番专题；
- 作品详情；
- 播放页；
- 线路与分集归属；
- 媒体 URL；
- 镜像及防走丢入口。

健壮性改进：

- 不依赖 HTML 属性固定顺序；
- 单条非法 URL 不会中断整页；
- 异常百分号编码不会中断解析；
- 资源保存作品 ID、线路、集数和来源页；
- 未确认媒体默认标记为授权未知、可用性未检查。

### 4. AGE 同步架构

新增 `scripts/sync-age.mjs`：

- 支持日漫、国漫、动态漫、剧场、特摄和美漫；
- 分页同步并生成 `public/data/age-latest.json`；
- 支持断点续传；
- 支持请求超时、重试、限速和并发控制；
- 记录失败页；
- 可选同步详情和播放页；
- 快照使用串行写入和原子重命名，防止并发写入损坏 JSON。

前台 `/api/age/current` 一次只读取指定分类的一页，不再因一个浏览器请求实时抓取约 181 页。存在快照时优先读取最近成功版本。

### 5. 数据正确性保护

已经实现：

- 空字符串、空数组和占位值不覆盖旧有效字段；
- 模板变量被识别为无效数据；
- 抓取失败不清空旧数据；
- 缺失年份不自动写为当前年份；
- 资源重复和跨作品串位检测；
- 字段来源、资源来源和热度口径保留；
- 年份冲突不强制合并；
- 公开资料不会自动生成个人追番状态、评分、进度或观看日志。

### 6. 前台页面

#### 资源中心 `/resources`

支持：

- 关键词搜索；
- 来源筛选；
- 资源类型筛选；
- AGE 分类筛选；
- 指定页加载；
- 分页显示；
- YUC 外部链接转换为统一资源记录；
- AGE 详情、线路、分集和媒体资源展示。

资源类型模型支持：

- 详情；
- 官网；
- PV；
- 播放；
- 下载；
- 网盘；
- 字幕；
- 镜像；
- 防走丢；
- 其他媒体资源。

#### 写作中心 `/writing`

已经连接统一注册表，支持：

- 选择作品；
- 选择写作模板；
- 查看真实字段；
- 查看字段来源；
- 查看缺失项；
- 查看冲突；
- 基于真实字段生成资料草稿；
- 避免把缺失或推断内容写成事实。

#### 数据审查 `/audit`

检查内容包括：

- 作品身份；
- 标题与来源；
- 日期和集数；
- STAFF／CAST 占位内容；
- 外部链接；
- 资源 URL；
- 资源与作品绑定；
- 来源 ID；
- 字段覆盖；
- 重复资源；
- 跨作品串位；
- 跨来源年份冲突。

#### 动漫详情页

- YUC 和 AGE 使用统一详情路由；
- AGE 可以按来源 ID 加载真实详情、线路和分集资源；
- STAFF、CAST 和资料字段无值时整项隐藏；
- 不再固定展示大量“未公开”宫格。

---

## 四、已完成验证

### 1. 自动测试

执行：

```bash
npm test
```

## 十一、2026-07-23 综合整改记录

### 2026-07-23 追加验收

- 本次继续整改新增资源卡元数据展示：来源、来源页、授权状态、可用性状态、抓取时间和验证时间；写作中心草稿新增可追溯引用清单。
- `npm ci`、`npm run typecheck`、`npm test`、`npm run build` 重新执行通过；测试为 17/17。
- Playwright 重新检查六种尺寸的首页、资源中心、写作中心、数据审查和 AGE 详情直达页，共 30 项；横向溢出 0。AGE 详情页在六种尺寸等待数据加载后均显示“蛀在糖糖里”。
- 资源契约测试覆盖 `resourceId`、`workId`、`sourcePage`、`originalUrl`、`resourceType`、`lineId`、授权状态和可用性状态。

本节为本次整改后的当前状态，优先级高于前文的历史验收记录。前文关于“站点不提供播放、下载或盗版资源”的旧政策表述已被统一资源索引政策替代；页面不托管媒体、不提供下载文件，也不把未知资源标记为官方或已授权。

当前统一风险提示为：

> 本站可索引公开资源，但不对资源授权状态和长期可用性作保证。所有资源均展示来源、抓取时间、授权状态和可用性状态；未知资源不得标记为官方或已授权。

### YUC CAST

- 通过浏览器保存 `tests/fixtures/yuc/202607-cast.html`、`202604-cast.html`、`202601-cast.html` 三份真实页面 fixture。
- 解析 `cast_r` 单元格，支持 `<br>` 多行、表格多列、角色/演员标签、演员单列；输出 `castCredits: Array<{ character?: string; actor: string }>`，同时保留演员列表兼容现有前端。
- 三份真实页面合计抽样作品数超过 10，测试覆盖真实 CAST、去重、空字段和不生成占位值。

### 资源数据契约

`ResourceRecord` 兼容并补充 `resourceId`、`workId`、`sourcePage`、`originalUrl`、`resourceType`、`lineId`、`availabilityStatus` 字段；授权状态包含 `official`、`authorized`、`unknown`、`unauthorized`、`disputed`，可用性状态包含 `available`、`unavailable`、`unchecked`、`redirected`、`expired`。空字段不渲染，抓取失败和占位值不得覆盖旧有效数据。

### 当前验收结果

- `npm ci`、`npm run typecheck`、`npm test`、`npm run build` 均通过；测试为 16/16。
- AGE 快照覆盖 6 个分类共 440/440 页：日本 181、国漫 79、动态漫 42、剧场 54、特摄 17、欧美 67；去重后 15,733 条，详情 200 条，播放页 351 条，失败 0。
- 最终 Playwright 回归已按六种尺寸（1440x900、1280x800、768x1024、430x932、390x844、375x812）检查首页、资源中心、写作中心、数据审查和 AGE 详情直达页，共 30 个检查；横向溢出 0，应用控制台错误 0。详情直达页六种尺寸均显示真实标题“蛀在糖糖里”。截图：`playwright-screenshots/resources-1440x900.png`、`playwright-screenshots/resources-430x932.png`。
- 未发布公开站点；未执行 GitHub 推送。本次交付仅包含当前 integrated 基线的源码、fixture、快照和验收文档。

结果：

```text
14 项通过
0 项失败
```

测试覆盖：

- AGE 首页、分类、周更、专题、详情和播放解析；
- HTML 属性换序；
- 非法 URL 隔离；
- 异常 URI 编码；
- 数据占位识别；
- 必填字段审查；
- 安全合并；
- 资源重复和串位；
- AGE 多页并发同步与快照写入；
- YUC 有值字段解析和缺失字段留空。

### 2. Node 语法检查

以下文件均已通过：

```bash
node --check scripts/age-parser.mjs
node --check scripts/yuc-parser.mjs
node --check scripts/sync-age.mjs
node --check scripts/create-sites-worker.mjs
```

生成 Worker 后：

```bash
node --check dist/server/index.js
```

结果通过。

### 3. Worker 接口模拟

模拟请求：

```text
/api/age/current?category=china&page=2
```

结果：

```json
{
  "status": 200,
  "category": "china",
  "label": "国漫",
  "page": 2,
  "count": 36,
  "upstreamCalls": 1
}
```

说明当前接口只读取请求的一个分类页，不再触发全站分页采集。

### 4. TypeScript 内部检查

在无法安装第三方依赖的环境中，使用临时模块声明执行了项目内部类型关系检查，未发现源码内部类型错误。

该检查不能替代安装真实 React／Vite 类型后的正式 `npm run typecheck`。

---

## 五、尚未完成及客观限制

当前执行环境的 npm 镜像返回 `503 Service Temporarily Unavailable`，因此没有独立完成：

```bash
npm ci
npm run typecheck
npm run build
```

最终项目中已删除：

- 不完整的 `node_modules`；
- 临时类型声明；
- TypeScript 缓存；
- 手工测试生成的 `dist`。

其他限制：

1. 成品包未预置 AGE 全站完整快照；同步器已经实现，但应在网络正常、允许访问上游并设置合理限速的环境运行。
2. 外部网站可能修改模板或提供错误数据；项目只能通过来源、抓取时间、状态、冲突和测试降低风险，不能保证上游原始内容绝对无误。
3. 复杂别名和同名作品仍可能需要人工审查。
4. 未完成 Playwright 的真实浏览器和移动端回归。

不得把以上未执行事项写成已经完成。

---

## 六、Codex 必须执行的下一步

请以当前项目为唯一基线，不得从旧版本覆盖。

### 1. 安装、检查和构建

网络正常后执行：

```bash
npm ci
npm run typecheck
npm test
npm run build
```

必须保存完整输出。任何失败都要先修复，再继续后续任务。

### 2. 小范围 AGE 同步验证

先运行：

```bash
node scripts/sync-age.mjs \
  --categories=japan \
  --max-pages=3 \
  --concurrency=1 \
  --delay=500 \
  --output=public/data/age-latest.json
```

检查：

- 快照 JSON 是否完整；
- 来源页是否正确；
- 失败页是否记录；
- 前台是否优先读取快照；
- 刷新后数据是否保留。

确认后再运行：

```bash
npm run sync:age
```

### 3. 详情和播放资源限量验证

先限制数量：

```bash
node scripts/sync-age.mjs \
  --all-categories \
  --details --max-details=100 \
  --play --max-play=200 \
  --concurrency=1 \
  --delay=500
```

不得在未限速、未确认上游承载能力、未评估磁盘容量时直接执行无限制全量播放页同步。

### 4. Playwright 浏览器回归

测试尺寸：

- 1440×900；
- 1280×800；
- 768×1024；
- 430×932；
- 390×844；
- 375×812。

重点验证：

1. 首页、搜索和档案可以同时找到 YUC 与 AGE 条目；
2. `/resources` 六类分类、筛选、指定页和分页正常；
3. AGE 条目进入 `/anime/age-*` 后可正常显示；
4. AGE 线路、分集和媒体 URL 不串位；
5. YUC 缺少 STAFF／CAST 时不显示“未公开”；
6. `/writing` 切换作品和模板后草稿、缺失项、冲突和来源同步更新；
7. `/audit` 能报告占位、无效 URL、资源绑定、来源缺失和年份冲突；
8. 接口部分失败或上游短时不可用时，旧有效数据不会被清空；
9. 收藏、追番状态和进度适用于 YUC 与 AGE；
10. 移动端菜单、搜索弹窗、筛选器、表格和长 URL 不溢出。

### 5. 最终数据验收报告

完成后在本文件末尾追加：

- YUC 作品数量；
- STAFF、CAST、官网和 PV 覆盖率；
- AGE 各分类成功页和失败页；
- 去重前后作品数量；
- 详情和播放页成功／失败数量；
- 各类资源数量；
- 无效链接、重复资源、跨作品串位和字段冲突；
- 快照文件大小和生成时间；
- `npm ci`、typecheck、test、build 完整结果；
- Playwright 截图位置；
- 未完成事项。

---

## 七、验收标准

只有同时满足以下条件，才可标记为最终完成：

- `npm ci` 成功；
- `npm run typecheck` 成功；
- `npm test` 全部通过；
- `npm run build` 成功；
- AGE 小范围同步成功并可恢复；
- YUC 真实字段解析通过抽样核对；
- 播放、线路和分集不存在跨作品串位；
- 无效、空白和占位字段不会覆盖旧有效数据；
- 资源中心、写作中心和审查中心真实可用；
- 桌面端和移动端 Playwright 回归通过；
- 项目文档与真实执行结果一致。

---

## 八、禁止回退事项

后续开发不得重新引入：

- “公开资料待补全”作为真实字段；
- “平台请以官方公告为准”作为平台值；
- 通用假简介和虚构 STAFF；
- 用当前年份填补缺失年份；
- 用空数组或抓取失败覆盖旧有效数据；
- 删除媒体 URL 来冒充完成资源审查；
- 将未知授权资源标记为官方、已授权或已验证；
- YUC 与 AGE 两套独立 Provider；
- 一个前台请求抓取 AGE 全部分页；
- 把未执行的同步、生产构建或浏览器测试写成已完成；
- 从旧版本覆盖当前统一数据架构。

---

## 九、历史报告位置

以下历史文件仅供追溯，不再作为主交接入口：

```text
docs/archive/IMPLEMENTATION_REPORT.md
docs/archive/CODE_REVIEW_REPORT.md
docs/archive/VALIDATION_RESULTS.md
docs/archive/CODEX_HANDOFF.md
```

后续开发和验收应优先阅读并更新：

```text
PROJECT_DELIVERY_HANDOFF.md

---

## 十、2026-07-23 integrated 基线验收记录

本节记录本次对 `dimension-creation-lab-integrated.zip` 解包基线的真实执行结果。未从旧工作区覆盖源码。

### 命令结果

```text
npm ci                         PASS
npm run typecheck              PASS
npm test                       PASS: 14/14
npm run build                  PASS
node --check scripts/age-parser.mjs       PASS
node --check scripts/yuc-parser.mjs       PASS
node --check scripts/sync-age.mjs         PASS
node --check scripts/create-sites-worker.mjs PASS
node --check dist/server/index.js         PASS
```

首次执行时 `tests/data-quality.test.mjs` 使用了旧环境绝对 TypeScript 路径，已改为项目依赖 `typescript`；修复后 14 项测试全部通过。

### AGE 同步覆盖

小范围命令 `--categories=japan --max-pages=3 --concurrency=1 --delay=500` 成功：3/3 页、271 条、0 失败。

限量详情/播放命令最终成功：

- 分类：日漫 181/181、国漫 79/79、动态漫 42/42、剧场 54/54、特摄 17/17、美漫 67/67，共 440/440 页；
- 去重后作品：15,733 条；
- 详情页：200 条；
- 播放页：351 条；
- 站点资源：1 条；
- 失败页、详情失败、播放失败和快照失败：0；
- 快照：`public/data/age-latest.json`，约 28.6 MB，`completedAt` 已写入。

同步器随后改为分类页逐页检查点、详情和播放每 10 条检查点并在阶段结束强制保存，仍使用串行队列和原子重命名，避免大快照逐条全量重写导致长时间无进展。

### YUC 实时抽样

对 `https://yuc.wiki/202607/` 的早期实时抽样曾记录 CAST 未解析；该结论已由后续三份真实 CAST fixture 和 17/17 测试覆盖结果取代，不再作为当前状态使用。

### 浏览器回归

使用 Playwright 检查 1440×900、1280×800、768×1024、430×932、390×844、375×812，共 30 个关键页面状态：

- 首页、资源中心、写作中心、数据审查页和 AGE 详情直达均可打开；
- AGE 详情直达 `/anime/age-38241bf798cf918917082c8e` 显示真实条目“蛀在糖糖里”；
- 30/30 检查无横向溢出；
- 资源中心、筛选布局和移动端表格保持可用；
- 截图：`playwright-screenshots/resources-1440x900.png`、`playwright-screenshots/resources-430x932.png`。

### 本次修复与未完成项

- `DataRegistryProvider` 在 API 失败时恢复 `/data/age-latest.json`，包括作品、分类分页、资源、详情和播放索引；短时上游失败不会清空旧有效数据。
- 修复 data-quality 测试的环境耦合路径。
- 未执行公开站点发布；本次仅完成基线验收和源码/快照构建验证。
- AGE 播放媒体仍保留来源、授权和可用性状态，不标记为官方或已授权；当前统一资源政策以本交接文档“综合整改记录”中的风险提示为准。
- 追加修复重复 React key：站点级资源使用稳定键，冲突列表使用索引键，AGE 详情和分集在 Registry 归一化去重；最终 AGE 直达页控制台无应用错误，移动端无横向溢出。
```
