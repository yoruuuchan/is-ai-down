# AI 服务状态聚合页数据源整理文档

校准时间：2026-06-19
用途：Cloudflare Worker cron 定时拉取各家 AI / 开发者工具 / 生成式媒体服务的官方 status page，用于聚合展示当前整体状态、当前未解决事件、组件状态与最近 incident。

## 0. 总体结论

本轮结果里有几处必须先纠正：

1. Vercel、Moonshot/Kimi、BFL、DeepSeek 后端都可以按 Atlassian Statuspage 解析，其中 DeepSeek 主域页面显示 Powered by FlashDuty，但可用的后端标准接口是 `deepseek.statuspage.io/api/v2/summary.json`。工程上优先走可稳定返回 JSON 的后端 URL。
2. Better Stack 不是只能抓 `og:image`。官方公开支持匿名 JSON API，模板是 `https://<status-domain>/index.json`；RSS 模板是 `https://<status-domain>/feed.rss`。`og:image` 只应作为兜底。
3. Replit 不是 Atlassian Statuspage，是 Rootly status page。`/api/v2/summary.json` 不存在。应优先试 Rootly 公共接口 `https://status.replit.com/api/v1/status.json` 与 `https://status.replit.com/api/v1/incidents.json`。
4. OpenRouter 当前页面显示 Powered by OnlineOrNot。OnlineOrNot 有匿名 summary endpoint，模板是 `https://api.onlineornot.com/v1/status_pages/<subdomain>/summary`。OpenRouter 应优先试 `https://api.onlineornot.com/v1/status_pages/openrouter/summary`。
5. xAI 仍需二次确认。主站可能有防护或自建接口，不应暂时硬归类为 Atlassian。
6. 对 Cloudflare Worker 每分钟 cron 场景，最稳的策略是：平台识别优先级固定、失败显式记录、不要用低置信 fallback 冒充成功。

---

## 1. 通用平台适配规则

### 1.1 Atlassian Statuspage

URL 模板：

```text
https://<status-domain>/api/v2/summary.json
```

有些服务的自定义域名可能被拦或 fetch 异常，可以尝试后端 statuspage.io 域名：

```text
https://<page-subdomain>.statuspage.io/api/v2/summary.json
```

字段映射：

```text
overall status          -> status.indicator / status.description
incident list           -> incidents[]
incident.title          -> incidents[].name
incident.started_at     -> incidents[].started_at
incident.created_at     -> incidents[].created_at
incident.status         -> incidents[].status
incident.severity       -> incidents[].impact 或 incidents[].impact_override
incident.resolved_at    -> incidents[].resolved_at
component list          -> components[]
component.name          -> components[].name
component.status        -> components[].status
maintenance list        -> scheduled_maintenances[]
```

状态字典：

```text
status.indicator:
- none
- minor
- major
- critical
- maintenance

component.status:
- operational
- degraded_performance
- partial_outage
- major_outage
- under_maintenance

incident.status:
- investigating
- identified
- monitoring
- resolved
- postmortem
```

推荐归一化：

```text
none        -> operational
minor       -> degraded
major       -> partial_outage
critical    -> major_outage
maintenance -> maintenance
```

### 1.2 Better Stack

公开 JSON API：

```text
https://<status-domain>/index.json
```

公开 RSS：

```text
https://<status-domain>/feed.rss
```

字段映射：

```text
overall status          -> data.attributes.aggregate_state
resource list           -> included[] where type === "status_page_resource"
resource.name           -> attributes.public_name
resource.status         -> attributes.status
incident list           -> included[] where type === "status_report"
incident.title          -> attributes.title
incident.started_at     -> attributes.starts_at
incident.resolved_at    -> attributes.ends_at
incident.severity       -> attributes.aggregate_state
incident.type           -> attributes.report_type
incident updates        -> included[] where type === "status_update"
update.message          -> attributes.message
update.published_at     -> attributes.published_at
```

状态字典：

