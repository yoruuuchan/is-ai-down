# is-ai-down

[中文](./README.zh-CN.md)

A public AI service status board. It aggregates official public status pages and lightweight public-page reachability probes, so users can quickly tell whether common AI services are having visible incidents.

Live: https://is-ai-down.yoru-and-akari.dev

## What it does

- Aggregates official status pages from AI products and infrastructure providers.
- Runs public-page reachability probes for services without a dedicated status page.
- Shows normalized service status, recent incidents, and public endpoint health.
- Provides a small feedback form for reporting missing services or suspicious status results.

## What it is not

This is not first-party telemetry from AI providers. A green status means the monitored public source or endpoint looked healthy at the time of the check. It does not guarantee that login, billing, model inference, regional access, or every product feature is working.

This is a personal public project provided as-is. There is no SLA, operational guarantee, or legal guarantee.

## Architecture

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

The frontend is a Next.js 16 static export served by Cloudflare Worker Assets. The backend is a Cloudflare Worker with scheduled polling and a D1 database.

## Local development

Frontend:

```bash
cd web
npm install
npm run dev
```

The frontend runs on http://localhost:3000.

Backend:

```bash
cd worker
npm install
npx wrangler dev --port 8788
```

The backend runs on http://localhost:8788. In local development, `web/.env.development` points the frontend to this Worker port.

## Data sources

The project uses official public status pages where available. For products without a meaningful standalone status page, it falls back to public-page probes. The data is normalized for display and should be treated as a public signal, not as a guarantee of product availability.

## Feedback

Use the feedback form on the live site, or open a GitHub Issue after this repository is public.

## License

This project is licensed under the GNU Affero General Public License v3.0. See [LICENSE](./LICENSE).

## Acknowledgements

Built collaboratively with Claude and Codex.
