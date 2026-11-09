# SPEC 06 — Leaderboard y tabla de juegos en Supabase

> **Status:** Implemented
> **Depends on:** SPEC 01, SPEC 04, SPEC 05
> **Date:** 2026-11-06
> **Objective:** Persistir el catálogo de juegos y las puntuaciones en Supabase (tablas `games` y `scores`) para que Biblioteca, Home, Detalle y Salón de la Fama lean datos reales, y que el único juego real (`asteroides`) guarde su puntuación de forma anónima desde el modal de fin de partida. El catálogo arranca con **una sola fila** (`asteroides`) y `scores` arranca **vacía** (sin datos ficticios).

---

## Scope

**In:**

- Migraciones aplicadas con la herramienta MCP `apply_migration` (no se crea la carpeta `supabase/`, igual que en SPEC 04) que crean:
  - Tabla `games` (catálogo), con RLS de solo lectura pública.
  - Tabla `scores` (puntuaciones anónimas), con RLS de lectura pública e insert público, sin update ni delete.
  - Vista `games_with_stats` (`security_invoker = true`) que añade `best` (`MAX(score)`) y `plays` (`COUNT(*)`) derivados de `scores`.
  - Índice `scores (game_id, score DESC)`.
- Seed en la migración: una única fila en `games` para `asteroides` (mismos `id`, `title`, `short`, `long`, `cat`, `cover` y `color` que en `app/data/games.ts`, `sort_order = 1`). `scores` se crea vacía: sin puntuaciones seed ni ficticias. Los otros 8 juegos del catálogo anterior (simulaciones) no se migran; se añadirán por migración cuando tengan lógica real.
- Regenerar `app/lib/supabase/database.types.ts` con MCP `generate_typescript_types`.
- Nuevo módulo de consultas de servidor `app/lib/games.ts` (usa `app/lib/supabase/server.ts`): `getGames()`, `getGame(id)`, `getTopScores(gameId, limit)`.
- Lecturas en servidor (Server Components) en todas las pantallas que hoy usan `GAMES` / `seededScores`:
  - `/biblioteca`: la página pasa a Server Component que carga los juegos y se los entrega a un componente cliente con el buscador y los chips (`components/BibliotecaView.tsx`).
  - `/` (Home): igual; el contenido actual pasa a `components/HomeView.tsx` (cliente) recibiendo `games` por props.
  - `/juegos/[id]`: juego y Top 10 desde la BD; `notFound()` si el id no existe.
  - `/juegos/[id]/jugar`: juego desde la BD; `notFound()` si no existe; se lo pasa a `GamePlayer`.
  - `/salon`: página de servidor; el juego activo se elige con el parámetro `?juego=<id>` (por defecto el primero del catálogo); las tabs son enlaces (`next/link`); podio y tabla muestran el Top 12 de la BD. Estado vacío si el juego no tiene puntuaciones (es el estado inicial de `asteroides`).
  - `/juegos/[id]` y `/biblioteca`/`/`: deben renderizar bien con `best = 0`, `plays = 0` y un Top 10 vacío (Detalle muestra un estado vacío tipo "AÚN NO HAY PUNTUACIONES — SÉ EL PRIMERO").
  - Con un único juego en BD, Biblioteca y Home muestran una sola tarjeta; los chips de categoría sin juegos muestran el estado vacío ya existente de la Biblioteca.
- Fila "TU MEJOR MARCA EN <JUEGO>" de `/salon`: componente cliente `components/YourBest.tsx` que, si hay sesión, consulta con el cliente de browser la mejor puntuación cuyo `player_name` coincide con `user.name.toUpperCase().slice(0, 10)` y calcula el rango como `1 + COUNT(score > mejor)`. Si no hay coincidencia, la fila no se muestra.
- `components/GamePlayer.tsx`:
  - Si `game.id` está en `GAME_ENGINES` (juego real), GUARDAR PUNTUACIÓN hace `insert` en `scores` con el cliente de browser (`{ game_id, player_name, score }`), con estados guardando / guardado / error (mensaje "NO SE PUDO GUARDAR" y botón reintentable).
  - Si no está en `GAME_ENGINES` (simulación), el modal "FIN DEL JUEGO" muestra la puntuación sin campo de iniciales ni botón de guardar, con el texto "MODO DEMO — NO SE GUARDA". Es una rama defensiva: con el catálogo actual (solo `asteroides`) no es alcanzable desde la UI, pero evita guardar basura si se añade a la BD un juego sin motor.