```text
aggregate_state / resource.status:
- operational
- degraded
- downtime
- maintenance
- not_monitored 仅 resource 可能出现
```

备注：

`og:image` 文件名仍可作为兜底：

```text
og_operational-*.png
og_degraded-*.png
og_downtime-*.png
og_maintenance-*.png
```

但它只能判断整体状态，拿不到 incident 列表，不建议作为主解析方案。

### 1.3 Instatus

公开 JSON API：

```text
https://<status-domain>/v3/summary.json
```

字段映射：

```text
overall status          -> page.status
incident list           -> activeIncidents[]
incident.title          -> activeIncidents[].name
incident.started_at     -> activeIncidents[].started
incident.resolved_at    -> activeIncidents[].resolved
component list          -> components[]
component.status        -> components[].status
```

常见状态：

```text
UP
HASISSUES
UNDERMAINTENANCE
```

组件状态通常是：

```text
OPERATIONAL
DEGRADED
PARTIALOUTAGE
MAJOROUTAGE
UNDERMAINTENANCE
```

### 1.4 Rootly

公开 overall status：

```text
https://<custom-domain>/api/v1/status.json
```

公开 active incidents：

```text
https://<custom-domain>/api/v1/incidents.json
```

字段映射：

```text
overall status          -> status.description
incident list           -> incidents[]
incident.title          -> incidents[].name
incident.started_at     -> incidents[].started_at
incident.created_at     -> incidents[].created_at
incident.monitoring_at  -> incidents[].monitoring_at
incident.resolved_at    -> incidents[].resolved_at
incident updates        -> incidents[].incident_updates[]
update.status           -> incident_updates[].status
update.body             -> incident_updates[].body
update.display_at       -> incident_updates[].display_at
```

备注：

Rootly 的公开接口不是 Atlassian 的 `/api/v2/summary.json`。如果被 Cloudflare 拦，先用浏览器 UA + `Accept: application/json`，但不要把 403/404 降级成成功。

### 1.5 OnlineOrNot

公开 summary API：

```text
https://api.onlineornot.com/v1/status_pages/<status_page_subdomain>/summary
```

字段映射：

```text
overall status          -> result.status_page.status
overall description     -> result.status.description
component list          -> result.components[]
component.name          -> result.components[].name
component.status        -> result.components[].status
incident list           -> result.active_incidents[]
incident.title          -> result.active_incidents[].title
incident.started_at     -> result.active_incidents[].started
incident.resolved_at    -> result.active_incidents[].ended
incident.severity       -> result.active_incidents[].impact
maintenance list        -> result.scheduled_maintenance[]
```

状态字典：

```text
status_page.status:
- ALL_SYSTEMS_OPERATIONAL
- DEGRADED_PERFORMANCE
- PARTIAL_OUTAGE
- MAJOR_OUTAGE
- UNDER_MAINTENANCE

component.status / incident.impact:
- OPERATIONAL
- MAJOR_OUTAGE
- PARTIAL_OUTAGE
- DEGRADED_PERFORMANCE
- NO_IMPACT
- MAINTENANCE
```

---

## 2. Prompt 1：Mistral / Vercel / OpenRouter

### === mistral ===

- JSON endpoint：无公开匿名 JSON endpoint
- 平台：Checkly status page，页面显示 Powered by Checkly
- 请求方式：`GET https://status.mistral.ai/`
- 鉴权：页面匿名可访问；底层 Checkly API 通常需要 Bearer token
- 响应示例：HTML 页面当前显示 `All systems operational`
- 字段映射：
  - overall status：无稳定公开 JSON 字段；HTML 文本可读 `All systems operational`
  - incident list：无稳定公开 JSON 字段；历史 incident 页面可 HTML 解析
  - incident.title / started_at / severity / resolved_at：只能从页面结构提取，不建议作为稳定接口
