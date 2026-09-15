# SPEC 03 — Página About y envío de correo de contacto

> **Status:** Approved
> **Depends on:** SPEC 01, SPEC 02
> **Date:** 2026-09-15
> **Objective:** Agregar la pantalla About (`references/templates/home-about/about.jsx`) como nueva ruta `/about`, enlazada desde el `Nav`, con un formulario de contacto funcional que envía un correo real mediante Resend a través de un Route Handler propio.

---

## Scope

**In:**

- Nueva ruta `/about` (`app/about/page.tsx`): sección "Acerca de" (kicker, título, misión, fila de 3 highlights con iconos) y sección "Contacto" (intro + tips + formulario), tal como en `references/templates/home-about/about.jsx`.
- Animación de aparición al hacer scroll (`useReveal` + clases `.reveal`/`.reveal.in`) y el divisor decorativo animado (`.about-divider`), portados tal cual del template. Se reutiliza el mismo patrón `useReveal`/`IntersectionObserver` ya introducido en SPEC 02 para Home, sin duplicar lógica si es razonable extraerla a un hook compartido.
- `HighlightIcon` (iconos SVG pixel-art de los 3 highlights: HEART, BROWSER, PLANT), portado tal cual del template.
- Formulario de contacto con campos Nombre, Correo electrónico y Mensaje:
  - Validación de campos vacíos (igual que el template: dispara animación `.shake` si falta alguno).
  - Validación adicional de formato de email (regex básica) antes de enviar; si el formato es inválido, dispara el mismo estado `.shake`.
  - Al enviar, hace `fetch` a un Route Handler propio (`POST /api/contact`) en vez de solo actualizar estado local.
  - Mientras espera la respuesta, el botón de envío se deshabilita y su texto cambia a "ENVIANDO…".
  - Si la respuesta es exitosa, se muestra la pantalla de éxito estilo terminal (`.terminal-success`) ya existente en el template, con el nombre del usuario.
  - Si la respuesta falla (error de red o error del servidor), se muestra un estado de error inline dentro del formulario, con estilo coherente (terminal/pixel) al resto de la pantalla, sin perder lo que el usuario escribió, permitiendo reintentar.
- Route Handler `app/api/contact/route.ts` (`POST`):
  - Recibe `{ name, email, message }` desde el cliente.
  - Valida en servidor que los tres campos no estén vacíos y que `email` tenga formato válido; si no, responde `400` con un mensaje de error.
  - Usa el SDK oficial `resend` (paquete npm) para enviar el correo, con la API key leída de `process.env.RESEND_API_KEY`.
  - Remitente: `onboarding@resend.dev` (dominio de pruebas de Resend, no requiere verificación de dominio propio).
  - Destinatario: `process.env.CONTACT_TO_EMAIL`.
  - `replyTo` del correo enviado: el email ingresado por el usuario en el formulario.
  - Asunto y cuerpo del correo incluyen nombre, email y mensaje del formulario.
  - Responde `200` con éxito si Resend confirma el envío; responde `500` con un mensaje de error si Resend falla (API key inválida, error de red, límite alcanzado, etc.).
- Instalación de la dependencia npm `resend` (se agrega a `package.json`/`package-lock.json`).
- Variables de entorno nuevas, documentadas en un archivo `.env.example` (committeado, sin valores reales): `RESEND_API_KEY` y `CONTACT_TO_EMAIL`. El archivo real `.env.local` con los valores reales no se commitea (ya cubierto por `.env*` en `.gitignore`).
- Actualización de `components/Nav.tsx`: se agrega el link "Acerca de" → `/about`, al final del listado de links (después de "Salón de la Fama"), tanto en el nav desktop como en el panel móvil, con su lógica de estado activo (`isActive("about")` → `pathname === "/about"`).
- Estilos CSS asociados a About/Contacto (`.about-hero`, `.about-title`, `.about-mission`, `.highlight-row`, `.highlight`, `.hl-icon`, `.hl-text`, `.about-divider`, `.div-bar`, `.div-pixels`, `.about-contact`, `.contact-grid`, `.contact-intro`, `.contact-title`, `.contact-sub`, `.contact-tips`, `.tip`, `.tip-led`, `.contact-form`, `@keyframes shake`, `.term-bar`, `.dot`, `.term-title`, `.term-body`, `.line`, `.prompt`, `.dim`, `.success`, `.caret`, `@keyframes blink`) portados desde `references/templates/home-about/styles.css` y añadidos a `app/globals.css`, sin duplicar clases ya existentes.

