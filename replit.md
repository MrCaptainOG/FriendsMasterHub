# FriendsMasterHub Workspace

## Overview

pnpm workspace monorepo using TypeScript. Minecraft server community website.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Frontend**: React + Vite (Tailwind CSS v4, Wouter routing)
- **Database (builds)**: MongoDB via Mongoose (`mongodb+srv://...`)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (ESM bundle)
- **Bot**: mineflayer (externalized from bundle)
- **Image uploads**: ImgBB API

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server + bot + MongoDB
│   └── friendsmasterhub/   # React + Vite frontend (at root /)
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM (not used, MongoDB used instead)
├── scripts/                # Utility scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## Features

### Website Pages
- **Home** (`/`) — Server status card (live check via mcstatus.io), connect info, copy IP:Port button, bot status
- **Gallery** (`/gallery`) — Public approved builds, image cards
- **Submit Build** (`/submit`) — Upload build screenshots (to ImgBB), submit form
- **Admin** (`/admin`) — Password-protected (9897162621762) review panel, approve/reject/award builds

### API Routes (all at `/api`)
- `GET /api/server/status` — Proxies mcstatus.io for server online/offline status
- `GET /api/builds` — Public approved builds from MongoDB
- `POST /api/builds` — Submit new build (uploads to ImgBB, saves to MongoDB)
- `GET /api/builds/admin?password=xxx` — All builds (admin)
- `PATCH /api/builds/:id/status?password=xxx` — Update build status
- `POST /api/builds/:id/award?password=xxx` — Award build (queues bot /give command)
- `GET /api/bot/status` — Minecraft bot status

### Minecraft Bot
- Runs 24/7, connects to `FriendsMasterHub.aternos.me:19276`
- Auto-reconnects if kicked/disconnected
- Sends chat messages every ~3 minutes
- Random movement (jump, sneak, look, move) every 10-20 ticks
- Tracks online players, executes `/give` commands for awards
- Awards are queued until both server and player are online

### MongoDB
- Connection: `mongodb+srv://DBJAVAGAMER:...@javagamerop.2rruqhw.mongodb.net/FriendsSMP/`
- Collection: `imageinfos`
- Status enum: `unchecked`, `approved`, `rejected`, `awarded`
- Rejected builds auto-deleted after 24 hours

## Important Paths

- Frontend artifact: `artifacts/friendsmasterhub/`
- API server: `artifacts/api-server/`
- Bot logic: `artifacts/api-server/src/lib/bot.ts`
- MongoDB model: `artifacts/api-server/src/lib/mongodb.ts`
- OpenAPI spec: `lib/api-spec/openapi.yaml`
- Run codegen: `pnpm --filter @workspace/api-spec run codegen`

## ImgBB
- API Key: `7e3d3f9d6b1ce807a6c0383643a41694`
- Used in `artifacts/api-server/src/routes/builds.ts`

## mineflayer externalization
- mineflayer is externalized from the esbuild bundle (too large to bundle)
- Added to external list in `artifacts/api-server/build.mjs`