- 状态值字典：未确认公开枚举。建议内部归一化 HTML 文案：
  - `All systems operational` -> operational
  - incident 页面 `Resolved` -> resolved
  - incident severity 如 `LOW` / `MEDIUM` / `HIGH` -> severity
- 备注：不是 Atlassian，不是 Better Stack。不要走 `/api/v2/summary.json`。

推荐 Worker 处理：

```text
adapter = "checkly_html"
url = "https://status.mistral.ai/"
parse = HTML text + known selectors
confidence = medium-low
```

### === vercel ===

- JSON endpoint：`https://vercel.statuspage.io/api/v2/summary.json`
- 备用域名：`https://www.vercel-status.com/api/v2/summary.json`
- 平台：Atlassian Statuspage
- page ID：`lvglq8h0mdyh`
- 请求方法：GET
- 必要 headers/cookies：无；建议 `Accept: application/json`
- 响应示例：

```json
{"page":{"id":"lvglq8h0mdyh","name":"Vercel","url":"https://www.vercel-status.com","time_zone":"Etc/UTC","updated_at":"2026-06-18T13:39:05.797Z"},"components":[...],"incidents":[],"scheduled_maintenances":[],"status":{"indicator":"none","description":"All Systems Operational"}}
```

- 字段映射：
  - overall status -> `status.indicator` / `status.description`
  - incident list -> `incidents[]`
  - incident.title -> `incidents[].name`
  - incident.started_at -> `incidents[].started_at`
  - incident.created_at -> `incidents[].created_at`
  - incident.status -> `incidents[].status`
  - incident.severity -> `incidents[].impact`
  - incident.resolved_at -> `incidents[].resolved_at`
- 状态值字典：见 Atlassian 通用规则
- 备注：不是自建，标准 Atlassian，匿名可访问，适合每分钟 cron。

### === openrouter ===

- JSON endpoint：优先尝试 `https://api.onlineornot.com/v1/status_pages/openrouter/summary`
- 平台：OnlineOrNot
- 页面：`https://status.openrouter.ai/`
- 请求方法：GET
- 必要 headers/cookies：无；建议 `Accept: application/json`
- 页面响应示例：`All Systems Operational`，组件包括 `Chat (/api/v1/chat/completions)`、`Data API`、`Homepage`、`Clerk (UI account auth)`
- 字段映射：
  - overall status -> `result.status_page.status`
  - overall description -> `result.status.description`
  - component list -> `result.components[]`
  - incident list -> `result.active_incidents[]`
  - incident.title -> `result.active_incidents[].title`
  - incident.started_at -> `result.active_incidents[].started`
  - incident.severity -> `result.active_incidents[].impact`
  - incident.resolved_at -> `result.active_incidents[].ended`
- 状态值字典：见 OnlineOrNot 通用规则
- 备注：`/api/v2/summary.json` 不是正确接口。若 OnlineOrNot summary 对 OpenRouter 返回 404，则降级为 HTML 解析并标记 `confidence = low`。

---

## 3. Prompt 2：CN 受限站点远程探测

### === deepseek ===

- platform：Atlassian Statuspage 后端可用；主页面当前显示 Powered by FlashDuty，存在平台标识冲突
- evidence：
  - `https://deepseek.statuspage.io/api/v2/summary.json` 返回标准 Atlassian JSON
  - page ID：`0db0rq26tg1l`
  - page.url：`https://status.deepseek.com`
- json endpoint：`https://deepseek.statuspage.io/api/v2/summary.json`
- summary.json HTTP：200（后端 statuspage.io）
- current display：All Systems Operational
- 组件：
  - API 服务 (API Service)
  - 网页对话服务 (Web Chat Service)
- notes：
  - 工程上直接使用 `deepseek.statuspage.io` 后端更稳。
  - `status.deepseek.com` 主域如果返回 HTML/FlashDuty 或网络失败，不应覆盖后端 JSON 的成功结果。
  - 这里建议记录 `platform = atlassian_statuspage_backend`，并在 notes 里写明主域页面存在 FlashDuty 标识。