**Out of scope (queda fuera explícitamente):**

- Cualquier persistencia de los mensajes de contacto (no se guardan en base de datos, `localStorage` ni archivo).
- Rate limiting, protección anti-spam (captcha, honeypot) o cualquier medida antiabuso sobre el formulario.
- Verificación de dominio propio en Resend: se usa el remitente de pruebas `onboarding@resend.dev`.
- Plantillas de correo HTML enriquecidas (React Email, etc.): el cuerpo del correo es texto plano simple con los datos del formulario.
- Cambios a la lógica de Home, Biblioteca, Detalle, Reproductor, Salón o Auth más allá de agregar el link "Acerca de" al `Nav`.
- Tests automatizados, internacionalización, autenticación real, base de datos (igual que SPEC 01 y SPEC 02).
- Confirmación por correo al propio usuario que llena el formulario (solo se notifica al destinatario en `CONTACT_TO_EMAIL`).

---

## Data model

No se introduce ningún modelo de datos persistente. El único "dato" nuevo es el payload transitorio `{ name, email, message }` que viaja del cliente al Route Handler y de ahí a la API de Resend; no se almacena en ningún lado del proyecto.

---

## Implementation plan

1. `npm install resend`. Crear `.env.example` con `RESEND_API_KEY=` y `CONTACT_TO_EMAIL=` (sin valores reales, solo las claves). El proyecto sigue compilando.
2. Añadir a `app/globals.css` las clases CSS de About/Contacto portadas desde `references/templates/home-about/styles.css` (listadas en Scope). Verificación: no hay clases duplicadas ni conflictos con las ya existentes de Home/Biblioteca.
3. Crear `app/about/page.tsx` (client component) portando `about.jsx`: secciones About (hero, highlights con `HighlightIcon`) y divisor, con el hook `useReveal` (reutilizando el ya existente de Home si SPEC 02 lo dejó extraído, o portando el mismo patrón `IntersectionObserver` si no). Verificación manual: cargar `/about`, ver que aparecen ambas secciones y que el scroll dispara `.reveal.in`.
4. Agregar a `app/about/page.tsx` la sección Contacto: formulario controlado con Nombre/Email/Mensaje, validación de campos vacíos + formato de email, estado `shake` en caso de error de validación de cliente. Sin conectar todavía al backend — el submit solo valida. Verificación manual: enviar el formulario vacío o con email mal formado dispara la animación `.shake`.
5. Crear `app/api/contact/route.ts` con el handler `POST`: valida el payload en servidor, instancia `Resend` con `process.env.RESEND_API_KEY`, envía el correo a `process.env.CONTACT_TO_EMAIL` con `replyTo` al email del formulario, y responde `200`/`400`/`500` según corresponda. Verificación manual: con `RESEND_API_KEY` real en `.env.local`, hacer un `POST` de prueba (o desde el formulario) y confirmar que el correo llega a `CONTACT_TO_EMAIL`.
6. Conectar el formulario de `app/about/page.tsx` al Route Handler: `fetch("/api/contact", { method: "POST", body: ... })` en el submit, con estado de carga (botón deshabilitado + "ENVIANDO…"), estado de éxito (pantalla `.terminal-success` existente) y estado de error (mensaje inline, formulario no se limpia). Verificación manual: enviar el formulario con datos válidos y `RESEND_API_KEY` correcta muestra la pantalla de éxito y el correo llega; con una `RESEND_API_KEY` inválida (o sin definir), se muestra el estado de error sin perder los datos escritos.
7. Actualizar `components/Nav.tsx`: agregar el link "Acerca de" → `/about` al final del listado (desktop y panel móvil), y `isActive("about")`. Verificación manual: en `/about` el link "Acerca de" aparece resaltado; en el resto de rutas no.
8. Revisión final de extremo a extremo en el navegador: recorrer Home → Biblioteca → Detalle → Reproductor → Salón → About → Auth, confirmando que no hay errores de consola, que el link "Acerca de" del Nav funciona desde cualquier pantalla, que el formulario de contacto envía un correo real y que el diseño responsive se mantiene en ancho móvil (~400px) sin scroll horizontal.

---

## Acceptance criteria

