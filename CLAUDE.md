# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Arcade Vault — a platform for playing games online and competing for high scores (per README.md, in Spanish). Specs 01–09 are all `Implemented`.

Features:

- Pages (`app/`): home (`page.tsx`), `biblioteca` (library + filters), `juegos/[id]` (detail), `juegos/[id]/jugar` (player), `salon` (Hall of Fame / leaderboard), `about`, `auth`, `api/contact` (Resend email).
- Real games with canvas engines: `asteroides`, `bloques`, `ladrillos`, `serpiente` (`app/games/<id>/`), and more.... (see `references\implemented-games.md` when you need to check which games are implemented)
- Games without an engine fall back to a simulation in `GamePlayer`.
- Supabase backend: auth, `games` table + `games_with_stats` view, scores/leaderboard. Session middleware in `proxy.ts` → `app/lib/supabase/proxy.ts`.

There is no test runner configured in this repo yet.

## Commands

- `npm run dev` / `build` / `start`
- `npm run lint` — ESLint
- `npm run format` — Prettier (`.prettierrc.json`: single quotes, semicolons, trailing commas)

## Skills

- Always use /frontend-design to design the user interface.
- `/spec` and `/spec-impl` — spec-driven workflow (see below).
- `/add-game` (`.claude/skills/add-game/`) — generates the spec (`specs/NN-juego-<id>.md`) to add a real game; ports from `references/started-games/` or designs from scratch. Spec only; implement with `/spec-impl`. Supporting files: `template.md`, `integration-guide.md` (platform contract).
- `/worktree` — isolated git worktree in `.trees/<name>`.

## Agents

- `game-planner` (`.claude/agents/`) — thinks/decides which new game fits the platform; memory of past suggestions in `references/game-suggestions-todo.md`; next step `/add-game`.
- `game-jam` (`.claude/agents/`) — given a theme, designs one original game and writes 3 complete Draft spec variants in `specs/game-jam/<id>/` (`spec-a.md`, `spec-b.md`, `spec-c.md`), modeled on specs 07–09. Read-only on `references/game-suggestions-todo.md`.

## Hooks

`.claude/settings.json`: PostToolUse on Write/Edit/MultiEdit runs `.claude/hooks/format-lint.mjs` (Prettier + `eslint --fix`; exit 2 reports lint errors).

## MCP

`.mcp.json`: Supabase MCP (project-scoped) for DB/migrations/advisors. Env vars in `.env.example`: `RESEND_API_KEY`, `CONTACT_TO_EMAIL`, `SUPABASE_DB_PASSWORD`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

## Architecture

- Next.js **App Router** (`app/` directory), TypeScript, React 19, Next 16.
- Styling via Tailwind CSS v4 using the `@tailwindcss/postcss` plugin (see `app/globals.css`); no separate `tailwind.config` file — v4 is configured via CSS.
- Path alias `@/*` maps to the repo root (`tsconfig.json`).
- `components/` — shared UI: `Nav`, `SessionProvider`, `GamePlayer` (mounts engine, saves score), `GameCard`, `BibliotecaView`, `HomeView`, `YourBest`.
- `app/lib/games.ts` — server-side data fetching (Supabase); `app/lib/supabase/` — client/server/proxy + `database.types.ts`; `app/data/games.ts` — shared types.
- Game engine contract (`app/games/types.ts`): `GameFactory(canvas, callbacks) → GameInstance {pause, resume, restart, end, destroy}`; callbacks `onStats({score, lives|null, level})` and `onGameOver(score)`. Register in `app/games/registry.ts` (`GAME_ENGINES`). Per-game files: `constants.ts`, `engine.ts`, `entities.ts`, optional `sprites.ts`/`board.ts`/`levels.ts`. Static assets in `public/games/<id>/`.
- `references/` — source material only (`started-games`, `templates`, `source-assets`); `demos/` — scratch.

## Spec-driven workflow

Per README.md, this project follows spec-driven design using the `/spec` and `/spec-impl` workflow from https://github.com/Klerith/fernando-skills, installed via:

```bash
npx skills@latest add Klerith/fernando-skills
```

Specs live in `specs/NN-<slug>.md` (01 MVP screens, 02 home, 03 about/contact, 04 Supabase infra, 05–09 games, 06 leaderboard). Status flow: Draft → Approved → Implemented (mark acceptance criteria done). Workflow per feature: branch `spec-NN-...`, implement, PR. Check whether the user wants the spec workflow before implementing directly.

## Important: this is not the Next.js you know

Per AGENTS.md, this project pins a Next.js version whose APIs/conventions may differ from training data. Before writing framework-related code, consult the bundled docs at `node_modules/next/dist/docs/` (sections: `01-app`, `02-pages`, `03-architecture`, `04-community`) rather than relying on prior Next.js knowledge, and watch for deprecation notices.