### === kimi / moonshot ===

- platform：Atlassian Statuspage
- evidence：标准 `/api/v2/summary.json` 可用，page ID `10y9y5wx5xh3`
- json endpoint：`https://status.moonshot.cn/api/v2/summary.json`
- summary.json HTTP：200
- current display：All Systems Operational
- 字段映射：Atlassian 通用规则
- 备注：
  - time_zone：Asia/Shanghai
  - 组件包括 Kimi、Open API、Website、API Service、Sign In / Sign Up、File uploads、Search、Model、Vision Model、Thinking Model、Text Model、Research Model、K2 Model、Agentic Model 等。
  - Kimi K2/K1.5 不需要独立 status，归入 Moonshot status。

### === xAI ===

- platform：unknown / likely custom
- evidence：
  - `status.x.ai` 页面可显示 `No incidents declared` / service status 类文案，但标准 Atlassian 接口不可用或被防护。
  - `xai.statuspage.io` 不应直接当作可用后端，需实测。
- json endpoint：none confirmed
- summary.json HTTP：主域 `/api/v2/summary.json` 不应作为有效接口
- current display：页面显示无当前 incident，但具体 JSON 源未确认
- notes：
  - 不要硬归类 Atlassian。
  - 建议下一轮用真实浏览器 Network 抓 XHR/fetch。
  - Worker 里暂时使用 `html_scrape`，并将 confidence 标为 low。

### === bfl ===

- platform：Atlassian Statuspage
- evidence：`https://status.bfl.ml/api/v2/summary.json` 返回标准 Atlassian JSON
- json endpoint：`https://status.bfl.ml/api/v2/summary.json`
- summary.json HTTP：200
- page ID：`xs1j1ypqjc32`
- current display：All Systems Operational
- 组件：FLUX 1.1 [pro]、FLUX.1 [pro]、FLUX.1 [dev]、FLUX 1.1 [pro] Ultra、Finetuning、FLUX.1 Fill [pro]、FLUX.1 Canny [pro]、API (api.bfl.ai)、FLUX.1 Depth [pro]、FLUX.1 Kontext [pro]、FLUX.1 Kontext [max]、FLUX.2、FLUX.2 [klein]
- notes：Flux 不需要独立 status；BFL status 已覆盖。

---

## 4. Prompt 3：Replit 反爬 UA 探测与平台判断

### 4.1 平台结论

`status.replit.com` 不是 Atlassian Statuspage。页面底部显示 Powered by Rootly，应按 Rootly 处理。

错误接口：

```text
https://status.replit.com/api/v2/summary.json
```

正确方向：

```text
https://status.replit.com/api/v1/status.json
https://status.replit.com/api/v1/incidents.json
```

### 4.2 UA 探测记录

| UA | HTTP | 是否拿到 JSON | 响应首 200 字符 |
|---|---:|---|---|
| `curl/8.0.0` | 403 | 否 | Cloudflare JS challenge，`<title>Just a moment...</title>` |
| Chrome 131 Windows | 404 | 否 | `Content-Type: application/json`，但 body 为空；说明通过了防护但端点不存在 |
| Googlebot | 403 | 否 | Cloudflare JS challenge |
| `ai-status-board/0.1 (+https://is-ai-down.yoru-and-akari.dev)` | 403 | 否 | Cloudflare JS challenge |
| 空 UA | 403 | 否 | Cloudflare JS challenge |

### 4.3 实施结论

- 问题不是单纯 UA；`/api/v2/summary.json` 对 Replit 根本不是正确接口。
- Chrome UA 可以绕过部分 challenge，但打错接口仍然 404。
- 应改成 Rootly adapter，先试：
  - `GET /api/v1/status.json`
  - `GET /api/v1/incidents.json`
- 建议 headers：

```http
Accept: application/json,text/plain,*/*
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36
Referer: https://status.replit.com/
```