- [ ] `npm run dev` arranca sin errores de compilación ni de consola en `/about` y el resto de rutas existentes.
- [ ] `/about` muestra la sección "Acerca de" completa (kicker, título, misión, 3 highlights con icono) y la sección "Contacto" (intro, tips, formulario).
- [ ] Al hacer scroll en `/about`, las secciones marcadas como `.reveal` aparecen con la transición (clase `.in` se agrega al entrar en viewport).
- [ ] Enviar el formulario con algún campo vacío dispara la animación `.shake` y no llama al backend.
- [ ] Enviar el formulario con un email de formato inválido (ej. `hola@`) dispara la animación `.shake` y no llama al backend.
- [ ] Enviar el formulario con datos válidos deshabilita el botón y muestra "ENVIANDO…" mientras espera la respuesta.
- [ ] Con `RESEND_API_KEY` y `CONTACT_TO_EMAIL` válidas configuradas en `.env.local`, enviar el formulario hace que llegue un correo real a `CONTACT_TO_EMAIL` con nombre, email y mensaje del formulario, y con `replyTo` apuntando al email ingresado.
- [ ] Tras un envío exitoso, se muestra la pantalla `.terminal-success` con el nombre del usuario en mayúsculas, igual que en el template.
- [ ] Si el envío falla (ej. `RESEND_API_KEY` inválida o ausente), se muestra un mensaje de error inline en el formulario, sin borrar los datos ingresados, permitiendo reintentar.
- [ ] `.env.example` existe en el repo con las claves `RESEND_API_KEY` y `CONTACT_TO_EMAIL` sin valores reales; ningún archivo `.env.local` con valores reales queda commiteado.
- [ ] El `Nav` muestra "Acerca de" como último link, después de "Salón de la Fama", tanto en desktop como en el panel móvil.
- [ ] El link "Acerca de" del `Nav` aparece resaltado (activo) únicamente en `/about`.
- [ ] En una ventana de ~400px de ancho, `/about` no produce scroll horizontal y el menú hamburguesa del `Nav` sigue funcionando.

---

## Decisions

- **Sí:** el correo se envía desde un Route Handler propio (`app/api/contact/route.ts`), no desde una Server Action ni desde el cliente directamente. Decisión explícita del usuario — es el patrón estándar de Next.js App Router para no exponer `RESEND_API_KEY` al navegador.
- **Sí:** destinatario y remitente se configuran vía variables de entorno (`CONTACT_TO_EMAIL`) y remitente de pruebas fijo de Resend (`onboarding@resend.dev`). Decisión explícita del usuario — evita hardcodear el destino y no requiere verificar un dominio propio para el MVP.
- **Sí:** se agrega validación de formato de email en cliente y servidor, además de la validación de "no vacío" que ya trae el template. Decisión explícita del usuario — evita que Resend rechace envíos con emails mal formados y mejora la señal de error para el usuario.
- **Sí:** se agrega un estado de error visible en el formulario cuando Resend falla, reutilizando el estilo terminal existente. Decisión explícita del usuario — el template original no contempla fallos reales porque no tenía backend.
- **Sí:** se agrega un estado de carga ("ENVIANDO…", botón deshabilitado) durante la llamada de red. Decisión explícita del usuario — necesario porque ahora hay una llamada real a un servicio externo con latencia, algo que el template estático no necesitaba.
- **Sí:** se instala el SDK oficial `resend` como dependencia npm en vez de llamar a la API HTTP directamente. Decisión explícita del usuario — es el enfoque recomendado por la documentación de Resend y simplifica el manejo de errores.
- **Sí:** se agrega el link "Acerca de" al `Nav`, revirtiendo la exclusión explícita de SPEC 02 (que lo dejó fuera porque la pantalla no existía todavía). Decisión explícita del usuario.
- **No:** persistencia de mensajes de contacto, rate limiting/antiabuso, verificación de dominio propio en Resend, plantillas de correo enriquecidas, o correo de confirmación al usuario. Fuera del alcance de este spec — MVP de contacto simple.

---

## Identified risks

- **Variables de entorno ausentes en desarrollo:** si `RESEND_API_KEY` o `CONTACT_TO_EMAIL` no están configuradas en `.env.local`, el formulario mostrará siempre el estado de error al enviar. Mitigación: `.env.example` documenta las claves requeridas; el mensaje de error del Route Handler debe ser claro para facilitar el diagnóstico durante desarrollo.
- **Remitente de pruebas de Resend (`onboarding@resend.dev`):** algunos proveedores de correo pueden marcar estos mensajes como spam o limitar su entrega. Aceptado como riesgo conocido del MVP; migrar a un dominio verificado queda fuera de este spec.
