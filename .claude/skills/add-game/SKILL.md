---
name: add-game
description: Genera el spec para añadir un juego real (con leaderboard en Supabase) a Arcade Vault, portándolo desde references/started-games/ o diseñándolo desde cero. Sigue el patrón de SPEC 05 (asteroides) y SPEC 06 (leaderboard). Solo escribe el spec; la implementación va con /spec-impl.
disable-model-invocation: true
argument-hint: 'carpeta de referencia (p. ej. 03-tetris) o descripción del juego'
allowed-tools: Read, Glob, Grep, Write, AskUserQuestion, Bash(ls:*), Bash(cat:*), Bash(date:*), Bash(grep:*)
---

# /add-game — Spec para integrar un juego real en Arcade Vault

## Contexto de sesión

Fecha de hoy (úsala en el header del spec, nunca la inventes):
!`date +%F`

Specs existentes:
!`ls specs/ 2>/dev/null || echo "No existe specs/"`

Juegos de referencia disponibles:
!`ls references/started-games/ 2>/dev/null || echo "No existe references/started-games/"`

Motores registrados:
!`cat app/games/registry.ts 2>/dev/null || echo "No existe app/games/registry.ts"`

Estado de `lives` en el contrato de motor:
!`grep -n "lives" app/games/types.ts 2>/dev/null || echo "No existe app/games/types.ts"`

---

Este skill produce **un único archivo**: `specs/NN-juego-<id>.md`, en estado `Draft`, que describe cómo añadir un juego jugable a la plataforma con su puntuación guardada en Supabase. **No escribes código.** Cuando el usuario apruebe el spec, lo implementa con `/spec-impl`.

Archivos de apoyo (mismo directorio que este skill):

- `template.md` — plantilla del spec, ya rellena con el patrón común a todos los juegos. Rellena los `<…>` y borra los bloques condicionales que no apliquen.
- `integration-guide.md` — contrato técnico de la plataforma (motor, registro, GamePlayer, BD, port desde JS plano). Léelo siempre antes de escribir.

Responde en el idioma del prompt inicial (por defecto, español, como los specs del repo).

## Fase 1 — Contexto

1. Lee `CLAUDE.md`, `specs/05-juego-asteroides.md` y `specs/06-leaderboard-y-tabla-juegos.md` (patrón de referencia), `integration-guide.md`, `app/games/types.ts`, `app/games/registry.ts` y `components/GamePlayer.tsx`.
2. Determina el **origen** a partir de `$ARGUMENTS`:
   - **Referencia:** si coincide (total o parcialmente, p. ej. `tetris` → `03-tetris`) con una carpeta de `references/started-games/`, lee su `CLAUDE.md`/`README.md`, `index.html`, `game.js`, cualquier otro `.js` y lista `assets/`. Haz inventario de: mecánicas, constantes, sistema de puntuación, vidas, niveles/velocidad, controles (teclado/ratón), resolución del canvas, HUD y overlays propios (pausa, game over, victoria), sonidos y sprites, y funciones extra que no encajan en la plataforma.
   - **Desde cero:** si no hay carpeta que coincida, el juego se diseña con el usuario en la Fase 2 (mecánicas, controles, puntuación, vidas, niveles). Debe ser un juego **original o de género**: nunca la recreación de un juego existente concreto (su nombre, personajes, arte, música o niveles).
   - Si `$ARGUMENTS` viene vacío, pregunta: "¿Qué juego añadimos? Indica una carpeta de `references/started-games/` o descríbelo en una frase."
3. Comprobaciones de bloqueo (avisa y para si se cumplen):
   - El `id` propuesto ya existe en `GAME_ENGINES` o ya hay un spec `NN-juego-<id>.md`.
4. Comprobación de plataforma: mira la salida de "Estado de `lives`". Si `lives` **no** es opcional (`lives: number` sin `| null`) y el juego no tiene vidas, el spec debe incluir el bloque condicional **"Vidas opcionales en el HUD"** de la plantilla como primer paso.

## Fase 2 — Preguntas

Pregunta en bloques de 3–5 con `AskUserQuestion`, opción recomendada primero y marcada `(Recommended)`. No preguntes lo que ya se deduce de la referencia: proponlo como recomendación. Cubre siempre:

**Catálogo (fila en `games`):**

