# AI Status Board / AI 服务公开状态巡检台需求文档

版本：v0.1
日期：2026-06-18
定位：轻量版 public status monitor，不做登录态真实体验探针。

---

## 1. 项目一句话

做一个聚合 AI 服务官方状态页与公开页面可访问性的状态看板，让用户在 ChatGPT、Claude、Gemini、Cursor、DeepSeek、Kimi 等服务不好用时，能先判断：是不是官方已经承认异常、公开页面是否挂了、API 是否降级。

---

## 2. 核心边界

本项目第一版只做公开层面的状态监控。

第一版做：

- 聚合官方 status page / health dashboard。
- 检测公开页面可访问性，例如官网首页、登录页、API 文档页、Console 公开入口。
- 展示当前状态、最近事故、最后检测时间、状态源类型。
- 标注不同状态源的可信度和覆盖范围。
- 支持国内外 AI 服务分类展示。


必须展示的边界文案：

> 本站监测官方状态页与公开页面可访问性，不代表登录后聊天功能一定正常。

---

## 3. 产品形态

首页是一个状态看板。

核心模块：

1. 顶部总览
   - 服务总数
   - 正常数量
   - 部分异常数量
   - 异常数量
   - 维护中数量
   - 未知数量
   - 今日事件数量
   - 最后更新时间

2. 服务卡片列表
   - 服务名
   - 公司名
   - 产品分类
   - 官方状态
   - 公开页面访问状态
   - API 状态
   - 状态源类型
   - 最后检测时间
   - 官方状态页链接
   - 详情入口

3. 近期事件
   - 事件标题
   - 影响服务
   - 事件状态：investigating / identified / monitoring / resolved / maintenance
   - 严重程度：notice / degraded / partial_outage / major_outage
   - 开始时间
   - 更新时间
   - 来源链接

4. 服务详情页
   - 服务基本信息
   - 官方 status page 原始链接
   - 公开探针 URL 列表
   - 最近 24 小时状态
   - 最近 7 天事件
   - 最近 90 天历史 uptime，如果来源支持
   - 状态源可信度说明

5. 状态源管理
   - 每个服务配置一组 source
   - 可配置检测频率
   - 可配置探针地区
   - 可配置 status source type
   - 可配置解析策略

---

## 4. 状态分类

统一状态枚举：

```ts
type NormalizedStatus =
  | "operational"
  | "degraded"
  | "partial_outage"
  | "major_outage"
  | "maintenance"
  | "unknown";
```

前端中文展示：

| normalized_status | 中文 | 说明 |
|---|---|---|
| operational | 正常 | 官方状态正常，公开页面可访问 |
| degraded | 降级 | 仍可用，但官方或探针显示性能下降 |
| partial_outage | 部分异常 | 部分组件不可用 |
| major_outage | 异常 | 核心服务不可用或官方声明 outage |
| maintenance | 维护中 | 官方计划维护或临时维护 |
| unknown | 未知 | 无法解析、无法访问状态源、来源不明确 |

注意：unknown 不能默认当成 operational。未知就是未知。

---

## 5. 状态源类型

国内外生态不一样，必须给每个服务标注状态源类型。

```ts
type StatusSourceType =
  | "official_ai_status_page"
  | "cloud_health_dashboard"
  | "public_page_probe_only"
  | "docs_or_notice_only"
  | "third_party_only"
  | "unknown";
```

解释：

| 类型 | 含义 | 可信度 | 示例 |
|---|---|---|---|
| official_ai_status_page | AI 产品自己的官方状态页 | 高 | OpenAI、Claude、DeepSeek、Kimi |
| cloud_health_dashboard | 云厂商大健康看板，需要筛 AI 产品 | 中高 | 阿里云、腾讯云、百度智能云 |
| public_page_probe_only | 没有独立 status，只能检测公开页面 | 中 | MiniMax、智谱、火山方舟 |
| docs_or_notice_only | 只有文档、公告、帮助中心，没有稳定状态页 | 中低 | 讯飞星火等 |
| third_party_only | 只能找到第三方状态监控 | 低 | 暂不建议作为 MVP 主数据 |
| unknown | 未确认来源 | 低 | 暂缓 |

