# 次元生成局：逻辑整改交付与后续验证说明

更新时间：2026-07-23  
适用项目：Dimension Creation Lab  
整改基线：用户上传的最新版本 `17e76da3-3420-4f16-8afd-6f4498d18943.zip`

本文件是本次逻辑整改后的唯一主交接文档。历史报告仅供追溯，不得从旧版本覆盖当前代码。

## 一、本次整改目标

围绕最新逻辑审查中发现的问题，优先修复：

- YUC CAST 语义错误；
- AGE 在不同部署方式下加载范围不一致；
- AGE 详情直达依赖列表预加载；
- AGE 快照详情、分集和媒体资源未进入统一资源库；
- 15,000 余条数据导致的一次性渲染和搜索压力；
- Worker 嵌入未压缩完整快照导致包体过大；
- 固定快照文件的一年不可变缓存；
- 同名同年作品误合并和来源 ID 覆盖；
- 合并后 `animeId`、`workId` 不一致；
- 资源筛选、雷达、首页统计、数据审查和 ICS 周期逻辑问题。

## 二、已经完成的整改

### 1. YUC CAST

- 无明确角色标签的多列姓名按独立声优解析；
- 只有明确冒号、箭头或角色／声优标签时才生成 `character`；
- 新增测试，防止把第二个声优误当成角色；
- 三份真实 fixture 继续用于抽样验证；
- 抓不到时保持空值，不生成“未公开”或“待补全”。

### 2. AGE 浏览器分片加载

新增 `scripts/build-age-data.mjs`，从同步源快照生成：

```text
public/data/age/manifest.json
public/data/age/pages/{category}/{page}.json
public/data/age/items/{prefix}.json
public/data/age/details/{id}.json
public/data/age/play/{animeId}.json
```

浏览器不再在 API 失败时下载完整 28.6 MB 快照，而是按分类页、作品 ID、详情和播放资源读取小分片。Worker 部署和纯静态部署使用相同的分页语义。

当前分片结果：

```text
分类页：440
作品索引分片：256
详情文件：200
播放作品分组：1
```

### 3. AGE 详情直达

- `/anime/age-*` 在 Registry 中不存在基础条目时会按来源 ID 加载作品索引；
- 加载期间展示加载状态，不提前显示“找不到记录”；
- 详情和播放资源可以通过 API 或静态分片回退；
- 详情数据写回统一 Registry。

### 4. 快照资源进入统一数据层

- `details[].episodes` 转换为分集资源；
- `play[].resources` 转换为播放、媒体、下载、网盘、字幕、镜像或防走丢资源；
- 保存作品、线路、集数、来源页、原始 URL、授权状态和可用性；
- 合并作品时同步重写 `animeId` 与 `workId`，原始 AGE ID 保留在 `sourceIds.age`。

### 5. 跨来源合并

- 标题索引由单个候选改为候选数组；
- AGE 条目只在存在唯一兼容 YUC 候选时自动合并；
- 多个 AGE 条目竞争同一 YUC 候选时保留独立记录并产生冲突；
- 年份冲突不自动合并；
- 避免同名同年但分类或版本不同的 AGE 条目互相覆盖来源 ID。

### 6. 大数据量页面

- 动漫档案增加前端分页和每页数量；
- AGE 下一页加载会查找第一个缺失页，不再简单使用最后页加一；
- 写作中心使用关键词筛选并限制下拉候选数量；
- AGE 详情分集按线路分组，每页显示 100 条；
- 顶部资源只展示有限数量，避免一次渲染数万链接；
- 全局搜索使用延迟值、相关性评分、标题精确／前缀优先和收藏加权。

### 7. 首页、雷达和资源中心

- 首页“正在放送”限定当前季度；
- 雷达只使用 YUC 未来条目或 AGE 新番专题来源，不再把普通 AGE 历史分类记录当作新番卫星；
- 资源中心数据来源筛选只保留 YUC／AGE；
- 另增授权状态筛选；
- 镜像和防走丢站点入口跟随资源类型筛选；
- 数据审查增加来源相关覆盖率和资源元数据缺失提示。

### 8. 放送状态与日历

- 有首播日和总集数的 YUC 条目可在预计结束后转为 `finished`；
- ICS 有总集数时使用 `COUNT`；
- 无总集数或结束日期时只导出下一次事件，不再永久每周重复。

### 9. Worker 和部署产物

- AGE 完整快照以 gzip 压缩后嵌入 Worker API；
- `/data/age/` 浏览器分片不再嵌入 Worker JavaScript；
- 模拟 Worker 从约 37 MB 降至约 2.2 MB；
- 固定名完整快照不再使用一年 `immutable` 缓存；
- 新增 `/api/age/item/:id`；
- 分类页 API 可返回对应详情和播放资源；
- 新增 `scripts/prune-dist.mjs`：Worker 生成后从最终 `dist` 删除未压缩完整快照，只保留浏览器分片与压缩 Worker 数据。

