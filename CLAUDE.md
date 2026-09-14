# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Arcade Vault — a platform for playing games online and competing for high scores (per README.md, in Spanish). The repo is currently a fresh, unmodified `create-next-app` scaffold: no app-specific routes, components, or data layer exist yet beyond the default boilerplate in `app/`.

## Commands

- `npm run dev` — start the dev server (Next.js 16 with Turbopack by default)
- `npm run build` — production build
- `npm run start` — run the production build
- `npm run lint` — ESLint (flat config in `eslint.config.mjs`, extends `next/core-web-vitals` + `next/typescript`)

There is no test runner configured in this repo yet.

## Architecture

- Next.js **App Router** (`app/` directory), TypeScript, React 19.
- Styling via Tailwind CSS v4 using the `@tailwindcss/postcss` plugin (see `app/globals.css`); no separate `tailwind.config` file — v4 is configured via CSS.
- Path alias `@/*` maps to the repo root (`tsconfig.json`).

## Spec-driven workflow

Per README.md, this project follows spec-driven design using the `/spec` and `/spec-impl` workflow from https://github.com/Klerith/fernando-skills, installed via:

```bash
npx skills@latest add Klerith/fernando-skills
```

No `/spec` documents exist in the repo yet — when adding features, check whether the user wants to go through the spec workflow before implementing directly.

## Important: this is not the Next.js you know

Per AGENTS.md, this project pins a Next.js version whose APIs/conventions may differ from training data. Before writing framework-related code, consult the bundled docs at `node_modules/next/dist/docs/` (sections: `01-app`, `02-pages`, `03-architecture`, `04-community`) rather than relying on prior Next.js knowledge, and watch for deprecation notices.