---

## 6. 第一批 MVP 服务清单

第一批不要太大。建议先接 12 个，保证体验稳定。

| 优先级 | 产品 | 公司 | 分类 | 状态源类型 | 官方状态页 / 健康页 |
|---|---|---|---|---|---|
| P0 | ChatGPT / OpenAI API / Codex | OpenAI | 大众聊天 / API / 编程 | official_ai_status_page | https://status.openai.com/ |
| P0 | Claude / Claude API / Claude Code | Anthropic | 大众聊天 / API / 编程 | official_ai_status_page | https://status.claude.com/ |
| P0 | Gemini / AI Studio / Gemini API | Google | 大众聊天 / API | official_ai_status_page | https://aistudio.google.com/status |
| P0 | Grok / xAI API | xAI | 大众聊天 / API | official_ai_status_page | https://status.x.ai/ |
| P0 | Perplexity | Perplexity AI | AI 搜索 / API | official_ai_status_page | https://status.perplexity.com/ |
| P0 | Cursor | Anysphere | AI 编程 | official_ai_status_page | https://status.cursor.com/ |
| P0 | Windsurf | Windsurf / Codeium | AI 编程 | official_ai_status_page | https://status.windsurf.com/ |
| P0 | DeepSeek | DeepSeek | 国内大众聊天 / API | official_ai_status_page | https://status.deepseek.com/ |
| P0 | Kimi / Moonshot API | Moonshot AI | 国内大众聊天 / API | official_ai_status_page | https://status.moonshot.cn/ |
| P0 | Hugging Face | Hugging Face | 模型平台 / 推理 / Hub | official_ai_status_page | https://status.huggingface.co/ |
| P0 | Replicate | Replicate | 模型推理 / 训练 | official_ai_status_page | https://www.replicatestatus.com/ |
| P0 | OpenRouter | OpenRouter | 模型路由 / API 聚合 | official_ai_status_page | https://status.openrouter.ai/ |

---

## 7. 大众聊天 / 通用 AI

| 产品 | 公司 | 状态源类型 | 官方状态页 / 健康页 | 公开探针建议 | 备注 |
|---|---|---|---|---|---|
| ChatGPT | OpenAI | official_ai_status_page | https://status.openai.com/ | https://chatgpt.com/ / https://openai.com/ / https://platform.openai.com/docs | 覆盖 APIs、ChatGPT、Codex 等组件 |
| Claude | Anthropic | official_ai_status_page | https://status.claude.com/ | https://claude.ai/ / https://console.anthropic.com/ / https://docs.anthropic.com/ | 覆盖 claude.ai、Console、API、Claude Code 等 |
| Gemini | Google | official_ai_status_page | https://aistudio.google.com/status | https://gemini.google.com/ / https://aistudio.google.com/ / https://ai.google.dev/ | AI Studio 状态页偏 Gemini API / AI Studio |
| Grok | xAI | official_ai_status_page | https://status.x.ai/ | https://grok.com/ / https://console.x.ai/ / https://docs.x.ai/ | xAI 状态页含 live service data |
| Perplexity | Perplexity AI | official_ai_status_page | https://status.perplexity.com/ | https://www.perplexity.ai/ / https://docs.perplexity.ai/ | 覆盖 Website、API |
| Character.AI | Character.AI | unknown / public_page_probe_only | https://status.character.ai/ | https://character.ai/ | 当前状态页可访问性/活跃度需要二次确认，MVP 暂缓 |

---

## 8. AI 编程 / Agent / 生产力

