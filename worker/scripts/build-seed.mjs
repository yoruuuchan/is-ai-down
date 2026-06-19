#!/usr/bin/env node
// Generates migrations/0002_seed.sql from the canonical service list.
// Run: node scripts/build-seed.mjs
//
// Why a generator and not a hand-written .sql?
//   - The frontend's seed lives in web/src/lib/services.ts; this script keeps
//     the worker seed in lock-step structurally (same ids, same brand colors,
//     same status enum values, etc.) without paying the cost of a TS importer.
//   - SQLite datetime('now', '-N minutes') expressions mean the "last update"
//     timestamps stay realistic no matter when the seed is replayed.
//
// To keep both lists in sync after editing services.ts, edit SERVICES below
// to match, then re-run this script and re-apply migrations/0002_seed.sql.

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const SERVICES = [
  { id:"chatgpt", n:"ChatGPT", co:"OpenAI", cat:"大众聊天", rg:"global", p:"P0", st:"operational", pat:"perfect", u7:0.9998, u90:0.9995, ago:2, bc:"#10A37F", at:"#fff", ini:"GP", sp:"status.openai.com", spu:"https://status.openai.com/", src:"official_ai_status_page", ep:[{label:"官网",url:"chatgpt.com",status:"up"},{label:"API",url:"api.openai.com",status:"up"},{label:"Platform",url:"platform.openai.com",status:"up"},{label:"文档",url:"platform.openai.com/docs",status:"up"}] },
  { id:"claude", n:"Claude", co:"Anthropic", cat:"大众聊天", rg:"global", p:"P0", st:"degraded", pat:"recent_issue", u7:0.9987, u90:0.9984, ago:5, bc:"#D97757", at:"#fff", ini:"CL", sp:"status.claude.com", spu:"https://status.claude.com/", src:"official_ai_status_page", ep:[{label:"官网",url:"claude.ai",status:"up"},{label:"API",url:"api.anthropic.com",status:"degraded"},{label:"Console",url:"console.anthropic.com",status:"up"},{label:"文档",url:"docs.anthropic.com",status:"up"}] },
  { id:"gemini", n:"Gemini", co:"Google", cat:"大众聊天", rg:"global", p:"P0", st:"operational", pat:"perfect", u7:0.9999, u90:0.9996, ago:1, bc:"#4285F4", at:"#fff", ini:"Ge", sp:"aistudio.google.com/status", spu:"https://aistudio.google.com/status", src:"official_ai_status_page", ep:[{label:"官网",url:"gemini.google.com",status:"up"},{label:"AI Studio",url:"aistudio.google.com",status:"up"},{label:"文档",url:"ai.google.dev",status:"up"}] },
  { id:"grok", n:"Grok", co:"xAI", cat:"大众聊天", rg:"global", p:"P0", st:"operational", pat:"perfect", u7:0.9991, u90:0.9988, ago:4, bc:"#1A1A1A", at:"#fff", ini:"Gk", sp:"status.x.ai", spu:"https://status.x.ai/", src:"official_ai_status_page", ep:[{label:"官网",url:"grok.com",status:"up"},{label:"Console",url:"console.x.ai",status:"up"},{label:"文档",url:"docs.x.ai",status:"up"}] },
  // DeepSeek: main domain shows FlashDuty page; statuspage.io backend is the
  // reliable JSON source (Atlassian Statuspage).
  { id:"deepseek", n:"DeepSeek", co:"DeepSeek", cat:"大众聊天", rg:"china", p:"P0", st:"partial_outage", pat:"some_issues", u7:0.9942, u90:0.9939, ago:3, bc:"#4D6BFE", at:"#fff", ini:"DS", sp:"status.deepseek.com", spu:"https://deepseek.statuspage.io/api/v2/summary.json", src:"official_ai_status_page", ep:[{label:"聊天",url:"chat.deepseek.com",status:"up"},{label:"官网",url:"deepseek.com",status:"up"},{label:"API",url:"api.deepseek.com",status:"degraded"},{label:"文档",url:"api-docs.deepseek.com",status:"up"}] },
  { id:"kimi", n:"Kimi", co:"月之暗面", cat:"大众聊天", rg:"china", p:"P0", st:"operational", pat:"perfect", u7:0.9988, u90:0.9985, ago:5, bc:"#6C5CE7", at:"#fff", ini:"Ki", sp:"status.moonshot.cn", spu:"https://status.moonshot.cn/", src:"official_ai_status_page", ep:[{label:"官网",url:"kimi.com",status:"up"},{label:"平台",url:"platform.moonshot.cn",status:"up"}] },
  { id:"perplexity", n:"Perplexity", co:"Perplexity AI", cat:"AI 搜索", rg:"global", p:"P0", st:"operational", pat:"perfect", u7:0.9996, u90:0.9993, ago:2, bc:"#20808D", at:"#fff", ini:"Px", sp:"status.perplexity.com", spu:"https://status.perplexity.com/", src:"official_ai_status_page", ep:[{label:"官网",url:"perplexity.ai",status:"up"},{label:"文档",url:"docs.perplexity.ai",status:"up"}] },
  { id:"cursor", n:"Cursor", co:"Anysphere", cat:"AI 编程", rg:"global", p:"P0", st:"operational", pat:"scattered", u7:0.9995, u90:0.9991, ago:3, bc:"#1A1A1A", at:"#fff", ini:"Cu", sp:"status.cursor.com", spu:"https://status.cursor.com/", src:"official_ai_status_page", ep:[{label:"官网",url:"cursor.com",status:"up"},{label:"文档",url:"docs.cursor.com",status:"up"}] },
  { id:"windsurf", n:"Windsurf", co:"Codeium", cat:"AI 编程", rg:"global", p:"P0", st:"maintenance", pat:"maintenance", u7:0.9980, u90:0.9978, ago:15, bc:"#00B4D8", at:"#fff", ini:"Ws", sp:"status.windsurf.com", spu:"https://status.windsurf.com/", src:"official_ai_status_page", ep:[{label:"官网",url:"windsurf.com",status:"up"},{label:"支持",url:"windsurf.com/support",status:"up"}] },
  { id:"huggingface", n:"Hugging Face", co:"Hugging Face", cat:"模型平台", rg:"global", p:"P0", st:"degraded", pat:"some_issues", u7:0.9965, u90:0.9962, ago:8, bc:"#FFD21E", at:"#1A1A1A", ini:"HF", sp:"status.huggingface.co", spu:"https://status.huggingface.co/", src:"betterstack", ep:[{label:"官网",url:"huggingface.co",status:"up"},{label:"Inference",url:"api-inference.huggingface.co",status:"degraded"},{label:"Hub",url:"huggingface.co/models",status:"up"},{label:"文档",url:"huggingface.co/docs",status:"up"}] },
  { id:"replicate", n:"Replicate", co:"Replicate", cat:"模型平台", rg:"global", p:"P0", st:"operational", pat:"perfect", u7:0.9994, u90:0.9991, ago:2, bc:"#262626", at:"#fff", ini:"Re", sp:"replicatestatus.com", spu:"https://www.replicatestatus.com/", src:"official_ai_status_page", ep:[{label:"官网",url:"replicate.com",status:"up"},{label:"API",url:"api.replicate.com",status:"up"},{label:"文档",url:"replicate.com/docs",status:"up"}] },
  // OpenRouter: status page powered by OnlineOrNot. spu is the public summary endpoint.
  { id:"openrouter", n:"OpenRouter", co:"OpenRouter", cat:"模型平台", rg:"global", p:"P0", st:"unknown", pat:"unknown", u7:null, u90:null, ago:null, bc:"#6366F1", at:"#fff", ini:"OR", sp:"status.openrouter.ai", spu:"https://api.onlineornot.com/v1/status_pages/openrouter/summary", src:"onlineornot", ep:[{label:"官网",url:"openrouter.ai",status:"unknown"},{label:"API",url:"openrouter.ai/api",status:"unknown"},{label:"文档",url:"openrouter.ai/docs",status:"unknown"}] },
  // Replit: powered by Rootly, exposes Atlassian-compatible JSON at /api/v1/status.json.
  { id:"replit", n:"Replit", co:"Replit", cat:"AI 编程", rg:"global", p:"P1", st:"operational", pat:"perfect", u7:0.9990, u90:0.9987, ago:3, bc:"#F26207", at:"#fff", ini:"Rp", sp:"status.replit.com", spu:"https://status.replit.com/api/v1/status.json", src:"official_ai_status_page", ep:[{label:"官网",url:"replit.com",status:"up"}] },
  { id:"manus", n:"Manus", co:"Manus", cat:"AI 编程", rg:"global", p:"P1", st:"operational", pat:"perfect", u7:0.9985, u90:0.9981, ago:6, bc:"#5046E5", at:"#fff", ini:"Ma", sp:"status.manus.im", spu:"https://status.manus.im/", src:"official_ai_status_page", ep:[{label:"官网",url:"manus.im",status:"up"}] },
  // Gamma: Instatus. Custom domain serves the same /v3/summary.json.
  { id:"gamma", n:"Gamma", co:"Gamma", cat:"设计/生产力", rg:"global", p:"P1", st:"operational", pat:"scattered", u7:0.9983, u90:0.9980, ago:7, bc:"#B197FC", at:"#fff", ini:"Ga", sp:"status.gamma.app", spu:"https://status.gamma.app/", src:"instatus", ep:[{label:"官网",url:"gamma.app",status:"up"}] },
  // Vercel: Atlassian Statuspage. Point at the statuspage.io backend so CN/edge networks always hit a JSON URL.
  { id:"vercel", n:"Vercel", co:"Vercel", cat:"模型平台", rg:"global", p:"P1", st:"operational", pat:"perfect", u7:0.9997, u90:0.9994, ago:2, bc:"#000000", at:"#fff", ini:"Ve", sp:"vercel-status.com", spu:"https://vercel.statuspage.io/api/v2/summary.json", src:"official_ai_status_page", ep:[{label:"官网",url:"vercel.com",status:"up"},{label:"AI Gateway 文档",url:"vercel.com/docs/ai-gateway",status:"up"}] },
  { id:"together", n:"Together AI", co:"Together AI", cat:"模型平台", rg:"global", p:"P1", st:"operational", pat:"perfect", u7:0.9992, u90:0.9989, ago:3, bc:"#2D2D2D", at:"#fff", ini:"To", sp:"status.together.ai", spu:"https://status.together.ai/", src:"official_ai_status_page", ep:[{label:"官网",url:"together.ai",status:"up"},{label:"API",url:"api.together.xyz",status:"up"},{label:"文档",url:"docs.together.ai",status:"up"}] },
  { id:"groq", n:"GroqCloud", co:"Groq", cat:"模型平台", rg:"global", p:"P1", st:"operational", pat:"scattered", u7:0.9989, u90:0.9985, ago:4, bc:"#F55036", at:"#fff", ini:"Gq", sp:"groqstatus.com", spu:"https://groqstatus.com/", src:"official_ai_status_page", ep:[{label:"官网",url:"groq.com",status:"up"},{label:"Console",url:"console.groq.com",status:"up"},{label:"文档",url:"console.groq.com/docs",status:"up"}] },
  { id:"mistral", n:"Mistral AI", co:"Mistral", cat:"模型平台", rg:"global", p:"P1", st:"operational", pat:"perfect", u7:0.9997, u90:0.9994, ago:2, bc:"#FF7000", at:"#fff", ini:"Mi", sp:"status.mistral.ai", spu:"https://status.mistral.ai/", src:"official_ai_status_page", ep:[{label:"官网",url:"mistral.ai",status:"up"},{label:"API",url:"api.mistral.ai",status:"up"},{label:"文档",url:"docs.mistral.ai",status:"up"}] },
  { id:"cohere", n:"Cohere", co:"Cohere", cat:"模型平台", rg:"global", p:"P1", st:"operational", pat:"perfect", u7:0.9993, u90:0.9990, ago:5, bc:"#39594C", at:"#fff", ini:"Co", sp:"status.cohere.com", spu:"https://status.cohere.com/", src:"official_ai_status_page", ep:[{label:"官网",url:"cohere.com",status:"up"},{label:"文档",url:"docs.cohere.com",status:"up"}] },
  { id:"fireworks", n:"Fireworks AI", co:"Fireworks", cat:"模型平台", rg:"global", p:"P1", st:"operational", pat:"perfect", u7:0.9991, u90:0.9988, ago:4, bc:"#5B1FE0", at:"#fff", ini:"Fi", sp:"status.fireworks.ai", spu:"https://status.fireworks.ai/", src:"official_ai_status_page", ep:[{label:"官网",url:"fireworks.ai",status:"up"},{label:"文档",url:"docs.fireworks.ai",status:"up"}] },
  { id:"azure-ai", n:"Microsoft Foundry", co:"Microsoft", cat:"模型平台", rg:"global", p:"P1", st:"operational", pat:"scattered", u7:0.9988, u90:0.9984, ago:6, bc:"#00A4EF", at:"#fff", ini:"MS", sp:"status.ai.azure.com", spu:"https://status.ai.azure.com/", src:"cloud_health_dashboard", ep:[{label:"AI Foundry",url:"ai.azure.com",status:"up"},{label:"Azure OpenAI",url:"azure.microsoft.com/products/ai-services/openai-service",status:"up"}] },
  { id:"stability", n:"Stability AI", co:"Stability AI", cat:"图像/音视频", rg:"global", p:"P1", st:"degraded", pat:"recent_issue", u7:0.9971, u90:0.9968, ago:10, bc:"#5B4CE0", at:"#fff", ini:"SA", sp:"status.stability.ai", spu:"https://status.stability.ai/", src:"official_ai_status_page", ep:[{label:"官网",url:"stability.ai",status:"up"},{label:"API",url:"api.stability.ai",status:"degraded"},{label:"文档",url:"platform.stability.ai/docs",status:"up"}] },
  { id:"runway", n:"Runway", co:"Runway", cat:"图像/音视频", rg:"global", p:"P1", st:"operational", pat:"perfect", u7:0.9992, u90:0.9988, ago:3, bc:"#1A1A1A", at:"#fff", ini:"Rw", sp:"status.runway.team", spu:"https://status.runway.team/", src:"official_ai_status_page", ep:[{label:"官网",url:"runwayml.com",status:"up"}] },
  { id:"elevenlabs", n:"ElevenLabs", co:"ElevenLabs", cat:"图像/音视频", rg:"global", p:"P1", st:"operational", pat:"perfect", u7:0.9995, u90:0.9992, ago:2, bc:"#1A1A1A", at:"#fff", ini:"EL", sp:"status.elevenlabs.io", spu:"https://status.elevenlabs.io/", src:"official_ai_status_page", ep:[{label:"官网",url:"elevenlabs.io",status:"up"},{label:"API",url:"api.elevenlabs.io",status:"up"},{label:"文档",url:"elevenlabs.io/docs",status:"up"}] },
  { id:"luma", n:"Luma AI", co:"Luma Labs", cat:"图像/音视频", rg:"global", p:"P1", st:"operational", pat:"perfect", u7:0.9986, u90:0.9983, ago:5, bc:"#1A1A1A", at:"#fff", ini:"Lu", sp:"status.lumalabs.ai", spu:"https://status.lumalabs.ai/", src:"betterstack", ep:[{label:"官网",url:"lumalabs.ai",status:"up"}] },
  { id:"ideogram", n:"Ideogram", co:"Ideogram", cat:"图像/音视频", rg:"global", p:"P1", st:"operational", pat:"perfect", u7:0.9984, u90:0.9980, ago:8, bc:"#8B5CF6", at:"#fff", ini:"Id", sp:"status.ideogram.ai", spu:"https://status.ideogram.ai/", src:"official_ai_status_page", ep:[{label:"官网",url:"ideogram.ai",status:"up"}] },
  { id:"adobe", n:"Adobe Firefly", co:"Adobe", cat:"设计/生产力", rg:"global", p:"P1", st:"operational", pat:"perfect", u7:0.9993, u90:0.9990, ago:4, bc:"#FA0F00", at:"#fff", ini:"Ad", sp:"status.adobe.com/products/536716", spu:"https://status.adobe.com/products/536716", src:"cloud_health_dashboard", ep:[{label:"Firefly",url:"firefly.adobe.com",status:"up",bodyMustContain:["Firefly"]}] },
  { id:"canva", n:"Canva", co:"Canva", cat:"设计/生产力", rg:"global", p:"P1", st:"operational", pat:"perfect", u7:0.9996, u90:0.9993, ago:3, bc:"#00C4CC", at:"#fff", ini:"Cv", sp:"canvastatus.com", spu:"https://www.canvastatus.com/", src:"official_ai_status_page", ep:[{label:"官网",url:"canva.com",status:"up"}] },
  { id:"figma", n:"Figma", co:"Figma", cat:"设计/生产力", rg:"global", p:"P1", st:"operational", pat:"perfect", u7:0.9994, u90:0.9991, ago:3, bc:"#F24E1E", at:"#fff", ini:"Fg", sp:"status.figma.com", spu:"https://status.figma.com/", src:"official_ai_status_page", ep:[{label:"官网",url:"figma.com",status:"up"}] },
  { id:"alibaba-bailian", n:"阿里云百炼", co:"阿里云", cat:"模型平台", rg:"china", p:"P1", st:"operational", pat:"perfect", u7:0.9990, u90:0.9987, ago:5, bc:"#FF6A00", at:"#fff", ini:"AL", sp:"status.alibabacloud.com", spu:"https://status.alibabacloud.com/", src:"cloud_health_dashboard", ep:[{label:"百炼控制台",url:"bailian.console.aliyun.com",status:"up"},{label:"DashScope",url:"dashscope.console.aliyun.com",status:"up"}] },
  { id:"baidu-qianfan", n:"百度千帆", co:"百度智能云", cat:"模型平台", rg:"china", p:"P1", st:"operational", pat:"perfect", u7:0.9985, u90:0.9982, ago:7, bc:"#2932E1", at:"#fff", ini:"BD", sp:"cloud.baidu.com/status.html", spu:"https://cloud.baidu.com/status.html", src:"cloud_health_dashboard", ep:[{label:"千帆控制台",url:"qianfan.cloud.baidu.com",status:"up"}] },
  { id:"tencent-hunyuan", n:"腾讯混元", co:"腾讯云", cat:"模型平台", rg:"china", p:"P1", st:"operational", pat:"perfect", u7:0.9988, u90:0.9985, ago:6, bc:"#006EFF", at:"#fff", ini:"TC", sp:"status.tencentcloud.com", spu:"https://status.tencentcloud.com/", src:"cloud_health_dashboard", ep:[{label:"混元",url:"hunyuan.tencent.com",status:"up"}] },
  { id:"baseten", n:"Baseten", co:"Baseten", cat:"模型平台", rg:"global", p:"P2", st:"operational", pat:"perfect", u7:0.9987, u90:0.9984, ago:9, bc:"#6366F1", at:"#fff", ini:"Bt", sp:"status.baseten.co", spu:"https://status.baseten.co/", src:"official_ai_status_page", ep:[{label:"官网",url:"baseten.co",status:"up"}] },
  { id:"novita", n:"Novita AI", co:"Novita AI", cat:"模型平台", rg:"global", p:"P2", st:"operational", pat:"perfect", u7:0.9981, u90:0.9978, ago:12, bc:"#5046E5", at:"#fff", ini:"Nv", sp:"status.novita.ai", spu:"https://status.novita.ai/", src:"betterstack", ep:[{label:"官网",url:"novita.ai",status:"up"}] },
  { id:"bfl", n:"Black Forest Labs", co:"BFL", cat:"图像/音视频", rg:"global", p:"P2", st:"operational", pat:"perfect", u7:0.9979, u90:0.9976, ago:11, bc:"#1A1A1A", at:"#fff", ini:"BF", sp:"status.bfl.ml", spu:"https://status.bfl.ml/", src:"official_ai_status_page", ep:[{label:"官网",url:"bfl.ai",status:"up"},{label:"文档",url:"docs.bfl.ml",status:"up"}] },
  { id:"udio", n:"Udio", co:"Udio", cat:"图像/音视频", rg:"global", p:"P2", st:"operational", pat:"perfect", u7:0.9976, u90:0.9973, ago:14, bc:"#00FFAA", at:"#1A1A1A", ini:"Ud", sp:"status.udio.com", spu:"https://status.udio.com/", src:"betterstack", ep:[{label:"官网",url:"udio.com",status:"up"}] },

  // ──────────────────── Phase G additions (ai-status-sources.md §7) ────────────────────
  // Atlassian Statuspage hosts:
  { id:"copilot", n:"GitHub Copilot", co:"GitHub", cat:"AI 编程", rg:"global", p:"P0", st:"unknown", pat:"unknown", u7:null, u90:null, ago:null, bc:"#1A1A1A", at:"#fff", ini:"GC", sp:"www.githubstatus.com", spu:"https://www.githubstatus.com/api/v2/summary.json", src:"official_ai_status_page", ep:[{label:"官网",url:"github.com",status:"unknown"},{label:"Copilot",url:"github.com/features/copilot",status:"unknown"}] },
  { id:"tabnine", n:"Tabnine", co:"Tabnine", cat:"AI 编程", rg:"global", p:"P1", st:"unknown", pat:"unknown", u7:null, u90:null, ago:null, bc:"#3DBDD5", at:"#fff", ini:"Tn", sp:"status.tabnine.com", spu:"https://status.tabnine.com/", src:"official_ai_status_page", ep:[{label:"官网",url:"tabnine.com",status:"unknown"}] },
  { id:"character-ai", n:"Character.AI", co:"Character.AI", cat:"大众聊天", rg:"global", p:"P1", st:"unknown", pat:"unknown", u7:null, u90:null, ago:null, bc:"#1E40AF", at:"#fff", ini:"Ch", sp:"status.character.ai", spu:"https://status.character.ai/", src:"official_ai_status_page", ep:[{label:"官网",url:"character.ai",status:"unknown"}] },
  { id:"notion", n:"Notion / Notion AI", co:"Notion", cat:"设计/生产力", rg:"global", p:"P1", st:"unknown", pat:"unknown", u7:null, u90:null, ago:null, bc:"#1A1A1A", at:"#fff", ini:"No", sp:"www.notion-status.com", spu:"https://www.notion-status.com/", src:"official_ai_status_page", ep:[{label:"官网",url:"notion.so",status:"unknown"}] },
  // Windsurf already exists above as `windsurf`; not re-added.

  // Instatus host:
  { id:"recraft", n:"Recraft", co:"Recraft", cat:"图像/音视频", rg:"global", p:"P2", st:"unknown", pat:"unknown", u7:null, u90:null, ago:null, bc:"#1A1A1A", at:"#fff", ini:"Rc", sp:"recraft.instatus.com", spu:"https://recraft.instatus.com/", src:"instatus", ep:[{label:"官网",url:"recraft.ai",status:"unknown"}] },

  // incident.io hosts:
  { id:"lovable", n:"Lovable", co:"Lovable", cat:"AI 编程", rg:"global", p:"P1", st:"unknown", pat:"unknown", u7:null, u90:null, ago:null, bc:"#FF4F8B", at:"#fff", ini:"Lv", sp:"status.lovable.dev", spu:"https://status.lovable.dev/", src:"incidentio", ep:[{label:"官网",url:"lovable.dev",status:"unknown"}] },
  { id:"bolt", n:"Bolt.new", co:"StackBlitz", cat:"AI 编程", rg:"global", p:"P1", st:"unknown", pat:"unknown", u7:null, u90:null, ago:null, bc:"#1A1A1A", at:"#fff", ini:"Bo", sp:"status.bolt.new", spu:"https://status.bolt.new/", src:"incidentio", ep:[{label:"官网",url:"bolt.new",status:"unknown"}] },
];

