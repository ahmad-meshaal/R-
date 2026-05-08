# روايتي (Roayti)

منصة عربية أولى للكتابة الإبداعية بالذكاء الاصطناعي — اكتب روايتك، وشاركها مع القراء.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — API server (port 8080)
- `pnpm --filter @workspace/roayti run dev` — Frontend (port from $PORT)
- `pnpm run typecheck` — full typecheck
- `pnpm run build` — build all packages
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19 + Vite 7 + Tailwind v4 + Wouter
- API: Express 5
- Auth: Clerk (Replit-managed, `@clerk/react` + `@clerk/express`)
- DB: PostgreSQL + Drizzle ORM
- AI: Google Gemini via `@google/genai`
- Validation: Zod v4, drizzle-zod
- Fonts: IBM Plex Sans Arabic + IBM Plex Mono

## Where things live

- `artifacts/roayti/` — React+Vite frontend
- `artifacts/api-server/` — Express 5 API server
- `lib/db/src/schema/` — Drizzle schema (source of truth for DB)
- `artifacts/api-server/src/routes/` — all route handlers
- `artifacts/roayti/src/pages/` — all page components
- `artifacts/roayti/src/components/` — shared UI components
- `artifacts/roayti/public/logo.png` — app logo (R | ر)

## Architecture decisions

- **Clerk via proxy**: All Clerk auth requests route through `/api/__clerk` — same origin, no CORS issues in production.
- **RTL-first**: `direction: rtl` set on `html` and `body` in CSS; all UI components are Arabic-first.
- **Brutalist monochrome design**: Zero border-radius, 2px solid borders, IBM Plex Sans Arabic, black/white palette.
- **`tailwindcss({ optimize: false })`**: Required for Clerk `@layer` imports to work correctly in production builds.
- **`Show` component from `@clerk/react`**: Used instead of deprecated `SignedIn`/`SignedOut` (removed in Clerk v6).
- **Gemini via `@google/genai`**: Not excluded from esbuild externals — must be bundled, not required at runtime.

## Product

- **Novel CRUD**: Create, edit, publish, delete novels with chapters
- **Rich editor**: Auto-save, chapter sidebar (collapsible on mobile), AI assist inline
- **AI tools** (Gemini-powered): outline generation, plot, chapter writing, text improvement, cover prompt
- **Social features**: follow authors, like novels, add to library, reading progress tracking, comments
- **Discovery**: search, filter by genre, sort by latest/trending
- **Profile**: editable display name, bio, avatar (click-to-edit inline), tab between novels/about
- **Auth**: Clerk (Google, email) — sign-in modal or dedicated `/sign-in` / `/sign-up` pages

## User preferences

- Arabic-first RTL UI
- Brutalist/minimalist monochrome design (black + white, no color accents except functional)
- Logo: R | ر (attached_assets/ر_R_1778281120640.png → public/logo.png)
- IBM Plex Sans Arabic as primary font
- Smooth, responsive — works on all screen sizes including mobile

## Gotchas

- Clerk `SignedIn`/`SignedOut` exports removed in v6 — use `<Show when="signed-in">` / `<Show when="signed-out">` from `@clerk/react`
- `publishableKeyFromHost` must be imported from `@clerk/react/internal` on the frontend
- Tailwind v4: `@layer` declaration and Google Fonts `@import url(...)` must come BEFORE `@import "tailwindcss"`
- `@google/genai` must NOT be in esbuild externals — it needs to be bundled
- Run `pnpm --filter @workspace/db run push` after any schema changes before testing

## Pointers

- See `pnpm-workspace` skill for workspace structure
- See `clerk-auth` skill for auth setup and customization
