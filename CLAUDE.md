# built-in-nyc — Project Brain for Claude

## What this is

A free, browser-based platform that lets students in developing countries (no access to design schools or makerspaces) become engineers by generating real 3D-printable CAD models from natural language prompts.

**Core loop:** Type what you want to make → Claude generates OpenSCAD code → browser renders a 3D preview → download STL and print it.

**The problem:** Creative minds exist everywhere. Access to engineering tools doesn't. A student in Lagos or Nairobi with a basic laptop and a borrowed printer should be able to design and manufacture physical objects.

## Why OpenSCAD

OpenSCAD is text-based parametric CAD. Claude generates it reliably (small, well-documented DSL). Output is readable and teachable — users can learn from the code, not just get a mesh blob. Files are kilobytes, not megabytes. Free and open source.

## Repo

- `advik-bhatt/built-in-nyc` — always develop on `main`
- Commit author: `Advik Bhatt <advik.bhatt@gmail.com>`

## Stack decisions

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16, App Router, TypeScript, Tailwind v4 |
| AI | Claude via `lib/anthropic.ts` (Anthropic SDK) |
| Database | Supabase via `lib/supabase.ts` |
| Auth | Auth0 v4 via `lib/auth0.ts` + `proxy.ts` (Next.js 16 pattern) |
| Email | Resend via `lib/resend.ts` |
| Errors | Sentry (sentry.*.config.ts + withSentryConfig in next.config.ts) |
| Rendering | OpenSCAD WASM in browser (or Vercel Sandbox server-side) |
| 3D preview | Three.js |

## Pre-wired service clients

```ts
import { anthropic } from "@/lib/anthropic";   // Anthropic SDK
import { supabase, createServiceClient } from "@/lib/supabase";
import { auth0 } from "@/lib/auth0";            // Auth0Client (server)
import { resend } from "@/lib/resend";
```

## Auth pattern (Auth0 v4 + Next.js 16)

Auth is handled by `proxy.ts` — no route handlers. Login: redirect to `/auth/login`. The middleware auto-manages session cookies.

## API routes to build

| Route | What it does |
|-------|-------------|
| `POST /api/generate` | Prompt → OpenSCAD via Claude |
| `POST /api/designs` | Save a design (auth required) |
| `GET /api/designs/[id]` | Fetch a design |
| `GET /api/gallery` | Public designs paginated |
| `POST /api/explain` | Claude explains OpenSCAD code snippet |

## Database schema

```sql
create table profiles (
  id uuid primary key,         -- Auth0 sub
  username text unique,
  created_at timestamptz default now()
);

create table designs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  prompt text not null,
  openscad_code text not null,
  is_public boolean default false,
  fork_of uuid references designs(id),
  created_at timestamptz default now()
);
```

## Full context

Full project brain lives in the knowledge-base repo:
`advik-bhatt/knowledge-base` → `projects/built-in-nyc/`

- `MEMORY.md` — decisions, features, open questions
- `product/vision.md` — detailed product philosophy
- `engineering/stack-and-decisions.md` — technical rationale
- `sessions/2026-06-27.md` — hackathon day log

## Env vars required

See `.env.local.example` — all vars documented there.