- `id` (kebab-case, sin acentos) y `title` (MAYÚSCULAS, en español, **sin marcas registradas**: p. ej. `BLOQUES` en vez de "Tetris", `LADRILLOS` en vez de "Arkanoid").
- `cat` (`ARCADE` | `PUZZLE` | `SHOOTER` | `VERSUS`), `color` (`cyan` | `magenta` | `yellow` | `green`), `sort_order` (por defecto, el siguiente al máximo actual).
- Textos `short` y `long` (propón un borrador basado en el juego real).

**Integración con la plataforma:**

- Mapeo al HUD React: qué es `score`, `lives` (o `null` si no hay vidas) y `level`.
- Adaptación a **800×600 lógicos** (convención fija) si la referencia usa otra resolución: cómo se reparte el espacio (p. ej. tablero vertical centrado + laterales con pieza siguiente / líneas).
- Qué se **elimina** del canvas (HUD propio, overlays de pausa y game over, "pulsa X para reiniciar") y qué indicadores de juego **se quedan** dentro (como el "3x" de asteroides).
- Pantalla de victoria (si la referencia la tiene, p. ej. superar el último nivel): ¿se trata como game over con la puntuación final, o los niveles se repiten acelerando?
- Puntuación máxima: si el juego puede superar 1.000.000 (límite `CHECK` de `scores`), decidir si se limita en el motor.

**Port y estilo:**

- Estilo visual: restyle neón con la paleta del proyecto (recomendado, como asteroides) o conservar sprites originales (copiados a `public/games/<id>/`).
- Sonido: mantener los efectos de la referencia (`public/games/<id>/sounds/`) o quitarlos. No se añade sonido nuevo.
- Input: teclas de juego (todas con `preventDefault` salvo en inputs), soporte de ratón si la referencia lo usa (con escalado por `getBoundingClientRect`), y funciones de la referencia que se descartan (p. ej. selector de nivel en la pausa).
- Portada `.cover-<id>`: concepto visual en una línea (qué motivo dibujan `::before`/`::after`).

Para juegos **desde cero**, añade antes un bloque de diseño: mecánica principal, controles, cómo se gana puntuación, cómo se pierde, progresión de niveles.

Deja de preguntar cuando puedas responder sin suponer nada: qué archivos aparecen o cambian, cuál es el primer y el último paso, y cómo se verifica que el juego está integrado.

## Fase 3 — Escribir el spec

Usa `template.md`. Reglas:

- Mantén la estructura y los títulos exactos de SPEC 05/06 (`Scope`, `Data model`, `Implementation plan`, `Acceptance criteria`, `Decisions`, `Identified risks`, `What is **not** in this spec`).
- Conserva todos los bloques comunes (motor, registro, portada, migración seed, conexión HUD/modal, verificación de leaderboard, regresión). Añade los específicos del juego: mecánicas portadas 1:1 con sus números (puntos, velocidades, probabilidades), layout del canvas, input.
- Elimina los bloques marcados `<!-- CONDICIONAL -->` que no apliquen y quita los comentarios HTML de la plantilla.
- Criterios de aceptación **booleanos y verificables**, incluyendo al menos uno por mecánica clave (p. ej. "limpiar 4 líneas en nivel 1 suma 800").
- En `Decisions`, marca con "Decisión explícita del usuario" lo que haya respondido en la Fase 2.
- Si ya tienes toda la información, escribe el spec completo sin confirmar sección por sección.

## Fase 4 — Guardar

1. `NN` = número más alto de `specs/` + 1 (dos dígitos). Nombre: `specs/NN-juego-<id>.md`.
2. `Status: Draft`, `Date:` = fecha del contexto de sesión, `Depends on: SPEC 05, SPEC 06` (+ otros si aplica; verifica que existen).
3. Escribe el archivo directamente. Pregunta solo si ya existe.
4. Confirma al usuario (conciso): ruta del archivo, que está en `Draft` y debe pasar a `Approved` tras revisarlo, y el siguiente paso: `/spec-impl NN-juego-<id>`. **Para ahí.**

## Reglas duras

- Nunca escribas código, migraciones ni CSS: solo el `.md` del spec.
- Nunca propongas implementar el spec tras guardarlo.
- Nunca incluyas datos ficticios (puntuaciones seed, `best`/`plays` inventados). `scores` no se siembra.
- Nunca cambies el esquema de BD (`games`, `scores`, `games_with_stats`) en un spec de juego; si hace falta, es otro spec.
- Nunca uses en el catálogo nombres comerciales de juegos existentes.
- Canvas siempre 800×600 lógicos; nunca cambies el tamaño fijo de `GamePlayer`.