const INCIDENTS = [
  { svc:"claude",      agoH:0,  title:"API 延迟升高，部分请求超时",    is:"investigating", sev:"degraded" },
  { svc:"deepseek",    agoH:3,  title:"API 频率限制异常，部分请求 429", is:"identified",    sev:"partial_outage" },
  { svc:"huggingface", agoH:4,  title:"Inference API 间歇性超时",      is:"monitoring",    sev:"degraded" },
  { svc:"stability",   agoH:5,  title:"图像生成 API 响应缓慢",          is:"investigating", sev:"degraded" },
  { svc:"windsurf",    agoH:12, title:"计划系统维护",                   is:"maintenance",   sev:"notice" },
  { svc:"chatgpt",     agoH:20, title:"网页版短暂中断",                 is:"resolved",      sev:"partial_outage" },
  { svc:"openrouter",  agoH:44, title:"状态页无响应",                   is:"investigating", sev:"unknown" },
];

const sortOrder = (p) => (p === "P0" ? 100 : p === "P1" ? 200 : 300);
const q = (v) => (v === null ? "NULL" : `'${String(v).replace(/'/g, "''")}'`);
const num = (v) => (v === null ? "NULL" : String(v));

const lines = [
  "-- Generated by scripts/build-seed.mjs — edit the script, not this file.",
  "-- D1 wraps file execution itself; statements run one-by-one.",
  "DELETE FROM incidents;",
  "DELETE FROM status_snapshots;",
  "DELETE FROM services;",
];