- Eliminar el guardado en `localStorage` (`av_scores`): se quitan `saveScore` y `ScoreEntry` de `components/SessionProvider.tsx`. La sesión simulada (`av_user`) no cambia.
- Retirar de `app/data/games.ts` el array `GAMES`, `PLAYERS` y `seededScores`; el archivo conserva los tipos y `CATS`, y gana `formatPlays(n)` (p. ej. `12400 → "12.4K"`, `< 1000` se muestra tal cual).
- Boundary de error mínimo `app/error.tsx` para el caso en que Supabase no responda.

**Out of scope (para futuros specs):**

- Auth real de Supabase, `user_id` en `scores` o protección de rutas. Las puntuaciones son anónimas, solo con nombre en texto.
- Anti-trampas real (validación de partida en servidor, firma de puntuaciones) y rate limiting. Se acepta en el MVP.
- Panel de administración o CRUD de juegos desde la UI; el catálogo se cambia por migración.
- Migrar puntuaciones ya guardadas en `av_scores` de `localStorage`.
- Realtime (ranking en vivo), paginación del ranking o filtros por fecha/periodo.
- Contador de partidas iniciadas: `plays` cuenta solo partidas guardadas.
- Lógica real para otros juegos. Los 8 juegos simulados salen del catálogo (sus rutas `/juegos/<id>` darán 404 hasta que se reincorporen por migración).
- Datos ficticios de cualquier tipo: ni juegos ni puntuaciones de relleno.
- Tests automatizados.

---

## Data model

```sql
create table public.games (
  id         text primary key,
  title      text not null,
  short      text not null,
  long       text not null,
  cat        text not null check (cat in ('ARCADE','PUZZLE','SHOOTER','VERSUS')),
  cover      text not null,                       -- clase CSS, p. ej. 'cover-asteroides'
  color      text not null check (color in ('cyan','magenta','yellow','green')),
  sort_order int  not null,
  created_at timestamptz not null default now()
);

create table public.scores (
  id          bigint generated always as identity primary key,
  game_id     text not null references public.games (id) on delete cascade,
  player_name text not null check (char_length(player_name) between 1 and 10),
  score       integer not null check (score between 0 and 1000000),
  created_at  timestamptz not null default now()
);

create index scores_game_score_idx on public.scores (game_id, score desc);

create view public.games_with_stats with (security_invoker = true) as
  select g.*, coalesce(max(s.score), 0) as best, count(s.id) as plays
  from public.games g left join public.scores s on s.game_id = g.id
  group by g.id;
```

RLS (ambas tablas con RLS activado):

- `games`: `select` para `anon` y `authenticated`. Sin otras políticas.
- `scores`: `select` para `anon` y `authenticated`; `insert` para `anon` y `authenticated` (`with check (true)`, los límites los imponen los `CHECK`). Sin políticas de `update` ni `delete`.

Tipo de aplicación (`app/data/games.ts`), derivado de la fila de la vista:

```ts
export interface Game {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: GameCategory;
  cover: string;
  color: 'cyan' | 'magenta' | 'yellow' | 'green';
  best: number; // MAX(score), 0 si no hay puntuaciones
  plays: number; // COUNT(*) de scores; se muestra con formatPlays()
}

export interface ScoreRow {
  rank: number; // calculado en servidor por orden descendente
  name: string; // scores.player_name
  score: number;
  date: string; // scores.created_at formateado dd/mm/aaaa
}
```

Convenciones:

