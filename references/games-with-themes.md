# Juegos con skins

Registro mantenido por el agente `skin-designer` (`.claude/agents/skin-designer.md`). Skins obligatorios por juego: `clasico` (default), `neon`, `retro`; todos sobre fondo oscuro.

Estados: `Falta` → `Implementado` (`Parcial` si la verificación no pasa). Columnas de skin: `✓` implementado, `✗` falta.

| ID           | clasico | neon | retro | Estado | Peor contraste | Fecha      | Notas                         |
| ------------ | ------- | ---- | ----- | ------ | -------------- | ---------- | ----------------------------- |
| `asteroides` | ✗       | ✗    | ✗     | Falta  | —              | 2026-11-11 |                               |
| `bloques`    | ✗       | ✗    | ✗     | Falta  | —              | 2026-11-11 |                               |
| `ladrillos`  | ✗       | ✗    | ✗     | Falta  | —              | 2026-11-11 | Usa spritesheet PNG (raster). |
| `serpiente`  | ✗       | ✗    | ✗     | Falta  | —              | 2026-11-11 |                               |

## Notas de decisiones

- Un juego por ejecución del agente; el agente implementa directamente (sin specs ni `/spec-impl`), en la rama actual, sin commits ni cambios de rama; el usuario revisa el diff y hace commit.
- Skin = setting **global** de todo Arcade Vault en `localStorage` (`arcade-vault:skin`); solo afecta a los juegos canvas (la UI web no cambia). Selector solo en el canvas/HUD de cada juego (nunca en `Nav`); muestra el valor de `localStorage`, al elegir lo actualiza; sin valor → `clasico` (colores actuales exactos).
- Sitio solo oscuro: "verse bien en modo oscuro" = contraste WCAG vs `bg` del skin — entidades ≥ 3:1, texto en canvas ≥ 4.5:1, `bg` luminancia ≤ 0.05.
- Infra compartida (`app/games/skins.ts`, `components/useSkin.ts`, `setSkin` en `GameInstance`, selector en `GamePlayer`): pendiente; la crea el primer juego procesado.
