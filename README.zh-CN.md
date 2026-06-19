# is-ai-down

[English](./README.md)

一个公开的 AI 服务状态聚合看板。它聚合官方公开状态页和轻量公开页面探针，帮助用户快速判断常见 AI 服务是否出现了可见异常。

在线地址：https://is-ai-down.yoru-and-akari.dev

## 它做什么

- 聚合 AI 产品和基础设施服务的官方状态页。
- 对没有独立状态页的服务做公开页面可访问性探针。
- 展示标准化后的服务状态、近期事件和公开 endpoint 健康情况。
- 提供一个轻量反馈表单，用于报告缺失服务或可疑状态结果。

## 它不是什么

这不是 AI 厂商的一手内部监控数据。绿色状态只代表被监测的公开来源或 endpoint 在检查时看起来正常；它不保证登录、计费、模型推理、地区访问或每一个产品功能都正常。

这是一个个人公开项目，按现状提供；不承诺 SLA，不提供运营保证或法律保证。

## 架构

```text
Browser
  ↓
Cloudflare Edge
  ↓
Cloudflare Worker
  ├─ /api/services
  ├─ /api/incidents
  ├─ /api/stats
  └─ /api/feedback
  ↓
Cloudflare D1
```

前端是 Next.js 16 静态导出，由 Cloudflare Worker Assets 托管。后端是 Cloudflare Worker，负责定时轮询和 API；数据存储在 Cloudflare D1。

## 本地开发

前端：

```bash
cd web
npm install
npm run dev
```

前端运行在 http://localhost:3000。

后端：

```bash
cd worker
npm install
npx wrangler dev --port 8788
```

后端运行在 http://localhost:8788。本地开发时，`web/.env.development` 会把前端 API 指向这个 Worker 端口。

## 数据来源

项目优先使用官方公开状态页。对于没有有意义独立状态页的产品，会退回到公开页面探针。所有数据都会被标准化后展示；请把它理解为公开信号，而不是产品可用性的保证。

## 反馈

可以使用线上站点里的反馈表单，也可以在仓库公开后开 GitHub Issue。

## License

本项目使用 GNU Affero General Public License v3.0。见 [LICENSE](./LICENSE)。

## 致谢

与 Claude 和 Codex 协作完成。
