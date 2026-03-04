# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Coachee** — a Hebrew-first (RTL) SaaS platform for sales & service training. Agents upload call recordings, which are analyzed by AI across three parallel streams (transcription, tone analysis, content analysis). The platform also provides real-time voice simulations for practice.

## Commands

```bash
npm run dev              # Start dev server (port 3000)
npm run build            # Production build
npm run lint             # ESLint
npm run type-check       # TypeScript validation (tsc --noEmit)
npm run deploy-check     # Pre-deployment validation script
npm run setup-prompts    # Initialize AI prompts to Supabase
```

## Architecture

### Tech Stack
- **Framework:** Next.js 14 (App Router), React 18, TypeScript
- **Styling:** Tailwind CSS + shadcn/ui (Radix primitives)
- **Database/Auth/Storage:** Supabase (PostgreSQL with RLS, Google OAuth)
- **AI:** OpenAI (gpt-4o-transcribe, gpt-4o-audio-preview, gpt-4o, gpt-realtime)
- **Audio:** ffmpeg.wasm for client-side format conversion

### Route Structure
- `app/(protected)/` — Auth-gated routes (dashboard, calls, simulations, team, profile)
- `app/api/` — ~58 API route handlers (RESTful, at `app/api/[route]/route.ts`)
- `app/login/`, `app/signup/` — Public auth pages
- Root layout sets `lang="he" dir="rtl"` globally

### Key Directories
- `lib/` — Business logic: Supabase clients (`lib/supabase/server.ts`, `lib/supabase/client.ts`), OpenAI analytics, audio conversion, cost model, partner API auth
- `components/` — React components; `components/ui/` contains shadcn/ui base components
- `types/` — TypeScript types including `database.types.ts` (Supabase-generated)
- `supabase/migrations/` — SQL migration files
- `memory-bank/` — Project docs (specs, patterns, progress tracking, prompt library)

### Call Analysis Pipeline
Audio uploads are processed in 3 parallel streams:
1. **Transcription** — `gpt-4o-transcribe`
2. **Tone analysis** — `gpt-4o-audio-preview` (requires wav/mp3)
3. **Content analysis** — `gpt-4o-2024-08-06`

Results are combined into a report (32-35 parameters per call type) stored in `call_analyses`.

### 6 Call Types
Each has specialized AI prompts: Outbound Sales, Follow-up (Pre-Proposal), Follow-up (Post-Proposal), Meeting Scheduling, Follow-up (Post-Meeting Scheduling), Customer Service.

### Auth & Role Hierarchy
Protected layout enforces a multi-step check: auth → approval → password change → legal terms → questionnaire → subscription → quota. Roles: Super Admin (hardcoded email check) > Admin > Manager > Agent. RLS enforces data isolation at the PostgreSQL level.

### Real-time Simulations
WebSocket connections to OpenAI's gpt-realtime API for live voice training. See `lib/simulation-websocket-server.ts` and `components/RealtimeSimulation.tsx`.

## Critical Patterns

### JSON Cleaning for OpenAI Responses
Always use `cleanOpenAIResponse()` before `JSON.parse()` on any OpenAI output. Hebrew text causes frequent issues: unbalanced quotes, missing commas, truncated JSON. The function handles markdown stripping, brace balancing, and Hebrew-specific quote fixes. Include fallback recovery with partial JSON extraction. See `.cursorrules` for the full implementation.

### Audio Conversion
Use `needsConversion()` to check format, then `convertAudioToMp3()` via ffmpeg.wasm. Direct formats: MP3, WAV. Conversion required: M4A, MP4, AAC, WebM, OGG, WMA.

### Supabase Clients
- Server components/API routes: `createServerComponentClient()` from `lib/supabase/server.ts`
- Client components: import from `lib/supabase/client.ts`
- Service role key used for admin operations bypassing RLS

### Error Logging
All major operations log to the `call_logs` table via `addCallLog()` with detailed context (error position, content preview, quote count).

### Path Alias
`@/*` maps to project root (configured in tsconfig.json).

## Environment Variables

Required in `.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`. See `.env.example` for the full list including email, partner API, and billing keys.