- 不建议默认加 Origin。除非页面真实 fetch 带 Origin，否则乱加 Origin 更像脚本请求。
- 如果 Rootly JSON 仍被 403，记录为 `blocked_by_waf`，不要降级成 HTML 成功。

---

## 5. Prompt 4：Better Stack JSON / Feed / 私有 API

### 5.1 公开匿名 JSON 接口

有。

URL 模板：

```text
https://<status-domain>/index.json
```

示例：

```text
https://status.huggingface.co/index.json
https://status.lumalabs.ai/index.json
https://status.novita.ai/index.json
https://status.betterstack.com/index.json
```

字段映射：

```text
overall status          -> data.attributes.aggregate_state
incident list           -> included[] where type === "status_report"
incident.title          -> attributes.title
incident.started_at     -> attributes.starts_at
incident.resolved_at    -> attributes.ends_at
incident.severity       -> attributes.aggregate_state
resource list           -> included[] where type === "status_page_resource"
resource.name           -> attributes.public_name
resource.status         -> attributes.status
```

状态字典：

```text
operational
degraded
downtime
maintenance
not_monitored
```

### 5.2 公开 feed

有 RSS。

URL 模板：

```text
https://<status-domain>/feed.rss
```

RSS 内容：

- new incident
- incident update
- scheduled maintenance
- maintenance update
- resolved incident

RSS 适合补 timeline，但不适合做当前整体状态的主来源。当前整体状态请用 `/index.json`。

### 5.3 私有 API

私有 API base：

```text
https://uptime.betterstack.com/api/v2/
```

鉴权：

```http
Authorization: Bearer <TOKEN>
```

用途：

- 管理自己的 status page
- 获取/创建/更新 status reports
- 管理 resources、monitors、heartbeats 等

Free tier 通常包含：

- 1 个 status page
- 10 个 monitors
- 10 个 heartbeats
- REST API 访问

### 5.4 推荐方案

Worker cron 每分钟一次时，Better Stack 使用以下顺序：

```text
1. GET https://<status-domain>/index.json
2. 如果 JSON 失败，GET https://<status-domain>/feed.rss 仅补 incident timeline
3. 如果 JSON/feed 都失败，再从 HTML 的 og:image 或 favicon 判断整体状态
4. HTML fallback 必须标记 low confidence，不能拿它冒充完整 incident 数据
```

最终结论：

```text
Better Stack:
primary = /index.json
secondary = /feed.rss
last_resort = og:image / favicon
```

---

## 6. Prompt 5：补充服务清单

### === Suno ===

- official status page：无稳定官方 status page
- platform：无 / 第三方监控为主
- 是否值得加入板上：否
- 备注：可做 synthetic check，例如首页、登录页、生成接口探针；不要标成官方 status。

### === Pika Labs ===

- official status page：无稳定官方 status page
- platform：无
- 是否值得加入板上：否
- 备注：Pika API 目前通过 Fal.ai 提供，若板上已有 Fal.ai 或可做 synthetic check，可间接覆盖。

### === Krea ===

- official status page：无稳定官方 status page
- platform：无
- 是否值得加入板上：否
- 备注：建议仅 synthetic check，不建议当作官方 status 收录。

### === Notion AI ===

- official status page：`https://www.notion-status.com/` 或 `https://notion-status.com/`
- platform：Atlassian Statuspage
- 是否值得加入板上：是，但作为 Notion 总状态
- 备注：Notion AI 没有独立 status。若加入，服务名建议写 `Notion / Notion AI`，避免误导为 AI 独立状态。

### === Poe (Quora) ===

- official status page：未查到稳定官方 status page
- platform：无
- 是否值得加入板上：否
- 备注：Poe 依赖多家模型供应商，故障来源复杂；可 synthetic check 首页/API，但不要伪装官方 status。

### === Character.AI ===

- official status page：`https://status.character.ai/`
- platform：Atlassian Statuspage
- 是否值得加入板上：是
- 备注：如果页面跳 inactive 或 API 不可用，则标记为 `inactive_or_unstable`，不要删除记录；Character.AI 用户量大，值得保留。