| 产品 | 公司 | 状态源类型 | 官方状态页 / 健康页 | 公开探针建议 | MVP 建议 |
|---|---|---|---|---|---|
| Cursor | Anysphere | official_ai_status_page | https://status.cursor.com/ | https://cursor.com/ / https://docs.cursor.com/ | P0 |
| Windsurf | Windsurf / Codeium | official_ai_status_page | https://status.windsurf.com/ | https://windsurf.com/ / https://windsurf.com/support | P0 |
| Replit / Replit Agent | Replit | official_ai_status_page | https://status.replit.com/ | https://replit.com/ | P1 |
| Manus | Manus | official_ai_status_page | https://status.manus.im/ | https://manus.im/ | P1 |
| Gamma | Gamma | official_ai_status_page | https://status.gamma.app/ | https://gamma.app/ | P1 |
| Vercel / AI Gateway 周边 | Vercel | cloud/platform_status | https://www.vercel-status.com/ | https://vercel.com/ / https://vercel.com/docs/ai-gateway | P1，偏平台 |

---

## 9. 模型 API / 推理平台 / 开发者平台

| 产品 | 公司 | 状态源类型 | 官方状态页 / 健康页 | 公开探针建议 | MVP 建议 |
|---|---|---|---|---|---|
| Hugging Face | Hugging Face | official_ai_status_page | https://status.huggingface.co/ | https://huggingface.co/ / https://huggingface.co/docs | P0 |
| Replicate | Replicate | official_ai_status_page | https://www.replicatestatus.com/ | https://replicate.com/ / https://replicate.com/docs | P0 |
| OpenRouter | OpenRouter | official_ai_status_page | https://status.openrouter.ai/ | https://openrouter.ai/ / https://openrouter.ai/docs | P0 |
| Together AI | Together AI | official_ai_status_page | https://status.together.ai/ | https://www.together.ai/ / https://docs.together.ai/ | P1 |
| GroqCloud | Groq | official_ai_status_page | https://groqstatus.com/ | https://console.groq.com/ / https://groq.com/ | P1 |
| Mistral AI | Mistral | official_ai_status_page | https://status.mistral.ai/ | https://mistral.ai/ / https://docs.mistral.ai/ | P1 |
| Cohere | Cohere | official_ai_status_page | https://status.cohere.com/ | https://cohere.com/ / https://docs.cohere.com/ | P1 |
| Fireworks AI | Fireworks | official_ai_status_page | https://status.fireworks.ai/ | https://fireworks.ai/ / https://docs.fireworks.ai/ | P1 |
| Baseten | Baseten | official_ai_status_page | https://status.baseten.co/ | https://www.baseten.co/ / https://docs.baseten.co/ | P2 |
| Novita AI | Novita AI | official_ai_status_page | https://status.novita.ai/ | https://novita.ai/ | P2 |
| Microsoft Foundry / Azure AI | Microsoft | cloud_health_dashboard | https://status.ai.azure.com/ | https://ai.azure.com/ / https://azure.microsoft.com/products/ai-services/openai-service | P1，偏企业/云平台 |

---

## 10. 图像 / 视频 / 音频 / 设计类 AI

| 产品 | 公司 | 状态源类型 | 官方状态页 / 健康页 | 公开探针建议 | MVP 建议 |
|---|---|---|---|---|---|
| Stability AI | Stability AI | official_ai_status_page | https://status.stability.ai/ | https://stability.ai/ / https://platform.stability.ai/ | P1 |
| Runway | Runway | official_ai_status_page | https://status.runway.team/ | https://runwayml.com/ | P1 |
| ElevenLabs | ElevenLabs | official_ai_status_page | https://status.elevenlabs.io/ | https://elevenlabs.io/ / https://elevenlabs.io/docs | P1 |
| Luma AI | Luma Labs | official_ai_status_page | https://status.lumalabs.ai/ | https://lumalabs.ai/ | P1 |
| Ideogram | Ideogram | official_ai_status_page | https://status.ideogram.ai/ | https://ideogram.ai/ | P1 |
| Black Forest Labs / FLUX | BFL | official_ai_status_page | https://status.bfl.ml/ | https://bfl.ai/ / https://docs.bfl.ml/ | P2 |
| Udio | Udio | official_ai_status_page | https://status.udio.com/ | https://www.udio.com/ | P2 |
| Adobe / Firefly | Adobe | cloud/platform_status | https://status.adobe.com/ | https://firefly.adobe.com/ | P1，但要筛 Firefly 产品，避免 Adobe 全家桶污染 |
| Canva | Canva | official_platform_status | https://www.canvastatus.com/ | https://www.canva.com/ | P1，偏设计平台 |
| Figma / Figma Make | Figma | official_platform_status | https://status.figma.com/ | https://www.figma.com/ | P1，偏设计平台 |

