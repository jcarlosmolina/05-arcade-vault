# SPEC 04 — Infraestructura de Supabase en Next.js

> **Status:** Implemented
> **Depends on:** SPEC 01
> **Date:** 2026-11-04
> **Objective:** Integrar Supabase en la app de Next.js dejando listos los clientes tipados (browser y server), las variables de entorno y el proxy de refresco de sesión, verificados con una llamada real a Supabase Auth desde Server Component y desde componente cliente, sin crear tablas ni cambiar ninguna funcionalidad existente.

---

## Scope

**In:**

- Instalación de las dependencias npm `@supabase/supabase-js` y `@supabase/ssr` (se agregan a `package.json`/`package-lock.json`).
- Variables de entorno nuevas en `.env.local` (valores reales, no se commitea) y documentadas en `.env.example` (solo claves, sin valores): `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Los valores se obtienen del proyecto Supabase ya configurado en `.mcp.json` (`project_ref=bxvveseoeomrelukbsxa`) mediante las herramientas MCP `get_project_url` y `get_publishable_keys`.
- Cliente de browser: `app/lib/supabase/client.ts` (`createBrowserClient` de `@supabase/ssr`), tipado con `Database`.
- Cliente de servidor: `app/lib/supabase/server.ts` (`createServerClient` de `@supabase/ssr`, con `cookies()` de `next/headers`), tipado con `Database`.
- Helper de refresco de sesión: `app/lib/supabase/proxy.ts` (`updateSession`), usado por el proxy raíz.
- Proxy de Next.js para refrescar la sesión/cookies de Supabase en cada request: `proxy.ts` en la raíz del repo (convención de la versión de Next fijada en el proyecto; se confirma contra `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md` antes de escribirlo), con `matcher` que excluye estáticos (`_next/static`, `_next/image`, `favicon.ico`, imágenes). No bloquea ni redirige rutas: solo refresca la sesión.
- Tipos TypeScript de la base de datos generados con la herramienta MCP `generate_typescript_types` y guardados en `app/lib/supabase/database.types.ts`. Al no haber tablas, el esquema `public` sale vacío; el archivo existe para que los clientes ya estén tipados y se regenere en specs futuros.
- Página temporal de verificación `app/debug/supabase/page.tsx` que:
  - Desde un Server Component llama a `supabase.auth.getClaims()` (o `getSession()` si `getClaims` no existe en la versión instalada) usando el cliente de servidor.
  - Renderiza un componente cliente que hace la misma llamada con el cliente de browser dentro de un `useEffect`.
  - Muestra en pantalla "OK"/"ERROR" por cada lado, más el mensaje de error si lo hay.
  - **Se elimina en el último paso del plan** (no queda en el repo al cerrar el spec).

**Out of scope (queda fuera explícitamente):**

- Creación de tablas, políticas RLS, migraciones o carpeta `supabase/` (no se ejecuta `supabase init`). Cada spec que use datos define su propio esquema.
- Auth real: `/auth` sigue usando la sesión simulada en `localStorage`; no se integra Supabase Auth ni se protegen rutas.
- Migrar `av_scores`, favoritos u otros datos de `localStorage` a Supabase.
- **Realtime** y **Edge Functions**: se usarán en el futuro, cada uno en su propio spec. `supabase-js` ya incluye el cliente Realtime, por lo que no requiere instalación adicional; no se crea `supabase/functions` ni se configura ningún canal.
- Uso de la clave `service_role` o `SUPABASE_DB_PASSWORD` en código de la app (la contraseña de DB existente en `.env.local` no se usa aquí).
- Tests automatizados.

---

## Data model

No se introduce ningún modelo de datos nuevo: el proyecto Supabase se mantiene sin tablas propias. El único artefacto relacionado es `database.types.ts` (tipo `Database` generado, con esquema `public` vacío), que no representa datos de la app.

---

## Implementation plan

1. `npm install @supabase/supabase-js @supabase/ssr`. Obtener URL y publishable key vía MCP (`get_project_url`, `get_publishable_keys`), agregarlas a `.env.local` y agregar las claves (sin valores) a `.env.example`. El proyecto sigue compilando.
2. Generar los tipos con MCP `generate_typescript_types` y guardarlos en `app/lib/supabase/database.types.ts`. El proyecto sigue compilando.
3. Crear `app/lib/supabase/client.ts` y `app/lib/supabase/server.ts` tipados con `Database` y leyendo las variables de entorno del paso 1 (consultar `node_modules/next/dist/docs/` para el uso de `cookies()` en esta versión, que puede ser asíncrono). `npx tsc --noEmit` pasa.
4. Crear `app/lib/supabase/proxy.ts` (`updateSession`) y `proxy.ts` en la raíz con el `matcher` indicado. Verificación manual: `npm run dev` arranca, las rutas existentes (`/`, `/biblioteca`, `/about`, `/salon`, `/auth`) cargan igual que antes sin errores de consola.
5. Crear la página temporal `app/debug/supabase/page.tsx` (Server Component + componente cliente) con la llamada a Auth en ambos lados. Verificación manual: `/debug/supabase` muestra "OK" para servidor y para cliente, sin errores en consola ni en terminal.
6. Verificación final: `npm run build` y `npm run lint` pasan; confirmar que las cookies/sesión no rompen la navegación existente. Eliminar `app/debug/` y confirmar que `/debug/supabase` responde 404. Confirmar que `.env.local` no aparece en `git status`.

---

## Acceptance criteria

- [X] `package.json` incluye `@supabase/supabase-js` y `@supabase/ssr`.
- [X] `.env.example` contiene las claves `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` sin valores; `.env.local` con valores reales no está trackeado por git.
- [X] Existen `app/lib/supabase/client.ts`, `server.ts`, `proxy.ts` y `database.types.ts`, y los clientes están tipados con `Database`.
- [X] Existe `proxy.ts` en la raíz con `matcher` que excluye estáticos y no redirige ni bloquea ninguna ruta.
- [X] Durante la verificación, `/debug/supabase` mostró "OK" tanto en la llamada desde Server Component como desde componente cliente.
- [X] `npm run dev` arranca sin errores de compilación ni de consola en `/`, `/biblioteca`, `/about`, `/salon` y `/auth`, y su comportamiento es idéntico al previo.
- [ ] `npm run build` y `npm run lint` pasan sin errores.
- [X] `app/debug/` no existe al cerrar el spec y `/debug/supabase` responde 404.
- [X] No existen en el repo tablas creadas, carpeta `supabase/` ni código que use `service_role` o `SUPABASE_DB_PASSWORD`.
- [X] `/auth` sigue funcionando con la sesión simulada de `localStorage` (login e invitado redirigen a `/`).

---

## Decisions

- **Sí:** alcance solo de infraestructura (clientes, env, proxy, tipos). Decisión explícita del usuario — Auth real, puntuaciones y demás se hacen en specs separados para no mezclar más de tres áreas.
- **Sí:** no crear tablas ni migraciones en este spec. Decisión explícita del usuario — el esquema se define cuando una feature lo necesite.
- **Sí:** verificar con `auth.getClaims()`/`getSession()` en vez de una consulta a una tabla. Decisión explícita del usuario — es una llamada de red real al servicio y no requiere tablas, coherente con "sin tablas".
- **Sí:** generar tipos con MCP `generate_typescript_types`, aunque hoy salgan vacíos. Decisión explícita del usuario — los clientes nacen tipados y solo se regeneran después.
- **Sí:** incluir `proxy.ts` de refresco de sesión ahora. Decisión explícita del usuario — evita retocar la infraestructura cuando llegue Auth; no bloquea rutas.
- **Sí:** usar la _publishable key_ (no `anon` legacy ni `service_role`). Es la clave pública recomendada por Supabase para el cliente y compatible con RLS.
- **Sí:** Realtime y Edge Functions quedan documentados como fuera de alcance, sin preparar nada (ni `supabase init`). Decisión explícita del usuario — se tratarán en su propio spec.
- **No:** dejar la página `/debug/supabase` en el repo. Es solo andamiaje de verificación; expone un diagnóstico que no pertenece al producto.
- **No:** usar el nombre `middleware.ts`. La versión de Next fijada en el proyecto usa `proxy.ts` (confirmar con las docs incluidas en `node_modules/next/dist/docs/`).

---

## Identified risks

- **Convenciones distintas de Next.js:** `AGENTS.md` advierte que esta versión difiere de lo conocido (`proxy.ts`, `cookies()` asíncrono). Mitigación: leer las docs locales antes de escribir `proxy.ts` y los clientes.
- **API de `@supabase/ssr` cambiante:** el nombre exacto del método de auth (`getClaims` vs `getSession`) y de la clave (`PUBLISHABLE_KEY`) depende de la versión instalada. Mitigación: verificar contra la versión instalada y contra `search_docs` de MCP.
- **Exposición de secretos:** `.env.local` ya contiene `SUPABASE_DB_PASSWORD`. Mitigación: solo variables `NEXT_PUBLIC_*` con claves públicas llegan al cliente; confirmar con `git status` que no se commitea.
- **Proxy en todas las rutas:** añade una llamada a Supabase por request. Aceptado para el MVP; se revisa al implementar Auth.