### === Lovable ===

- official status page：`https://status.lovable.dev/`
- platform：incident.io status page
- 是否值得加入板上：是
- 备注：页面显示 Website、Login、Editor、Hosting、Cloud 等组件。应单独写 incident.io adapter 或先 HTML 解析。

### === v0.dev / v0.app ===

- official status page：集成在 Vercel status
- platform：Atlassian Statuspage / 母平台 Vercel
- 是否值得加入板上：是，但作为 Vercel 子组件
- 备注：服务名建议写 `v0 (Vercel)`，数据源用 Vercel Status 的组件。

### === Bolt.new ===

- official status page：`https://status.bolt.new/`
- platform：incident.io status page
- 是否值得加入板上：是
- 备注：页面会显示上游 provider dependency incident，例如 Anthropic、Cloudflare、GitHub、Name.com、Supabase。适合加入聚合页。

### === Windsurf (Codeium) ===

- official status page：`https://status.windsurf.com/`
- platform：Atlassian Statuspage
- 是否值得加入板上：是
- 备注：建议使用 `/api/v2/summary.json`。如果页面未来变成 deleted/inactive，保留记录并标记异常。

### === Tabnine ===

- official status page：`https://status.tabnine.com/`
- platform：Atlassian Statuspage
- 是否值得加入板上：是
- 备注：覆盖 Website、Management、Tabnine App、插件、Code Assistant、Chat 等组件。

### === GitHub Copilot ===

- official status page：`https://www.githubstatus.com/`
- platform：Atlassian Statuspage / GitHub 子组件
- 是否值得加入板上：是
- 备注：GitHub Status 里有 `Copilot` 与 `Copilot AI Model Providers` 组件。不要单独找 Copilot status 域名。

### === AWS Bedrock ===

- official status page：`https://health.aws.amazon.com/`
- platform：AWS Health Dashboard / 母平台
- 是否值得加入板上：是
- 备注：不是独立 status page。建议作为云厂商 AI 服务加入，解析难度高于 Atlassian；可先链接到 dashboard，后续再接 AWS Health API 或 RSS/JSON 源。

### === Google Vertex AI ===

- official status page：`https://status.cloud.google.com/`
- platform：Google Cloud Service Health / 母平台
- 是否值得加入板上：是
- 备注：Google Cloud 提供产品级 status、RSS、JSON History、JSON Product Catalog。Vertex AI 需按产品 catalog 定位。

### === Midjourney ===

- official status page：`https://status.midjourney.com/`（需二次实测）
- platform：自建 / 未确认
- 是否值得加入板上：是，但先标 low confidence
- 备注：Midjourney 用户量大，值得加入；如果 status 页面无法稳定抓 JSON，则用 HTML/synthetic check。

### === DALL-E ===

- official status page：集成在 OpenAI status
- platform：母平台 OpenAI status
- 是否值得加入板上：否，除非你要拆 OpenAI 子组件
- 备注：如果板上已有 ChatGPT / OpenAI，不建议单独列 DALL-E，避免重复。

### === Flux ===

- official status page：`https://status.bfl.ml/`
- platform：Atlassian Statuspage / BFL 母平台
- 是否值得加入板上：否，已由 BFL 覆盖
- 备注：BFL 组件已覆盖 FLUX.1 / FLUX.2 / API / Finetuning。

### === Recraft ===

- official status page：`https://recraft.instatus.com/`
- platform：Instatus
- 是否值得加入板上：是
- JSON endpoint：`https://recraft.instatus.com/v3/summary.json`
- 备注：组件包括 Website、App、API。

### === LumaAI Dream Machine ===

- official status page：`https://status.lumalabs.ai/`
- platform：Better Stack
- 是否值得加入板上：否，已有 Luma 就够
- 备注：Dream Machine 属于 Luma 产品体系；数据源用 `https://status.lumalabs.ai/index.json`。