---

## 11. 国内 / 中文生态

国内生态必须拆成三层：独立 AI 状态页、云厂商健康看板、公开页面探针。

### 11.1 第一批国内建议

| 产品 | 公司 | 状态源类型 | 官方状态页 / 健康页 | 公开探针建议 | MVP 建议 |
|---|---|---|---|---|---|
| DeepSeek | DeepSeek | official_ai_status_page | https://status.deepseek.com/ | https://chat.deepseek.com/ / https://www.deepseek.com/ / https://api-docs.deepseek.com/ | P0 |
| Kimi / Moonshot API | 月之暗面 | official_ai_status_page | https://status.moonshot.cn/ | https://www.kimi.com/ / https://platform.moonshot.cn/ | P0 |
| 阿里云百炼 / DashScope / Qwen 云服务 | 阿里云 | cloud_health_dashboard | https://status.alibabacloud.com/ | https://bailian.console.aliyun.com/ / https://dashscope.console.aliyun.com/ / https://help.aliyun.com/zh/model-studio/ | P1，需要筛 AI 服务 |
| 百度千帆 / 文心 | 百度智能云 | cloud_health_dashboard / docs_or_notice_only | https://cloud.baidu.com/status.html | https://qianfan.cloud.baidu.com/ / https://cloud.baidu.com/product/qianfan.html | P1，需要确认千帆是否可在健康看板中稳定筛选 |
| 腾讯混元 / 腾讯云 AI | 腾讯云 | cloud_health_dashboard | https://status.tencentcloud.com/ | https://cloud.tencent.com/product/hunyuan / https://hunyuan.tencent.com/ | P1，需要确认混元服务筛选方式 |

### 11.2 第二批国内建议

| 产品 | 公司 | 状态源类型 | 状态源 / 公开页 | 公开探针建议 | MVP 建议 |
|---|---|---|---|---|---|
| 火山方舟 / 豆包 API | 火山引擎 / 字节 | public_page_probe_only / docs_or_notice_only | 暂未确认独立 status | https://www.volcengine.com/product/ark / https://www.volcengine.com/docs/82379/1399008 / https://console.volcengine.com/ark | P2 |
| MiniMax | MiniMax | public_page_probe_only / docs_or_notice_only | 暂未确认独立 status | https://platform.minimaxi.com/ / https://platform.minimax.io/ / https://www.minimax.io/ | P2 |
| 智谱 GLM / Z.ai / BigModel | 智谱 AI | public_page_probe_only / docs_or_notice_only | 暂未确认独立 status | https://open.bigmodel.cn/ / https://bigmodel.cn/ / https://z.ai/ | P2 |
| 讯飞星火 | 科大讯飞 | docs_or_notice_only | 暂未确认独立 status | https://xinghuo.xfyun.cn/ / https://www.xfyun.cn/doc/spark/ | P2 |
| 华为云盘古 | 华为云 | cloud_health_dashboard / docs_or_notice_only | 暂未确认盘古独立 status | https://www.huaweicloud.com/product/pangu.html | P3 |
| 商汤日日新 | 商汤 | unknown / public_page_probe_only | 暂未确认独立 status | 产品页待补 | P3 |
| 百川智能 | 百川 | unknown / public_page_probe_only | 暂未确认独立 status | 产品页待补 | P3 |
| 零一万物 | 01.AI | unknown / public_page_probe_only | 暂未确认独立 status | 产品页待补 | P3 |
| 阶跃星辰 | StepFun | unknown / public_page_probe_only | 暂未确认独立 status | 产品页待补 | P3 |
| 昆仑万维天工 | 昆仑万维 | unknown / public_page_probe_only | 暂未确认独立 status | 产品页待补 | P3 |
| 360 智脑 | 360 | unknown / public_page_probe_only | 暂未确认独立 status | 产品页待补 | P3 |

国内注意事项：