SERVICES.forEach((s, i) => {
  lines.push(
    `INSERT INTO services (id, name, company, category, region_group, priority, brand_color, avatar_text, initial, status_page, status_page_url, source_type, endpoints_json, sort_order) VALUES (${q(s.id)}, ${q(s.n)}, ${q(s.co)}, ${q(s.cat)}, ${q(s.rg)}, ${q(s.p)}, ${q(s.bc)}, ${q(s.at)}, ${q(s.ini)}, ${q(s.sp)}, ${q(s.spu)}, ${q(s.src)}, ${q(JSON.stringify(s.ep))}, ${sortOrder(s.p) + i});`
  );
});

SERVICES.forEach((s) => {
  if (s.ago === null) return; // No snapshot → LEFT JOIN returns NULL → API emits "unknown".
  const checked = `datetime('now', '-${s.ago} minutes')`;
  lines.push(
    `INSERT INTO status_snapshots (service_id, status, pattern_hint, uptime_7d, uptime_90d, endpoints_json, checked_at) VALUES (${q(s.id)}, ${q(s.st)}, ${q(s.pat)}, ${num(s.u7)}, ${num(s.u90)}, ${q(JSON.stringify(s.ep))}, ${checked});`
  );
});

INCIDENTS.forEach((x, i) => {
  const started = `datetime('now', '-${x.agoH} hours')`;
  lines.push(
    `INSERT INTO incidents (id, service_id, title, inc_status, severity, started_at, updated_at) VALUES (${q(`seed-${i}-${x.svc}`)}, ${q(x.svc)}, ${q(x.title)}, ${q(x.is)}, ${q(x.sev)}, ${started}, ${started});`
  );
});

// (no COMMIT — see header)

const out = join(__dirname, "..", "migrations", "0002_seed.sql");
writeFileSync(out, lines.join("\n") + "\n", "utf8");
console.log(`Wrote ${lines.length} statements to ${out}`);