### === 月之暗面 Kimi K2/K1.5 ===

- official status page：`https://status.moonshot.cn/`
- platform：Atlassian Statuspage / Moonshot 母平台
- 是否值得加入板上：否，已有 Kimi/Moonshot 即可
- 备注：K2 Model 已在 Moonshot status 组件里。

---

## 7. 推荐加入优先级

### Top 5

1. GitHub Copilot
   - 理由：开发者高频依赖，状态在 GitHub Status 子组件里，解析稳定。
2. AWS Bedrock
   - 理由：企业/API 用户重要，云厂商 AI 基础设施，影响面大。
3. Google Vertex AI
   - 理由：企业/API 用户重要，Google Cloud 官方 status 有结构化数据。
4. Windsurf
   - 理由：AI coding 工具高相关，Atlassian 解析成本低。
5. Bolt.new
   - 理由：AI app builder 热门，status 页面活跃，上游依赖事件多。

### 第二梯队

6. Tabnine
7. Lovable
8. Recraft
9. Notion / Notion AI
10. Character.AI
11. Midjourney

### 暂不推荐

- Suno：无稳定官方 status
- Pika：无稳定官方 status；API 走 Fal.ai
- Krea：无稳定官方 status
- Poe：无稳定官方 status
- DALL-E：OpenAI 已覆盖
- Flux：BFL 已覆盖
- Dream Machine：Luma 已覆盖
- Kimi K2/K1.5：Moonshot 已覆盖

---

## 8. Worker 实施建议

### 8.1 数据源配置结构

建议每个服务用如下结构：

```ts
type StatusSource = {
  id: string
  name: string
  platform:
    | "atlassian"
    | "betterstack"
    | "instatus"
    | "rootly"
    | "onlineornot"
    | "incidentio"
    | "aws_health"
    | "google_cloud"
    | "html"
    | "unknown"

  urls: {
    page: string
    json?: string
    feed?: string
    fallbackJson?: string
  }

  componentFilter?: string[]
  confidence: "high" | "medium" | "low"
  notes?: string
}
```

### 8.2 当前可直接落地的配置样例

```ts
export const statusSources: StatusSource[] = [
  {
    id: "vercel",
    name: "Vercel / v0",
    platform: "atlassian",
    urls: {
      page: "https://www.vercel-status.com/",
      json: "https://vercel.statuspage.io/api/v2/summary.json",
      fallbackJson: "https://www.vercel-status.com/api/v2/summary.json",
    },
    confidence: "high",
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    platform: "atlassian",
    urls: {
      page: "https://status.deepseek.com/",
      json: "https://deepseek.statuspage.io/api/v2/summary.json",
    },
    confidence: "high",
    notes: "主域页面显示 FlashDuty，但 statuspage.io 后端可用。",
  },
  {
    id: "moonshot",
    name: "Moonshot / Kimi",
    platform: "atlassian",
    urls: {
      page: "https://status.moonshot.cn/",
      json: "https://status.moonshot.cn/api/v2/summary.json",
    },
    confidence: "high",
  },
  {
    id: "bfl",
    name: "Black Forest Labs / FLUX",
    platform: "atlassian",
    urls: {
      page: "https://status.bfl.ml/",
      json: "https://status.bfl.ml/api/v2/summary.json",
    },
    confidence: "high",
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    platform: "onlineornot",
    urls: {
      page: "https://status.openrouter.ai/",
      json: "https://api.onlineornot.com/v1/status_pages/openrouter/summary",
    },
    confidence: "medium",
  },
  {
    id: "replit",
    name: "Replit",
    platform: "rootly",
    urls: {
      page: "https://status.replit.com/",
      json: "https://status.replit.com/api/v1/status.json",
      fallbackJson: "https://status.replit.com/api/v1/incidents.json",
    },
    confidence: "medium",
  },
  {
    id: "luma",
    name: "Luma",
    platform: "betterstack",
    urls: {
      page: "https://status.lumalabs.ai/",
      json: "https://status.lumalabs.ai/index.json",
      feed: "https://status.lumalabs.ai/feed.rss",
    },
    confidence: "high",
  },
  {
    id: "recraft",
    name: "Recraft",
    platform: "instatus",
    urls: {
      page: "https://recraft.instatus.com/",
      json: "https://recraft.instatus.com/v3/summary.json",
    },
    confidence: "high",
  },
]
```