- `player_name` se guarda en mayúsculas y máximo 10 caracteres (lo impone el campo del modal; la BD solo valida longitud).
- Empates en el ranking: orden por `score DESC, created_at ASC` (el primero en lograrlo queda arriba).
- Las fechas se muestran en formato `es-ES` (`dd/mm/aaaa`).

---

## Implementation plan

1. Aplicar con `apply_migration` el esquema (tablas, índice, vista, RLS, políticas) y, en una segunda migración, el seed de la única fila de `games` (`asteroides`); `scores` no se siembra. Verificación: `list_tables` muestra `games` (1 fila) y `scores` (0 filas) con RLS activo; `execute_sql` sobre `games_with_stats` devuelve 1 fila (`asteroides`) con `best = 0` y `plays = 0`. La app no cambia.
2. Regenerar `app/lib/supabase/database.types.ts` con `generate_typescript_types`. `npx tsc --noEmit` pasa.
3. Crear `app/lib/games.ts` con `getGames()`, `getGame(id)` y `getTopScores(gameId, limit)`, y añadir `formatPlays` a `app/data/games.ts` (`GAMES` sigue existiendo por ahora). `npx tsc --noEmit` pasa.
4. Migrar `/biblioteca`: `page.tsx` de servidor + `components/BibliotecaView.tsx` cliente; añadir `app/error.tsx`. Verificación manual: buscador, chips y tarjeta de `asteroides` funcionan, con `best`/`plays` reales (0 y 0 al inicio); la tarjeta usa `formatPlays`; chips de otras categorías muestran el estado vacío.
5. Migrar `/` (Home): contenido actual a `components/HomeView.tsx` recibiendo `games`; `app/page.tsx` de servidor. Verificación manual: la sección "JUEGOS DISPONIBLES AHORA" muestra los juegos de la BD (hasta 6; hoy solo `asteroides`) y navega al Detalle.
6. Migrar `/juegos/[id]` y `/juegos/[id]/jugar` a lecturas desde la BD (Top 10 real en el Detalle con estado vacío, `notFound()` si el id no existe) pasando `game` a `GamePlayer`. Verificación manual: Detalle de `asteroides` (Top 10 vacío); `/juegos/rocas` e `/juegos/inexistente` responden 404; `/juegos/asteroides/jugar` sigue jugable.
7. Migrar `/salon`: página de servidor con `?juego=`, tabs como `Link` (hoy una sola tab), podio y tabla desde `getTopScores(id, 12)`, estado vacío y `components/YourBest.tsx`. Verificación manual: `/salon` muestra el estado vacío de `asteroides` sin errores y sin fila "TU MEJOR MARCA". La verificación con puntuaciones se completa en el paso 8.
8. Modificar `GamePlayer.tsx` para insertar en `scores` solo en juegos reales (estados guardando/guardado/error) y mantener la rama "MODO DEMO — NO SE GUARDA" para juegos sin motor; quitar `saveScore` y `ScoreEntry` de `SessionProvider.tsx`. Verificación manual: jugar asteroides, terminar, guardar con un nombre nuevo y verlo en `/salon?juego=asteroides` y en el Top 10 del Detalle tras recargar; con sesión cuyo nombre coincide con la puntuación guardada aparece "TU MEJOR MARCA" con su rango; sin coincidencia no aparece. Limpiar después las filas de prueba de `scores` con `execute_sql` para que la tabla quede vacía.
9. Limpieza: eliminar `GAMES`, `PLAYERS` y `seededScores` de `app/data/games.ts` y comprobar que no queda ninguna referencia. `npm run lint`, `npm run build` y MCP `get_advisors` (seguridad) sin hallazgos nuevos.

---

## Acceptance criteria

