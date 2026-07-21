# 次元生成局

动漫资料库、新番观测站、个人观看记录与 AI 创作实验室。

## 运行

```bash
npm install
npm run typecheck
npm run build
npm run dev
```

## SPA 部署

- Vercel：已提供 `vercel.json`
- Netlify：将 `_redirects` 放入发布目录
- Nginx：`try_files $uri $uri/ /index.html;`

所有动漫、播出时间和作品内容均为原创模拟数据，仅用于界面演示。