### 8.3 失败状态必须显式

不要这样做：

```text
fetch 失败 -> 使用上一次缓存 -> 标成 operational
HTML 只看到绿图 -> 当作完整成功
接口 404 -> 换路径直到某个 HTML 返回 200 -> 标成成功
```

应该这样做：

```text
fetch 失败:
  source_status = "source_error"
  error_type = "http_403" | "http_404" | "timeout" | "parse_error" | "waf_challenge"
  displayed_status = last_known_status
  displayed_status_is_stale = true
  confidence = "low"
```

### 8.4 建议统一输出结构

```ts
type NormalizedStatus = {
  id: string
  name: string
  platform: string
  overall: "operational" | "degraded" | "partial_outage" | "major_outage" | "maintenance" | "unknown"
  sourceHealth: "ok" | "source_error" | "parse_error" | "blocked" | "unknown"
  confidence: "high" | "medium" | "low"
  updatedAt?: string
  components: Array<{
    id?: string
    name: string
    status: string
    normalizedStatus: string
  }>
  incidents: Array<{
    id?: string
    title: string
    status?: string
    severity?: string
    startedAt?: string
    resolvedAt?: string | null
    url?: string
  }>
  raw?: unknown
}
```

---

## 9. 待二次调查清单

这些不要在代码里写死成最终结论：

1. xAI
   - 目标：抓真实 Network XHR/fetch
   - 当前：unknown/custom，HTML 可看但 JSON 未确认

2. Midjourney
   - 目标：确认 `https://status.midjourney.com/` 是否仍稳定存在、是否有 JSON
   - 当前：值得加入，但先 low confidence

3. Mistral
   - 目标：确认 Checkly 是否有可匿名 status JSON
   - 当前：无公开 JSON，HTML 解析或 authenticated API

4. Lovable / Bolt.new
   - 目标：确认 incident.io 是否有公开 JSON endpoint 或只适合 HTML
   - 当前：页面稳定，适合加入；adapter 需单独写

5. Suno / Pika / Krea / Poe
   - 目标：确认是否后续上线官方 status
   - 当前：不加入官方 status 列表，可做 synthetic probe

---

## 10. 最终实施优先级

第一阶段，直接可做：

```text
Atlassian:
- Vercel / v0
- DeepSeek
- Moonshot / Kimi
- BFL / Flux
- Windsurf
- Tabnine
- GitHub Copilot
- Character.AI
- Notion

Better Stack:
- HuggingFace
- Luma
- Novita
- Better Stack-hosted services

Instatus:
- Recraft

Rootly:
- Replit

OnlineOrNot:
- OpenRouter
```

第二阶段，需要新 adapter：

```text
incident.io:
- Lovable
- Bolt.new

cloud vendor:
- AWS Bedrock
- Google Vertex AI
- Azure AI Foundry 如果还没做细组件
```

第三阶段，先别硬塞官方 status：

```text
- Suno
- Pika
- Krea
- Poe
- Midjourney 如果 JSON 未确认
- xAI 如果 JSON 未确认
```

---

## 11. 一句话版工程策略

先把 Atlassian / Better Stack / Instatus / Rootly / OnlineOrNot 五类适配器写稳；每个 adapter 严格输出 `sourceHealth`、`confidence`、`rawStatus`、`normalizedStatus`。任何 403、404、HTML fallback、WAF challenge 都只能标成低置信或 source_error，不能悄悄当成 operational。