- [X] Existen en Supabase las tablas `games` y `scores` y la vista `games_with_stats`, con RLS activado en ambas tablas.
- [X] `games` contiene exactamente 1 fila: `asteroides`, con los mismos `id` y textos que el catálogo anterior.
- [X] `scores` existe y está vacía (0 filas) al terminar la implementación; no hay puntuaciones seed ni ficticias.
- [X] `games_with_stats` devuelve para `asteroides` `best = 0` y `plays = 0` mientras `scores` esté vacía.
- [X] Con la clave publishable, un `insert` en `scores` válido tiene éxito; un `insert` con `player_name` vacío, de más de 10 caracteres, `score` negativo o mayor que 1.000.000, o `game_id` inexistente es rechazado por la BD.
- [X] Con la clave publishable, `update` y `delete` sobre `scores` y cualquier escritura sobre `games` son rechazados.
- [X] `/biblioteca` muestra el único juego leído de la BD (`asteroides`); el filtro "SHOOTER" lo muestra y los demás filtros de categoría muestran el estado vacío.
- [X] La tarjeta muestra `best` y `plays` calculados desde `scores`; `plays` pasa por `formatPlays`.
- [X] `/` muestra en "JUEGOS DISPONIBLES AHORA" los juegos de la BD (hasta 6; hoy solo `asteroides`) sin romper el layout.
- [X] `/juegos/asteroides` muestra el Top 10 real ordenado por puntuación descendente (estado vacío si no hay puntuaciones); `/juegos/inexistente` y `/juegos/rocas` responden 404.
- [X] `/salon` sin parámetro muestra el primer juego (`asteroides`); `/salon?juego=asteroides` muestra podio (3 primeros) y tabla (12) de ese juego cuando hay datos, y cambiar de tab cambia el parámetro `juego` de la URL.
- [X] Un juego sin puntuaciones (el estado inicial de `asteroides`) muestra un estado vacío en `/salon` sin errores.
- [X] Tras guardar una puntuación de prueba con un nombre igual al de la sesión simulada, `/salon` muestra "TU MEJOR MARCA" con su mejor puntuación y rango; sin coincidencia o sin sesión, la fila no aparece.
- [X] En `/juegos/asteroides/jugar`, GUARDAR PUNTUACIÓN crea una fila en `scores` con `game_id = 'asteroides'`, el nombre en mayúsculas y la puntuación final, y aparece en `/salon?juego=asteroides` al recargar.
- [X] Si el insert falla (p. ej. sin red), el modal muestra "NO SE PUDO GUARDAR" y permite reintentar.
- [X] `GamePlayer` conserva la rama "MODO DEMO — NO SE GUARDA" (sin campo de iniciales ni botón de guardar, sin insert) para juegos fuera de `GAME_ENGINES`; no es alcanzable desde la UI con el catálogo actual.
- [X] No queda código que lea o escriba la clave `av_scores` ni referencias a `GAMES`, `seededScores` o `PLAYERS`.
- [X] `npm run build` y `npm run lint` pasan sin errores.
- [X] MCP `get_advisors` (seguridad) no reporta tablas sin RLS ni vistas `SECURITY DEFINER` para `games`, `scores` o `games_with_stats`.
- [X] No hay errores en la consola del navegador al recorrer Home → Biblioteca → Detalle → Reproductor → Salón.

---

## Decisions

