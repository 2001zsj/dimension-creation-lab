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
