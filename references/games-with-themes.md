# Juegos con skins

Registro mantenido por el agente `skin-designer` (`.claude/agents/skin-designer.md`). Skins obligatorios por juego: `clasico` (default), `neon`, `retro`; todos sobre fondo oscuro.

Estados: `Falta` → `Spec` → `Implementado`. Columnas de skin: `✓` implementado, `spec` diseñado en spec, `✗` falta.

| ID           | clasico | neon | retro | Estado | Spec | Peor contraste | Fecha      | Notas                         |
| ------------ | ------- | ---- | ----- | ------ | ---- | -------------- | ---------- | ----------------------------- |
| `asteroides` | ✗       | ✗    | ✗     | Falta  | —    | —              | 2026-11-11 |                               |
| `bloques`    | ✗       | ✗    | ✗     | Falta  | —    | —              | 2026-11-11 |                               |
| `ladrillos`  | ✗       | ✗    | ✗     | Falta  | —    | —              | 2026-11-11 | Usa spritesheet PNG (raster). |
| `serpiente`  | ✗       | ✗    | ✗     | Falta  | —    | —              | 2026-11-11 |                               |

## Notas de decisiones

- Un juego por ejecución del agente; resultado = spec Draft `specs/NN-skins-<id>.md`, implementación con `/spec-impl`.
- Sitio solo oscuro: "verse bien en modo oscuro" = contraste WCAG vs `bg` del skin — entidades ≥ 3:1, texto en canvas ≥ 4.5:1, `bg` luminancia ≤ 0.05.
- Infra compartida (`app/games/skins.ts`, `setSkin` en `GameInstance`, selector en `GamePlayer`): pendiente; la define el primer spec de skins.