### 10. AGE 播放同步取样

同步器新增跨作品轮询，避免播放页上限全部被第一部长篇作品占用。

当前已有快照是在修复前生成，其 351 个播放页全部来自同一作品；`manifest.json` 会明确标记：

```text
playSamplingStatus: sample-biased
```

后续发布前应使用新同步器重新生成播放样本。

## 三、验证结果

### 自动测试

```text
npm test
19 项通过
0 项失败
```

新增覆盖：

- YUC 无标签双列姓名不得形成虚假角色；
- AGE 播放候选跨作品轮询；
- 原有 AGE 属性换序、非法 URL、异常编码、数据安全合并和快照检查继续通过。

### Node 语法检查

以下文件全部通过：

```text
scripts/age-parser.mjs
scripts/yuc-parser.mjs
scripts/sync-age.mjs
scripts/build-age-data.mjs
scripts/create-sites-worker.mjs
scripts/prune-dist.mjs
```

### TypeScript 内部关系检查

在临时模块声明下执行严格内部类型检查通过。临时声明不会进入最终交付包。

该检查不能替代安装真实 React、Router、Lucide 和 Vite 依赖后的正式 `npm run typecheck`。

### Worker API 模拟

已模拟并成功返回：

```text
/api/age/categories
/api/age/current?category=china&page=2
/api/age/item/38241bf798cf918917082c8e
/api/age/detail/38241bf798cf918917082c8e
/api/age/play?source=...
```

播放接口保留原始媒体 URL，并标记授权状态 `unknown`。

### 静态分片

所有生成 JSON 均可解析。示例规模：

```text
manifest：约 2.4 KB
分类页：约 5 KB（普通页）
作品索引分片：约 32 KB（示例）
详情：按作品变化
播放分组：按作品变化
```

## 四、未能独立完成的验证

当前执行环境无法正常完成 npm 依赖安装，因此本次没有独立完成：

```text
npm ci
npm run typecheck
npm run build
Playwright 真实浏览器回归
```

不得把上述项目写成已经通过。最终包中不会保留不完整 `node_modules`、临时类型声明或模拟 `dist`。

## 五、Codex 必须执行的下一步

以当前整改包为唯一基线，先执行：

```bash
npm ci
npm run typecheck
npm test
npm run build
```

确认：

- 测试不少于 19 项；
- `dist/data/age-latest.json` 已被构建末尾清理；
- `dist/data/age/` 浏览器分片存在；
- `dist/server/index.js` 可通过 `node --check`；
- Worker 文件大小保持在平台限制内。

随后执行 Playwright：

```text
1440×900
1280×800
768×1024
430×932
390×844
375×812
```

重点检查：

1. AGE 尚未载入的直接详情链接可打开；
2. 资源中心可以看到分集和播放资源；
3. 同名同年不同分类作品不被错误合并；
4. YUC CAST 不出现“声优被当角色”；
5. 动漫档案分页和 AGE 补页正常；
6. 长篇作品分集线路切换和分页正常；
7. 全局搜索精确标题优先；
8. 静态部署不请求完整 `age-latest.json`；
9. Worker、Netlify、Vercel 页面数据范围一致；
10. 移动端无横向溢出和控制台应用错误。

## 六、发布前必须重新同步播放页

当前快照播放样本严重偏向一部长篇作品。使用修复后的轮询同步器重新生成：

```bash
node scripts/sync-age.mjs \
  --all-categories \
  --details --max-details=200 \
  --play --max-play=500 \
  --concurrency=1 \
  --delay=500
```

同步后重新执行：

```bash
npm run build:age-data
```

检查 `public/data/age/manifest.json`：

```text
playAnimeCount > 1
playSamplingStatus = distributed
```

## 七、禁止回退事项

不得重新引入：

- 无标签双列声优被解析成角色／声优；
- 浏览器直接下载完整 28.6 MB 快照；
- 一个 `<select>` 放入 15,000 多个作品；
- 详情页一次渲染数千集；
- 同名标题 Map 只保存一个候选；
- 合并后 `animeId` 和 `workId` 不一致；
- 固定名快照一年不可变缓存；
- Worker 直接嵌入未压缩完整快照；
- 普通 AGE 历史分类条目进入新番雷达；
- ICS 永久每周重复；
- 把当前未完成的生产构建或 Playwright 写成已通过。

## 仓库清理基线（2026-07-24）

主仓库仅保留运行源码、测试、构建脚本、部署配置、必要 fixture 与 `public/data/age-latest.json` 源快照。以下内容不再提交：`dist/`、`public/data/age/` 生成分片、历史交接报告、验证输出、Playwright 截图和临时压缩包。