- 独立 AI status page 很少。
- 很多状态藏在云厂商健康看板、控制台公告、文档、工单系统里。
- 云厂商健康看板会包含大量非 AI 服务，必须做产品筛选。
- 没有独立状态页的服务不要硬标“正常”，只能展示公开页面探针结果。
- 对 public_page_probe_only 的服务，前端要明确显示“无官方状态页，仅检测公开页面”。

---

## 12. 数据结构建议

### 12.1 Service

```ts
type Service = {
  id: string;
  name: string;
  company: string;
  regionGroup: "global" | "china" | "mixed";
  category:
    | "general_chat"
    | "ai_search"
    | "coding_agent"
    | "model_api"
    | "inference_platform"
    | "image_video_audio"
    | "design_productivity"
    | "cloud_platform"
    | "domestic_ai";

  priority: "P0" | "P1" | "P2" | "P3";

  statusSourceType:
    | "official_ai_status_page"
    | "cloud_health_dashboard"
    | "public_page_probe_only"
    | "docs_or_notice_only"
    | "third_party_only"
    | "unknown";

  officialStatusUrl?: string;
  publicProbeUrls: ProbeUrl[];

  homepageUrl?: string;
  docsUrl?: string;
  apiDocsUrl?: string;
  consoleUrl?: string;

  notes?: string;
  enabled: boolean;
};
```

### 12.2 ProbeUrl

```ts
type ProbeUrl = {
  label: string;
  url: string;
  probeType: "homepage" | "login_page" | "docs" | "api_docs" | "console_public_entry" | "status_page";
  expectedStatusCodes: number[];
  timeoutMs: number;
  followRedirects: boolean;
  regions?: string[];
};
```

### 12.3 StatusSnapshot

```ts
type StatusSnapshot = {
  serviceId: string;
  checkedAt: string;
  normalizedStatus: NormalizedStatus;

  officialStatus?: {
    sourceUrl: string;
    rawStatusText?: string;
    parsedStatus?: NormalizedStatus;
    components?: StatusComponent[];
    activeIncidents?: Incident[];
  };

  publicProbe?: {
    overallStatus: "reachable" | "unreachable" | "degraded" | "unknown";
    probes: ProbeResult[];
  };

  confidence: "high" | "medium" | "low";
  reason: string;
};
```

### 12.4 ProbeResult

```ts
type ProbeResult = {
  label: string;
  url: string;
  region: string;
  checkedAt: string;
  httpStatus?: number;
  responseTimeMs?: number;
  success: boolean;
  errorType?: "timeout" | "dns_error" | "tls_error" | "http_error" | "blocked" | "unknown";
  errorMessage?: string;
};
```

### 12.5 Incident

```ts
type Incident = {
  id: string;
  serviceId: string;
  title: string;
  sourceUrl: string;
  status: "investigating" | "identified" | "monitoring" | "resolved" | "maintenance" | "unknown";
  severity: "notice" | "degraded" | "partial_outage" | "major_outage" | "unknown";
  startedAt?: string;
  updatedAt?: string;
  resolvedAt?: string;
  affectedComponents?: string[];
  rawText?: string;
};
```

---

## 13. 解析策略

### 13.1 官方状态页

优先级：

1. 官方 JSON API，如果 status page 提供。
2. 官方 RSS / Atom feed。
3. 页面 HTML 解析。
4. 只记录链接，不解析，人工补规则。

很多 status page 基于 Atlassian Statuspage、Better Stack、Instatus、OnlineOrNot、Checkly 等服务搭建。可以优先识别平台类型，再写通用 parser。

### 13.2 公开页面探针

探针规则：

- 使用服务端定时任务发起，不在浏览器端直接请求，避免 CORS 问题。
- 默认 GET 请求。
- 超时时间 5-10 秒。
- 2xx / 3xx 一般视为 reachable。
- 401 / 403 对 console 入口不一定算异常，需要按 URL 类型配置。
- 429 可能代表限流，需要单独记录。
- 5xx 算异常。
- DNS / TLS / timeout 算异常。
- 每次检测保存 response time。
- 多地区探针后续再加，MVP 可以先单地区。