- **Sí:** catálogo y puntuaciones en Supabase (`games` + `scores`). Decisión explícita del usuario — aprovecha la infraestructura del SPEC 04.
- **Sí:** puntuaciones anónimas con nombre en texto, insert público por RLS. Decisión explícita del usuario — Auth real es otro spec.
- **No:** requerir Supabase Auth ni `user_id` ahora. Haría el spec mucho mayor (login real, protección de rutas).
- **Sí:** solo los juegos reales guardan puntuación; un juego sin motor mostraría "MODO DEMO — NO SE GUARDA". Decisión explícita del usuario — el ranking no se llena de puntuaciones automáticas falsas.
- **Sí:** el catálogo en BD contiene solo `asteroides`, el único juego realmente implementado. Decisión explícita del usuario — no se muestran juegos que no funcionan.
- **Sí:** `best` y `plays` derivados de `scores` vía vista `games_with_stats`. Decisión explícita del usuario — sin contadores que se desincronicen.
- **No:** columnas `best`/`plays` mantenidas por trigger. Más piezas móviles para un volumen que no lo justifica.
- **Sí:** `plays` cuenta solo partidas guardadas. Consecuencia aceptada de la derivación; un contador de partidas iniciadas requeriría su propio spec.
- **Sí:** `security_invoker = true` en la vista. Evita saltarse RLS y el aviso del advisor de seguridad.
- **Sí:** protección con RLS + `CHECK` en la BD (nombre 1–10, score 0–1.000.000, FK a `games`). Decisión explícita del usuario — suficiente para el MVP sin código de servidor extra.
- **No:** Route Handler `POST /api/scores`. Más código sin ganancia real mientras no haya anti-trampas ni rate limiting.
- **No:** puntuaciones seed ficticias. `scores` se crea vacía y `/salon` deja de usar `seededScores`. Decisión explícita del usuario — solo puntuaciones reales; el Salón nace vacío y muestra un estado vacío.
- **Sí:** lecturas en Server Components con el cliente de servidor; el filtrado interactivo queda en componentes cliente. Decisión explícita del usuario.
- **Sí:** tab activa del Salón en `?juego=<id>` con enlaces. Permite compartir URL y leer en servidor sin estado cliente.
- **Sí:** "TU MEJOR MARCA" por coincidencia de nombre de la sesión simulada (`toUpperCase().slice(0, 10)`). Decisión explícita del usuario — sin `user_id` es la única forma.
- **No:** mantener `av_scores` de `localStorage` ni migrarlo. Decisión explícita del usuario — se abandona.
- **Sí:** el catálogo se modifica por migración, sin UI de administración.
- **Sí:** `app/error.tsx` mínimo para fallos de lectura. Sin él, una caída de Supabase deja las páginas con la pantalla de error por defecto de Next.

---

## Identified risks

| Riesgo                                                                                     | Mitigación                                                                                            |
| ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| Insert público permite spam o puntuaciones falsas                                          | Aceptado en el MVP. `CHECK` limita rangos; anti-trampas y rate limiting quedan para un spec futuro.   |
| Nombres ofensivos o impersonación (cualquiera puede escribir `ATARI_KID`)                  | Aceptado: sin Auth no hay identidad. Se resuelve con `user_id` en el spec de Auth.                    |
| "Tu mejor marca" puede mostrar la marca de otra persona con el mismo nombre                | Aceptado y documentado; desaparece con Auth real.                                                     |
| Supabase no disponible o lento: todas las pantallas leen de la BD                          | `app/error.tsx` muestra un error controlado; Home y Biblioteca dependen de la BD, sin fallback local. |
| El proxy (SPEC 04) y `cookies()` hacen las páginas dinámicas, con una consulta por request | Aceptado para el MVP; revisar caché/`revalidate` si el volumen crece.                                 |
| `plays` y `best` pasan de valores ficticios a 0 al no haber seed                           | Esperado: los valores son reales y suben conforme se guardan partidas.                                |
| Home, Biblioteca y Salón se ven casi vacíos (1 juego, 0 puntuaciones)                      | Estados vacíos explícitos; se verifica el layout con 1 tarjeta y sin datos.                           |
| Enlaces antiguos a `/juegos/<id>` de juegos retirados dan 404                              | Aceptado; vuelven al reincorporarse el juego por migración.                                           |
| La vista sin `security_invoker` ignoraría RLS                                              | La vista se crea con `security_invoker = true`; se comprueba con `get_advisors`.                      |
| Los tipos generados quedan desactualizados tras cambios de esquema                         | Regenerar con `generate_typescript_types` en cada migración futura.                                   |

---

## What is **not** in this spec

- Auth real, `user_id` o rutas protegidas.
- Anti-trampas, rate limiting o moderación de nombres.
- Panel de administración / CRUD de juegos.
- Migración de `av_scores` desde `localStorage`.
- Realtime, paginación o filtros por periodo en el ranking.
- Contador de partidas iniciadas.
- Puntuaciones de juegos simulados.
- Los 8 juegos simulados en el catálogo y cualquier dato ficticio.
- Tests automatizados.

Cada uno, si llega, va en su propio spec.
