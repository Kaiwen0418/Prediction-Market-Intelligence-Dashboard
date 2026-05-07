<<<<<<< ours
<<<<<<< ours
# Prediction Market Intelligence Dashboard

A frontend-only, production-style analytics dashboard for prediction markets. The project demonstrates realtime data handling, client-side state architecture, derived market analytics, and rich visualization without a custom backend.

## Problem

Prediction markets react faster than many traditional information channels, but raw market pages do not explain:

- how market pricing compares with polls
- whether price action leads or lags public polling
- what events likely caused moves
- what the orderbook says about short-term conviction

## Solution

This dashboard treats the frontend as a complete intelligence layer:

- ingest market, polling, and event data
- maintain query cache and live store state
- compute derived analytics in the client
- render dashboard views for interpretation

## Core Features

- Historical `market probability vs poll average` chart
- `Lead-lag analysis` using cross-correlation
- `Realtime orderbook` depth, spread, and recent trade prints
- `Event timeline` connecting catalysts to market moves
- `Analytics layer` for volatility, momentum, and liquidity imbalance

## Architecture

```text
External APIs
 ├ Polymarket
 ├ Polling data
 └ News / event feeds
       │
       ▼
Frontend ingestion layer
 ├ TanStack Query cache
 ├ Mock/live-ready WebSocket manager
 └ Service adapters
       │
       ▼
Client stores
 ├ marketStore
 ├ orderbookStore
 └ eventStore
       │
       ▼
Analytics layer
 ├ leadLag.ts
 ├ volatility.ts
 ├ momentum.ts
 └ liquidity.ts
       │
       ▼
Visualization layer
 ├ time-series chart
 ├ depth chart
 ├ orderbook table
 ├ trade tape
 └ event timeline
       │
       ▼
Dashboard UI
```

## Stack

- Next.js App Router
- TypeScript
- Zustand
- TanStack Query
- ECharts
- Tailwind CSS
- date-fns
- d3-array / d3-scale ready in dependency layer for future expansion

## Repo Structure

```text
src
 ├ app
 │   ├ page.tsx
 │   ├ market/page.tsx
 │   ├ history/page.tsx
 │   └ timeline/page.tsx
 ├ analytics
 ├ components
 │   ├ charts
 │   ├ dashboard
 │   ├ layout
 │   ├ orderbook
 │   └ timeline
 ├ hooks
 ├ services
 │   ├ polymarket
 │   ├ polling
 │   └ news
 ├ stores
 ├ websocket
 ├ utils
 └ types
```

## Local Development

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment

Create a local `.env.local` from `.env.example` if you want to point the app at a specific live market slug or override API endpoints.

## Public Data Assets

The cleaned state-level polling resource used by `/history` is published as a frontend-readable asset:

- [public/data/state-party-support-2024.json](/Users/blueberryncherry/Proj/Prediction%20Market%20Intelligence%20Dashboard/public/data/state-party-support-2024.json)

Regenerate it from the original FiveThirtyEight CSV with:

```bash
pnpm generate:state-support
```

Or provide a local CSV path:

```bash
pnpm generate:state-support -- /tmp/presidential_general_averages_2024-09-12_uncorrected.csv
```

## Notes

- The app now uses live-ready Polymarket REST / WebSocket adapters with mock fallback, so the dashboard remains usable if upstream fetches fail.
- The architecture is intentionally designed to showcase frontend systems thinking, not just UI styling.
- Routes now have distinct purposes:
  - `/` overview
  - `/market` realtime microstructure
  - `/history` lead-lag and historical comparison
  - `/timeline` catalyst interpretation
=======
=======
>>>>>>> theirs
# Nokia 经典手机（Three.js）

一个使用 Three.js 制作的 Nokia 经典款手机示例：
- 鼠标拖拽可旋转查看模型（OrbitControls）
- 点击手机键盘按钮输入数字
- 屏幕与左上角 HUD 实时显示输入值

## 本地运行

直接启动静态服务器：

```bash
python3 -m http.server 4173
```

然后访问 `http://localhost:4173`。

## GitHub Pages 部署

仓库已包含 `.github/workflows/deploy.yml`，推送到 `main` 分支后会自动部署到 GitHub Pages。

> 注意：本示例通过 CDN 加载 Three.js，不需要本地安装依赖。
<<<<<<< ours
>>>>>>> theirs
=======
>>>>>>> theirs
